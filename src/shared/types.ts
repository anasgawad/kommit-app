// ============================================================
// Kommit — Shared Type Definitions
// ============================================================

// --- Git Status Types ---

export enum FileStatusCode {
  Added = 'A',
  Modified = 'M',
  Deleted = 'D',
  Renamed = 'R',
  Copied = 'C',
  Untracked = '?',
  Ignored = '!',
  Unmerged = 'U'
}

export interface FileStatus {
  path: string
  originalPath?: string // for renames
  indexStatus: FileStatusCode | '.'
  workTreeStatus: FileStatusCode | '.'
  isStaged: boolean
  isConflicted: boolean
}

export interface BranchTrackingInfo {
  ahead: number
  behind: number
  remoteName?: string
  remoteBranch?: string
}

export interface GitStatus {
  branch: string
  isDetachedHead: boolean
  tracking: BranchTrackingInfo | null
  staged: FileStatus[]
  unstaged: FileStatus[]
  untracked: FileStatus[]
  conflicted: FileStatus[]
  isClean: boolean
}

// --- Commit Types ---

export interface Commit {
  hash: string
  abbreviatedHash: string
  parents: string[]
  author: string
  authorEmail: string
  authorDate: Date
  subject: string
  body?: string
  refs: string[]
}

export interface LogOptions {
  maxCount?: number
  skip?: number
  branch?: string
  all?: boolean
  author?: string
  search?: string
}

// --- Branch Types ---

export interface Branch {
  name: string
  isRemote: boolean
  isCurrent: boolean
  isHead: boolean
  upstream?: string
  tracking?: BranchTrackingInfo
  lastCommitHash?: string
  lastCommitSubject?: string
}

// --- Tag Types ---

export interface Tag {
  name: string
  hash: string
  message?: string
  isAnnotated: boolean
  taggerDate?: Date
}

// --- Diff Types ---

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffFile {
  oldPath: string
  newPath: string
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'binary'
  hunks: DiffHunk[]
  isBinary: boolean
  similarityIndex?: number
}

// --- Graph Types (Phase 2, defined early for planning) ---

export interface GraphRow {
  commit: Commit
  column: number
  edges: GraphEdge[]
}

export interface GraphEdge {
  fromColumn: number
  toColumn: number
  fromRow: number
  toRow: number
  color: string
}

// --- Repository Types ---

export interface RepoInfo {
  path: string
  name: string
  lastOpened: number // timestamp
}

// --- Stash Types (Phase 4, defined early for planning) ---

export interface StashEntry {
  index: number
  message: string
  branch: string
  date: Date
  hash: string
}

// --- Remote Types (Phase 5, defined early for planning) ---

export interface Remote {
  name: string
  fetchUrl: string
  pushUrl: string
}

// --- Error Types ---

export class GitError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(message)
    this.name = 'GitError'
  }
}

export class GitNotFoundError extends Error {
  constructor() {
    super('Git is not installed or not found in PATH')
    this.name = 'GitNotFoundError'
  }
}

export class NotARepositoryError extends Error {
  constructor(path: string) {
    super(`Not a git repository: ${path}`)
    this.name = 'NotARepositoryError'
  }
}
