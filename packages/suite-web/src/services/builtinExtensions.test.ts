// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MessageEvent } from "@lichtblick/suite";
import { buildContributionPoints } from "@lichtblick/suite-base/providers/helpers/buildContributionPoints";

import { builtinExtensions } from "./builtinExtensions";

describe("builtinExtensions", () => {
  // buildContributionPoints swallows activate() errors, so a broken source
  // would surface as an extension with zero contributions
  it("activates every built-in extension with at least one contribution", () => {
    for (const { info, source } of builtinExtensions) {
      const contributionPoints = buildContributionPoints(info, source);
      const contributionCount =
        contributionPoints.messageConverters.length +
        Object.keys(contributionPoints.panels).length +
        contributionPoints.topicAliasFunctions.length +
        contributionPoints.cameraModels.size;
      expect(contributionCount).toBeGreaterThan(0);
    }
  });

  it("converts custom_msgs/msg/GpsFix to foxglove.LocationFix", () => {
    const [extension] = builtinExtensions;
    const { messageConverters } = buildContributionPoints(extension!.info, extension!.source);

    const converter = messageConverters.find(
      (installed) =>
        installed.fromSchemaName === "custom_msgs/msg/GpsFix" &&
        installed.toSchemaName === "foxglove.LocationFix",
    );
    expect(converter).toBeDefined();

    const message = {
      stamp: { sec: 1, nsec: 2 },
      latitude: 48.1,
      longitude: 11.5,
      altitude: 520,
    };
    const messageEvent: MessageEvent = {
      topic: "/gps",
      schemaName: "custom_msgs/msg/GpsFix",
      receiveTime: { sec: 1, nsec: 2 },
      message,
      sizeInBytes: 0,
    };

    expect(converter!.converter(message, messageEvent)).toEqual({
      timestamp: { sec: 1, nsec: 2 },
      frame_id: "gps",
      latitude: 48.1,
      longitude: 11.5,
      altitude: 520,
      position_covariance_type: 0,
    });
  });
});
