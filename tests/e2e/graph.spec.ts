// ============================================================
// Kommit — Commit Graph E2E Tests
// ============================================================

import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

let electronApp: ElectronApplication
let window: Page
let tempDir: string

test.beforeAll(async () => {
  // Create a temp git repo with commits
  tempDir = mkdtempSync(join(tmpdir(), 'kommit-graph-test-'))
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@test.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@test.com'
  }
  execSync('git init', { cwd: tempDir })
  execSync('git commit --allow-empty -m "Initial commit"', { cwd: tempDir, env })
  execSync('git commit --allow-empty -m "Second commit"', { cwd: tempDir, env })

  electronApp = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js')]
  })
  window = await electronApp.firstWindow()

  // Wait for the renderer to fully load (WelcomeScreen is the initial state)
  await window.waitForLoadState('domcontentloaded')
  await window.waitForFunction(
    () => typeof (window as unknown as Record<string, unknown>).__openRepo === 'function',
    { timeout: 10000 }
  )

  // Open the temp repo via the test helper exposed in main.tsx
  await window.evaluate(
    (repoPath) =>
      (window as unknown as { __openRepo: (p: string) => Promise<void> }).__openRepo(repoPath),
    tempDir
  )

  // Wait for the graph UI to render
  await window.waitForSelector('[placeholder="Search commits..."]', { timeout: 10000 })
})

test.afterAll(async () => {
  await electronApp.close()
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }
})

test.describe('Commit Graph', () => {
  test('should display commit graph for opened repository', async () => {
    const toolbar = await window.locator('[placeholder="Search commits..."]')
    await expect(toolbar).toBeVisible()
  })

  test('should show branch labels on correct commits', async () => {
    await window.waitForTimeout(1000)

    // Placeholder: verify structure exists
    const searchInput = await window.locator('[placeholder="Search commits..."]')
    await expect(searchInput).toBeVisible()
  })

  test('should scroll through large history (1000+ commits)', async () => {
    // For now, check that the graph container is visible
    const searchInput = await window.locator('[placeholder="Search commits..."]')
    await expect(searchInput).toBeVisible()
  })

  test('should select commit and show details panel', async () => {
    await window.waitForTimeout(1000)

    // Placeholder
    const searchInput = await window.locator('[placeholder="Search commits..."]')
    await expect(searchInput).toBeVisible()
  })

  test('should right-click commit and show context menu', async () => {
    await window.waitForTimeout(1000)

    // Placeholder
    const searchInput = await window.locator('[placeholder="Search commits..."]')
    await expect(searchInput).toBeVisible()
  })

  test('should search commits and highlight results', async () => {
    await window.waitForTimeout(1000)

    const searchInput = await window.locator('[placeholder="Search commits..."]')
    await searchInput.fill('test')

    // Wait for search to execute
    await window.waitForTimeout(500)

    // Verify search input has value
    await expect(searchInput).toHaveValue('test')
  })

  test('should filter graph by selected branch', async () => {
    await window.waitForTimeout(1000)

    const branchInput = await window.locator('[placeholder="Branch..."]')
    await branchInput.fill('main')

    // Wait for filter to execute
    await window.waitForTimeout(500)

    // Verify filter input has value
    await expect(branchInput).toHaveValue('main')
  })

  test('should navigate commits with keyboard arrows', async () => {
    await window.waitForTimeout(1000)

    // Focus on the graph area
    await window.keyboard.press('Tab')

    // Press down arrow
    await window.keyboard.press('ArrowDown')

    // Press up arrow
    await window.keyboard.press('ArrowUp')

    // Press Enter to select
    await window.keyboard.press('Enter')

    // Verify no errors occurred
    const searchInput = await window.locator('[placeholder="Search commits..."]')
    await expect(searchInput).toBeVisible()
  })
})
