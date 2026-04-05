// ============================================================
// Kommit — Git IPC Handlers
// Bridge between renderer requests and GitService
// ============================================================

import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { LogOptions, TagOptions, ResetMode } from '@shared/types'
import { gitService } from '../services/git'

export function registerGitHandlers(): void {
  // --- Status ---
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.status(repoPath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_IS_REPO, async (_event, path: string) => {
    if (typeof path !== 'string') {
      throw new Error('path must be a string')
    }
    return gitService.isRepository(path)
  })

  // --- Log ---
  ipcMain.handle(IPC_CHANNELS.GIT_LOG, async (_event, repoPath: string, options?: LogOptions) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.log(repoPath, options)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_SHOW, async (_event, repoPath: string, hash: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    if (typeof hash !== 'string' || hash.length === 0) {
      throw new Error('hash must be a non-empty string')
    }
    return gitService.show(repoPath, hash)
  })

  // --- Branches ---
  ipcMain.handle(IPC_CHANNELS.GIT_BRANCHES, async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.branches(repoPath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_CREATE_BRANCH,
    async (_event, repoPath: string, name: string, startPoint?: string) => {
      return gitService.createBranch(repoPath, name, startPoint)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_DELETE_BRANCH,
    async (_event, repoPath: string, name: string, force?: boolean) => {
      return gitService.deleteBranch(repoPath, name, force)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_RENAME_BRANCH,
    async (_event, repoPath: string, oldName: string, newName: string) => {
      return gitService.renameBranch(repoPath, oldName, newName)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_CHECKOUT,
    async (_event, repoPath: string, ref: string, options?: { createBranch?: boolean }) => {
      return gitService.checkout(repoPath, ref, options)
    }
  )

  // --- Staging & Commit ---
  ipcMain.handle(IPC_CHANNELS.GIT_STAGE, async (_event, repoPath: string, filePath: string) => {
    return gitService.stageFile(repoPath, filePath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE, async (_event, repoPath: string, filePath: string) => {
    return gitService.unstageFile(repoPath, filePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    async (_event, repoPath: string, message: string, options?: { amend?: boolean }) => {
      return gitService.commit(repoPath, message, options)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GIT_DIFF, async (_event, repoPath: string, filePath?: string) => {
    return gitService.diff(repoPath, filePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_DIFF_STAGED,
    async (_event, repoPath: string, filePath?: string) => {
      return gitService.diffStaged(repoPath, filePath)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_DIFF_UNTRACKED,
    async (_event, repoPath: string, filePath: string) => {
      return gitService.diffUntracked(repoPath, filePath)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GIT_DISCARD, async (_event, repoPath: string, filePath: string) => {
    return gitService.discardChanges(repoPath, filePath)
  })

  // --- Tags ---
  ipcMain.handle(IPC_CHANNELS.GIT_TAGS, async (_event, repoPath: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.listTags(repoPath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_CREATE_TAG,
    async (_event, repoPath: string, name: string, options?: TagOptions) => {
      if (typeof repoPath !== 'string' || repoPath.length === 0) {
        throw new Error('repoPath must be a non-empty string')
      }
      return gitService.createTag(repoPath, name, options)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_DELETE_TAG,
    async (_event, repoPath: string, name: string, remote?: string) => {
      if (typeof repoPath !== 'string' || repoPath.length === 0) {
        throw new Error('repoPath must be a non-empty string')
      }
      return gitService.deleteTag(repoPath, name, remote)
    }
  )

  // --- Advanced commit operations ---
  ipcMain.handle(IPC_CHANNELS.GIT_CHERRY_PICK, async (_event, repoPath: string, hash: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.cherryPick(repoPath, hash)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_REVERT, async (_event, repoPath: string, hash: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.revert(repoPath, hash)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_RESET,
    async (_event, repoPath: string, ref: string, mode?: ResetMode) => {
      if (typeof repoPath !== 'string' || repoPath.length === 0) {
        throw new Error('repoPath must be a non-empty string')
      }
      return gitService.reset(repoPath, ref, mode)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_MERGE,
    async (_event, repoPath: string, branch: string, options?: { noFf?: boolean }) => {
      if (typeof repoPath !== 'string' || repoPath.length === 0) {
        throw new Error('repoPath must be a non-empty string')
      }
      return gitService.merge(repoPath, branch, options)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_HUNK, async (_event, repoPath: string, patch: string) => {
    if (typeof repoPath !== 'string' || repoPath.length === 0) {
      throw new Error('repoPath must be a non-empty string')
    }
    return gitService.stageHunk(repoPath, patch)
  })

  // --- Repository operations ---
  ipcMain.handle(IPC_CHANNELS.REPO_INIT, async (_event, dir: string) => {
    return gitService.init(dir)
  })

  ipcMain.handle(IPC_CHANNELS.REPO_CLONE, async (_event, url: string, parentDir: string) => {
    return gitService.clone(url, parentDir)
  })

  // --- Dialog helpers ---
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })

    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
