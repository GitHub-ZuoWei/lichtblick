// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { test, expect } from "../../../../fixtures/electron";
import { loadFiles } from "../../../../fixtures/load-files";
import { LayoutManager, Sidebar } from "../../../../page-objects";

const MCAP_FILENAME = "example_logs.mcap";

/**
 * GIVEN a file is loaded and the user is on the Layouts tab
 * WHEN a new layout is created and a User Scripts panel is added
 * THEN the User Scripts welcome screen should be visible
 * WHEN the Panel tab is opened in the sidebar
 * THEN the panel settings should be displayed
 * WHEN the Topics tab is opened and a topic is selected
 * THEN the topic row should be visible in the sidebar
 */
test("add User Scripts panel in a new layout, open Panel tab, and select a topic", async ({
  mainWindow,
}) => {
  const sidebar = new Sidebar(mainWindow);
  const layout = new LayoutManager(mainWindow);

  // Given
  await loadFiles({
    mainWindow,
    filenames: MCAP_FILENAME,
  });
  await sidebar.openLayoutsTab();

  // When - create a new layout and add User Scripts panel
  await layout.openDefaultLayout();
  await layout.createNewLayout();
  await layout.selectPanel("User Scripts");

  // Then - the User Scripts welcome screen should be visible
  await expect(mainWindow.getByText("Welcome to User Scripts!")).toBeVisible();

  // When - open the Panel tab in the sidebar
  await sidebar.openPanelSettingsTab();

  // Then - panel settings should be displayed
  await expect(mainWindow.getByText("Auto-format on save")).toBeVisible();

  // When - open the Topics tab and select a topic
  await sidebar.openTopicsTab();
  const topicRow = mainWindow.getByTestId("topic-row").first();
  await expect(topicRow).toBeVisible();
  await topicRow.click();
});
