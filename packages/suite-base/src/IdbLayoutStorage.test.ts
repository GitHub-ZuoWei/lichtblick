/** @jest-environment jsdom */

// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { layoutDatabaseName } from "@lichtblick/suite-base/IdbLayoutStorage";
import { KEY_WORKSPACE_PREFIX } from "@lichtblick/suite-base/constants/browserStorageKeys";
import { BasicBuilder } from "@lichtblick/test-builders";

describe("layoutDatabaseName", () => {
  const DEFAULT_NAME = `${KEY_WORKSPACE_PREFIX}lichtblick-layouts`;

  it("should return the default unscoped database name when workspaceId is undefined", () => {
    // GIVEN no workspace id
    // WHEN computing the database name
    const result = layoutDatabaseName(undefined);

    // THEN the shared, unscoped name is returned with no workspace suffix
    expect(result).toBe(DEFAULT_NAME);
    expect(result).toMatch(/lichtblick-layouts$/);
  });

  it("should match the undefined case when called with no arguments (backward compatibility)", () => {
    // GIVEN no arguments passed
    // WHEN computing the database name
    const result = layoutDatabaseName();

    // THEN it matches the default unscoped name used by existing installs and the web build
    expect(result).toBe(DEFAULT_NAME);
    expect(result).toBe(layoutDatabaseName(undefined));
  });

  it("should scope the database name with the workspace id when one is given", () => {
    // GIVEN a workspace id
    const workspaceId = BasicBuilder.string();

    // WHEN computing the database name
    const result = layoutDatabaseName(workspaceId);

    // THEN the id is appended to the default name after a dash
    expect(result).toBe(`${DEFAULT_NAME}-${workspaceId}`);
  });

  it("should produce different names for different workspace ids", () => {
    // GIVEN two distinct workspace ids
    const firstId = BasicBuilder.string();
    const secondId = BasicBuilder.string();

    // WHEN computing the database name for each
    const firstName = layoutDatabaseName(firstId);
    const secondName = layoutDatabaseName(secondId);

    // THEN the two workspaces resolve to isolated databases
    expect(firstId).not.toBe(secondId);
    expect(firstName).not.toBe(secondName);
  });
});
