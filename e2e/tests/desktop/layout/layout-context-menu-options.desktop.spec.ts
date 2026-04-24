// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "../../../fixtures/electron";

/**
 * GIVEN the user is on the Layouts tab
 * AND the Default layout has been modified (triggering unsaved changes via panel split)
 * WHEN the user right-clicks the Default layout (active, with unsaved changes)
 * THEN the context menu shows: "This layout has unsaved changes", "Save changes", "Revert", "Rename", "Export…", "Delete"
 * AND the context menu does NOT show "Duplicate"
 */
test("layout context menu shows unsaved-changes options for a modified layout", async ({
  mainWindow,
}) => {
  // Given — modify the Default layout by splitting a panel to trigger unsaved changes
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();

  await mainWindow
    .getByTestId("panel-mouseenter-container 3D!18i6zy7")
    .getByTestId("panel-menu")
    .click();
  await mainWindow.getByRole("menuitem", { name: "Split down" }).click();

  await mainWindow.getByTestId("layouts-left").click();

  const defaultLayoutItem = mainWindow.getByRole("listitem").filter({ hasText: "Default" });

  // When — right-click the modified Default layout
  await defaultLayoutItem.getByRole("button", { name: "Default" }).click({ button: "right" });

  // Then — layout with unsaved changes shows Save changes, Revert and no Duplicate
  await expect(
    mainWindow.getByRole("menuitem", { name: "This layout has unsaved changes" }),
  ).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Save changes" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Revert" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Rename" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Export…" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Duplicate" })).not.toBeVisible();
});

/**
 * GIVEN the user is on the Layouts tab
 * AND the Default layout has NOT been modified
 * WHEN the user right-clicks the Default layout
 * THEN the context menu shows: "Rename", "Duplicate", "Export…", "Delete"
 * AND the context menu does NOT show "Save changes" or "Revert"
 */
test("layout context menu shows standard options for an unmodified layout", async ({
  mainWindow,
}) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  const defaultLayoutItem = mainWindow.getByRole("listitem").filter({ hasText: "Default" });

  // When — right-click the unmodified Default layout
  await defaultLayoutItem.getByRole("button", { name: "Default" }).click({ button: "right" });

  // Then — unmodified layout shows Duplicate and no Save changes / Revert
  await expect(mainWindow.getByRole("menuitem", { name: "Rename" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Duplicate" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Export…" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Delete" })).toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Save changes" })).not.toBeVisible();
  await expect(mainWindow.getByRole("menuitem", { name: "Revert" })).not.toBeVisible();
});
