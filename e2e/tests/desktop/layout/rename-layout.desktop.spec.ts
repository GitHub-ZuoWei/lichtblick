// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "../../../fixtures/electron";

const NEW_LAYOUT_NAME = "My Renamed Layout";

/**
 * GIVEN the user is on the Layouts tab
 * WHEN they right-click on the "Default" layout and select "Rename"
 * AND type a new name and press Enter
 * THEN the layout should appear in the list with the new name
 * AND the old name should no longer be visible
 */
test("rename a layout via the context menu", async ({ mainWindow }) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  // When
  await mainWindow.getByRole("button", { name: "Default" }).click({ button: "right" });
  await mainWindow.getByRole("menuitem", { name: "Rename" }).click();

  const renameInput = mainWindow.getByTestId("layout-list-item").locator("input[type=text]");
  await renameInput.fill(NEW_LAYOUT_NAME);
  await renameInput.press("Enter");

  // Then
  await expect(mainWindow.getByRole("button", { name: NEW_LAYOUT_NAME })).toBeVisible();
  await expect(mainWindow.getByRole("button", { name: "Default" })).not.toBeVisible();
});
