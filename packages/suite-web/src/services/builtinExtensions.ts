// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ExtensionInfo } from "@lichtblick/suite-base/types/Extensions";

export type BuiltinExtension = {
  info: ExtensionInfo;
  /**
   * CommonJS source evaluated by buildContributionPoints via `new Function`.
   * It must assign `module.exports = { activate }` and be self-contained:
   * `require` only resolves "react" and "react-dom".
   */
  source: string;
};

/**
 * Extensions bundled with the web app, loaded on startup by
 * BuiltinExtensionLoader without any user install step.
 */
export const builtinExtensions: BuiltinExtension[] = [
  {
    info: {
      id: "lichtblick.builtin-converters",
      name: "builtin-converters",
      publisher: "lichtblick",
      displayName: "Built-in Converters",
      qualifiedName: "lichtblick.builtin-converters",
      description: "Message converters bundled with the app",
      version: "1.0.0",
      homepage: "",
      keywords: ["builtin"],
      license: "MPL-2.0",
      namespace: "local",
    },
    source: `
      module.exports = {
        activate(extensionContext) {
          // Example: convert a custom schema to a schema built-in panels understand.
          // Topics with fromSchemaName gain a "convertibleTo" entry, and panels
          // subscribing with convertTo receive the converted messages.
          extensionContext.registerMessageConverter({
            fromSchemaName: "custom_msgs/msg/GpsFix",
            toSchemaName: "foxglove.LocationFix",
            converter: (message) => ({
              timestamp: message.stamp,
              frame_id: "gps",
              latitude: message.latitude,
              longitude: message.longitude,
              altitude: message.altitude,
              position_covariance_type: 0,
            }),
          });
        },
      };
      `,
  },
];
