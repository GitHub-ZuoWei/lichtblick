// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { Locator, Page } from "playwright";

import { changeToEpochFormat } from "../../../fixtures/change-to-epoch-format";
import { test, expect } from "../../../fixtures/electron";
import { loadFiles } from "../../../fixtures/load-files";

const MCAP_FILENAME = "example.mcap";

function getPlaybackElements(mainWindow: Page): {
  playButton: Locator;
  loopButton: Locator;
  timestamp: Locator;
  slider: Locator;
} {
  return {
    playButton: mainWindow.getByTestId("play-button"),
    loopButton: mainWindow.getByTestId("loop-playback-button"),
    timestamp: mainWindow.getByTestId("PlaybackTime-text").locator("input"),
    slider: mainWindow.getByTestId("playback-slider"),
  };
}

async function seekToFraction(slider: Locator, mainWindow: Page, fraction: number): Promise<void> {
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error("Playback slider bounding box not found");
  }
  const x = box.x + box.width * fraction;
  const y = box.y + box.height / 2;
  await mainWindow.mouse.click(x, y);
}

/**
 * GIVEN a .mcap file is loaded
 * WHEN the loop playback button is clicked
 * THEN the button should be active (aria-pressed = true)
 * WHEN the loop playback button is clicked again
 * THEN the button should be inactive (aria-pressed = false)
 */
test("loop playback button toggles on and off", async ({ mainWindow }) => {
  // Given
  await loadFiles({ mainWindow, filenames: MCAP_FILENAME });

  const { loopButton } = getPlaybackElements(mainWindow);

  // Then - initial state is off
  await expect(loopButton).toHaveAttribute("aria-pressed", "false");

  // When - enable loop
  await loopButton.click();

  // Then - loop is on
  await expect(loopButton).toHaveAttribute("aria-pressed", "true");

  // When - disable loop
  await loopButton.click();

  // Then - loop is off again
  await expect(loopButton).toHaveAttribute("aria-pressed", "false");
});

/**
 * GIVEN a .mcap file is loaded
 * AND loop playback is enabled
 * AND the playback position is seeked to near the end of the file
 * WHEN playback starts and reaches the end
 * THEN playback should restart from the beginning (timestamp resets to a value
 *      lower than the near-end position it started from)
 */
test("loop playback restarts from beginning after reaching end of file", async ({ mainWindow }) => {
  // Given
  await loadFiles({ mainWindow, filenames: MCAP_FILENAME });
  await changeToEpochFormat(mainWindow);

  const { playButton, loopButton, timestamp, slider } = getPlaybackElements(mainWindow);

  // Enable loop playback
  await loopButton.click();
  await expect(loopButton).toHaveAttribute("aria-pressed", "true");

  // Seek to 98% of the file to get near the end
  await seekToFraction(slider, mainWindow, 0.98);
  await mainWindow.waitForTimeout(300);
  const nearEndTime = Number(await timestamp.inputValue());

  // When - start playback and wait for it to loop back
  await playButton.click();
  await expect(playButton).toHaveAttribute("title", "Pause");

  // Wait enough time for the file to reach the end and loop to the beginning
  await mainWindow.waitForTimeout(2500);

  // Pause and capture the post-loop timestamp
  await playButton.click();
  await expect(playButton).toHaveAttribute("title", "Play");
  const afterLoopTime = Number(await timestamp.inputValue());

  // Then - timestamp should have wrapped back, ending up before the near-end position
  expect(afterLoopTime).toBeLessThan(nearEndTime);
});

/**
 * GIVEN a .mcap file is loaded
 * AND the playback position is seeked to near the end of the file
 * WHEN loop playback is disabled and playback starts
 * THEN playback should stop at the end and not restart
 */
test("playback stops at end of file when loop is disabled", async ({ mainWindow }) => {
  // Given
  await loadFiles({ mainWindow, filenames: MCAP_FILENAME });
  await changeToEpochFormat(mainWindow);

  const { playButton, loopButton, timestamp, slider } = getPlaybackElements(mainWindow);

  // Ensure loop is disabled
  await expect(loopButton).toHaveAttribute("aria-pressed", "false");

  // Seek to 98% of the file
  await seekToFraction(slider, mainWindow, 0.98);
  await mainWindow.waitForTimeout(300);
  const nearEndTime = Number(await timestamp.inputValue());

  // When - start playback and wait for it to reach the end
  await playButton.click();
  await expect(playButton).toHaveAttribute("title", "Pause");
  await mainWindow.waitForTimeout(2500);

  // Then - playback should have stopped (button title returns to "Play")
  await expect(playButton).toHaveAttribute("title", "Play");

  // And timestamp should be at or past the near-end position (no loop happened)
  const stoppedTime = Number(await timestamp.inputValue());
  expect(stoppedTime).toBeGreaterThanOrEqual(nearEndTime);
});
