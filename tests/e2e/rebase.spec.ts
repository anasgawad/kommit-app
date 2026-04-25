// ============================================================
// Kommit — Interactive Rebase E2E Tests
// Covers: start, squash, reword, drop, abort, conflict+continue,
//         conflict+skip, and rebase status display
// ============================================================

import { _electron as electron, test, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import type { RebaseAction, RebaseResult, RebaseStatus } from '../../src/shared/types'

// ---------------------------------------------------------------------------
// Types for window.api access inside page.evaluate()
// ---------------------------------------------------------------------------

interface WindowApi {
  git: {
    rebaseInteractive: (repoPath: string, onto: string, actions: RebaseAction[]) => Promise<RebaseResult>
    rebaseContinue: (repoPath: string) => Promise<void>
    rebaseAbort: (repoPath: string) => Promise<void>
    rebaseSkip: (repoPath: string) => Promise<void>
    rebaseStatus: (repoPath: string) => Promise<RebaseStatus | null>
    log: (repoPath: string) => Promise<Array<{ hash: string; subject: string }>>
  }
  __openRepo: (path: string) => Promise<void>
}

declare const window: Window & WindowApi

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const gitEnv = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@test.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@test.com'
}

// ---------------------------------------------------------------------------
// Shared app instance (one Electron process for all tests)
// ---------------------------------------------------------------------------

let electronApp: ElectronApplication
let page: Page

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js')]
  })
  page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(
    () => typeof (window as unknown as WindowApi).__openRepo === 'function',
    { timeout: 10000 }
  )
})

