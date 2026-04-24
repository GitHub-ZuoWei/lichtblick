// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "../../../fixtures/electron";

/**
 * GIVEN the user is on the Layouts tab
 * AND a new layout exists
 * WHEN the user right-clicks the new layout, selects "Delete", and confirms in the dialog
 * THEN the layout is removed from the list
 */
test("should remove the layout from the list when delete is confirmed", async ({ mainWindow }) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();
  await mainWindow.getByTestId("create-new-layout").click();
  await mainWindow.getByTestId("layouts-left").click();

  const newLayoutItem = mainWindow.getByRole("listitem").filter({ hasText: /Unnamed layout/ });
  await expect(newLayoutItem).toBeVisible();

  // When
  await newLayoutItem.getByRole("button", { name: /Unnamed layout/ }).click({ button: "right" });
  await mainWindow.getByRole("menuitem", { name: "Delete" }).click();

  const dialog = mainWindow.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();

  // Then
  await expect(newLayoutItem).not.toBeVisible();
});

/**
 * GIVEN the user is on the Layouts tab
 * AND a new layout exists
 * WHEN the user right-clicks the new layout, selects "Delete", but cancels in the dialog
 * THEN the layout remains in the list
 */
test("should keep the layout in the list when delete is cancelled", async ({ mainWindow }) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();
  await mainWindow.getByTestId("create-new-layout").click();
  await mainWindow.getByTestId("layouts-left").click();

  const newLayoutItem = mainWindow.getByRole("listitem").filter({ hasText: /Unnamed layout/ });
  await expect(newLayoutItem).toBeVisible();

  // When
  await newLayoutItem.getByRole("button", { name: /Unnamed layout/ }).click({ button: "right" });
  await mainWindow.getByRole("menuitem", { name: "Delete" }).click();

  const dialog = mainWindow.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // Then
  await expect(newLayoutItem).toBeVisible();
});
