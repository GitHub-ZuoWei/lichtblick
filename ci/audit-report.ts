// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Transforms the NDJSON output of `yarn npm audit --all --recursive --json`
 * into a developer-friendly, self-contained HTML report.
 *
 * Advisories are grouped by the affected package so that multiple findings on
 * the same source are presented together. Usage:
 *
 *   yarn npm audit --all --recursive --severity moderate --json | ts-node ci/audit-report.ts
 *
 * Reads the audit NDJSON from stdin and writes the HTML report to the path
 * given by the first CLI argument (defaults to `audit-report.html`).
 */

import fs from "node:fs";
import path from "node:path";

type Severity = "info" | "low" | "moderate" | "high" | "critical";

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  low: 3,
  info: 4,
};

/**
 * Shape of a single advisory line emitted by `yarn npm audit --json`.
 *
 * Fields are optional because the data is parsed from an external process and
 * the format is not guaranteed; the parser fills in safe defaults.
 */
type AuditAdvisory = {
  ID?: string | number;
  Issue?: string;
  Severity?: string;
  "Vulnerable Versions"?: string;
  "Tree Versions"?: string[];
  Dependents?: string[];
  URL?: string;
};

type AuditLine = {
  value: string;
  children: AuditAdvisory;
};

type NormalizedAdvisory = {
  id: string;
  issue: string;
  severity: Severity;
  vulnerableVersions: string;
  treeVersions: string[];
  dependents: string[];
  url?: string;
};

type PackageGroup = {
  packageName: string;
  advisories: NormalizedAdvisory[];
  highestSeverity: Severity;
};

function isSeverity(value: string): value is Severity {
  return (
    value === "info" ||
    value === "low" ||
    value === "moderate" ||
    value === "high" ||
    value === "critical"
  );
}

function normalizeSeverity(value: string): Severity {
  const lower = value.toLowerCase();
  return isSeverity(lower) ? lower : "info";
}

/** Narrow an arbitrary parsed JSON value to an advisory line emitted by the audit tool. */
function isAuditLine(value: unknown): value is AuditLine {
  if (typeof value !== "object" || value == undefined) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.value === "string" &&
    typeof candidate.children === "object" &&
    candidate.children != undefined
  );
}

/** Parse the audit NDJSON stream into normalized advisories grouped by package. */
function parseAudit(raw: string): PackageGroup[] {
  const groups = new Map<string, PackageGroup>();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (!isAuditLine(parsed)) {
      continue;
    }

    const child = parsed.children;
    const severity = normalizeSeverity(child.Severity ?? "");
    const advisory: NormalizedAdvisory = {
      id: String(child.ID ?? "unknown"),
      issue: child.Issue ?? "No description provided.",
      severity,
      vulnerableVersions: child["Vulnerable Versions"] ?? "unknown",
      treeVersions: child["Tree Versions"] ?? [],
      dependents: child.Dependents ?? [],
      url: child.URL,
    };

    const existing = groups.get(parsed.value);
    if (existing) {
      existing.advisories.push(advisory);
      if (SEVERITY_ORDER[severity] < SEVERITY_ORDER[existing.highestSeverity]) {
        existing.highestSeverity = severity;
      }
    } else {
      groups.set(parsed.value, {
        packageName: parsed.value,
        advisories: [advisory],
        highestSeverity: severity,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.highestSeverity] - SEVERITY_ORDER[b.highestSeverity];
    if (bySeverity !== 0) {
      return bySeverity;
    }
    return a.packageName.localeCompare(b.packageName);
  });
}

