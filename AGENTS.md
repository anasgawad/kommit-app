# Kommit — AI Agent Instructions

This file contains project context, conventions, and instructions for AI coding assistants working on the Kommit codebase.

## Project Overview

**Kommit** is a cross-platform (Windows/Linux/Mac) desktop Git GUI for experienced developers. It provides a UI for most Git commands, featuring an interactive visual commit/branch history graph.

- **Display name:** Kommit
- **npm/GitHub namespace:** `kommit-app`
- **Project directory:** `D:\Projects\kommit-app`

## Master Plan

**Always read `PLAN.md` before starting new work.** It contains all 6 phases, task checklists, data structures, algorithms, complete unit/component/E2E test specifications (~255 tests), and the full GitService API surface.

### Development Phases

| Phase | Focus | Weeks | Status |
|-------|-------|-------|--------|
| 1 | Foundation & Repository Management | 1-3 | Scaffolded (not yet verified — Node.js not installed) |
| 2 | Commit Graph & Branch Visualization | 4-6 | Not started |
| 3 | Core Git Operations | 7-9 | Not started |
| 4 | Stash, Interactive Rebase & Conflict Resolution | 10-12 | Not started |
| 5 | Remote Operations & Platform Integration | 13-15 | Not started |
| 6 | Performance, Testing & Release | 16-18 | Not started |

### Critical Note

Phase 1 code has been fully written (38 files) but **never compiled or tested**. Node.js is not yet installed on the dev machine. Before starting Phase 2, verify Phase 1 by running `npm install`, `npm test`, and `npm run build`.

## Technology Stack

| Concern | Choice |
|---------|--------|
| Framework | Electron + React 19 + TypeScript 5.x |
| Bundler | `electron-vite` (Vite for all processes) |
| Packaging | `electron-builder` |
| State management | Zustand |
| Git integration | `child_process.execFile('git', ...)` in main process |
| Graph rendering | Custom SVG per-row inside `@tanstack/react-virtual` |
| Styling | Tailwind CSS |
| Unit/component tests | Vitest + React Testing Library |
| E2E tests | Playwright (Electron support) |
| Auto-update | `electron-updater` via GitHub Releases |

## Architecture

### Process Model (Electron)

```
Main Process (Node.js)          Preload (contextBridge)         Renderer (React)
├── services/git.ts             └── index.ts                    ├── stores/ (Zustand)
├── services/git-parser.ts          exposes window.api          ├── components/
├── services/repo.ts                                            └── hooks/
└── ipc/ (handlers)
```

- **Strict process separation:** Renderer NEVER has direct Node.js access
- `contextIsolation: true`, `nodeIntegration: false` — always enforced
- All native operations go through IPC via `contextBridge`
- All IPC channels defined in `src/shared/ipc-channels.ts` as single source of truth

### Git Integration

- Shell out to system `git` via `child_process.execFile` (NOT `exec`, NOT libgit2/nodegit)
- `GIT_TERMINAL_PROMPT=0` to prevent interactive prompts
- `GIT_ASKPASS=''` to prevent GUI credential helpers from hanging
- `LANG=en_US.UTF-8` for consistent output language
- `windowsHide: true` on all child processes
- `maxBuffer: 10MB` default
- Git log uses NUL-byte delimited format (`%x00`) with double-NUL record separators for unambiguous parsing
- Status parsing uses porcelain v2 (`--porcelain=v2 --branch`)
- Branch parsing uses NUL-delimited `--format` strings

### Path Aliases

TypeScript path alias `@shared/*` maps to `src/shared/*`. Use this in all main process and shared imports:
```typescript
import { GitStatus } from '@shared/types'
```

## Code Conventions

### TypeScript

- Strict mode enabled (`"strict": true`)
- Target: ES2022, Module: ESNext, Module resolution: bundler
- No semicolons (enforced by Prettier)
- Single quotes (enforced by Prettier)
- No trailing commas (enforced by Prettier)
- 100 char print width
- 2-space indentation
- Arrow parens always: `(x) => x`
- Unused vars prefixed with `_` are allowed (`argsIgnorePattern: '^_'`)
- `@typescript-eslint/no-explicit-any` is warn (not error)
- `explicit-function-return-type` is off

### File Headers

Source files use a banner comment:
```typescript
// ============================================================
// Kommit — <Short Description>
// <Optional second line>
// ============================================================
```

### Exports

- Services export a singleton instance: `export const gitService = new GitService()`
- Types are exported from `src/shared/types.ts`
- IPC channels are exported from `src/shared/ipc-channels.ts`

### Error Handling

Custom error classes defined in `src/shared/types.ts`:
- `GitError` — generic git command failure (includes command, exitCode, stderr)
- `GitNotFoundError` — git binary not found (ENOENT)
- `NotARepositoryError` — path is not a git repository

## Testing Conventions

### Unit Tests (`tests/unit/`)

- Framework: Vitest
- Config: `vitest.config.ts`
- Import pattern: `import { describe, it, expect, vi, beforeEach } from 'vitest'`
- Use `vi.mock()` for module mocking, `vi.fn()` for function mocks
- Use `vi.mocked()` to get typed mock references
- Tests use relative imports to source files (e.g., `../../../src/main/services/git`)
- Helper functions for common mock patterns (e.g., `mockExecSuccess`, `mockExecFailure`)
- Each `describe` block corresponds to a class or module
- Each nested `describe` corresponds to a method
- Each `it` tests a single behavior

### Component Tests (`tests/components/`)

- Framework: Vitest + React Testing Library + jsdom
- Config: `vitest.config.components.ts`
- Setup file: `tests/components/setup.ts`
- Use `@testing-library/react` for rendering, `@testing-library/jest-dom` for assertions
- Mock `window.api` (the preload bridge) in component tests

