# End-to-End (E2E) Testing for Lichtblick

This directory contains all end-to-end (E2E) tests using [Playwright](https://playwright.dev/). The tests are organized and scoped by platform: **web** and **desktop** (Electron).

## 📦 How to Run

```bash
# Build desktop packages
yarn desktop:build:dev
```

```bash
# Install Playwright
yarn playwright install
```

### Web

```bash
# Run all web tests
yarn test:e2e:web

# Run in debug mode (step-by-step)
yarn test:e2e:web:debug

# View latest web test report
yarn test:e2e:web:report
```

### Desktop (Electron)

```bash
# Run all desktop tests
yarn test:e2e:desktop

# Run in debug mode
yarn test:e2e:desktop:debug

# View latest desktop test report
yarn test:e2e:desktop:report

# Run desktop tests in CI (headless mode enforced in Electron)
yarn test:e2e:desktop:ci

# Generate test summary with timings
yarn test:e2e:summary

# Run a specific test when developing (filename: uninstall-extension.desktop.spec.ts)
yarn test:e2e:desktop:debug uninstall-extens
```

## 📊 Test Performance Analysis

After running tests, you can generate a summary report showing test execution times:

```bash
# Run tests and generate summary
yarn test:e2e:desktop
yarn test:e2e:summary
```

The summary includes:

- **Overall statistics** (total tests, passed/failed/skipped)
- **Top 10 slowest tests** to identify performance bottlenecks
- **Failed tests list** with retry information
- **Total and average execution times**

This helps identify which tests are taking too long and may need optimization.

## 🧪 Filename Pattern

Test files follow the pattern:

```ts
{feature-name}.{platform}.spec.ts
```

**Example:**

```
install-multiple-extensions.web.spec.ts;
```

## 🗂 Directory Structure

```text
/e2e
  ├── tests/                         # E2E tests
  │   ├── desktop/                   # Desktop e2e tests
  │   │   ├── open-files/            # Tests for open files
  │   │   │   ├── open-mcap-via-ui.desktop.spec.ts
  │   │   │   └── ...desktop.spec.ts
  │   │   ├── sidebar/               # Tests for right and left sidebars
  │   │   ├── layout/                # Tests for layouts
  │   │   ├── extension/             # Tests for extension
  │   │   ├── panel/                 # Tests for panels
  │   │   ├── utils/                 # Shared functions
  │   │   ├── desktop-setup.ts       # Pre script to setup desktop tests
  │   │   ├── desktop-teardown.ts    # Pre script to cleanup desktop tests
  │   │   └── playwright.config.ts   # Desktop Playwright configuration
  │   └── web/                       # Web e2e tests
  │       ├── open-files/            # Tests for open files via URL
  │       │   ├── open-mcap-via-url.web.spec.ts
  │       │   └── ...web.spec.ts
  │       ├── utils/                 # Shared functions
  │       ├── web-setup.ts           # Pre script to setup web tests
  │       ├── web-teardown.ts        # Pre script to cleanup web tests
  │       └── playwright.config.ts   # Web Playwright configuration
  ├── fixtures/                      # Fixtures for testing (e.g. data mocks)
  ├── helpers/                       # Generic functions useful for testing
  ├── reports/                       # Automatically generated test reports
  ├── global-setup.ts                # Global setup before testing
  └── global-teardown.ts             # Cleanup after testing (clear DB, stored files, etc.)
```

---

## 🤖 AI-Assisted Test Development with Playwright MCP

This project includes a [Playwright MCP](https://github.com/microsoft/playwright-mcp) server configured in `.vscode/mcp.json`. It enables AI agents (such as GitHub Copilot in Agent mode) to control a real browser and interact with the running app while you write tests.

### Prerequisites

- VS Code 1.99+
- GitHub Copilot extension with Agent mode enabled
- Google Chrome installed

### How to use

1. Start the web dev server:

   ```bash
   yarn web:serve
   ```

2. Open Copilot chat in **Agent mode** (`@agent` or the agent icon in the chat panel).

3. Ask the agent to interact with the app, for example:
   - _"Navigate to http://localhost:8080 and take a snapshot"_
   - _"Close the startup dialog and take a screenshot"_
   - _"Click the play button and generate the Playwright TypeScript code for it"_
   - _"Assert that the element with testId 'play-button' is visible"_

### What it provides

| Capability              | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| Browser navigation      | Navigate to URLs, go back/forward                                               |
| Accessibility snapshots | Read the full accessibility tree of the current page                            |
| Screenshots             | Capture viewport or full-page images                                            |
| Interactions            | Click, fill, hover, press keys, select options                                  |
| Code generation         | Generates TypeScript Playwright code from interactions (`--codegen typescript`) |
| Test assertions         | Assert element visibility, text content, attribute values (`--caps testing`)    |

### Notes

- The MCP server runs in **isolated mode** — each session starts with a clean browser profile, matching the isolation used in the test suite.
- The server uses **Chrome** to match the `Desktop Chrome` device configured in `e2e/tests/web/playwright.config.ts`.
- Desktop (Electron) tests are **not** covered by Playwright MCP — the `electronApp` custom fixture handles those.
- Generated code snippets appear inline in Copilot chat. Copy them directly into your spec files.

---

> For questions or improvements, contact the QA team or refer to the [Playwright docs](https://playwright.dev/docs/intro).
