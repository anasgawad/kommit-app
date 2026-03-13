// ============================================================
// Kommit — IPC Channel Definitions (Single Source of Truth)
// ============================================================

export const IPC_CHANNELS = {
  // Repository operations
  REPO_OPEN: 'repo:open',
  REPO_CLONE: 'repo:clone',
  REPO_INIT: 'repo:init',
  REPO_GET_RECENT: 'repo:get-recent',
  REPO_ADD_RECENT: 'repo:add-recent',
  REPO_REMOVE_RECENT: 'repo:remove-recent',

  // Git status
  GIT_STATUS: 'git:status',
  GIT_IS_REPO: 'git:is-repo',

  // Git log
  GIT_LOG: 'git:log',
  GIT_SHOW: 'git:show',

  // Branch operations
  GIT_BRANCHES: 'git:branches',
  GIT_CREATE_BRANCH: 'git:create-branch',
  GIT_DELETE_BRANCH: 'git:delete-branch',
  GIT_RENAME_BRANCH: 'git:rename-branch',
  GIT_CHECKOUT: 'git:checkout',

  // Staging & Commit
  GIT_STAGE: 'git:stage',
  GIT_UNSTAGE: 'git:unstage',
  GIT_COMMIT: 'git:commit',
  GIT_DIFF: 'git:diff',
  GIT_DIFF_STAGED: 'git:diff-staged',
  GIT_DISCARD: 'git:discard',

  // Tags
  GIT_TAGS: 'git:tags',
  GIT_CREATE_TAG: 'git:create-tag',
  GIT_DELETE_TAG: 'git:delete-tag',

  // Remote operations (Phase 5)
  GIT_FETCH: 'git:fetch',
  GIT_PULL: 'git:pull',
  GIT_PUSH: 'git:push',
  GIT_REMOTES: 'git:remotes',

  // Stash operations (Phase 4)
  GIT_STASH_SAVE: 'git:stash-save',
  GIT_STASH_LIST: 'git:stash-list',
  GIT_STASH_APPLY: 'git:stash-apply',
  GIT_STASH_POP: 'git:stash-pop',
  GIT_STASH_DROP: 'git:stash-drop',

  // Dialog helpers
  DIALOG_OPEN_DIRECTORY: 'dialog:open-directory',
  DIALOG_OPEN_FILE: 'dialog:open-file',

  // Window controls (for frameless window)
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // App events (main -> renderer)
  APP_REPO_CHANGED: 'app:repo-changed',
  APP_GIT_PROGRESS: 'app:git-progress'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
