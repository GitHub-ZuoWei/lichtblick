// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "../../../fixtures/electron";

/**
 * GIVEN the user is on the Layouts tab
 * AND the "Default" layout exists
 * WHEN the user right-clicks "Default" and selects "Duplicate"
 * THEN a new layout named "Default copy" appears in the list
 * AND the original "Default" layout is still visible
 */
test("should create a copy of the layout when duplicate is selected", async ({ mainWindow }) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  // When
  await mainWindow.getByRole("button", { name: "Default" }).click({ button: "right" });
  await mainWindow.getByRole("menuitem", { name: "Duplicate" }).click();

  // Then
  await expect(mainWindow.getByRole("button", { name: "Default copy" })).toBeVisible();
  await expect(mainWindow.getByRole("button", { name: "Default", exact: true })).toBeVisible();
});

/**
 * GIVEN the user is on the Layouts tab
 * AND a "Default copy" layout already exists
 * WHEN the user duplicates "Default copy"
 * THEN a new layout named "Default copy copy" appears in the list
 */
test("should append ' copy' to the name when duplicating a layout that already contains 'copy'", async ({
  mainWindow,
}) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  await mainWindow.getByRole("button", { name: "Default" }).click({ button: "right" });
  await mainWindow.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(mainWindow.getByRole("button", { name: "Default copy" })).toBeVisible();

  // When
  await mainWindow.getByRole("button", { name: "Default copy" }).click({ button: "right" });
  await mainWindow.getByTestId("duplicate-layout").click();

  // Then
  await expect(mainWindow.getByRole("button", { name: "Default copy copy" })).toBeVisible();
});