test.afterAll(async () => {
  await electronApp.close()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh git repo with three real file-based commits and returns its path.
 *   commit A (oldest): adds file.txt "version 1"
 *   commit B:          adds file.txt "version 2"
 *   commit C (HEAD):   adds file.txt "version 3"
 */
function createRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kommit-rebase-'))
  const git = (cmd: string) => execSync(cmd, { cwd: dir, env: { ...process.env, ...gitEnv } })

  git('git init')
  git('git config user.email "test@test.com"')
  git('git config user.name "Test User"')

  writeFileSync(join(dir, 'file.txt'), 'version 1\n')
  git('git add .')
  git('git commit -m "commit A: version 1"')

  writeFileSync(join(dir, 'file.txt'), 'version 2\n')
  git('git add .')
  git('git commit -m "commit B: version 2"')

  writeFileSync(join(dir, 'file.txt'), 'version 3\n')
  git('git add .')
  git('git commit -m "commit C: version 3"')

  return dir
}

/**
 * Opens the repo in the Electron app and waits for the commit graph to be ready.
 */
async function openRepo(repoPath: string) {
  await page.evaluate(
    (path) => (window as unknown as WindowApi).__openRepo(path),
    repoPath
  )
  await page.waitForSelector('[placeholder="Search commits..."]', { timeout: 10000 })
  await page.waitForTimeout(300)
}

/**
 * Navigates to the rebase panel via the activity bar and waits for it to appear.
 */
async function openRebasePanel() {
  await page.locator('[data-testid="activity-rebase"]').click()
  await expect(page.locator('[data-testid="rebase-panel"]')).toBeVisible({ timeout: 5000 })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Interactive Rebase', () => {
  let tempDir: string

  test.beforeEach(async () => {
    tempDir = createRepo()
    await openRepo(tempDir)
  })

  test.afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  })

  // -------------------------------------------------------------------------
  // 1. Start interactive rebase
  // -------------------------------------------------------------------------
  test('should start interactive rebase', async () => {
    await openRebasePanel()

    // The panel must list the commits that are candidates for rebase
    const commitRows = page.locator('[data-testid^="rebase-commit-row-"]')
    await expect(commitRows.first()).toBeVisible({ timeout: 5000 })

    // All three commits should be represented
    const count = await commitRows.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Subjects should be visible
    await expect(page.locator('text=commit B: version 2')).toBeVisible()
    await expect(page.locator('text=commit C: version 3')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 2. Squash two commits
  // -------------------------------------------------------------------------
  test('should squash two commits via drag', async () => {
    const logBefore = execSync('git log --oneline', { cwd: tempDir }).toString().trim().split('\n')
    expect(logBefore).toHaveLength(3)

    await openRebasePanel()

    // Change the action for commit B to "squash" via its action dropdown
    const commitBRow = page.locator('[data-testid^="rebase-commit-row-"]').nth(1) // commit B (index from bottom, B is 2nd)
    const actionSelect = commitBRow.locator('[data-testid="rebase-action-select"]')
    await actionSelect.selectOption('squash')

    // Start the rebase
    await page.locator('[data-testid="rebase-start-btn"]').click()

    // Wait for the rebase to complete (panel should close or show success)
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="rebase-panel"]') ||
            !!document.querySelector('[data-testid="rebase-success"]'),
      { timeout: 15000 }
    )

    // The commit count should have decreased by 1 (squash merges two into one)
    const logAfter = execSync('git log --oneline', { cwd: tempDir }).toString().trim().split('\n').filter(Boolean)
    expect(logAfter.length).toBeLessThan(logBefore.length)
  })

  // -------------------------------------------------------------------------
  // 3. Reword commit message
  // -------------------------------------------------------------------------
  test('should reword commit message', async () => {
    await openRebasePanel()

    // Set commit C's action to "reword"
    const commitCRow = page.locator('[data-testid^="rebase-commit-row-"]').first() // HEAD = commit C
    const actionSelect = commitCRow.locator('[data-testid="rebase-action-select"]')
    await actionSelect.selectOption('reword')

    // Start the rebase — should pause for reword input
    await page.locator('[data-testid="rebase-start-btn"]').click()

    // A reword dialog / input field should appear
    const rewordInput = page.locator('[data-testid="rebase-reword-input"]')
    await expect(rewordInput).toBeVisible({ timeout: 10000 })

    // Clear and type the new message
    await rewordInput.fill('commit C: reworded message')

    // Confirm the reword
    await page.locator('[data-testid="rebase-reword-confirm-btn"]').click()

    // Wait for completion
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="rebase-reword-input"]'),
      { timeout: 10000 }
    )

    // Verify via git CLI
    const lastSubject = execSync('git log --format="%s" -1', { cwd: tempDir }).toString().trim()
    expect(lastSubject).toBe('commit C: reworded message')
  })

  // -------------------------------------------------------------------------
  // 4. Drop a commit
  // -------------------------------------------------------------------------
  test('should drop a commit', async () => {
    await openRebasePanel()

    // Set commit B's action to "drop"
    const commitBRow = page.locator('[data-testid^="rebase-commit-row-"]').nth(1)
    const actionSelect = commitBRow.locator('[data-testid="rebase-action-select"]')
    await actionSelect.selectOption('drop')

    // Start the rebase
    await page.locator('[data-testid="rebase-start-btn"]').click()

    // Wait for rebase to complete
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="rebase-panel"]') ||
            !!document.querySelector('[data-testid="rebase-success"]'),
      { timeout: 15000 }
    )

    // Commit B should no longer appear in git log
    const log = execSync('git log --format="%s"', { cwd: tempDir }).toString()
    expect(log).not.toContain('commit B: version 2')
    // Commit A and C must remain
    expect(log).toContain('commit A: version 1')
    expect(log).toContain('commit C: version 3')
  })

  // -------------------------------------------------------------------------
  // 5. Abort rebase in progress
  // -------------------------------------------------------------------------
  test('should abort rebase in progress', async () => {
    // Set up a conflict: create a branch from commit A, then rebase onto it
    // so that commit B conflicts with the branch tip.
    const git = (cmd: string) =>
      execSync(cmd, { cwd: tempDir, env: { ...process.env, ...gitEnv } })

    // Grab the hash of commit A (the root)
    const commitAHash = execSync('git log --format="%H" --reverse', { cwd: tempDir })
      .toString()
      .trim()
      .split('\n')[0]

    // Create a competing branch from commit A with a conflicting change
    git(`git checkout -b conflict-branch ${commitAHash}`)
    writeFileSync(join(tempDir, 'file.txt'), 'conflict version\n')
    git('git add .')
    git('git commit -m "conflict-branch commit"')
    git('git checkout main || git checkout master')

    // Get hashes for rebase (rebase commits B and C onto conflict-branch)
    const commits = execSync('git log --format="%H %s" main || git log --format="%H %s" master', {
      cwd: tempDir
    })
      .toString()
      .trim()
      .split('\n')

    // Trigger interactive rebase via IPC to put the repo in a conflict state
    const actions: RebaseAction[] = commits
      .filter((line) => !line.includes('commit A'))
      .map((line) => {
        const [hash, ...subjectParts] = line.split(' ')
        return { action: 'pick' as const, hash, subject: subjectParts.join(' ') }
      })

    // Start rebase via IPC — expected to stop on conflict
    await page.evaluate(
      async ([path, branch, acts]) => {
        const api = (window as unknown as { api: WindowApi }).api
        try {
          await api.git.rebaseInteractive(path as string, branch as string, acts as RebaseAction[])
        } catch {
          // conflict is expected — rebase will be in-progress
        }
      },
      [tempDir, 'conflict-branch', actions]
    )

    // Navigate to rebase panel — it should show in-progress controls
    await page.locator('[data-testid="activity-rebase"]').click()
    const panel = page.locator('[data-testid="rebase-panel"]')
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Abort/Continue/Skip buttons must be visible when rebase is in progress
    await expect(page.locator('[data-testid="rebase-abort-btn"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="rebase-continue-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="rebase-skip-btn"]')).toBeVisible()

    // Click Abort
    await page.locator('[data-testid="rebase-abort-btn"]').click()

    // Wait for abort to finish (panel closes or reverts to idle state)
    await page.waitForFunction(
      () => {
        const abortBtn = document.querySelector('[data-testid="rebase-abort-btn"]')
        return !abortBtn
      },
      { timeout: 10000 }
    )

    // Verify git repo is back to a clean state — no rebase in progress
    const status = execSync('git status', { cwd: tempDir }).toString()
    expect(status).not.toContain('rebase in progress')
    expect(status).not.toContain('You are currently rebasing')
  })

  // -------------------------------------------------------------------------
  // 6. Handle rebase conflict and continue
  // -------------------------------------------------------------------------
  test('should handle rebase conflict and continue', async () => {
    // Build a conflict: rebase commit C (which writes "version 3") onto a branch
    // that also writes to file.txt — creating a content conflict.
    const git = (cmd: string) =>
      execSync(cmd, { cwd: tempDir, env: { ...process.env, ...gitEnv } })

    const commitAHash = execSync('git log --format="%H" --reverse', { cwd: tempDir })
      .toString()
      .trim()
      .split('\n')[0]

    git(`git checkout -b base-branch ${commitAHash}`)
    writeFileSync(join(tempDir, 'file.txt'), 'base-branch version\n')
    git('git add .')
    git('git commit -m "base-branch: conflicting change"')

    // Get hash of commit C (HEAD of main/master)
    const mainBranch = execSync('git branch', { cwd: tempDir }).toString().includes('main')
      ? 'main'
      : 'master'
    const commitCHash = execSync(`git log ${mainBranch} --format="%H" -1`, { cwd: tempDir })
      .toString()
      .trim()
    const commitCSubject = execSync(`git log ${mainBranch} --format="%s" -1`, { cwd: tempDir })
      .toString()
      .trim()

    git(`git checkout ${mainBranch}`)

    // Start rebase of commit C onto base-branch via IPC
    await page.evaluate(
      async ([path, branch, acts]) => {
        const api = (window as unknown as { api: WindowApi }).api
        try {
          await api.git.rebaseInteractive(path as string, branch as string, acts as RebaseAction[])
        } catch {
          // conflict — rebase is paused
        }
      },
      [tempDir, 'base-branch', [{ action: 'pick', hash: commitCHash, subject: commitCSubject }]]
    )

    // Navigate to rebase panel
    await page.locator('[data-testid="activity-rebase"]').click()
    await expect(page.locator('[data-testid="rebase-panel"]')).toBeVisible({ timeout: 5000 })

    // Conflicted files list must be shown
    const conflictList = page.locator('[data-testid="rebase-conflict-list"]')
    await expect(conflictList).toBeVisible({ timeout: 5000 })
    await expect(conflictList.locator('text=file.txt')).toBeVisible()

    // Resolve the conflict by accepting "ours" (the rebasing commit's version)
    await page.locator('[data-testid="rebase-accept-ours-btn"]').click()

    // Verify the conflict is resolved in the list
    await expect(page.locator('[data-testid="rebase-conflict-list"] text=file.txt')).not.toBeVisible({
      timeout: 5000
    })

    // Continue the rebase
    await page.locator('[data-testid="rebase-continue-btn"]').click()

    // Wait for rebase to complete
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="rebase-abort-btn"]'),
      { timeout: 15000 }
    )

    // Verify the rebased commit is now on the branch
    const log = execSync(`git log ${mainBranch} --format="%s"`, { cwd: tempDir }).toString()
    expect(log).toContain('commit C: version 3')
    // Confirm no rebase is in progress
    const status = execSync('git status', { cwd: tempDir }).toString()
    expect(status).not.toContain('rebase in progress')
  })

  // -------------------------------------------------------------------------
  // 7. Skip a commit during conflict
  // -------------------------------------------------------------------------
  test('should skip a commit during conflict', async () => {
    const git = (cmd: string) =>
      execSync(cmd, { cwd: tempDir, env: { ...process.env, ...gitEnv } })

    // Create a branch that conflicts with commit B
    const commitAHash = execSync('git log --format="%H" --reverse', { cwd: tempDir })
      .toString()
      .trim()
      .split('\n')[0]

    git(`git checkout -b skip-branch ${commitAHash}`)
    writeFileSync(join(tempDir, 'file.txt'), 'skip-branch version\n')
    git('git add .')
    git('git commit -m "skip-branch: conflicting change"')

    const mainBranch = execSync('git branch', { cwd: tempDir }).toString().includes('main')
      ? 'main'
      : 'master'
    const commitBHash = execSync(
      `git log ${mainBranch} --format="%H" --reverse`,
      { cwd: tempDir }
    )
      .toString()
      .trim()
      .split('\n')[1] // commit B is the 2nd in chronological order

    const commitBSubject = execSync(`git show --format="%s" -s ${commitBHash}`, { cwd: tempDir })
      .toString()
      .trim()

    git(`git checkout ${mainBranch}`)

    // Start rebase of commit B (which writes "version 2") onto skip-branch — will conflict
    await page.evaluate(
      async ([path, branch, acts]) => {
        const api = (window as unknown as { api: WindowApi }).api
        try {
          await api.git.rebaseInteractive(path as string, branch as string, acts as RebaseAction[])
        } catch {
          // conflict is expected
        }
      },
      [tempDir, 'skip-branch', [{ action: 'pick', hash: commitBHash, subject: commitBSubject }]]
    )

    // Navigate to rebase panel and confirm it shows in-progress state
    await page.locator('[data-testid="activity-rebase"]').click()
    await expect(page.locator('[data-testid="rebase-panel"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="rebase-skip-btn"]')).toBeVisible({ timeout: 5000 })

    // Click Skip — this discards the conflicting commit and continues
    await page.locator('[data-testid="rebase-skip-btn"]').click()

    // Wait for rebase to finish (abort/continue/skip buttons gone)
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="rebase-abort-btn"]'),
      { timeout: 10000 }
    )

    // Commit B should have been skipped — its subject no longer in log
    const log = execSync(`git log ${mainBranch} --format="%s"`, { cwd: tempDir }).toString()
    expect(log).not.toContain('commit B: version 2')

    // Repo must be in a clean state
    const status = execSync('git status', { cwd: tempDir }).toString()
    expect(status).not.toContain('rebase in progress')
  })

  // -------------------------------------------------------------------------
  // 8. Show rebase status while in progress
  // -------------------------------------------------------------------------
  test('should show rebase status while in progress', async () => {
    const git = (cmd: string) =>
      execSync(cmd, { cwd: tempDir, env: { ...process.env, ...gitEnv } })

    // Build a 2-commit conflict scenario so we can inspect step numbers
    const commitAHash = execSync('git log --format="%H" --reverse', { cwd: tempDir })
      .toString()
      .trim()
      .split('\n')[0]

    git(`git checkout -b status-branch ${commitAHash}`)
    writeFileSync(join(tempDir, 'file.txt'), 'status-branch version\n')
    git('git add .')
    git('git commit -m "status-branch: base"')

    const mainBranch = execSync('git branch', { cwd: tempDir }).toString().includes('main')
      ? 'main'
      : 'master'

    // Collect commits B and C to rebase
    const commitLines = execSync(
      `git log ${mainBranch} --format="%H %s" --reverse`,
      { cwd: tempDir }
    )
      .toString()
      .trim()
      .split('\n')
      .slice(1) // drop commit A

    const actions: RebaseAction[] = commitLines.map((line) => {
      const [hash, ...subjectParts] = line.split(' ')
      return { action: 'pick' as const, hash, subject: subjectParts.join(' ') }
    })

    git(`git checkout ${mainBranch}`)

    // Start rebase with 2 commits — first one will conflict
    await page.evaluate(
      async ([path, branch, acts]) => {
        const api = (window as unknown as { api: WindowApi }).api
        try {
          await api.git.rebaseInteractive(path as string, branch as string, acts as RebaseAction[])
        } catch {
          // conflict — paused at step 1
        }
      },
      [tempDir, 'status-branch', actions]
    )

    // Navigate to rebase panel
    await page.locator('[data-testid="activity-rebase"]').click()
    await expect(page.locator('[data-testid="rebase-panel"]')).toBeVisible({ timeout: 5000 })

    // Progress indicator must show current/total step
    const progress = page.locator('[data-testid="rebase-progress"]')
    await expect(progress).toBeVisible({ timeout: 5000 })

    // Step text should match "1 / 2" or similar pattern
    const progressText = await progress.textContent()
    expect(progressText).toMatch(/1\s*\/\s*2/)

    // Conflicted files section must list file.txt
    await expect(page.locator('[data-testid="rebase-conflict-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="rebase-conflict-list"] text=file.txt')).toBeVisible()

    // Abort to clean up
    await page.locator('[data-testid="rebase-abort-btn"]').click()
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="rebase-abort-btn"]'),
      { timeout: 10000 }
    )
  })
})
