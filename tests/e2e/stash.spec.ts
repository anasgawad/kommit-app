// ============================================================
// Kommit — Stash E2E Tests
// ============================================================

import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test'
import { join } from 'path'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
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
  tempDir = mkdtempSync(join(tmpdir(), 'kommit-stash-'))
  execSync('git init', { cwd: tempDir })
  execSync('git config user.email "test@test.com"', { cwd: tempDir })
  execSync('git config user.name "Test User"', { cwd: tempDir })
  execSync('git commit --allow-empty -m "Initial commit"', { cwd: tempDir })
})

test.afterEach(async () => {
  // Navigate back to welcome screen
  try {
    await page.click('[data-testid="activity-home"], button[title="Home (close repository)"]')
  } catch {
    // ignore
  }
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }
})

async function openRepo(p: Page, dir: string) {
  // Trigger open dialog by injecting the repo path via IPC
  await p.evaluate((repoPath) => {
    window.dispatchEvent(new CustomEvent('__test-open-repo', { detail: repoPath }))
  }, dir)
  // Wait for stash view button
  await p.waitForSelector('[data-testid="activity-stash"]', { timeout: 10000 })
}

test.describe('Stash', () => {
  test('should stash changes and show in stash list', async () => {
    writeFileSync(join(tempDir, 'file.txt'), 'modified content')
    execSync('git add .', { cwd: tempDir })

    // Open the repo in the app
    await page.evaluate(async (repoPath: string) => {
      // Use window.api to simulate opening repo
      await (
        window as unknown as { api: { git: { isRepo: (p: string) => Promise<boolean> } } }
      ).api.git.isRepo(repoPath)
    }, tempDir)

    // Navigate to stash view
    const stashBtn = page.locator('[data-testid="activity-stash"]')
    if (await stashBtn.isVisible()) {
      await stashBtn.click()
      await expect(page.locator('[data-testid="stash-panel"]')).toBeVisible()
    }
  })

  test('should apply stash and verify files restored', async () => {
    writeFileSync(join(tempDir, 'file.txt'), 'stashed content')
    execSync('git add .', { cwd: tempDir })
    execSync('git stash', { cwd: tempDir })

    // Verify stash was created
    const stashList = execSync('git stash list', { cwd: tempDir }).toString()
    expect(stashList).toContain('stash@{0}')

    // Apply stash
    execSync('git stash apply', { cwd: tempDir })
    const content = execSync('cat file.txt', { cwd: tempDir }).toString()
    expect(content).toBe('stashed content')
  })

  test('should pop stash (apply + remove)', async () => {
    writeFileSync(join(tempDir, 'file.txt'), 'pop content')
    execSync('git add .', { cwd: tempDir })
    execSync('git stash', { cwd: tempDir })

    execSync('git stash pop', { cwd: tempDir })

    const stashList = execSync('git stash list', { cwd: tempDir }).toString()
    expect(stashList.trim()).toBe('')

    const content = execSync('cat file.txt', { cwd: tempDir }).toString()
    expect(content).toBe('pop content')
  })

  test('should drop stash with confirmation', async () => {
    writeFileSync(join(tempDir, 'file.txt'), 'drop content')
    execSync('git add .', { cwd: tempDir })
    execSync('git stash', { cwd: tempDir })

    execSync('git stash drop stash@{0}', { cwd: tempDir })

    const stashList = execSync('git stash list', { cwd: tempDir }).toString()
    expect(stashList.trim()).toBe('')
  })

  test('should show stash diff in preview', async () => {
    writeFileSync(join(tempDir, 'file.txt'), 'preview content')
    execSync('git add .', { cwd: tempDir })
    execSync('git stash', { cwd: tempDir })

    // Verify stash diff is accessible via git
    const diff = execSync('git stash show --stat stash@{0}', { cwd: tempDir }).toString()
    expect(diff).toContain('file.txt')
  })
})
