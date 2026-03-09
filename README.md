# Kommit

A powerful cross-platform Git GUI for experienced developers. Kommit provides a visual interface for most Git commands, featuring an interactive commit/branch history graph built with custom SVG rendering.

> **Status:** Phase 1 (Foundation & Repository Management) is complete. The app can open, clone, and initialize repositories, display git status and branch information, and manage a recent repositories list. See [PLAN.md](PLAN.md) for the full development roadmap.

## Features

### Phase 1 (Current)

- **Open repositories** via native directory picker
- **Clone repositories** with progress reporting
- **Initialize** new git repositories
- **Real-time git status** -- staged, unstaged, untracked, and conflicted files with counts
- **Branch listing** -- local and remote branches with current branch highlighting
- **Tracking info** -- ahead/behind counts relative to upstream
- **Recent repositories** -- persistent history (up to 20), sorted by last opened
- **Dark theme** -- Catppuccin Mocha-inspired color scheme with custom scrollbars
- **Window state persistence** -- remembers size and position across sessions
- **Detached HEAD detection** -- clear indication when HEAD is not on a branch

### Planned

- Phase 2: Commit graph & branch visualization (custom SVG)
- Phase 3: Core git operations (staging, committing, diffing, branching)
- Phase 4: Stash, interactive rebase & conflict resolution
- Phase 5: Remote operations & platform integration
- Phase 6: Performance, testing & release

## Tech Stack

| Concern              | Technology                                                 |
| -------------------- | ---------------------------------------------------------- |
| Framework            | Electron 34 + React 19 + TypeScript 5.7                    |
| Bundler              | electron-vite (Vite for all processes)                     |
| Packaging            | electron-builder                                           |
| State management     | Zustand 5                                                  |
| Git integration      | `child_process.execFile('git', ...)` -- no libgit2/nodegit |
| Styling              | Tailwind CSS 3                                             |
| Unit/component tests | Vitest + React Testing Library                             |
| E2E tests            | Playwright (Electron support)                              |
| Auto-update          | electron-updater via GitHub Releases                       |

## Prerequisites

- **Node.js** >= 18 (LTS recommended)
- **Git** >= 2.30 (must be in PATH)
- **OS:** Windows 10+, macOS 12+, or Ubuntu 20.04+

## Getting Started

```bash
# Clone the repository
git clone https://github.com/kommit-app/kommit.git
cd kommit-app

# Install dependencies
npm install

# Start in development mode (hot-reload)
npm run dev

# Run tests
npm test
```

The app will open an Electron window. On first launch you'll see the Welcome Screen with options to open, clone, or initialize a repository.

## Project Structure

```
kommit-app/
├── PLAN.md                          # Master development plan (all 6 phases)
├── AGENTS.md                        # AI agent instructions
├── MANUAL-TESTS.md                  # Phase 1 manual test cases
├── package.json
├── electron.vite.config.ts          # Vite config for all processes
├── electron-builder.yml             # Packaging config
├── tsconfig.json                    # Base TypeScript config
├── tsconfig.node.json               # Main process TypeScript config
├── tsconfig.web.json                # Renderer TypeScript config
├── vitest.config.ts                 # Unit test config
├── vitest.config.components.ts      # Component test config (jsdom)
├── playwright.config.ts             # E2E test config
├── tailwind.config.ts               # Tailwind with custom Kommit tokens
├── src/
│   ├── shared/
│   │   ├── types.ts                 # All TypeScript types and error classes
│   │   └── ipc-channels.ts          # All IPC channel constants
│   ├── main/
│   │   ├── index.ts                 # Electron main process entry
│   │   ├── services/
│   │   │   ├── git.ts               # GitService -- CLI wrapper (execFile)
│   │   │   ├── git-parser.ts        # parseStatus, parseLog, parseBranches
│   │   │   └── repo.ts             # RepoService -- recent repos persistence
│   │   └── ipc/
│   │       ├── git-handlers.ts      # IPC handlers for git operations
│   │       └── repo-handlers.ts     # IPC handlers for repo management
│   ├── preload/
│   │   └── index.ts                 # contextBridge API (window.api)
│   └── renderer/
│       ├── index.html               # HTML entry with CSP
│       ├── main.tsx                  # React entry point
│       ├── App.tsx                   # Root component
│       ├── env.d.ts                 # window.api type declaration
│       ├── styles/
│       │   └── globals.css          # Tailwind + dark/light theme variables
│       ├── stores/
│       │   └── repo-store.ts        # Zustand store
│       └── components/
│           ├── layout/
│           │   ├── AppLayout.tsx     # Main app layout (title bar, sidebar, content)
│           │   ├── Sidebar.tsx       # Branch list, repo info, changes summary
│           │   └── StatusBar.tsx     # Bottom bar with status info
│           └── repo/
│               └── WelcomeScreen.tsx # Onboarding screen
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── git.test.ts          # 30 tests -- GitService
│   │   │   └── git-parser.test.ts   # 26 tests -- parsers
│   │   ├── ipc/
│   │   │   └── git-handlers.test.ts # 6 tests -- IPC handlers
│   │   └── stores/
│   │       └── repo-store.test.ts   # 11 tests -- Zustand store
│   ├── components/
│   │   ├── setup.ts                 # Testing Library setup
│   │   └── repo/
│   │       └── WelcomeScreen.test.tsx # 9 tests
│   └── e2e/
│       └── repo.spec.ts             # 4 tests -- app launch & repo flows
└── resources/                       # App icons (placeholder)
```

