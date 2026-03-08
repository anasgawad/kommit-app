// ============================================================
// Kommit — Repo IPC Handlers
// Handle recent repositories persistence
// ============================================================

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { RepoService } from '../services/repo'

export function registerRepoHandlers(repoService: RepoService): void {
  ipcMain.handle(IPC_CHANNELS.REPO_GET_RECENT, async () => {
    return repoService.getRecentRepos()
  })

  ipcMain.handle(
    IPC_CHANNELS.REPO_ADD_RECENT,
    async (_event, path: string, name: string) => {
      repoService.addRecentRepo(path, name)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO_REMOVE_RECENT,
    async (_event, path: string) => {
      repoService.removeRecentRepo(path)
    }
  )
}
