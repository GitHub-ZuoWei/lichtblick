// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { Page } from "@playwright/test";

import { test, expect } from "../../../fixtures/electron";

/**
 * Intercepts blob downloads triggered by `<a download>` clicks in Electron,
 * where the Playwright `download` event does not fire. Must be called before
 * the action that triggers the download.
 */
async function interceptBlobDownload(
  page: Page,
): Promise<() => Promise<{ fileName: string; content: string } | undefined>> {
  await page.evaluate(() => {
    (window as Record<string, unknown>).__capturedDownload = undefined;

    // Capture blob content at URL creation time since fetch(blob:file://…) fails in Electron
    const blobStore = new Map<string, Blob>();
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (blob: Blob) {
      const url = origCreateObjectURL(blob);
      blobStore.set(url, blob);
      return url;
    };

    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const href = this.getAttribute("href");
      const download = this.getAttribute("download");
      if (href && download && blobStore.has(href)) {
        const blob = blobStore.get(href)!;
        blob.text().then((text) => {
          (window as Record<string, unknown>).__capturedDownload = {
            fileName: download,
            content: text,
          };
        });
        return;
      }
      return origClick.call(this);
    };
  });

  return async () => {
    // Wait briefly for the async blob.text() to resolve
    await page.waitForFunction(
      () => (window as Record<string, unknown>).__capturedDownload != undefined,
      undefined,
      { timeout: 5000 },
    );
    return await page.evaluate(() => {
      return (window as Record<string, unknown>).__capturedDownload as
        | { fileName: string; content: string }
        | undefined;
    });
  };
}

/**
 * GIVEN the user is on the Layouts tab
 * AND the "Default" layout is currently active
 * WHEN the user right-clicks "Default" and selects "Export…"
 * THEN the exported file is named "Default.json"
 * AND its content is valid JSON with a "configById" property
 */
test("should download a JSON file when exporting the active layout", async ({ mainWindow }) => {
  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  // When
  const getDownload = await interceptBlobDownload(mainWindow);
  await mainWindow.getByRole("button", { name: "Default" }).click({ button: "right" });
  await mainWindow.getByTestId("export-layout").click();
  const download = await getDownload();

  // Then
  expect(download).toBeDefined();
  expect(download!.fileName).toBe("Default.json");

  const parsed: unknown = JSON.parse(download!.content);
  expect(parsed).toHaveProperty("configById");
});

/**
 * GIVEN the user has renamed the "Default" layout to "My Export Test"
 * WHEN the user right-clicks the renamed layout and selects "Export…"
 * THEN the exported file is named "My Export Test.json"
 */
test("should use the current layout name as the exported file name", async ({ mainWindow }) => {
  const RENAMED = "My Export Test";

  // Given
  await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
  await mainWindow.getByTestId("layouts-left").click();

  await mainWindow.getByRole("button", { name: "Default" }).click({ button: "right" });
  await mainWindow.getByRole("menuitem", { name: "Rename" }).click();
  const renameInput = mainWindow.getByTestId("layout-list-item").locator("input[type=text]");
  await renameInput.fill(RENAMED);
  await renameInput.press("Enter");
  await expect(mainWindow.getByRole("button", { name: RENAMED })).toBeVisible();

  // When
  const getDownload = await interceptBlobDownload(mainWindow);
  await mainWindow.getByRole("button", { name: RENAMED }).click({ button: "right" });
  await mainWindow.getByTestId("export-layout").click();
  const download = await getDownload();

  // Then
  expect(download).toBeDefined();
  expect(download!.fileName).toBe(`${RENAMED}.json`);
});
