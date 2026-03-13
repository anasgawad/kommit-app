// ============================================================
// Kommit — Preload Script
// Exposes type-safe API to the renderer via contextBridge
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { LogOptions, GitStatus, Commit, Branch, RepoInfo, CommitDetail } from '@shared/types'

const api = {
  git: {
    status: (repoPath: string): Promise<GitStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, repoPath),

    isRepo: (path: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.GIT_IS_REPO, path),

    log: (repoPath: string, options?: LogOptions): Promise<Commit[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_LOG, repoPath, options),

    show: (repoPath: string, hash: string): Promise<CommitDetail> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_SHOW, repoPath, hash),

    branches: (repoPath: string): Promise<Branch[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCHES, repoPath),

    createBranch: (repoPath: string, name: string, startPoint?: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, repoPath, name, startPoint),

    deleteBranch: (repoPath: string, name: string, force?: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DELETE_BRANCH, repoPath, name, force),

    renameBranch: (repoPath: string, oldName: string, newName: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_RENAME_BRANCH, repoPath, oldName, newName),

    checkout: (
      repoPath: string,
      ref: string,
      options?: { createBranch?: boolean }
    ): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, repoPath, ref, options),

    stage: (repoPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE, repoPath, filePath),

    unstage: (repoPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE, repoPath, filePath),

    commit: (repoPath: string, message: string, options?: { amend?: boolean }): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, repoPath, message, options),

    diff: (repoPath: string, filePath?: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF, repoPath, filePath),

    diffStaged: (repoPath: string, filePath?: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF_STAGED, repoPath, filePath),

    discard: (repoPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD, repoPath, filePath)
  },

  repo: {
    init: (dir: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.REPO_INIT, dir),

    clone: (url: string, parentDir: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO_CLONE, url, parentDir),

    getRecent: (): Promise<RepoInfo[]> => ipcRenderer.invoke(IPC_CHANNELS.REPO_GET_RECENT),

    addRecent: (path: string, name: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO_ADD_RECENT, path, name),

    removeRecent: (path: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO_REMOVE_RECENT, path)
  },

  dialog: {
    openDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY)
  },

  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED)
  },

  // Listen for events pushed from main process
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

// Type declaration for renderer access
export type KommitAPI = typeof api
