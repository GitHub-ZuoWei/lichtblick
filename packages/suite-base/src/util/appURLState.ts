// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import * as _ from "lodash-es";

import { Time, toRFC3339String } from "@lichtblick/rostime";
import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { parseTimeUrlString } from "@lichtblick/suite-base/util/time";

import { keyMap } from "./constants";

export type AppURLState = {
  ds?: string;
  dsParams?: Record<string, string>;
  dsParamsArray?: Record<string, string[]>;
  layoutId?: LayoutID;
  time?: Time;
};

/**
 * Helper to parse hash parameters from a URL's hash fragment.
 * The hash is expected to be in the format: #key=value&key=value
 */
function parseHashParams(url: URL): URLSearchParams {
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  return new URLSearchParams(hash);
}

/**
 * Encodes app state in a URL's hash/anchor params.
 *
 * @param url The base URL to encode params into.
 * @param urlState The player state to encode.
 * @returns A url with all app state stored as hash params.
 */
export function updateAppURLState(url: URL, urlState: AppURLState): URL {
  const newURL = new URL(url.href);
  const hashParams = parseHashParams(newURL);

  if ("time" in urlState) {
    if (urlState.time) {
      hashParams.set("time", toRFC3339String(urlState.time));
    } else {
      hashParams.delete("time");
    }
  }

  if ("ds" in urlState) {
    if (urlState.ds) {
      hashParams.set("ds", urlState.ds);
    } else {
      hashParams.delete("ds");
    }
  }

  if (urlState.dsParams || urlState.dsParamsArray) {
    [...hashParams].forEach(([k]) => {
      if (k.startsWith("ds.")) {
        hashParams.delete(k);
      }
    });

    Object.entries(urlState.dsParams ?? {}).forEach(([k, v]) => {
      hashParams.append("ds." + (keyMap[k] ?? k), v);
    });
    Object.entries(urlState.dsParamsArray ?? {}).forEach(([k, v]) => {
      v.forEach((item: string) => {
        hashParams.append("ds." + (keyMap[k] ?? k), item);
      });
    });
  }

  hashParams.sort();
  const hashString = hashParams.toString();
  newURL.hash = hashString ? `#${hashString}` : "";

  return newURL;
}

/**
 * Tries to parse a state url into one of the types we know how to open.
 * Reads parameters from the URL's hash/anchor fragment.
 *
 * @param url URL to try to parse.
 * @returns Parsed URL type or undefined if the url is not a valid URL.
 * @throws Error if URL parsing fails.
 */
export function parseAppURLState(url: URL): AppURLState | undefined {
  const hashParams = parseHashParams(url);
  const ds = hashParams.get("ds") ?? undefined;
  const timeString = hashParams.get("time");
  const time = parseTimeUrlString(timeString ?? undefined);
  const dsParams: Record<string, string> = {};
  hashParams.forEach((v, k) => {
    if (k && v && k.startsWith("ds.")) {
      const cleanKey = k.replace(/^ds./, "");
      if (dsParams[cleanKey] == undefined) {
        dsParams[cleanKey] = v;
      } else if (cleanKey === "url") {
        dsParams[cleanKey] = dsParams[cleanKey] + "," + v;
      } else {
        dsParams[cleanKey] = v;
      }
    }
  });

  const state: AppURLState = _.omitBy(
    {
      time,
      ds,
      dsParams: _.isEmpty(dsParams) ? undefined : dsParams,
    },
    _.isEmpty,
  );

  return _.isEmpty(state) ? undefined : state;
}

/**
 * Tries to parse app url state from the window's current location.
 */
export function windowAppURLState(): AppURLState | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return parseAppURLState(new URL(window.location.href));
  } catch {
    return undefined;
  }
}
