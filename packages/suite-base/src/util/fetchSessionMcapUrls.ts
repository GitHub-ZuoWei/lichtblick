// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import Logger from "@lichtblick/log";

const log = Logger.getLogger(__filename);

/**
 * Response shape from the session endpoint.
 * Extensible — currently only `mcapUrls` is used.
 */
export type SessionResponse = {
  /** List of remote MCAP file URLs to load */
  mcapUrls?: string[];
  /** Error message returned by the endpoint on 4xx responses */
  error?: string;

  [key: string]: unknown;
};

/**
 * Reads the `sessionid` query parameter from the current page URL.
 * Returns `undefined` if not present.
 */
export function getSessionId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return new URLSearchParams(window.location.search).get("sessionid") ?? undefined;
}

/**
 * Derives the session endpoint URL from the current page location and the session ID.
 *
 * URL derivation: strips everything after `/app/` from the pathname, then appends `/session/<sessionId>`.
 * Example: `/my-base/app/viewer` + sessionId `abc123` → `/my-base/session/abc123`
 */
function buildSessionUrl(sessionId: string): string {
  const basePath = window.location.pathname.replace(/\/app\/.*$/, "");
  return `${window.location.origin}${basePath}/session/${sessionId}`;
}

/**
 * Fetches MCAP file URLs from the session endpoint.
 *
 * @param sessionId - The session ID to look up.
 * @returns The parsed session response, or throws on network/HTTP errors.
 * @throws Error with a user-friendly message on 4xx/5xx responses.
 */
export async function fetchSessionMcapUrls(sessionId: string): Promise<SessionResponse> {
  const url = buildSessionUrl(sessionId);
  log.info(`Fetching session data from: ${url}`);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    let errorMessage = "Session not found or expired";
    try {
      const body = (await response.json()) as SessionResponse;
      if (body.error) {
        errorMessage = body.error;
      }
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as SessionResponse;
  log.info("Session response:", data);
  return data;
}
