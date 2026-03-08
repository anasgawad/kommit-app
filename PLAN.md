# Kommit — Cross-Platform Git GUI Application

## Development Plan

> **Status:** Phase 1 — In Progress  
> **Start Date:** March 2026  
> **Platforms:** Windows, macOS, Linux  
> **License:** TBD  
> **npm package:** `kommit-app`  
> **GitHub org:** `kommit-app`  
> **Display name:** Kommit

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Phase 1: Foundation & Repository Management](#phase-1-foundation--repository-management-weeks-1-3)
- [Phase 2: Commit Graph & Branch Visualization](#phase-2-commit-graph--branch-visualization-weeks-4-6)
- [Phase 3: Core Git Operations](#phase-3-core-git-operations-weeks-7-9)
- [Phase 4: Stash, Interactive Rebase & Conflict Resolution](#phase-4-stash-interactive-rebase--conflict-resolution-weeks-10-12)
- [Phase 5: Remote Operations & Platform Integration](#phase-5-remote-operations--platform-integration-weeks-13-15)
- [Phase 6: Performance, Testing & Release](#phase-6-performance-testing--release-weeks-16-18)
- [Summary Timeline](#summary-timeline)
- [Test Summary](#test-summary)

---

## Technology Stack

| Concern            | Choice                                          |
| ------------------ | ----------------------------------------------- |
| Framework          | Electron + React 19 + TypeScript 5.x            |
| Bundler            | `electron-vite` (Vite for all processes)         |
| Packaging          | `electron-builder`                               |
| State Management   | Zustand                                          |
| Git Integration    | `child_process.execFile('git', ...)` in main process |
| Graph Rendering    | Custom SVG per-row inside virtualized list        |
| Virtualization     | `@tanstack/react-virtual`                        |
| Styling            | Tailwind CSS + shadcn/ui                         |
| Unit/Integration   | Vitest + React Testing Library                   |
| E2E Tests          | Playwright (Electron support)                    |
| Auto-Update        | `electron-updater` via GitHub Releases           |

### Key Architectural Decisions

- **Git CLI over libgit2:** Shell out to the system `git` binary via `child_process.execFile` (not `exec`). This avoids native module compilation issues, stays current with git features, and is used by most production Git GUIs.
- **Custom Graph Rendering:** No general-purpose graph library. Git commit graphs have a regular structure (vertical lanes + connections) that is best served by custom SVG or Canvas rendering. Every production Git GUI (GitKraken, SourceTree, VS Code git-graph) uses custom rendering.
- **Strict Process Separation:** The renderer never has direct Node.js access. All native operations go through IPC via `contextBridge`. `contextIsolation: true` is enforced.
- **Typed IPC:** All IPC channels are defined in `shared/ipc-channels.ts` as a single source of truth with full TypeScript typing.

---

## Project Structure

```
kommit-app/
├── src/
│   ├── main/                  # Main (Node.js) process
│   │   ├── index.ts           # App lifecycle, BrowserWindow
│   │   ├── ipc/               # IPC handler registrations
│   │   │   ├── git-handlers.ts
│   │   │   ├── repo-handlers.ts
│   │   │   └── file-handlers.ts
│   │   ├── services/          # Business logic
│   │   │   ├── git.ts         # Git CLI wrapper
│   │   │   ├── git-parser.ts  # Parse git output
│   │   │   └── repo.ts        # Repository management
│   │   └── updater.ts
│   ├── preload/
│   │   └── index.ts           # contextBridge.exposeInMainWorld()
│   ├── renderer/              # React app
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── graph/         # Commit graph rendering
│   │   │   ├── diff/          # Diff viewer
│   │   │   ├── branches/      # Branch management
│   │   │   ├── commits/       # Commit details & creation
│   │   │   ├── stash/         # Stash management
│   │   │   ├── rebase/        # Interactive rebase
│   │   │   ├── merge/         # Conflict resolution
│   │   │   ├── remote/        # Remote management
│   │   │   └── layout/        # Shell, sidebar, tabs
│   │   ├── hooks/
│   │   ├── stores/            # Zustand stores
│   │   └── index.html
│   └── shared/                # Shared types/constants
│       ├── types.ts
│       └── ipc-channels.ts
├── tests/
│   ├── unit/                  # Vitest unit tests
│   ├── components/            # Component tests
│   └── e2e/                   # Playwright E2E tests
├── electron-builder.yml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 1: Foundation & Repository Management (Weeks 1-3)

### Goals

Set up the project scaffold, Git CLI integration layer, and basic repository operations.

### Tasks

#### 1.1 — Project Setup

- [ ] Initialize Electron + React + TypeScript project with `electron-vite`
- [ ] Configure ESLint, Prettier, Vitest, Playwright
- [ ] Set up CI pipeline (GitHub Actions) for lint, test, build on all 3 platforms
- [ ] Configure `electron-builder` for Windows (NSIS), macOS (DMG), Linux (AppImage)

#### 1.2 — Git Service Layer (Main Process)

- [ ] Implement `GitService` class wrapping `child_process.execFile`
- [ ] Parse `git status --porcelain=v2 --branch`
- [ ] Parse `git log` with structured `--format` using NUL delimiters
- [ ] Parse `git branch -a --format=...`
- [ ] Implement error handling (repo not found, git not installed, auth failures)

#### 1.3 — IPC Bridge

- [ ] Define typed IPC channels in `shared/ipc-channels.ts`
- [ ] Implement `preload/index.ts` with `contextBridge.exposeInMainWorld`
- [ ] Register IPC handlers in main process
- [ ] Type-safe `window.api` in renderer

#### 1.4 — Repository Management UI

- [ ] Open/clone/init repository dialogs
- [ ] Recent repositories list (persisted via `electron-store`)
- [ ] Repository selector in sidebar
- [ ] Display basic repo info (current branch, clean/dirty status)

### Unit Tests — Phase 1

#### Git Service Tests (`tests/unit/services/git.test.ts`)

```
GitService.exec()
  ✓ should execute git command and return stdout
  ✓ should reject on non-zero exit code with stderr message
  ✓ should set GIT_TERMINAL_PROMPT=0 in env
  ✓ should throw descriptive error when git is not installed
  ✓ should respect maxBuffer setting

GitService.status()
  ✓ should parse clean working tree
  ✓ should parse staged files (added, modified, deleted)
  ✓ should parse unstaged changes
  ✓ should parse untracked files
  ✓ should parse renamed files with rename detection
  ✓ should parse merge conflict states (UU, AA, DD)
  ✓ should parse branch tracking info (ahead/behind)
  ✓ should handle detached HEAD state

GitService.log()
  ✓ should parse commits with all fields (hash, author, date, subject, refs)
  ✓ should parse parent hashes (0 parents = root, 1 = normal, 2+ = merge)
  ✓ should parse ref decorations (branches, tags, HEAD)
  ✓ should handle empty repo (no commits)
  ✓ should respect --max-count limit
  ✓ should parse commits with special characters in subject

GitService.branches()
  ✓ should list local branches
  ✓ should list remote branches
  ✓ should identify current branch
  ✓ should parse tracking info for each branch
  ✓ should handle detached HEAD
```

#### Git Output Parser Tests (`tests/unit/services/git-parser.test.ts`)

```
parseStatus()
  ✓ all porcelain v2 status codes

parseLog()
  ✓ NUL-delimited format with edge cases

parseBranches()
  ✓ local, remote, tracking

parseDiff()
  ✓ unified diff header parsing
```

#### IPC Tests (`tests/unit/ipc/git-handlers.test.ts`)

```
IPC Handlers
  ✓ should register all expected IPC handlers
  ✓ should validate repoPath argument is a string
  ✓ should return structured data (not raw strings)
  ✓ should propagate errors with meaningful messages
```

#### Repository Management Component Tests (`tests/components/repo/`)

```
RepoSelector
  ✓ should display list of recent repositories
  ✓ should call openRepo when selecting a repository
  ✓ should show "Open Repository" button
  ✓ should show "Clone Repository" button

CloneDialog
  ✓ should validate URL format
  ✓ should allow selecting target directory
  ✓ should show progress during clone

RepoStore (Zustand)
  ✓ should set active repository
  ✓ should persist recent repos list
  ✓ should update status on repo change
```

### E2E Tests — Phase 1 (`tests/e2e/repo.spec.ts`)

```
Repository Workflow
  ✓ should launch application and show welcome screen
  ✓ should open an existing repository via dialog
  ✓ should clone a repository from URL
  ✓ should initialize a new repository
  ✓ should show repo in recent list after opening
  ✓ should display current branch name in header
```

---

## Phase 2: Commit Graph & Branch Visualization (Weeks 4-6)

### Goals

Implement the interactive commit graph — the centerpiece of the application.

### Tasks

#### 2.1 — Graph Data Model

- [ ] Implement lane assignment algorithm (column allocation for branches)
- [ ] Assign deterministic colors per branch
- [ ] Build `GraphRow[]` from parsed commit data
- [ ] Support incremental loading (pagination with `--skip`)

#### 2.2 — Graph Renderer

- [ ] Custom SVG-per-row rendering inside `@tanstack/react-virtual`
- [ ] Draw commit nodes (circles), branch lines (Bezier curves), merge points
- [ ] Color-code branches consistently
- [ ] Render ref labels (branch names, tags) as badges
- [ ] Support horizontal scrolling for repos with many concurrent branches

#### 2.3 — Graph Interactions

- [ ] Click commit to view details (right panel)
- [ ] Right-click context menu (checkout, cherry-pick, reset, revert)
- [ ] Search commits by message, author, hash
- [ ] Filter by branch, date range, author
- [ ] Keyboard navigation (up/down arrows, Enter to select)

#### 2.4 — Commit Detail Panel

- [ ] Show full commit metadata (hash, author, date, message, parents)
- [ ] List changed files with status icons (added/modified/deleted)
- [ ] Click file to view diff (placeholder — full diff in Phase 3)

### Core Data Structures

```typescript
interface Commit {
  hash: string;
  abbreviatedHash: string;
  parents: string[];       // parent hashes (2 = merge, 0 = root)
  author: string;
  authorEmail: string;
  authorDate: Date;
  subject: string;
  refs: string[];          // branch names, tags, HEAD
}

interface GraphRow {
  commit: Commit;
  column: number;          // x-position (swim lane index)
  edges: Edge[];           // connections to draw from this row
}

interface Edge {
  fromColumn: number;
  toColumn: number;
  fromRow: number;
  toRow: number;
  color: string;           // consistent color per branch
}

type CommitGraph = GraphRow[];
```

### Lane Assignment Algorithm (Pseudocode)

```typescript
function assignLanes(commits: Commit[]): GraphRow[] {
  // commits in topological order (git log default)
  const lanes: (string | null)[] = [];
  const rows: GraphRow[] = [];

  for (const commit of commits) {
    // Find lane expecting this commit hash
    let col = lanes.indexOf(commit.hash);
    if (col === -1) {
      col = lanes.indexOf(null);
      if (col === -1) { col = lanes.length; lanes.push(null); }
    }

    // Lane now expects first parent
    lanes[col] = commit.parents[0] ?? null;

    // Additional parents (merges) get own lanes
    for (let i = 1; i < commit.parents.length; i++) {
      let parentCol = lanes.indexOf(commit.parents[i]);
      if (parentCol === -1) {
        parentCol = lanes.indexOf(null);
        if (parentCol === -1) { parentCol = lanes.length; lanes.push(null); }
        lanes[parentCol] = commit.parents[i];
      }
    }

    // Compact trailing nulls
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop();

    rows.push({ commit, column: col, edges: [] });
  }
  return rows;
}
```

### Git Log Format

```bash
git log \
  --format='%H%x00%h%x00%P%x00%an%x00%ae%x00%aI%x00%s%x00%D%x00%x00' \
  --topo-order \
  --all \
  -n 500
```

Fields separated by NUL (`%x00`), records separated by double-NUL + newline.

### Unit Tests — Phase 2

#### Lane Assignment Algorithm (`tests/unit/graph/lane-algorithm.test.ts`)

```
Lane Assignment
  ✓ should assign column 0 to linear history (no branches)
  ✓ should allocate new column for branch fork
  ✓ should merge columns when branches merge
  ✓ should reuse freed columns (compact layout)
  ✓ should handle octopus merges (3+ parents)
  ✓ should handle root commits (no parents)
  ✓ should handle multiple roots (unrelated histories)
  ✓ should produce stable output for same input
  ✓ should handle 10,000 commits without stack overflow
  ✓ should correctly order columns (main branch leftmost)
```

#### Graph Color Assignment (`tests/unit/graph/colors.test.ts`)

```
Color Assignment
  ✓ should assign deterministic color per branch name
  ✓ should produce visually distinct colors for common branch names
  ✓ should handle unnamed branches (detached HEAD)
  ✓ should return same color for same branch across calls
```

#### GraphRow Component (`tests/components/graph/GraphRow.test.tsx`)

```
GraphRow
  ✓ should render commit node at correct x position
  ✓ should render straight line for linear parent
  ✓ should render curved line for merge
  ✓ should render ref labels for branches
  ✓ should render ref label for tags
  ✓ should highlight selected commit
  ✓ should apply correct color per branch
  ✓ should truncate long commit messages
```

#### CommitGraph Component (`tests/components/graph/CommitGraph.test.tsx`)

```
CommitGraph
  ✓ should render virtualized list of commits
  ✓ should load more commits on scroll to bottom
  ✓ should filter commits by branch name
  ✓ should filter commits by author
  ✓ should search commits by message substring
  ✓ should highlight search matches
  ✓ should select commit on click
  ✓ should show context menu on right-click
```

#### CommitDetail Component (`tests/components/commits/CommitDetail.test.tsx`)

```
CommitDetail
  ✓ should display commit hash (abbreviated + full)
  ✓ should display author name and email
  ✓ should display formatted date
  ✓ should display full commit message
  ✓ should list parent commit hashes as links
  ✓ should list changed files with correct status icons
  ✓ should handle merge commits (multiple parents)
```

#### Graph Store (`tests/unit/stores/graph-store.test.ts`)

```
GraphStore
  ✓ should load initial batch of commits
  ✓ should append commits on loadMore
  ✓ should rebuild graph rows on data change
  ✓ should set selected commit
  ✓ should apply branch filter
  ✓ should apply search filter
```

### E2E Tests — Phase 2 (`tests/e2e/graph.spec.ts`)

```
Commit Graph
  ✓ should display commit graph for opened repository
  ✓ should show branch labels on correct commits
  ✓ should scroll through large history (1000+ commits)
  ✓ should select commit and show details panel
  ✓ should right-click commit and show context menu
  ✓ should search commits and highlight results
  ✓ should filter graph by selected branch
  ✓ should navigate commits with keyboard arrows
```

---

## Phase 3: Core Git Operations (Weeks 7-9)

### Goals

Implement the essential daily-use Git commands with a polished UX.

### Tasks

#### 3.1 — Staging & Committing

- [ ] File tree view of working directory changes (staged/unstaged/untracked)
- [ ] Stage/unstage individual files, hunks, or lines
- [ ] Commit form (message editor, amend checkbox)
- [ ] Commit message templates and conventional commit helpers

#### 3.2 — Branching

- [ ] Create, rename, delete branches (local and remote)
- [ ] Checkout branch (with dirty-tree warnings)
- [ ] Fast-forward and no-ff merge
- [ ] Branch comparison view (ahead/behind)

#### 3.3 — Diff Viewer

- [ ] Side-by-side and inline diff views
- [ ] Syntax highlighting per language (using `shiki` or `highlight.js`)
- [ ] Hunk-level staging from diff view
- [ ] Word-level diff highlighting
- [ ] File navigation (previous/next changed file)

#### 3.4 — Tag Management

- [ ] Create lightweight and annotated tags
- [ ] Delete tags (local and remote)
- [ ] Push tags
- [ ] List and filter tags

### Unit Tests — Phase 3

#### Staging (`tests/unit/services/staging.test.ts`)

```
GitService.stageFile()
  ✓ should stage a single file
  ✓ should stage multiple files
  ✓ should handle paths with spaces and special characters

GitService.unstageFile()
  ✓ should unstage a staged file
  ✓ should handle unstaging in initial commit (no HEAD)

GitService.stageHunk()
  ✓ should apply patch for single hunk
  ✓ should handle binary files gracefully

GitService.discardChanges()
  ✓ should checkout file to HEAD version
  ✓ should remove untracked file
```

#### Commit (`tests/unit/services/commit.test.ts`)

```
GitService.commit()
  ✓ should create commit with message
  ✓ should create commit with multi-line message
  ✓ should amend previous commit
  ✓ should reject empty commit message
  ✓ should handle commit hooks (pre-commit, commit-msg)
```

#### CommitForm Component (`tests/components/commits/CommitForm.test.tsx`)

```
CommitForm
  ✓ should enable commit button only with staged files and message
  ✓ should show character count for subject line
  ✓ should warn when subject exceeds 72 characters
  ✓ should support amend toggle
  ✓ should clear form after successful commit
```

#### Branch Operations (`tests/unit/services/branch.test.ts`)

```
GitService.createBranch()
  ✓ should create branch from HEAD
  ✓ should create branch from specific commit
  ✓ should reject invalid branch names

GitService.deleteBranch()
  ✓ should delete merged branch
  ✓ should warn on unmerged branch deletion
  ✓ should delete remote branch

GitService.renameBranch()
  ✓ should rename current branch
  ✓ should reject if target name exists

GitService.checkout()
  ✓ should switch to existing branch
  ✓ should create and switch to new branch (-b)
  ✓ should warn about uncommitted changes
  ✓ should handle detached HEAD checkout

GitService.merge()
  ✓ should fast-forward merge
  ✓ should no-ff merge
  ✓ should detect and report merge conflicts
  ✓ should abort merge
```

#### Diff Parser (`tests/unit/services/diff-parser.test.ts`)

```
Diff Parser
  ✓ should parse unified diff format
  ✓ should parse file additions (new file)
  ✓ should parse file deletions
  ✓ should parse file renames with similarity index
  ✓ should parse binary file changes
  ✓ should parse multiple hunks
  ✓ should handle no-newline-at-end-of-file
  ✓ should parse word-level diff (--word-diff)
```

#### DiffViewer Component (`tests/components/diff/DiffViewer.test.tsx`)

```
DiffViewer
  ✓ should render side-by-side view
  ✓ should render inline view
  ✓ should toggle between side-by-side and inline
  ✓ should apply syntax highlighting based on file extension
  ✓ should highlight added lines in green
  ✓ should highlight removed lines in red
  ✓ should show word-level changes within modified lines
  ✓ should allow staging individual hunks
  ✓ should navigate between files (prev/next)
  ✓ should show "Binary file" message for binary diffs
```

#### Tag Operations (`tests/unit/services/tag.test.ts`)

```
GitService.createTag()
  ✓ should create lightweight tag
  ✓ should create annotated tag with message
  ✓ should reject duplicate tag names

GitService.deleteTag()
  ✓ should delete local tag
  ✓ should delete remote tag

GitService.listTags()
  ✓ should list all tags
  ✓ should include tag message for annotated tags
  ✓ should include tagged commit hash
```

### E2E Tests — Phase 3

#### Staging & Commit (`tests/e2e/commit.spec.ts`)

```
Staging & Commit
  ✓ should show changed files in working tree panel
  ✓ should stage file by clicking stage button
  ✓ should unstage file by clicking unstage button
  ✓ should create commit with message
  ✓ should show new commit in graph after committing
  ✓ should amend previous commit
```

#### Branching (`tests/e2e/branch.spec.ts`)

```
Branching
  ✓ should create new branch from context menu
  ✓ should switch branches via branch selector
  ✓ should delete branch with confirmation dialog
  ✓ should show merge dialog and complete merge
  ✓ should show ahead/behind indicators for tracking branches
```

#### Diff Viewer (`tests/e2e/diff.spec.ts`)

```
Diff Viewer
  ✓ should show diff when clicking changed file
  ✓ should toggle between inline and side-by-side
  ✓ should stage hunk from diff view
  ✓ should navigate between changed files
```

---

## Phase 4: Stash, Interactive Rebase & Conflict Resolution (Weeks 10-12)

### Goals

Implement the advanced features that differentiate a power-user tool.

### Tasks

#### 4.1 — Stash Management

- [ ] Stash list panel with message, date, and branch context
- [ ] Stash save (with message, include untracked, keep index)
- [ ] Apply, pop, drop stash entries
- [ ] View stash diff (contents preview)

#### 4.2 — Interactive Rebase

- [ ] Drag-and-drop commit reordering
- [ ] Pick, reword, edit, squash, fixup, drop actions per commit
- [ ] Rebase progress indicator with abort/continue/skip controls
- [ ] Rebase conflict integration with conflict resolver

#### 4.3 — Conflict Resolution Tool

- [ ] 3-way merge viewer (base, ours, theirs -> result)
- [ ] Visual conflict markers with accept-left/right/both buttons
- [ ] Inline editing of merge result
- [ ] Mark file as resolved
- [ ] Abort merge/rebase from conflict view

### Unit Tests — Phase 4

#### Stash Operations (`tests/unit/services/stash.test.ts`)

```
GitService.stashSave()
  ✓ should stash changes with default message
  ✓ should stash with custom message
  ✓ should stash including untracked files (-u)
  ✓ should stash with --keep-index
  ✓ should report error if working tree is clean

GitService.stashList()
  ✓ should parse stash list with index, branch, message
  ✓ should handle empty stash list
  ✓ should parse stash entry dates

GitService.stashApply()
  ✓ should apply stash and keep it in list
  ✓ should report conflicts on apply

GitService.stashPop()
  ✓ should apply and remove stash from list
  ✓ should keep stash in list if conflicts occur

GitService.stashDrop()
  ✓ should remove specific stash entry
  ✓ should reject invalid stash index

GitService.stashShow()
  ✓ should return diff of stash contents
  ✓ should show stat summary
```

#### StashPanel Component (`tests/components/stash/StashPanel.test.tsx`)

```
StashPanel
  ✓ should display stash list with messages
  ✓ should show empty state when no stashes
  ✓ should call apply when Apply button clicked
  ✓ should call pop when Pop button clicked
  ✓ should confirm before dropping stash
  ✓ should show diff preview when selecting stash
```

#### Interactive Rebase (`tests/unit/services/rebase.test.ts`)

```
GitService.rebaseInteractive()
  ✓ should generate todo list from commit range
  ✓ should apply reordered commits
  ✓ should squash consecutive commits
  ✓ should reword commit message
  ✓ should drop specified commits
  ✓ should handle fixup action

GitService.rebaseContinue()
  ✓ should continue after conflict resolution
  ✓ should reject if conflicts remain

GitService.rebaseAbort()
  ✓ should restore original branch state

GitService.rebaseSkip()
  ✓ should skip current commit and continue

RebaseTodoParser
  ✓ should parse git-rebase-todo format
  ✓ should serialize actions back to todo format
  ✓ should validate action types
```

#### RebasePanel Component (`tests/components/rebase/RebasePanel.test.tsx`)

```
RebasePanel
  ✓ should display commits in rebase range
  ✓ should allow drag-and-drop reordering
  ✓ should change action via dropdown (pick/squash/reword/drop/fixup)
  ✓ should show rebase progress during execution
  ✓ should show abort/continue/skip buttons during rebase
  ✓ should disable start when no changes made
```

#### Conflict Resolution (`tests/unit/services/conflict.test.ts`)

```
GitService.getConflictedFiles()
  ✓ should list files with conflict markers
  ✓ should identify conflict type (content, rename, delete)

ConflictParser
  ✓ should parse 3-way conflict markers
  ✓ should extract base, ours, theirs sections
  ✓ should handle multiple conflicts in single file
  ✓ should handle nested conflict markers (rerere)

GitService.markResolved()
  ✓ should stage resolved file
  ✓ should reject file still containing conflict markers
```

#### MergeConflictViewer Component (`tests/components/merge/MergeConflictViewer.test.tsx`)

```
MergeConflictViewer
  ✓ should display 3-pane view (ours | base | theirs)
  ✓ should display result pane below
  ✓ should highlight conflict regions
  ✓ should accept "ours" when clicking accept-left
  ✓ should accept "theirs" when clicking accept-right
  ✓ should accept both when clicking accept-both
  ✓ should allow manual editing of result
  ✓ should mark file as resolved
  ✓ should show remaining conflicts count
```

### E2E Tests — Phase 4

#### Stash (`tests/e2e/stash.spec.ts`)

```
Stash
  ✓ should stash changes and show in stash list
  ✓ should apply stash and verify files restored
  ✓ should pop stash (apply + remove)
  ✓ should drop stash with confirmation
  ✓ should show stash diff in preview
```

#### Interactive Rebase (`tests/e2e/rebase.spec.ts`)

```
Interactive Rebase
  ✓ should start interactive rebase
  ✓ should squash two commits via drag
  ✓ should reword commit message
  ✓ should abort rebase in progress
  ✓ should handle rebase conflict and continue
```

#### Conflict Resolution (`tests/e2e/conflict.spec.ts`)

```
Conflict Resolution
  ✓ should detect merge conflicts and open resolver
  ✓ should resolve conflict by accepting ours
  ✓ should resolve conflict by accepting theirs
  ✓ should resolve conflict with manual edit
  ✓ should complete merge after all conflicts resolved
```

---

## Phase 5: Remote Operations & Platform Integration (Weeks 13-15)

### Goals

Remote management, GitHub/GitLab integration, and platform polish.

### Tasks

#### 5.1 — Remote Operations

- [ ] Fetch, pull, push with progress indicators
- [ ] Remote management (add, remove, rename remotes)
- [ ] Credential handling (SSH keys, HTTPS tokens via credential manager)
- [ ] Force push protection (confirmation dialog)

#### 5.2 — GitHub/GitLab Integration

- [ ] Detect hosting platform from remote URL
- [ ] View and create Pull Requests / Merge Requests
- [ ] PR status badges on branches
- [ ] Open file/commit on web (right-click action)

#### 5.3 — Platform Polish

- [ ] Native window frame (custom title bar on Windows/Linux, native on macOS)
- [ ] System tray integration
- [ ] Dark/light theme with system preference detection
- [ ] Keyboard shortcut reference (Ctrl+K command palette)
- [ ] Auto-update mechanism via `electron-updater`
- [ ] Application menu with all operations

### Unit Tests — Phase 5

#### Remote Operations (`tests/unit/services/remote.test.ts`)

```
GitService.fetch()
  ✓ should fetch from default remote
  ✓ should fetch from specific remote
  ✓ should fetch all remotes (--all)
  ✓ should emit progress events

GitService.pull()
  ✓ should pull with rebase
  ✓ should pull with merge
  ✓ should detect conflicts during pull
  ✓ should report upstream not set error

GitService.push()
  ✓ should push to tracking remote
  ✓ should push with --set-upstream
  ✓ should detect rejected push (non-fast-forward)
  ✓ should force push with lease
  ✓ should push specific branch

GitService.remoteManagement()
  ✓ should list remotes with URLs
  ✓ should add new remote
  ✓ should remove remote
  ✓ should rename remote
```

#### GitHub/GitLab Integration (`tests/unit/services/hosting.test.ts`)

```
detectHostingPlatform()
  ✓ should detect GitHub from HTTPS URL
  ✓ should detect GitHub from SSH URL
  ✓ should detect GitLab from URL
  ✓ should detect Bitbucket from URL
  ✓ should return null for unknown hosts

GitHubService
  ✓ should fetch pull requests for repository
  ✓ should create pull request
  ✓ should parse PR status (open, merged, closed)
  ✓ should handle API rate limiting
```

#### Theme & Preferences (`tests/unit/stores/preferences-store.test.ts`)

```
PreferencesStore
  ✓ should default to system theme preference
  ✓ should toggle between dark and light theme
  ✓ should persist theme selection
  ✓ should store and retrieve keyboard shortcuts
  ✓ should store editor font size preference
```

#### CommandPalette Component (`tests/components/layout/CommandPalette.test.tsx`)

```
CommandPalette
  ✓ should open on Ctrl+K
  ✓ should filter commands by query
  ✓ should execute selected command
  ✓ should close on Escape
  ✓ should show keyboard shortcut hints
```

### E2E Tests — Phase 5

#### Remote Operations (`tests/e2e/remote.spec.ts`)

```
Remote Operations
  ✓ should fetch from remote and update branches
  ✓ should push commits to remote
  ✓ should pull changes from remote
  ✓ should show force-push confirmation dialog
  ✓ should add and remove remote
```

#### Platform (`tests/e2e/platform.spec.ts`)

```
Platform
  ✓ should toggle dark/light theme
  ✓ should open command palette with Ctrl+K
  ✓ should persist window size and position
  ✓ should check for updates on launch
```

---

## Phase 6: Performance, Testing & Release (Weeks 16-18)

### Goals

Optimize for large repositories, finalize testing, and prepare for release.

### Tasks

#### 6.1 — Performance Optimization

- [ ] Profile and optimize graph rendering for 100k+ commit repos
- [ ] Implement commit caching (`Map<hash, Commit>`)
- [ ] Background file watcher for auto-refresh (`chokidar` or `fs.watch`)
- [ ] Lazy loading for diffs and file contents
- [ ] OffscreenCanvas for graph if frame drops detected

#### 6.2 — Cross-Platform Testing Matrix

- [ ] Test on Windows 10/11, macOS 13+, Ubuntu 22.04+
- [ ] Test with various git versions (2.30+)
- [ ] Test with large repos (Linux kernel, Chromium)
- [ ] Accessibility audit (screen reader, keyboard-only navigation)

#### 6.3 — Release Pipeline

- [ ] Code signing (Windows: EV cert, macOS: Developer ID + notarization)
- [ ] Auto-update publish to GitHub Releases
- [ ] Generate changelog from conventional commits
- [ ] Create landing page and documentation

### Performance Tests (`tests/perf/large-repo.test.ts`)

```
Large Repository Performance
  ✓ should load 10,000 commits graph in under 2 seconds
  ✓ should scroll graph at 60fps with 100k commits loaded
  ✓ should parse git log of 50k commits in under 3 seconds
  ✓ should not exceed 500MB memory with 100k commits
  ✓ should incrementally load commits (500 per batch)
  ✓ lane assignment should complete in under 100ms for 10k commits
```

### File Watcher Tests (`tests/unit/services/watcher.test.ts`)

```
File Watcher
  ✓ should detect new file creation
  ✓ should detect file modification
  ✓ should detect file deletion
  ✓ should debounce rapid file changes
  ✓ should ignore .git directory changes
  ✓ should trigger status refresh on change
```

---

## Summary Timeline

| Phase | Duration  | Deliverable                                        |
| ----- | --------- | -------------------------------------------------- |
| 1     | Weeks 1-3 | Scaffold, Git service, open/clone/init repos       |
| 2     | Weeks 4-6 | Interactive branch graph with commit details        |
| 3     | Weeks 7-9 | Stage, commit, branch, diff viewer, tags           |
| 4     | Weeks 10-12 | Stash management, interactive rebase, 3-way merge |
| 5     | Weeks 13-15 | Push/pull/fetch, GitHub integration, theming       |
| 6     | Weeks 16-18 | Optimization, cross-platform testing, packaging   |

---

## Test Summary

| Category              | Estimated Count |
| --------------------- | --------------- |
| Git Service unit tests | ~80            |
| Parser unit tests      | ~30            |
| Store unit tests       | ~25            |
| Component tests        | ~70            |
| E2E tests              | ~40            |
| Performance tests      | ~10            |
| **Total**              | **~255 tests** |

---

## Technical References

### Git Log Parsing Format

```bash
# NUL-delimited fields, double-NUL record separator
git log \
  --format='%H%x00%h%x00%P%x00%an%x00%ae%x00%aI%x00%s%x00%D%x00%x00' \
  --topo-order --all -n 500
```

### Key Flags for Machine-Readable Output

| Command       | Flag                       | Purpose                              |
| ------------- | -------------------------- | ------------------------------------ |
| `git status`  | `--porcelain=v2 --branch`  | Machine-readable status with branch  |
| `git log`     | `--format=<NUL-delimited>` | Structured commit data               |
| `git branch`  | `--format=%(refname:short)` | Structured branch list              |
| `git diff`    | `--unified=3`              | Standard unified diff                |
| `git stash`   | `list --format=...`        | Structured stash entries             |

### Environment Variables

| Variable               | Value | Purpose                                |
| ---------------------- | ----- | -------------------------------------- |
| `GIT_TERMINAL_PROMPT`  | `0`   | Prevent interactive prompts from hanging |
| `GIT_ASKPASS`          | (custom) | Credential handling                 |

---

## Appendix: Git Service API Surface

```typescript
// Core operations the GitService must implement across all phases
interface GitService {
  // Phase 1
  exec(args: string[], cwd: string): Promise<string>;
  status(repoPath: string): Promise<GitStatus>;
  log(repoPath: string, options?: LogOptions): Promise<Commit[]>;
  branches(repoPath: string): Promise<Branch[]>;
  clone(url: string, targetDir: string, onProgress?: (p: number) => void): Promise<void>;
  init(dir: string): Promise<void>;

  // Phase 3
  stageFile(repoPath: string, filePath: string): Promise<void>;
  unstageFile(repoPath: string, filePath: string): Promise<void>;
  stageHunk(repoPath: string, patch: string): Promise<void>;
  discardChanges(repoPath: string, filePath: string): Promise<void>;
  commit(repoPath: string, message: string, options?: CommitOptions): Promise<string>;
  createBranch(repoPath: string, name: string, startPoint?: string): Promise<void>;
  deleteBranch(repoPath: string, name: string, force?: boolean): Promise<void>;
  renameBranch(repoPath: string, oldName: string, newName: string): Promise<void>;
  checkout(repoPath: string, ref: string, options?: CheckoutOptions): Promise<void>;
  merge(repoPath: string, branch: string, options?: MergeOptions): Promise<MergeResult>;
  diff(repoPath: string, options?: DiffOptions): Promise<string>;
  createTag(repoPath: string, name: string, options?: TagOptions): Promise<void>;
  deleteTag(repoPath: string, name: string, remote?: boolean): Promise<void>;
  listTags(repoPath: string): Promise<Tag[]>;

  // Phase 4
  stashSave(repoPath: string, options?: StashOptions): Promise<void>;
  stashList(repoPath: string): Promise<StashEntry[]>;
  stashApply(repoPath: string, index?: number): Promise<void>;
  stashPop(repoPath: string, index?: number): Promise<void>;
  stashDrop(repoPath: string, index: number): Promise<void>;
  stashShow(repoPath: string, index: number): Promise<string>;
  rebaseInteractive(repoPath: string, onto: string, actions: RebaseAction[]): Promise<void>;
  rebaseContinue(repoPath: string): Promise<void>;
  rebaseAbort(repoPath: string): Promise<void>;
  rebaseSkip(repoPath: string): Promise<void>;
  getConflictedFiles(repoPath: string): Promise<ConflictFile[]>;
  markResolved(repoPath: string, filePath: string): Promise<void>;

  // Phase 5
  fetch(repoPath: string, remote?: string, options?: FetchOptions): Promise<void>;
  pull(repoPath: string, options?: PullOptions): Promise<PullResult>;
  push(repoPath: string, options?: PushOptions): Promise<void>;
  addRemote(repoPath: string, name: string, url: string): Promise<void>;
  removeRemote(repoPath: string, name: string): Promise<void>;
  listRemotes(repoPath: string): Promise<Remote[]>;
}
```
