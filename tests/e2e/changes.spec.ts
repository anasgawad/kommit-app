// ============================================================
// Kommit — Phase 3 Changes View E2E Tests
// Manual tests: 1.2, 2.2, 4.1, 4.2, 4.3, 4.4
// ============================================================

import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

let electronApp: ElectronApplication
let window: Page
let tempDir: string

// ── helpers ──────────────────────────────────────────────────────────────────

/** Spawn a temp git repo with one untracked file `foo.txt` */
function createDirtyRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kommit-e2e-'))

  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test User',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test User',
    GIT_COMMITTER_EMAIL: 'test@example.com'
  }

  execSync('git init', { cwd: dir, env })
  execSync('git config user.email "test@example.com"', { cwd: dir, env })
  execSync('git config user.name "Test User"', { cwd: dir, env })

  // An initial commit so HEAD exists (needed by some git operations)
  writeFileSync(join(dir, 'README.md'), '# test repo\n')
  execSync('git add README.md', { cwd: dir, env })
  execSync('git commit -m "chore: initial commit"', { cwd: dir, env })

  // The file we'll stage + commit during the test
  writeFileSync(join(dir, 'foo.txt'), 'hello world\n')

  return dir
}

/** Open a repository in the app without a file dialog */
async function openRepo(page: Page, repoPath: string): Promise<void> {
  await page.evaluate(
    (path) => (window as unknown as { __openRepo: (p: string) => Promise<void> }).__openRepo(path),
    repoPath
  )
  // Wait until the repo is open — activity bar becomes visible
  await page.waitForSelector('[data-testid="activity-changes"]', { timeout: 10000 })
}

// ── lifecycle ────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js')]
  })
  window = await electronApp.firstWindow()
  // Let the renderer fully mount
  await window.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await electronApp.close()
})

test.beforeEach(async () => {
  tempDir = createDirtyRepo()
})

test.afterEach(async () => {
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // best effort
  }
})

// ── test 4.1: Basic Commit ───────────────────────────────────────────────────

test.describe('Phase 3 — Commit Form (manual test 4.1)', () => {
  test('stages a file, fills subject, commits, and shows new commit in history', async () => {
    // ── 1. Open repo ─────────────────────────────────────────────────────────
    await openRepo(window, tempDir)

    // ── 2. Switch to Changes view ────────────────────────────────────────────
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    // ── 3. Untracked file appears in the "Untracked Files" section ───────────
    const untrackedSection = window.locator('[data-testid="section-untracked"]')
    await expect(untrackedSection).toBeVisible()
    await expect(untrackedSection).toContainText('foo.txt')

    // ── 4. Stage the file ────────────────────────────────────────────────────
    // The stage button uses `hidden group-hover:flex` — dispatch click directly
    // to bypass Playwright's visibility checks
    await window.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')

    // ── 5. File moves to Staged section ─────────────────────────────────────
    const stagedSection = window.locator('[data-testid="section-staged"]')
    await expect(stagedSection).toBeVisible()
    await expect(stagedSection).toContainText('foo.txt')

    // Screenshot 1 — staged state
    await expect(window).toHaveScreenshot('01-file-staged.png', { maxDiffPixels: 1000 })

    // ── 6. Commit button is disabled with empty subject ───────────────────────
    const commitBtn = window.locator('[data-testid="commit-button"]')
    await expect(commitBtn).toBeDisabled()

    // ── 7. Fill commit subject ────────────────────────────────────────────────
    const subjectInput = window.locator('[data-testid="commit-subject-input"]')
    await subjectInput.fill('add foo')

    // Screenshot 2 — form ready to commit
    await expect(window).toHaveScreenshot('02-commit-ready.png', { maxDiffPixels: 1000 })

    // ── 8. Commit button is now enabled ──────────────────────────────────────
    await expect(commitBtn).toBeEnabled()

    // ── 9. Click commit ───────────────────────────────────────────────────────
    await commitBtn.click()

    // ── 10. Inputs are cleared after commit ───────────────────────────────────
    await expect(subjectInput).toHaveValue('')

    // ── 11. Working tree is clean ─────────────────────────────────────────────
    await expect(window.locator('[data-testid="working-tree-clean"]')).toBeVisible({
      timeout: 8000
    })

    // ── 12. Switch to History view ────────────────────────────────────────────
    await window.click('[data-testid="activity-history"]')

    // ── 13. New commit appears at the top of the graph ────────────────────────
    // The commit graph rows contain the commit subject text
    const firstCommitRow = window.locator('[data-testid^="commit-row"]').first()
    await expect(firstCommitRow).toContainText('add foo', { timeout: 8000 })

    // Screenshot 3 — new commit visible in graph
    await expect(window).toHaveScreenshot('03-commit-in-graph.png', { maxDiffPixels: 1000 })
  })
})

// ── test 4.2: Commit with Body ───────────────────────────────────────────────