function countBySeverity(groups: PackageGroup[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };
  for (const group of groups) {
    for (const advisory of group.advisories) {
      counts[advisory.severity] += 1;
    }
  }
  return counts;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderAdvisory(advisory: NormalizedAdvisory): string {
  const titleId = /^\d+$/.test(advisory.id)
    ? `Advisory #${escapeHtml(advisory.id)}`
    : escapeHtml(advisory.id);
  const link =
    advisory.url != undefined
      ? `<a class="advisory-link" href="${escapeHtml(advisory.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(advisory.url)}</a>`
      : "";
  const dependents =
    advisory.dependents.length > 0
      ? `<div class="meta-row"><span class="meta-label">Dependents</span><span class="meta-value">${advisory.dependents
          .map((dep) => `<code>${escapeHtml(dep)}</code>`)
          .join(" ")}</span></div>`
      : "";
  const treeVersions =
    advisory.treeVersions.length > 0
      ? `<div class="meta-row"><span class="meta-label">Installed</span><span class="meta-value">${advisory.treeVersions
          .map((version) => `<code>${escapeHtml(version)}</code>`)
          .join(" ")}</span></div>`
      : "";

  return `
        <div class="advisory">
          <div class="advisory-head">
            <span class="badge badge-${advisory.severity}">${advisory.severity}</span>
            <span class="advisory-id">${titleId}</span>
          </div>
          <p class="advisory-issue">${escapeHtml(advisory.issue)}</p>
          <div class="meta-row"><span class="meta-label">Vulnerable</span><span class="meta-value"><code>${escapeHtml(advisory.vulnerableVersions)}</code></span></div>
          ${treeVersions}
          ${dependents}
          ${link}
        </div>`;
}

function renderGroup(group: PackageGroup): string {
  const advisories = [...group.advisories].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  const countLabel =
    group.advisories.length === 1 ? "1 advisory" : `${group.advisories.length} advisories`;

  return `
      <details class="group" open>
        <summary class="group-summary">
          <span class="badge badge-${group.highestSeverity}">${group.highestSeverity}</span>
          <span class="group-name">${escapeHtml(group.packageName)}</span>
          <span class="group-count">${countLabel}</span>
        </summary>
        <div class="group-body">
          ${advisories.map(renderAdvisory).join("")}
        </div>
      </details>`;
}

function renderHtml(groups: PackageGroup[]): string {
  const counts = countBySeverity(groups);
  const totalAdvisories = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const generatedAt = new Date().toISOString();

  const summaryCards = (Object.keys(SEVERITY_ORDER) as Severity[])
    .map(
      (severity) =>
        `<div class="card card-${severity}"><span class="card-count">${counts[severity]}</span><span class="card-label">${severity}</span></div>`,
    )
    .join("");

  const body =
    groups.length === 0
      ? `<div class="empty">No vulnerabilities found. 🎉</div>`
      : groups.map(renderGroup).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dependency Audit Report</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f6f7f9;
        --surface: #ffffff;
        --border: #e2e5e9;
        --text: #1b1f24;
        --muted: #5c6570;
        --critical: #7c1d1d;
        --high: #c0392b;
        --moderate: #d68910;
        --low: #2e86c1;
        --info: #7f8c8d;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #15181c;
          --surface: #1e2228;
          --border: #2c323a;
          --text: #e6e9ed;
          --muted: #9aa4af;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 2rem 1.5rem 4rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.5;
      }
      .container { max-width: 960px; margin: 0 auto; }
      h1 { font-size: 1.6rem; margin: 0 0 0.25rem; }
      .subtitle { color: var(--muted); margin: 0 0 1.5rem; font-size: 0.9rem; }
      .cards { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 2rem; }
      .card {
        flex: 1 1 120px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .card-count { font-size: 1.6rem; font-weight: 700; }
      .card-label { text-transform: capitalize; color: var(--muted); font-size: 0.8rem; }
      .card-critical .card-count { color: var(--critical); }
      .card-high .card-count { color: var(--high); }
      .card-moderate .card-count { color: var(--moderate); }
      .card-low .card-count { color: var(--low); }
      .card-info .card-count { color: var(--info); }
      .group {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        margin-bottom: 0.85rem;
        overflow: hidden;
      }
      .group-summary {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.85rem 1rem;
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      .group-summary::-webkit-details-marker { display: none; }
      .group-name { font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .group-count { margin-left: auto; color: var(--muted); font-size: 0.8rem; }
      .group-body { padding: 0 1rem 0.5rem; }
      .advisory {
        border-top: 1px solid var(--border);
        padding: 0.9rem 0;
      }
      .advisory-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
      .advisory-id { font-size: 0.85rem; color: var(--muted); }
      .advisory-issue { margin: 0 0 0.6rem; }
      .meta-row { display: flex; gap: 0.5rem; font-size: 0.85rem; margin-bottom: 0.25rem; }
      .meta-label { color: var(--muted); min-width: 90px; }
      .meta-value { word-break: break-word; }
      code {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 0.05rem 0.35rem;
        font-size: 0.82rem;
      }
      .advisory-link { display: inline-block; margin-top: 0.4rem; font-size: 0.85rem; word-break: break-all; }
      .badge {
        text-transform: uppercase;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        color: #fff;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
      }
      .badge-critical { background: var(--critical); }
      .badge-high { background: var(--high); }
      .badge-moderate { background: var(--moderate); }
      .badge-low { background: var(--low); }
      .badge-info { background: var(--info); }
      .empty {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 2.5rem;
        text-align: center;
        color: var(--muted);
        font-size: 1.1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Dependency Audit Report</h1>
      <p class="subtitle">${totalAdvisories} advisor${totalAdvisories === 1 ? "y" : "ies"} across ${groups.length} package${groups.length === 1 ? "" : "s"} &middot; generated ${escapeHtml(generatedAt)}</p>
      <div class="cards">${summaryCards}</div>
      ${body}
    </div>
  </body>
</html>
`;
}

async function readStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += String(chunk)));
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", reject);
  });
}

/**
 * Resolve a user-supplied output path and ensure it stays within the current
 * working directory. This prevents a malicious or mistaken CLI argument (e.g.
 * `../../etc/passwd` or an absolute path) from escaping the project tree when
 * the report is written.
 */
function resolveSafeOutputPath(candidate: string): string {
  const baseDir = process.cwd();
  const resolved = path.resolve(baseDir, candidate);
  const relative = path.relative(baseDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Refusing to write outside of the working directory: "${candidate}" resolves to "${resolved}".`,
    );
  }
  return resolved;
}

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? "audit-report.html";
  const safeOutputPath = resolveSafeOutputPath(outputPath);
  const raw = await readStdin();
  const groups = parseAudit(raw);

  const html = renderHtml(groups);
  fs.writeFileSync(safeOutputPath, html, "utf8");

  const counts = countBySeverity(groups);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  console.info(
    `Audit report written to ${safeOutputPath} (${total} advisories across ${groups.length} packages: ` +
      `${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low, ${counts.info} info).`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
