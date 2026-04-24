// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Browser, Page } from "playwright";
import { test, expect } from "@playwright/test";

import { loadFiles } from "../../fixtures/load-files";

const MCAP_FILENAME = "example.mcap";
const BASE_URL = "http://localhost:8080";

/**
 * Creates two pages in the same browser context (required for BroadcastChannel
 * communication between tabs) and loads the same MCAP file in both.
 */
async function setupTwoSyncedPages(
  browser: Browser,
): Promise<{ page1: Page; page2: Page; cleanup: () => Promise<void> }> {
  const context = await browser.newContext();
  const page1 = await context.newPage();
  const page2 = await context.newPage();

  await page1.goto(BASE_URL);
  await page2.goto(BASE_URL);
  await page1.waitForLoadState("networkidle");
  await page2.waitForLoadState("networkidle");

  await loadFiles({ mainWindow: page1, filenames: MCAP_FILENAME });
  await loadFiles({ mainWindow: page2, filenames: MCAP_FILENAME });

  await page1.waitForSelector('input[value*="2025-02-26"]', { timeout: 15000 });
  await page2.waitForSelector('input[value*="2025-02-26"]', { timeout: 15000 });

  return {
    page1,
    page2,
    cleanup: async () => {
      await page1.close();
      await page2.close();
      await context.close();
    },
  };
}

function getTimestamp(page: Page): Promise<string> {
  return page.locator('input[value*="2025-02-26"]').first().inputValue();
}

/**
 * GIVEN two Lichtblick instances are open in separate tabs with the same MCAP file loaded
 * WHEN the sync button is clicked on a page
 * THEN its aria-pressed should become true and show "on"
 * WHEN it is clicked again
 * THEN it should return to aria-pressed false and show "off"
 */
test("sync toggle switches on and off", async ({ browser }) => {
  const { page1, cleanup } = await setupTwoSyncedPages(browser);

  try {
    const syncBtn = page1.getByTestId("sync-toggle-button");

    // Then - initial state is off
    await expect(syncBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page1.getByText("off")).toBeVisible();

    // When - enable sync
    await syncBtn.click();

    // Then - sync is on
    await expect(syncBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page1.getByText("on")).toBeVisible();

    // When - disable sync
    await syncBtn.click();

    // Then - sync is off again
    await expect(syncBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page1.getByText("off")).toBeVisible();
  } finally {
    await cleanup();
  }
});

/**
 * GIVEN two Lichtblick instances are open in separate tabs with the same MCAP file loaded
 * AND sync is enabled in both tabs
 * WHEN playback starts in the first tab
 * THEN the second tab should also start playing
 * AND after pausing, both tabs should have the same timestamp (within 200ms tolerance)
 */
test("enabling sync causes both instances to play together", async ({ browser }) => {
  const { page1, page2, cleanup } = await setupTwoSyncedPages(browser);

  try {
    // Enable sync in both tabs
    await page1.getByTestId("sync-toggle-button").click();
    await page2.getByTestId("sync-toggle-button").click();

    await expect(page1.getByTestId("sync-toggle-button")).toHaveAttribute("aria-pressed", "true");
    await expect(page2.getByTestId("sync-toggle-button")).toHaveAttribute("aria-pressed", "true");

    const initialTime1 = await getTimestamp(page1);
    const initialTime2 = await getTimestamp(page2);

    // Both tabs start at the same position
    expect(initialTime1).toBe(initialTime2);

    // When - start playback in page1
    await page1.getByTestId("play-button").click();

    // Then - page2 should also start playing due to sync
    await expect(page1.getByTestId("play-button")).toHaveAttribute("title", "Pause");
    await expect(page2.getByTestId("play-button")).toHaveAttribute("title", "Pause");

    // Let both play for a moment
    await page1.waitForTimeout(2000);

    // Pause from page1
    await page1.getByTestId("play-button").click();
    await expect(page1.getByTestId("play-button")).toHaveAttribute("title", "Play");
    await expect(page2.getByTestId("play-button")).toHaveAttribute("title", "Play");

    // Then - both timestamps should have advanced and be within 200ms of each other
    const time1 = await getTimestamp(page1);
    const time2 = await getTimestamp(page2);

    expect(time1).not.toBe(initialTime1);

    const ts1 = new Date(time1.replace(/\s+[A-Z]{2,4}$/, "")).getTime();
    const ts2 = new Date(time2.replace(/\s+[A-Z]{2,4}$/, "")).getTime();
    expect(Math.abs(ts1 - ts2)).toBeLessThan(200);
  } finally {
    await cleanup();
  }
});

/**
 * GIVEN two Lichtblick instances are open in separate tabs with the same MCAP file loaded
 * AND sync is disabled in both tabs (default state)
 * WHEN playback starts in the first tab
 * THEN the second tab should remain paused
 * AND the second tab's timestamp should not advance
 */
test("disabling sync keeps instances independent", async ({ browser }) => {
  const { page1, page2, cleanup } = await setupTwoSyncedPages(browser);

  try {
    // Verify sync is off by default
    await expect(page1.getByTestId("sync-toggle-button")).toHaveAttribute("aria-pressed", "false");
    await expect(page2.getByTestId("sync-toggle-button")).toHaveAttribute("aria-pressed", "false");

    const initialTime2 = await getTimestamp(page2);

    // When - start playback only in page1
    await page1.getByTestId("play-button").click();
    await expect(page1.getByTestId("play-button")).toHaveAttribute("title", "Pause");

    // Wait for page1 to play
    await page1.waitForTimeout(2000);

    // Then - page2 should still be paused (sync is off)
    await expect(page2.getByTestId("play-button")).toHaveAttribute("title", "Play");

    // And page2's timestamp should not have changed
    const time2AfterPage1Plays = await getTimestamp(page2);
    expect(time2AfterPage1Plays).toBe(initialTime2);
  } finally {
    await cleanup();
  }
});
