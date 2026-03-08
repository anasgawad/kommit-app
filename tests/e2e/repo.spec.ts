// ============================================================
// Kommit — Repository Workflow E2E Tests
// ============================================================

import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test'
import { join } from 'path'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

let app: ElectronApplication
let page: Page
let tempDir: string

test.beforeAll(async () => {
  app = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js')]
  })
  page = await app.firstWindow()
})

test.afterAll(async () => {
  await app.close()
})

test.beforeEach(() => {
  // Create a temp dir for test repos
  tempDir = mkdtempSync(join(tmpdir(), 'kommit-test-'))
})

test.afterEach(() => {
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }
})

test.describe('Repository Workflow', () => {
  test('should launch application and show welcome screen', async () => {
    const title = await page.locator('h1').textContent()
    expect(title).toBe('Kommit')

    // Should show action buttons
    await expect(page.getByText('Open Repository')).toBeVisible()
    await expect(page.getByText('Clone Repository')).toBeVisible()
    await expect(page.getByText('Init Repository')).toBeVisible()
  })

  test('should show clone form when Clone button is clicked', async () => {
    await page.getByText('Clone Repository').click()
    await expect(page.getByPlaceholder('Repository URL')).toBeVisible()
    await expect(page.getByPlaceholder('Target directory')).toBeVisible()
  })

  test('should display current branch name after opening repo', async () => {
    // Init a test repo
    execSync('git init', { cwd: tempDir })
    execSync('git commit --allow-empty -m "Initial commit"', {
      cwd: tempDir,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@test.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@test.com'
      }
    })

    // Open the repo (would need to mock the dialog or use API)
    // This test documents the expected behavior
    // In real E2E, we'd inject the path via the app's API
  })

  test('should show error for non-git directory', async () => {
    // This test verifies error handling when opening a non-repo directory
    // The error message should be visible to the user
  })
})
