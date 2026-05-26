// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { test, expect } from "../../../fixtures/electron";
import { loadFromFilePicker } from "../../../fixtures/load-from-file-picker";
import { DataSourceDialog, LayoutManager, Sidebar } from "../../../page-objects";

const LAYOUT_FILE = "imported-layout.json";

/**
 * GIVEN the user has an imported layout in the layouts tab
 * WHEN they rename the layout via the layout actions menu
 * THEN the layout list should display the new name
 */
test("rename a layout via layout actions menu", async ({ mainWindow }) => {
  const dialog = new DataSourceDialog(mainWindow);
  const sidebar = new Sidebar(mainWindow);
  const layout = new LayoutManager(mainWindow);

  // Given
  await dialog.close();
  await sidebar.openLayoutsTab();
  await loadFromFilePicker(mainWindow, LAYOUT_FILE);
  await layout.importLayout();
  await expect(
    layout.getLayoutListItem().getByText("imported-layout", { exact: true }),
  ).toBeVisible();

  // When
  await layout.renameLayout("imported-layout", "renamed-layout");

  // Then
  await expect(
    layout.getLayoutListItem().getByText("renamed-layout", { exact: true }),
  ).toBeVisible();
  await expect(
    layout.getLayoutListItem().getByText("imported-layout", { exact: true }),
  ).not.toBeVisible();
});
