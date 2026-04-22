---
name: e2e-playwright-mcp
description: Domain knowledge for Playwright MCP-assisted E2E test development in Lichtblick. Covers test architecture, fixture reference, selector strategy, MCP usage, and source instrumentation patterns.
---

# E2E Testing with Playwright MCP

This skill covers writing E2E tests for Lichtblick using Playwright, with AI-assisted exploration
via the Playwright MCP server configured in `.vscode/mcp.json`.

Follow the **test-conventions** skill for GWT pattern and core quality rules.

---

## Test Architecture

### Two Platforms

| Platform | Runner | Base URL / Entry | Config |
| --- | --- | --- | --- |
| **Web** | Chromium | `http://localhost:8080` (via `yarn web:serve`) | `e2e/tests/web/playwright.config.ts` |
| **Desktop** | Electron | Custom `electronApp` fixture | `e2e/tests/desktop/playwright.config.ts` |

**Primary focus: desktop.** Write web tests only when the behavior is web-specific (e.g., URL-based data loading, multi-tab `BroadcastChannel` sync).

### File Placement

```
e2e/tests/
  desktop/
    open-files/
    sidebar/
    layout/
    extension/
    panel/
    player/
    settings/
    topics/
    variables/
    menu/
    remote-data/
  web/
    open-files/
```

Group new tests under the most relevant subdirectory. Create a new subdirectory if no existing one fits.

### Filename Pattern

```
{feature-name}.{platform}.spec.ts
```

Examples: `loop-playback.desktop.spec.ts`, `sync-playback.web.spec.ts`

---

## Fixtures Reference

### Desktop (`e2e/fixtures/electron.ts`)

```typescript
import { test, expect } from "../../../fixtures/electron";
// Provides: { mainWindow }  — a Playwright Page for the Electron renderer
```

### Web (`@playwright/test`)

```typescript
import { test, expect } from "@playwright/test";
// Standard Playwright test with Chromium
```

### Helper Fixtures

```typescript
import { loadFiles } from "../../../fixtures/load-files";
// loadFiles({ mainWindow, filenames: "example.mcap" })
// loadFiles({ mainWindow, filenames: ["a.mcap", "b.mcap"] })

import { changeToEpochFormat } from "../../../fixtures/change-to-epoch-format";
// changeToEpochFormat(mainWindow)
// Converts timestamp display to epoch seconds for stable numeric assertions

import { launchWebsocket } from "../../../fixtures/launch-websocket";
// launchWebsocket() — starts a local WebSocket server for remote data tests
```

---

## Selector Strategy

### Priority Order

1. **`data-testid`** — most stable, preferred for interactive controls
   ```typescript
   mainWindow.getByTestId("play-button")
   mainWindow.getByTestId("loop-playback-button")
   ```

2. **`getByRole`** — semantic and accessible, preferred for menus, dialogs, buttons
   ```typescript
   mainWindow.getByRole("menuitem", { name: "Save changes" })
   mainWindow.getByRole("button", { name: "Close" })
   mainWindow.getByRole("listitem").filter({ hasText: "Default" })
   ```

3. **`getByText`** — for labels that are not interactive elements
   ```typescript
   mainWindow.getByText("User Scripts panel")
   ```

4. **`aria-pressed`** — for toggle button state assertions
   ```typescript
   await expect(button).toHaveAttribute("aria-pressed", "true")
   ```

### Avoid

- MUI class names (e.g., `.MuiButton-root`) — unstable across builds
- CSS selectors with internal component structure
- `nth(0)` without context — be specific about which element you mean

---

## Common Patterns

### Dismiss the startup dialog

```typescript
await mainWindow.getByTestId("DataSourceDialog").getByTestId("CloseIcon").click();
```

### Open the Layouts left sidebar

```typescript
await mainWindow.getByTestId("layouts-left").click();
```

### Open the Panel sidebar

```typescript
await mainWindow.getByTestId("panel-left").click();
```

### Load a file and start playback

```typescript
await loadFiles({ mainWindow, filenames: "example.mcap" });
await changeToEpochFormat(mainWindow);
const playButton = mainWindow.getByTestId("play-button");
await playButton.click();
```

### Seek to a position via the slider

```typescript
const slider = mainWindow.getByRole("slider");
await slider.focus();
await slider.evaluate((el, value) => {
    (el as HTMLInputElement).value = String(value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
}, targetValue);
```

### Context menus (right-click)

```typescript
await item.getByRole("button", { name: "Layout name" }).click({ button: "right" });
await expect(mainWindow.getByRole("menuitem", { name: "Rename" })).toBeVisible();
await mainWindow.keyboard.press("Escape"); // dismiss after assertion
```

### Multi-tab BroadcastChannel tests (web only)

```typescript
// Use browser.newContext() so both pages share the same BroadcastChannel origin
const context = await browser.newContext();
const page1 = await context.newPage();
const page2 = await context.newPage();
await page1.goto("http://localhost:8080");
await page2.goto("http://localhost:8080");
// ...
await context.close();
```

---

## Instrumentation: Adding `data-testid` to Source Components

When no stable selector exists for an interactive element, add a `data-testid` to the source component.

### Rules

- Add `data-testid` only when: no existing `data-testid`, `getByRole` is ambiguous, and MUI class names are the only alternative.
- Place the attribute on the outermost interactive element (the actual `<button>`, `<input>`, etc.).
- For toggle buttons, also add `aria-pressed={booleanState}` for state assertions.
- **Do not** add `data-testid` to wrapper `<div>` elements — target the element that receives focus/click.

### Example — IconButton with toggle state

```tsx
<HoverableIconButton
    data-testid="loop-playback-button"
    aria-pressed={repeat}
    onClick={toggleRepeat}
    // ... other props
/>
```

### Example — Regular Button with on/off state

```tsx
<Button
    data-testid="sync-toggle-button"
    aria-pressed={syncInstances}
    onClick={toggleSync}
>
    Sync
</Button>
```

---

## Playwright MCP Usage

The MCP server is configured in `.vscode/mcp.json` with `--isolated`, `--browser chrome`, and `--caps testing`.

### Workflow

1. **Start the dev server** — `yarn web:serve` (for web tests) or build desktop separately
2. **Open Copilot in Agent mode**
3. **Use MCP to explore the UI**:
   - Navigate to the target URL or state
   - Take accessibility snapshots to discover selectors
   - Interact with elements to verify behavior
   - Use `--caps testing` assertions to verify visibility
4. **Extract stable selectors** from the snapshot (prefer `data-testid` and role-based)
5. **Write the test** using verified selectors
6. **Run the test** to confirm it passes

### Key MCP Limitations

- MCP controls the **web** app (Chrome) — it cannot drive the Electron desktop app
- Desktop test selectors must be verified by reading existing desktop test files and source components
- MCP `browser_run_code` does not have access to Node.js globals (`process`, `require`) — use absolute paths or avoid file operations in code snippets
- Screenshots and snapshots are saved under `.playwright-mcp/` (gitignored)

---

## Test Commands

```bash
yarn test:e2e:web                          # All web E2E tests
yarn test:e2e:web:debug                    # Debug mode (headed)
yarn test:e2e:desktop                      # All desktop E2E tests
yarn test:e2e:desktop:debug <filter>       # Debug a single test by filename fragment
yarn test:e2e:desktop:ci                   # Headless CI mode
```