### E2E Tests (`tests/e2e/`)

- Framework: Playwright
- Config: `playwright.config.ts`

### Test File Naming

- Unit: `tests/unit/<category>/<name>.test.ts`
- Component: `tests/components/<category>/<Name>.test.tsx`
- E2E: `tests/e2e/<name>.spec.ts`

### Test Specifications

All test cases are pre-defined in PLAN.md. When implementing tests, follow the exact test descriptions specified there. Phase 2 tests include:
- `tests/unit/graph/lane-algorithm.test.ts` (10 tests)
- `tests/unit/graph/colors.test.ts` (4 tests)
- `tests/components/graph/GraphRow.test.tsx` (8 tests)
- `tests/components/graph/CommitGraph.test.tsx` (8 tests)
- `tests/components/commits/CommitDetail.test.tsx` (7 tests)
- `tests/unit/stores/graph-store.test.ts` (6 tests)
- `tests/e2e/graph.spec.ts` (8 tests)

## Project Structure

```
kommit-app/
├── PLAN.md                          # Master development plan (READ THIS FIRST)
├── AGENTS.md                        # This file
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml
├── tsconfig.json                    # Base config
├── tsconfig.node.json               # Main process
├── tsconfig.web.json                # Renderer
├── eslint.config.mjs                # ESLint flat config
├── .prettierrc
├── vitest.config.ts                 # Unit tests
├── vitest.config.components.ts      # Component tests (jsdom)
├── playwright.config.ts             # E2E tests
├── tailwind.config.ts
├── src/
│   ├── shared/
│   │   ├── types.ts                 # ALL TypeScript types and error classes
│   │   └── ipc-channels.ts          # ALL IPC channel constants
│   ├── main/
│   │   ├── index.ts                 # Electron main process entry
│   │   ├── ipc/
│   │   │   ├── git-handlers.ts      # IPC handlers for git operations
│   │   │   └── repo-handlers.ts     # IPC handlers for repo management
│   │   └── services/
│   │       ├── git.ts               # GitService class (CLI wrapper)
│   │       ├── git-parser.ts        # parseStatus, parseLog, parseBranches
│   │       └── repo.ts             # RepoService (recent repos persistence)
│   ├── preload/
│   │   └── index.ts                 # contextBridge API
│   └── renderer/
│       ├── index.html
│       ├── main.tsx                 # React entry point
│       ├── App.tsx
│       ├── env.d.ts                 # Window.api type declaration
│       ├── styles/
│       │   └── globals.css          # Tailwind + dark/light theme CSS vars
│       ├── stores/
│       │   └── repo-store.ts        # Zustand store
│       └── components/
│           ├── repo/
│           │   └── WelcomeScreen.tsx
│           ├── graph/               # Phase 2 (to be created)
│           ├── commits/             # Phase 2+ (to be created)
│           ├── diff/                # Phase 3 (to be created)
│           ├── branches/            # Phase 3 (to be created)
│           ├── stash/               # Phase 4 (to be created)
│           ├── rebase/              # Phase 4 (to be created)
│           ├── merge/               # Phase 4 (to be created)
│           ├── remote/              # Phase 5 (to be created)
│           └── layout/
│               ├── AppLayout.tsx
│               ├── Sidebar.tsx
│               └── StatusBar.tsx
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── git.test.ts          # 22 tests
│   │   │   └── git-parser.test.ts   # 26 tests
│   │   ├── ipc/
│   │   │   └── git-handlers.test.ts # 6 tests
│   │   ├── stores/
│   │   │   └── repo-store.test.ts   # 11 tests
│   │   └── graph/                   # Phase 2 (to be created)
│   ├── components/
│   │   ├── setup.ts
│   │   ├── repo/
│   │   │   └── WelcomeScreen.test.tsx # 9 tests
│   │   ├── graph/                   # Phase 2 (to be created)
│   │   └── commits/                 # Phase 2 (to be created)
│   └── e2e/
│       ├── repo.spec.ts             # 4 tests
│       └── graph.spec.ts            # Phase 2 (to be created)
└── resources/                       # App icons (empty placeholder)
```

## Key Algorithms

### Lane Assignment (Commit Graph)

The graph rendering uses a custom lane assignment algorithm (~50 lines, O(n)) defined in PLAN.md. Key properties:
- Commits arrive in topological order (git log default)
- Each lane tracks which commit hash it "expects" next
- First parent continues the lane; additional parents (merges) get new lanes
- Freed lanes (trailing nulls) are compacted
- Colors are deterministic per branch name

### Git Log Format

```bash
git log --format='%H%x00%h%x00%P%x00%an%x00%ae%x00%aI%x00%s%x00%D%x00%x00' --topo-order --all
```

Fields: hash, abbreviated hash, parents (space-separated), author name, author email, author date (ISO 8601), subject, ref names. Fields separated by NUL, records separated by double-NUL.

## Common Commands

```bash
npm run dev          # Start Electron in dev mode
npm run build        # Build all processes
npm test             # Run unit + component tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
npm run format       # Prettier
```

## Things to Avoid

- Do NOT use `exec()` for git commands — always `execFile()` (no shell injection)
- Do NOT import Node.js modules in the renderer process
- Do NOT add `nodeIntegration: true` or set `contextIsolation: false`
- Do NOT use libgit2, nodegit, isomorphic-git, or similar — only CLI git
- Do NOT use a graph rendering library (D3, vis.js, etc.) — custom SVG only
- Do NOT skip the preload bridge — all IPC goes through `contextBridge`
- Do NOT add new IPC channels without adding them to `src/shared/ipc-channels.ts`
- Do NOT add new types without adding them to `src/shared/types.ts`
