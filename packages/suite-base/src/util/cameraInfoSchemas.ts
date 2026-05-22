// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/** All schema name variants for sensor_msgs/CameraInfo (ROS1, ROS2, protobuf). */
export const CAMERA_INFO_DATATYPES = new Set<string>([
  "sensor_msgs/CameraInfo",
  "sensor_msgs/msg/CameraInfo",
  "ros.sensor_msgs.CameraInfo",
]);

/** All schema name variants for foxglove.CameraCalibration (JSON/protobuf, ROS1, ROS2, IDL). */
export const CAMERA_CALIBRATION_DATATYPES = new Set<string>([
  "foxglove.CameraCalibration",
  "foxglove_msgs/CameraCalibration",
  "foxglove_msgs/msg/CameraCalibration",
  "foxglove::CameraCalibration",
]);

/** Union of all camera info/calibration schema name variants, covering both ROS and Foxglove encodings. */
export const CAMERA_INFO_SCHEMA_NAMES = new Set<string>([
  ...CAMERA_INFO_DATATYPES,
  ...CAMERA_CALIBRATION_DATATYPES,
]);