test.describe('Phase 3 — Commit Form (manual test 4.2)', () => {
  test('commit with subject and body stores both in git log', async () => {
    await openRepo(window, tempDir)
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    // Stage file
    await window.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')
    await expect(window.locator('[data-testid="section-staged"]')).toContainText('foo.txt')

    // Fill subject + body
    await window.locator('[data-testid="commit-subject-input"]').fill('feat: add foo')
    await window.locator('[data-testid="commit-body-input"]').fill('This is the body\nSecond line')

    await window.locator('[data-testid="commit-button"]').click()

    // Inputs cleared
    await expect(window.locator('[data-testid="commit-subject-input"]')).toHaveValue('')
    await expect(window.locator('[data-testid="commit-body-input"]')).toHaveValue('')
    await expect(window.locator('[data-testid="working-tree-clean"]')).toBeVisible({
      timeout: 8000
    })

    // Verify git log contains subject and body
    const { execSync: exec } = await import('node:child_process')
    const logOutput = exec(`git log -1 --format="%B"`, { cwd: tempDir }).toString().trim()
    expect(logOutput).toContain('feat: add foo')
    expect(logOutput).toContain('This is the body')
  })
})

// ── test 4.3: 72-Character Subject Warning ───────────────────────────────────

test.describe('Phase 3 — Commit Form (manual test 4.3)', () => {
  test('shows warning when subject exceeds 72 characters', async () => {
    await openRepo(window, tempDir)
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    const subjectInput = window.locator('[data-testid="commit-subject-input"]')
    const warning = window.locator('[data-testid="commit-subject-warning"]')

    // No warning with short subject
    await subjectInput.fill('short subject')
    await expect(warning).not.toBeVisible()

    // Warning appears with >72 chars
    const longSubject = 'a'.repeat(73)
    await subjectInput.fill(longSubject)
    await expect(warning).toBeVisible()
    await expect(warning).toContainText('72')

    // Screenshot — warning visible
    await expect(window).toHaveScreenshot('04-subject-warning.png', { maxDiffPixels: 1000 })

    // Can still commit (warning, not error) — stage a file first
    await window.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')
    await expect(window.locator('[data-testid="commit-button"]')).toBeEnabled()
  })
})

// ── test 4.4: Ctrl+Enter Shortcut ────────────────────────────────────────────

test.describe('Phase 3 — Commit Form (manual test 4.4)', () => {
  test('Ctrl+Enter in subject input submits the commit', async () => {
    await openRepo(window, tempDir)
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    // Stage file
    await window.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')
    await expect(window.locator('[data-testid="section-staged"]')).toContainText('foo.txt')

    // Fill subject and press Ctrl+Enter
    const subjectInput = window.locator('[data-testid="commit-subject-input"]')
    await subjectInput.fill('chore: keyboard commit')
    await subjectInput.press('Control+Enter')

    // Commit should have gone through
    await expect(window.locator('[data-testid="working-tree-clean"]')).toBeVisible({
      timeout: 8000
    })
    await expect(subjectInput).toHaveValue('')
  })

  test('Ctrl+Enter in body textarea submits the commit', async () => {
    await openRepo(window, tempDir)
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    // Stage file
    await window.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')

    // Fill subject then body, press Ctrl+Enter from body
    await window.locator('[data-testid="commit-subject-input"]').fill('chore: body keyboard commit')
    const bodyInput = window.locator('[data-testid="commit-body-input"]')
    await bodyInput.fill('some description')
    await bodyInput.press('Control+Enter')

    await expect(window.locator('[data-testid="working-tree-clean"]')).toBeVisible({
      timeout: 8000
    })
  })
})

// ── test 2.2: Stage / Unstage ────────────────────────────────────────────────

test.describe('Phase 3 — Working Tree (manual test 2.2)', () => {
  test('stages and unstages individual files', async () => {
    await openRepo(window, tempDir)
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    // File starts untracked
    await expect(window.locator('[data-testid="section-untracked"]')).toContainText('foo.txt')

    // Stage it
    await window.locator('[data-testid="stage-btn-foo.txt"]').dispatchEvent('click')
    await expect(window.locator('[data-testid="section-staged"]')).toContainText('foo.txt')

    // Unstage it
    await window.locator('[data-testid="unstage-btn-foo.txt"]').dispatchEvent('click')

    // Returns to untracked section
    await expect(window.locator('[data-testid="section-untracked"]')).toContainText('foo.txt', {
      timeout: 8000
    })
    // section-staged is gone from the DOM when empty
    await expect(window.locator('[data-testid="section-staged"]')).toHaveCount(0)
  })
})

// ── test 1.2: View Switching ─────────────────────────────────────────────────

test.describe('Phase 3 — Activity Bar (manual test 1.2)', () => {
  test('switches between History and Changes views', async () => {
    await openRepo(window, tempDir)

    // Ensure we start in History view (previous test may have left us in Changes)
    await window.click('[data-testid="activity-history"]')
    await expect(window.locator('[data-testid^="commit-row"]').first()).toBeVisible({
      timeout: 10000
    })

    // Switch to Changes view
    await window.click('[data-testid="activity-changes"]')
    await window.waitForSelector('[data-testid="section-untracked"]', { timeout: 10000 })

    // Changes view shows working tree
    await expect(window.locator('[data-testid="commit-subject-input"]')).toBeVisible()

    // Switch back to History view
    await window.click('[data-testid="activity-history"]')

    // Commit graph is visible again
    await expect(window.locator('[data-testid^="commit-row"]').first()).toBeVisible({
      timeout: 10000
    })

    // Screenshot — history view active
    await expect(window).toHaveScreenshot('05-history-view.png', { maxDiffPixels: 1000 })
  })
})
