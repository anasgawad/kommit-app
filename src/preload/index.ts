// ============================================================
// Kommit — Preload Script
// Exposes type-safe API to the renderer via contextBridge
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type {
  LogOptions,
  GitStatus,
  Commit,
  Branch,
  RepoInfo,
  CommitDetail,
  Tag,
  TagOptions,
  MergeResult,
  ResetMode,
  DiffFile,
  StashEntry,
  StashOptions,
  RebaseAction,
  RebaseStatus,
  RebaseResult,
  ConflictFile,
  ConflictFileContent
} from '@shared/types'
import { parseDiff as _parseDiff } from '@shared/diff-parser'

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

    diffUntracked: (repoPath: string, filePath: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF_UNTRACKED, repoPath, filePath),

    diffCommitFile: (repoPath: string, hash: string, filePath: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF_COMMIT, repoPath, hash, filePath),

    discard: (repoPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD, repoPath, filePath),

    // Tags
    tags: (repoPath: string): Promise<Tag[]> => ipcRenderer.invoke(IPC_CHANNELS.GIT_TAGS, repoPath),

    createTag: (repoPath: string, name: string, options?: TagOptions): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_TAG, repoPath, name, options),

    deleteTag: (repoPath: string, name: string, remote?: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_DELETE_TAG, repoPath, name, remote),

    // Advanced commit operations
    cherryPick: (repoPath: string, hash: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_CHERRY_PICK, repoPath, hash),

    revert: (repoPath: string, hash: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REVERT, repoPath, hash),

    reset: (repoPath: string, ref: string, mode?: ResetMode): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_RESET, repoPath, ref, mode),

    merge: (repoPath: string, branch: string, options?: { noFf?: boolean }): Promise<MergeResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_MERGE, repoPath, branch, options),

    stageHunk: (repoPath: string, patch: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_HUNK, repoPath, patch),

    // Client-side diff parsing (no IPC needed)
    parseDiff: (raw: string): DiffFile[] => _parseDiff(raw),

    // Stash operations (Phase 4)
    stashSave: (repoPath: string, options?: StashOptions): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_SAVE, repoPath, options),

    stashList: (repoPath: string): Promise<StashEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_LIST, repoPath),

    stashApply: (repoPath: string, index?: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_APPLY, repoPath, index),

    stashPop: (repoPath: string, index?: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_POP, repoPath, index),

    stashDrop: (repoPath: string, index: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_DROP, repoPath, index),

    stashShow: (repoPath: string, index: number): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_SHOW, repoPath, index),

    // Rebase operations (Phase 4)
    rebaseInteractive: (
      repoPath: string,
      onto: string,
      actions: RebaseAction[]
    ): Promise<RebaseResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REBASE_INTERACTIVE, repoPath, onto, actions),

    rebaseContinue: (repoPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REBASE_CONTINUE, repoPath),

    rebaseAbort: (repoPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REBASE_ABORT, repoPath),

    rebaseSkip: (repoPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REBASE_SKIP, repoPath),

    rebaseStatus: (repoPath: string): Promise<RebaseStatus | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_REBASE_STATUS, repoPath),

    // Conflict resolution (Phase 4)
    getConflictedFiles: (repoPath: string): Promise<ConflictFile[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CONFLICTED_FILES, repoPath),

    getConflictFileContent: (repoPath: string, filePath: string): Promise<ConflictFileContent> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CONFLICT_CONTENT, repoPath, filePath),

    markResolved: (repoPath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_MARK_RESOLVED, repoPath, filePath),

    writeResolvedFile: (repoPath: string, filePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT_WRITE_RESOLVED, repoPath, filePath, content)
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
