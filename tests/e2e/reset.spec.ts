// ============================================================
// Kommit — Reset Command E2E Tests
// Covers: soft/mixed/hard reset modes + graph HEAD update
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

const gitEnv = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@test.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@test.com'
}

test.beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'kommit-reset-e2e-'))

  // Set up repo:
  //   commit1: add file.txt with "v1"
  //   commit2: modify file.txt to "v2" (this is what we reset away from)
  execSync('git init', { cwd: tempDir })
  writeFileSync(join(tempDir, 'file.txt'), 'v1\n')
  execSync('git add .', { cwd: tempDir })
  execSync('git commit -m "commit1"', { cwd: tempDir, env: { ...process.env, ...gitEnv } })
  writeFileSync(join(tempDir, 'file.txt'), 'v2\n')
  execSync('git add .', { cwd: tempDir })
  execSync('git commit -m "commit2"', { cwd: tempDir, env: { ...process.env, ...gitEnv } })

  electronApp = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js')]
  })
  window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  await window.waitForFunction(
    () => typeof (window as unknown as { __openRepo: unknown }).__openRepo === 'function',
    { timeout: 10000 }
  )
  await window.evaluate(
    (repoPath) =>
      (window as unknown as { __openRepo: (p: string) => Promise<void> }).__openRepo(repoPath),
    tempDir
  )
  await window.waitForSelector('[placeholder="Search commits..."]', { timeout: 10000 })
  await window.waitForTimeout(500)
})

test.afterAll(async () => {
  await electronApp.close()
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // best-effort
  }
})

/** Restore HEAD to original state (commit2) between tests */
async function restoreHead() {
  execSync('git reset --hard ORIG_HEAD', { cwd: tempDir })
  await window.evaluate(
    (repoPath) =>
      (window as unknown as { __openRepo: (p: string) => Promise<void> }).__openRepo(repoPath),
    tempDir
  )
  await window.waitForTimeout(800)
}

/** Open the reset dialog by right-clicking the row containing the given commit subject */
async function openResetDialog(commitSubject: string) {
  const row = window
    .locator('[data-testid^="commit-row-"]')
    .filter({ hasText: commitSubject })
    .first()
  await expect(row).toBeVisible({ timeout: 5000 })
  await row.click({ button: 'right' })
  await expect(window.locator('.context-menu')).toBeVisible({ timeout: 3000 })
  await window.locator('.context-menu').getByText('Reset to here').click()
  await expect(window.locator('text=Reset to commit')).toBeVisible({ timeout: 3000 })
}

// ---------------------------------------------------------------------------
// Test 1: dialog UI
// ---------------------------------------------------------------------------
test('reset dialog appears with soft/mixed/hard options and descriptions', async () => {
  await openResetDialog('commit1')

  await expect(window.locator('input[value="soft"]')).toBeVisible()
  await expect(window.locator('input[value="mixed"]')).toBeVisible()
  await expect(window.locator('input[value="hard"]')).toBeVisible()
  await expect(window.locator('text=Move HEAD only; keep staged and working tree')).toBeVisible()
  await expect(window.locator('text=Move HEAD and unstage; keep working tree')).toBeVisible()
  await expect(window.locator('text=Move HEAD, unstage, and discard all changes')).toBeVisible()

  await window.getByText('Cancel').click()
  await expect(window.locator('text=Reset to commit')).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// Test 2: soft reset keeps changes staged
// ---------------------------------------------------------------------------
test('soft reset keeps changes staged', async () => {
  await openResetDialog('commit1')
  await window.locator('input[value="soft"]').click()
  await window.getByRole('button', { name: /Reset \(soft\)/ }).click()
  await window.waitForTimeout(1500)

  const status = await window.evaluate(
    (repoPath) =>
      (
        window as unknown as {
          api: { git: { status: (p: string) => Promise<{ staged: Array<{ path: string }> }> } }
        }
      ).api.git.status(repoPath),
    tempDir
  )

  // file.txt modification should be staged (index still has v2, HEAD is at v1)
  expect(status.staged.some((f) => f.path === 'file.txt')).toBe(true)

  await restoreHead()
})

// ---------------------------------------------------------------------------
// Test 3: mixed reset unstages changes but keeps working tree
// ---------------------------------------------------------------------------
test('mixed reset unstages changes but keeps working tree', async () => {
  await openResetDialog('commit1')
  await window.locator('input[value="mixed"]').click()
  await window.getByRole('button', { name: /Reset \(mixed\)/ }).click()
  await window.waitForTimeout(1500)

  const status = await window.evaluate(
    (repoPath) =>
      (
        window as unknown as {
          api: {
            git: {
              status: (p: string) => Promise<{
                staged: Array<{ path: string }>
                unstaged: Array<{ path: string }>
              }>
            }
          }
        }
      ).api.git.status(repoPath),
    tempDir
  )

  // file.txt should NOT be staged (index reverted to v1)
  expect(status.staged.some((f) => f.path === 'file.txt')).toBe(false)
  // file.txt should be unstaged/modified (working tree still has v2)
  expect(status.unstaged.some((f) => f.path === 'file.txt')).toBe(true)

  await restoreHead()
})

// ---------------------------------------------------------------------------
// Test 4: hard reset discards all changes
// ---------------------------------------------------------------------------
test('hard reset discards all changes', async () => {
  await openResetDialog('commit1')
  await window.locator('input[value="hard"]').click()
  await window.getByRole('button', { name: /Reset \(hard\)/ }).click()
  await window.waitForTimeout(1500)

  const status = await window.evaluate(
    (repoPath) =>
      (
        window as unknown as {
          api: {
            git: {
              status: (p: string) => Promise<{
                staged: Array<{ path: string }>
                unstaged: Array<{ path: string }>
                isClean: boolean
              }>
            }
          }
        }
      ).api.git.status(repoPath),
    tempDir
  )

  expect(status.staged.length).toBe(0)
  expect(status.unstaged.length).toBe(0)
  expect(status.isClean).toBe(true)

  await restoreHead()
})

// ---------------------------------------------------------------------------
// Test 5: after reset, commit graph updates to reflect new HEAD
// ---------------------------------------------------------------------------
test('after reset, commit graph updates to reflect new HEAD', async () => {
  const newHeadHash = execSync('git rev-parse HEAD~1', { cwd: tempDir }).toString().trim()

  await openResetDialog('commit1')
  await window.locator('input[value="mixed"]').click()
  await window.getByRole('button', { name: /Reset \(mixed\)/ }).click()
  await window.waitForTimeout(2000)

  // The HEAD badge should now be visible on the commit1 row
  const newHeadRow = window.locator(`[data-testid="commit-row-${newHeadHash}"]`)
  await expect(newHeadRow.locator('text=HEAD')).toBeVisible({ timeout: 5000 })

  await restoreHead()
})
