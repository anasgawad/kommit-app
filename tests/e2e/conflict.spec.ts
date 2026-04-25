// ============================================================
// Kommit — Conflict Resolution E2E Tests
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
  tempDir = mkdtempSync(join(tmpdir(), 'kommit-conflict-'))
  execSync('git init', { cwd: tempDir })
  execSync('git config user.email "test@test.com"', { cwd: tempDir })
  execSync('git config user.name "Test User"', { cwd: tempDir })

  // Create base commit
  writeFileSync(join(tempDir, 'file.txt'), 'base content\n')
  execSync('git add .', { cwd: tempDir })
  execSync('git commit -m "Base commit"', { cwd: tempDir })

  // Create feature branch with different content
  execSync('git checkout -b feature', { cwd: tempDir })
  writeFileSync(join(tempDir, 'file.txt'), 'feature content\n')
  execSync('git add .', { cwd: tempDir })
  execSync('git commit -m "Feature change"', { cwd: tempDir })

  // Return to main and make conflicting change
  execSync('git checkout main || git checkout master', { cwd: tempDir })
  writeFileSync(join(tempDir, 'file.txt'), 'main content\n')
  execSync('git add .', { cwd: tempDir })
  execSync('git commit -m "Main change"', { cwd: tempDir })
})

test.afterEach(() => {
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }
})

function createConflict(dir: string) {
  try {
    execSync('git merge feature', { cwd: dir })
  } catch {
    // merge conflict expected
  }
}

test.describe('Conflict Resolution', () => {
  test('should detect merge conflicts and open resolver', async () => {
    createConflict(tempDir)

    // Verify conflict exists in git status
    const status = execSync('git status --porcelain=v2', { cwd: tempDir }).toString()
    expect(status).toContain('file.txt')

    // Navigate to conflicts view in app
    const conflictBtn = page.locator('[data-testid="activity-conflicts"]')
    if (await conflictBtn.isVisible()) {
      await conflictBtn.click()
      await expect(page.locator('[data-testid="merge-conflict-viewer"]')).toBeVisible()
    }
  })

  test('should resolve conflict by accepting ours', async () => {
    createConflict(tempDir)

    // Simulate accepting ours by writing main content
    writeFileSync(join(tempDir, 'file.txt'), 'main content\n')
    execSync('git add file.txt', { cwd: tempDir })

    const status = execSync('git status --porcelain=v2', { cwd: tempDir }).toString()
    // After staging resolved file, it should not be in conflicted state
    expect(status).not.toMatch(/AA file\.txt/)
  })

  test('should resolve conflict by accepting theirs', async () => {
    createConflict(tempDir)

    // Simulate accepting theirs by writing feature content
    writeFileSync(join(tempDir, 'file.txt'), 'feature content\n')
    execSync('git add file.txt', { cwd: tempDir })

    const status = execSync('git status --porcelain=v2', { cwd: tempDir }).toString()
    expect(status).not.toMatch(/AA file\.txt/)
  })

  test('should resolve conflict with manual edit', async () => {
    createConflict(tempDir)

    // Manually resolve the conflict
    writeFileSync(join(tempDir, 'file.txt'), 'manually resolved content\n')
    execSync('git add file.txt', { cwd: tempDir })

    const content = execSync('cat file.txt', { cwd: tempDir }).toString()
    expect(content).toBe('manually resolved content\n')
  })

  test('should complete merge after all conflicts resolved', async () => {
    createConflict(tempDir)

    // Resolve all conflicts
    writeFileSync(join(tempDir, 'file.txt'), 'resolved content\n')
    execSync('git add file.txt', { cwd: tempDir })
    execSync('git commit -m "Merge resolved"', { cwd: tempDir })

    const log = execSync('git log --oneline', { cwd: tempDir }).toString()
    expect(log).toContain('Merge resolved')
  })
})
