// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "../../../../fixtures/electron";

/**
 * GIVEN the user is on the Layouts tab
 * WHEN they create a new layout and add a User Scripts panel
 * AND they open the Panel tab
 * THEN the User Scripts panel settings should be visible
 * AND the "New script" button should be visible and enabled
 */
test("add User Scripts panel in a new layout and verify script creation is enabled", async ({
  mainWindow,
}) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  // When
  await mainWindow.getByTestId("layout-list-item").getByText("Default", { exact: true }).click();
  await mainWindow.getByTestId("create-new-layout").click();

  const panelSearch = mainWindow.getByTestId("panel-list-textfield").locator("input");
  await panelSearch.fill("User Scripts");
  await mainWindow.getByText("User Scripts").nth(0).click();

  // Open Panel tab
  await mainWindow.getByTestId("panel-settings-left").click();

  // Then
  await expect(mainWindow.getByText("User Scripts panel")).toBeVisible();
  await expect(mainWindow.getByRole("button", { name: "New script" })).toBeVisible();
  await expect(mainWindow.getByRole("button", { name: "New script" })).toBeEnabled();
});
