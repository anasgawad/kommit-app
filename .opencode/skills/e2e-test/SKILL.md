# Skill: Kommit E2E Testing

Convert manual test checklist items from `Manual-Tests-Phase3.md` (and future phase files) into Playwright E2E tests.

## Context

- App: Electron + React. Built output: `out/main/index.js`
- Always run `npm run build` before adding/running E2E tests
- E2E config: `playwright.config.ts` — `testDir=./tests/e2e`, 1 worker, html reporter

## Key Patterns

### Launch app

```ts
import { _electron as electron } from '@playwright/test'
const electronApp = await electron.launch({ args: [join(__dirname, '../../out/main/index.js')] })
const window = await electronApp.firstWindow()
await window.waitForLoadState('domcontentloaded')
```

### Open a repo without a file dialog

```ts
await page.evaluate(
  (path) => (window as unknown as { __openRepo: (p: string) => Promise<void> }).__openRepo(path),
  repoPath
)
await page.waitForSelector('[data-testid="activity-changes"]', { timeout: 10000 })
```

### Stage hidden buttons (bypass CSS visibility)

```ts
await page.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')
```

### Screenshots

```ts
await expect(window).toHaveScreenshot('descriptive-name.png', { maxDiffPixels: 1000 })
```

Use `maxDiffPixels: 1000` to tolerate relative date rendering variance.

## Available data-testids

| Selector                 | Location                                                  |
| ------------------------ | --------------------------------------------------------- |
| `activity-history`       | ActivityBar — history button                              |
| `activity-changes`       | ActivityBar — changes button                              |
| `section-staged`         | WorkingTree staged section                                |
| `section-unstaged`       | WorkingTree unstaged section                              |
| `section-untracked`      | WorkingTree untracked section                             |
| `section-conflicted`     | WorkingTree conflicted section                            |
| `file-row-{path}`        | Individual file row                                       |
| `stage-btn-{path}`       | Stage button (hidden until hover — use dispatchEvent)     |
| `unstage-btn-{path}`     | Unstage button (hidden until hover — use dispatchEvent)   |
| `discard-btn-{path}`     | Discard button (hidden until hover — use dispatchEvent)   |
| `working-tree-clean`     | Shown when nothing staged/modified                        |
| `commit-subject-input`   | Commit form subject                                       |
| `commit-body-input`      | Commit form body                                          |
| `commit-button`          | Commit/Amend button                                       |
| `commit-amend-checkbox`  | Amend last commit checkbox                                |
| `commit-subject-warning` | Subject > 72 chars warning                                |
| `commit-error`           | Commit error message                                      |
| `commit-row-{hash}`      | Commit graph row (virtualized — only visible rows in DOM) |

## File locations

- Tests: `tests/e2e/changes.spec.ts` (primary), `tests/e2e/graph.spec.ts`, `tests/e2e/repo.spec.ts`
- Snapshots: auto-saved alongside spec file (`tests/e2e/<spec>-snapshots/`)
- Manual checklist: `Manual-Tests-Phase3.md`

## Workflow

1. Read the relevant section of `Manual-Tests-Phase3.md`
2. Create a temp git repo with the required state (`mkdtempSync`, `execSync('git ...')`)
3. Open it with `__openRepo`
4. Automate the steps described in the checklist item
5. Assert expected UI state with `expect(locator).toBeVisible()` / `toContainText()` / `toBeEnabled()` / `toBeDisabled()`
6. Add `toHaveScreenshot()` at key moments
7. Run `npm run test:e2e` to verify the test passes and baselines are created