## Architecture

### Process Model

Kommit follows Electron's three-process architecture with strict security boundaries:

```
Main Process (Node.js)          Preload (contextBridge)         Renderer (React)
├── services/git.ts             └── index.ts                    ├── stores/ (Zustand)
├── services/git-parser.ts          exposes window.api          ├── components/
├── services/repo.ts                  ├── api.git.*             └── hooks/
└── ipc/ (handlers)                   ├── api.repo.*
                                      ├── api.dialog.*
                                      └── api.on()
```

### Security

- `contextIsolation: true` -- renderer cannot access Node.js APIs
- `nodeIntegration: false` -- no `require()` in renderer
- All IPC goes through `contextBridge` (preload bridge)
- Git commands use `execFile()` (not `exec()`) to prevent shell injection
- `GIT_TERMINAL_PROMPT=0` and `GIT_ASKPASS=''` prevent interactive prompts
- `windowsHide: true` on all child processes
- Content Security Policy enforced in `index.html`

### Data Flow

1. User interaction triggers a Zustand store action
2. Store calls `window.api.*` (preload bridge)
3. Preload forwards via `ipcRenderer.invoke()` to main process
4. IPC handler calls `GitService` which runs `git` via `execFile`
5. Raw output is parsed by `git-parser.ts` into typed structures
6. Result returns through IPC back to the store
7. React components re-render from updated store state

### Git Integration

All git operations shell out to the system `git` binary via `child_process.execFile`. Key design decisions:

- NUL-byte delimited format (`%x00`) for unambiguous log parsing
- Porcelain v2 (`--porcelain=v2 --branch`) for status parsing
- NUL-delimited `--format` strings for branch parsing
- 10MB default `maxBuffer`, 500MB for clone operations
- Custom error classes: `GitError`, `GitNotFoundError`, `NotARepositoryError`

## Scripts

| Script                  | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Start Electron in development mode with hot-reload |
| `npm run build`         | Build all processes (main, preload, renderer)      |
| `npm run preview`       | Preview the production build                       |
| `npm test`              | Run unit + component tests (Vitest)                |
| `npm run test:watch`    | Run tests in watch mode                            |
| `npm run test:coverage` | Run tests with V8 coverage report                  |
| `npm run test:e2e`      | Run Playwright E2E tests                           |
| `npm run lint`          | Check code with ESLint                             |
| `npm run lint:fix`      | Auto-fix ESLint issues                             |
| `npm run format`        | Format code with Prettier                          |
| `npm run format:check`  | Check formatting without writing                   |
| `npm run build:win`     | Build + package for Windows (NSIS installer)       |
| `npm run build:mac`     | Build + package for macOS (DMG, x64 + arm64)       |
| `npm run build:linux`   | Build + package for Linux (AppImage + deb)         |

## Testing

### Unit & Component Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

- **Unit tests** (`tests/unit/`): Run in Node.js environment via Vitest. Cover `GitService`, parsers, IPC handlers, and the Zustand store.
- **Component tests** (`tests/components/`): Run in jsdom environment via Vitest + React Testing Library. Cover React components with a mocked `window.api`.

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e
```

E2E tests launch the full Electron app using Playwright and test end-to-end user flows.

### Manual Tests

See [MANUAL-TESTS.md](MANUAL-TESTS.md) for a comprehensive checklist of manual test cases for Phase 1.

## Packaging

```bash
# Windows -- produces NSIS installer in dist/
npm run build:win

# macOS -- produces DMG in dist/ (universal: x64 + arm64)
npm run build:mac

# Linux -- produces AppImage and .deb in dist/
npm run build:linux
```

Packaged apps are output to the `dist/` directory. Auto-update is configured to publish to GitHub Releases.

## Contributing

### Code Conventions

- **No semicolons**, single quotes, no trailing commas (Prettier-enforced)
- 100 character line width, 2-space indentation
- Arrow parens always: `(x) => x`
- TypeScript strict mode enabled
- Unused variables prefixed with `_` are allowed

### File Conventions

- All types go in `src/shared/types.ts`
- All IPC channels go in `src/shared/ipc-channels.ts`
- Services export singleton instances
- Source files use a banner comment:

```typescript
// ============================================================
// Kommit — <Short Description>
// ============================================================
```

### Key Rules

- Never use `exec()` for git commands -- always `execFile()`
- Never import Node.js modules in the renderer
- Never set `nodeIntegration: true` or `contextIsolation: false`
- All IPC goes through the preload `contextBridge`
- No third-party graph libraries -- custom SVG only

## License

[MIT](LICENSE)
