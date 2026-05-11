// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import Logger from "@lichtblick/log";

const log = Logger.getLogger(__filename);

const MCAP_METADATA_HEADER = "X-Mcap-Metadata";

/**
 * Represents the JSON structure of the X-Mcap-Metadata response header.
 * Extensible — currently only `mcapUrls` is used, but other fields can be added.
 */
export type McapMetadata = {
  /** List of remote MCAP file URLs to load */
  mcapUrls?: string[];

  // Future extensibility — add more fields here as needed
  [key: string]: unknown;
};

/**
 * Fetches the current page URL (or a given URL) and reads the `X-Mcap-Metadata`
 * response header. If present, parses the JSON and returns the metadata object.
 *
 * Returns `undefined` if the header is not present or parsing fails.
 *
 * @param url - URL to fetch. Defaults to `window.location.href`.
 */
export async function fetchMcapMetadataHeader(url?: string): Promise<McapMetadata | undefined> {
  const targetUrl = url ?? window.location.href;

  try {
    const controller = new AbortController();
    const response = await fetch(targetUrl, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });

    const headerValue = response.headers.get(MCAP_METADATA_HEADER);
    if (headerValue == undefined || headerValue.length === 0) {
      log.debug("No X-Mcap-Metadata header found");
      return undefined;
    }

    const metadata: McapMetadata = JSON.parse(headerValue) as McapMetadata;
    log.info("Received X-Mcap-Metadata header:", metadata);
    return metadata;
  } catch (error) {
    log.warn("Failed to fetch or parse X-Mcap-Metadata header:", error);
    return undefined;
  }
}
