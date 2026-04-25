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
  color: string // Lane color for this commit (propagated from branch tip)
  edges: GraphEdge[] // Edges originating from this commit (to parents)
  passThroughEdges: PassThroughEdge[] // Edges passing through this row
  incomingEdges: GraphEdge[] // Edges terminating at this commit (from children)
}

export interface GraphEdge {
  fromColumn: number
  toColumn: number
  fromRow: number
  toRow: number
  color: string
}

export interface PassThroughEdge {
  column: number
  color: string
}

export interface CommitChangedFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
}

export interface CommitDetail {
  commit: Commit
  changedFiles: CommitChangedFile[]
}

// --- Commit Operation Types (Phase 3) ---

export interface CommitOptions {
  amend?: boolean
  allowEmpty?: boolean
}

export interface MergeResult {
  success: boolean
  conflictedFiles: string[]
}

export interface TagOptions {
  message?: string // If present → annotated tag; otherwise lightweight
  hash?: string // Target commit (defaults to HEAD)
}

export type ResetMode = 'soft' | 'mixed' | 'hard'

export interface DiffOptions {
  staged?: boolean
  filePath?: string
  commitHash?: string
}

// --- Repository Types ---

export interface RepoInfo {
  path: string
  name: string
  lastOpened: number // timestamp
}

// --- Stash Types (Phase 4) ---

export interface StashEntry {
  index: number
  message: string
  branch: string
  date: Date
  hash: string
}

export interface StashOptions {
  message?: string
  includeUntracked?: boolean // -u flag
  keepIndex?: boolean // --keep-index flag
}

// --- Rebase Types (Phase 4) ---

export type RebaseActionType = 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'

export interface RebaseAction {
  action: RebaseActionType
  hash: string
  subject: string
}

export interface RebaseStatus {
  inProgress: boolean
  currentStep: number // msgnum
  totalSteps: number // end
  currentHash: string
  conflictedFiles: string[]
  stoppedForEdit: boolean // paused at an 'edit' action — user must amend then continue
}

export interface RebaseResult {
  success: boolean
  needsContinue: boolean // stopped for reword/edit
  conflictedFiles: string[]
}

// --- Conflict Types (Phase 4) ---

export interface ConflictRegion {
  startLine: number
  endLine: number
  oursLines: string[]
  baseLines: string[] // may be empty (2-way merge)
  theirsLines: string[]
}

export interface ConflictFile {
  path: string
  conflictCount: number
}

export interface ConflictFileContent {
  ours: string // git show :2:path
  base: string // git show :1:path
  theirs: string // git show :3:path
  result: string // current working tree (with markers)
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
