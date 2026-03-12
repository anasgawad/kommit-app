# Kommit -- Phase 1 Manual Test Cases

Manual test checklist for Phase 1 (Foundation & Repository Management).

> **Important:** Phase 1 code has been written but never compiled or tested. Complete the Pre-flight section first before running any other tests.

**Test Environment:**

- OS: ******\_\_\_******
- Node.js version: ******\_\_\_******
- Git version: ******\_\_\_******
- Date: ******\_\_\_******
- Tester: ******\_\_\_******

---

## 1. Pre-flight Verification

These must pass before any other testing can begin.

### 1.1 Install Dependencies

| #     | Test Case              | Steps                                 | Expected Result                                                                                    | Pass |
| ----- | ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| 1.1.1 | npm install succeeds   | Run `npm install` in the project root | All dependencies install without errors. `node_modules/` is created. No peer dependency conflicts. | [✅]  |
| 1.1.2 | Post-install hook runs | Observe output after `npm install`    | `electron-builder install-app-deps` runs successfully                                              | [✅]  |

### 1.2 Build

| #     | Test Case           | Steps                              | Expected Result                                                                            | Pass |
| ----- | ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ | ---- |
| 1.2.1 | TypeScript compiles | Run `npm run build`                | Build completes with no TypeScript errors. Output files are generated in `out/` directory. | [✅]  |
| 1.2.2 | No type errors      | Check build output for type errors | Zero type errors across all three processes (main, preload, renderer)                      | [✅]  |

### 1.3 Automated Tests

| #     | Test Case        | Steps              | Expected Result                                       | Pass |
| ----- | ---------------- | ------------------ | ----------------------------------------------------- | ---- |
| 1.3.1 | Unit tests pass  | Run `npm test`     | All unit and component tests pass (86 tests expected) | [✅]  |
| 1.3.2 | No test failures | Review test output | 0 failures, 0 errors                                  | [✅]  |

### 1.4 Code Quality

| #     | Test Case             | Steps                      | Expected Result                            | Pass |
| ----- | --------------------- | -------------------------- | ------------------------------------------ | ---- |
| 1.4.1 | Lint passes           | Run `npm run lint`         | No ESLint errors (warnings are acceptable) | [✅]  |
| 1.4.2 | Formatting is correct | Run `npm run format:check` | All files are properly formatted           | [✅]  |

---

## 2. Application Launch

### 2.1 First Launch

| #     | Test Case           | Steps                                     | Expected Result                                                      | Pass |
| ----- | ------------------- | ----------------------------------------- | -------------------------------------------------------------------- | ---- |
| 2.1.1 | App starts          | Run `npm run dev`                         | Electron window opens without crash or error in terminal             | [✅]  |
| 2.1.2 | Default window size | Observe window dimensions                 | Window opens at approximately 1280x800 pixels                        | [✅]  |
| 2.1.3 | Minimum window size | Try to resize window smaller than 800x600 | Window cannot be resized below 800x600                               | [✅]  |
| 2.1.4 | Dark background     | Observe window background                 | Background is dark (Catppuccin Mocha `#1e1e2e`) before content loads | [✅]  |
| 2.1.5 | No console errors   | Open DevTools (Ctrl+Shift+I / Cmd+Opt+I)  | No errors in the console on initial load                             | [✅]  |

### 2.2 Window State Persistence

| #     | Test Case            | Steps                                                                                               | Expected Result                                    | Pass |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---- |
| 2.2.1 | Size is restored     | 1. Resize window to a non-default size (e.g., 1000x700) 2. Close the app 3. Run `npm run dev` again | Window opens at the previously set size (1000x700) | [✅]  |
| 2.2.2 | Position is restored | 1. Move window to a different position on screen 2. Close the app 3. Run `npm run dev` again        | Window opens at the previously set position        | [✅]  |

---

## 3. Welcome Screen

### 3.1 UI Elements

| #     | Test Case            | Steps                        | Expected Result                                                                  | Pass |
| ----- | -------------------- | ---------------------------- | -------------------------------------------------------------------------------- | ---- |
| 3.1.1 | Heading displayed    | Observe the welcome screen   | "Kommit" heading is visible and prominently displayed                            | [✅]  |
| 3.1.2 | Tagline displayed    | Observe below the heading    | A tagline/description text is visible                                            | [✅]  |
| 3.1.3 | Open button present  | Look for action buttons      | "Open Repository" button is visible and clickable                                | [✅]  |
| 3.1.4 | Clone button present | Look for action buttons      | "Clone Repository" button is visible and clickable                               | [✅]  |
| 3.1.5 | Init button present  | Look for action buttons      | "Init Repository" button is visible and clickable                                | [✅]  |
| 3.1.6 | Empty recent list    | First launch with no history | Recent repositories section is either empty or shows a "no recent repos" message | [✅]  |

---

## 4. Open Repository

### 4.1 Valid Git Repository

**Prerequisite:** Have a local git repository available (e.g., this project itself or any git-initialized directory).

| #      | Test Case                   | Steps                                     | Expected Result                                                                                            | Pass |
| ------ | --------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 4.1.1  | Dialog opens                | Click "Open Repository"                   | Native OS directory picker dialog appears                                                                  | [✅]  |
| 4.1.2  | Repo loads successfully     | Select a valid git repository directory   | App transitions from Welcome Screen to the main App Layout                                                 | [✅]  |
| 4.1.3  | Title bar shows             | After opening repo                        | Title bar at top displays "Kommit" and is visible                                                          | [✅]  |
| 4.1.4  | Sidebar shows repo name     | After opening repo                        | Sidebar displays the repository name (directory name)                                                      | [✅]  |
| 4.1.5  | Sidebar shows branch        | After opening repo                        | Sidebar shows the current branch name                                                                      | [✅]  |
| 4.1.6  | Sidebar shows branches list | After opening repo                        | Sidebar lists local branches, with current branch highlighted (accent color, `*` prefix)                   | [✅]  |
| 4.1.7  | Remote branches shown       | Open a repo with remote tracking branches | Sidebar shows a "Remote Branches" section listing remote branches                                          | [✅]  |
| 4.1.8  | Main panel shows info       | After opening repo                        | Main panel displays repo name, branch, and status information                                              | [✅]  |
| 4.1.9  | Status bar populated        | After opening repo                        | Status bar shows: branch name, upstream info (if tracking), clean/dirty status, repo path, "Kommit v0.1.0" | [✅]  |
| 4.1.10 | Phase 2 placeholder         | After opening repo                        | Main panel shows "Graph view coming in Phase 2" placeholder text                                           | [✅]  |

### 4.2 Non-Git Directory

**Prerequisite:** Have a directory that is NOT a git repository (e.g., `C:\Users` or any folder without `.git`).

| #     | Test Case               | Steps                                                    | Expected Result                                                          | Pass |
| ----- | ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| 4.2.1 | Error displayed         | 1. Click "Open Repository" 2. Select a non-git directory | Error message appears indicating it is not a git repository              | [✅]  |
| 4.2.2 | Stays on welcome screen | After the error in 4.2.1                                 | App remains on the Welcome Screen, does not navigate away                | [✅]  |
| 4.2.3 | Error is visible        | After the error in 4.2.1                                 | Error message is displayed in a visible error area (red/warning styling) | [✅]  |

### 4.3 Cancel Dialog

| #     | Test Case      | Steps                                                              | Expected Result                                         | Pass |
| ----- | -------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ---- |
| 4.3.1 | Cancel is safe | 1. Click "Open Repository" 2. Click Cancel in the directory picker | Nothing happens. No error. App stays on Welcome Screen. | [✅]  |

---

## 5. Init Repository

**Prerequisite:** Create an empty directory for testing (e.g., `test-init-repo`).

| #     | Test Case        | Steps                      | Expected Result                                                                   | Pass |
| ----- | ---------------- | -------------------------- | --------------------------------------------------------------------------------- | ---- |
| 5.1.1 | Dialog opens     | Click "Init Repository"    | Native OS directory picker dialog appears                                         | [✅]  |
| 5.1.2 | Repo initialized | Select the empty directory | `git init` is executed. A `.git` folder is created inside the selected directory. | [✅]  |
| 5.1.3 | App transitions  | After initialization       | App transitions from Welcome Screen to App Layout showing the new repository      | [✅]  |
| 5.1.4 | Branch shown     | After initialization       | Default branch name is displayed (likely "main" or "master")                      | [✅]  |
| 5.1.5 | Clean status     | After initialization       | Status shows clean working tree (no staged, unstaged, or untracked files)         | [✅]  |
| 5.1.6 | Added to recent  | Close and reopen the app   | The initialized repository appears in the Recent Repositories list                | [✅]  |

---

## 6. Clone Repository

### 6.1 Clone Form UI

| #     | Test Case                       | Steps                                 | Expected Result                                                              | Pass |
| ----- | ------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| 6.1.1 | Form toggle                     | Click "Clone Repository"              | Clone form appears with URL input, target directory input, and Browse button | [✅]  |
| 6.1.2 | URL input present               | Observe clone form                    | Text input for repository URL is visible and editable                        | [✅]  |
| 6.1.3 | Directory input present         | Observe clone form                    | Text input for target directory is visible                                   | [✅]  |
| 6.1.4 | Browse button present           | Observe clone form                    | Browse button is next to the directory input                                 | [✅]  |
| 6.1.5 | Clone button disabled           | Leave both fields empty               | Clone button is disabled / not clickable                                     | [✅]  |
| 6.1.6 | Clone button disabled (partial) | Enter only URL, leave directory empty | Clone button remains disabled                                                | [✅]  |

### 6.2 Clone Operation

**Prerequisite:** Have a small public git repository URL ready (e.g., `https://github.com/octocat/Hello-World.git`). Create an empty target directory.

| #     | Test Case             | Steps                                 | Expected Result                                                           | Pass |
| ----- | --------------------- | ------------------------------------- | ------------------------------------------------------------------------- | ---- |
| 6.2.1 | Clone button enabled  | Fill in both URL and target directory | Clone button becomes enabled / clickable                                  | [✅]  |
| 6.2.2 | Browse sets directory | Click Browse, select a directory      | Target directory input is populated with the selected path                | [✅]  |
| 6.2.3 | Cloning state         | Click Clone with valid inputs         | Button text changes to "Cloning..." and buttons are disabled during clone | [✅]  |
| 6.2.4 | Clone succeeds        | Wait for clone to complete            | App transitions to App Layout showing the cloned repository               | [✅]  |
| 6.2.5 | Cloned repo content   | After successful clone                | Sidebar shows branches and status for the cloned repository               | [✅]  |

### 6.3 Clone Error Handling

| #     | Test Case               | Steps                                                                                        | Expected Result                                                                             | Pass |
| ----- | ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---- |
| 6.3.1 | Invalid URL error       | Enter an invalid URL (e.g., `not-a-url`) and a valid directory, click Clone                  | Error message is displayed after clone attempt fails                                        | [✅]  |
| 6.3.2 | Non-existent repo error | Enter a valid-looking but non-existent URL (e.g., `https://github.com/nonexistent/repo.git`) | Error message is displayed                                                                  | [✅]  |
| 6.3.3 | Error stays on form     | After a clone error                                                                          | App stays on the Welcome Screen with the clone form visible. User can fix inputs and retry. | [✅]  |

---

## 7. Recent Repositories

### 7.1 Basic Functionality

| #     | Test Case            | Steps                                                                           | Expected Result                                                              | Pass |
| ----- | -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| 7.1.1 | Repo added to recent | Open a repository using "Open Repository"                                       | The repository appears in the Recent Repositories list on the Welcome Screen | [✅]  |
| 7.1.2 | Name and path shown  | After adding a repo to recent                                                   | Each entry shows the repository name and full path                           | [✅]  |
| 7.1.3 | Click to reopen      | 1. Return to Welcome Screen (close and reopen app) 2. Click a recent repo entry | The clicked repository opens and app transitions to App Layout               | [✅]  |
| 7.1.4 | Most recent first    | Open multiple repos (A, then B, then C)                                         | Recent list shows: C, B, A (most recently opened first)                      | [✅]  |

### 7.2 Persistence

| #     | Test Case            | Steps                                                                                                     | Expected Result                                                              | Pass |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| 7.2.1 | Survives restart     | 1. Open a few repos 2. Close the app completely 3. Restart the app                                        | Recent repositories list is preserved with all previously opened repos       | [✅]  |
| 7.2.2 | Duplicate handling   | Open the same repository twice                                                                            | Only one entry exists in the recent list (timestamp updated, not duplicated) | [✅]  |
| 7.2.3 | Reopen updates order | 1. Have repos A, B, C in recent (C most recent) 2. Click on repo A to open it 3. Return to Welcome Screen | Repo A is now first in the list (order: A, C, B)                             | [✅]  |

### 7.3 Limits

| #     | Test Case          | Steps                                    | Expected Result                                                   | Pass |
| ----- | ------------------ | ---------------------------------------- | ----------------------------------------------------------------- | ---- |
| 7.3.1 | Maximum 20 entries | Open more than 20 different repositories | Recent list never exceeds 20 entries. Oldest entries are removed. | [✅]  |

---

## 8. Repository Switching

**Prerequisite:** Have two or more git repositories available locally.

| #     | Test Case           | Steps                                                | Expected Result                                                                | Pass |
| ----- | ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ---- |
| 8.1.1 | Switch from sidebar | 1. Open repo A 2. Click the repo name in the Sidebar | A native directory picker dialog appears                                       | [✅]  |
| 8.1.2 | UI updates          | Select a different repo (B) from the dialog          | Sidebar, main panel, and status bar all update to reflect repo B's information | [✅]  |
| 8.1.3 | Branch list updates | After switching to repo B                            | Branch list in sidebar shows repo B's branches, not repo A's                   | [✅]  |
| 8.1.4 | Status updates      | After switching to repo B                            | Status counts (staged, unstaged, etc.) reflect repo B's state                  | [✅]  |
| 8.1.5 | Cancel switch       | 1. Click repo name in Sidebar 2. Cancel the dialog   | App remains showing the current repo. No error.                                | [✅]  |

---

## 9. Git Status Display

**Prerequisite:** Open a git repository in Kommit. Use an external terminal/editor to modify files in the repo for these tests.

### 9.1 Clean Repository

| #     | Test Case    | Steps                       | Expected Result                                                                              | Pass |
| ----- | ------------ | --------------------------- | -------------------------------------------------------------------------------------------- | ---- |
| 9.1.1 | Clean status | Open a repo with no changes | Status shows clean (checkmark or "Working tree clean"). No staged/unstaged/untracked counts. | [✅]  |

### 9.2 Unstaged Changes

| #     | Test Case              | Steps                                                                       | Expected Result                                                       | Pass |
| ----- | ---------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---- |
| 9.2.1 | Modified file detected | 1. Modify a tracked file externally 2. Reopen or refresh the repo in Kommit | Unstaged/modified count increases by 1. Status bar shows dirty state. | [✅]  |
| 9.2.2 | Multiple modifications | Modify 3 tracked files externally, refresh                                  | Unstaged count shows 3                                                | [✅]  |

### 9.3 Staged Changes

| #     | Test Case            | Steps                                                           | Expected Result                                                             | Pass |
| ----- | -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| 9.3.1 | Staged file detected | 1. Stage a file externally (`git add <file>`) 2. Refresh Kommit | Staged count increases. Status shows staged count separately from unstaged. | [✅]  |

### 9.4 Untracked Files

| #     | Test Case               | Steps                                                                   | Expected Result                | Pass |
| ----- | ----------------------- | ----------------------------------------------------------------------- | ------------------------------ | ---- |
| 9.4.1 | Untracked file detected | 1. Create a new file in the repo (don't `git add` it) 2. Refresh Kommit | Untracked count increases by 1 | [✅]  |

### 9.5 Conflicted Files

| #     | Test Case         | Steps                                                               | Expected Result               | Pass |
| ----- | ----------------- | ------------------------------------------------------------------- | ----------------------------- | ---- |
| 9.5.1 | Conflict detected | 1. Create a merge conflict in the repo externally 2. Refresh Kommit | Conflicted count is displayed | [✅]  |

### 9.6 Combined Status

| #     | Test Case   | Steps                                                   | Expected Result                                                    | Pass |
| ----- | ----------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ---- |
| 9.6.1 | Mixed state | Have staged + unstaged + untracked files simultaneously | All three counts are displayed correctly in status bar and sidebar | [✅]  |

---

## 10. Branch Display

**Prerequisite:** Open a repository with multiple branches (local and remote).

### 10.1 Local Branches

| #      | Test Case                  | Steps                                         | Expected Result                                        | Pass |
| ------ | -------------------------- | --------------------------------------------- | ------------------------------------------------------ | ---- |
| 10.1.1 | Current branch highlighted | Open repo, look at sidebar branch list        | Current branch has `*` prefix and accent color styling | [ ]  |
| 10.1.2 | All local branches listed  | Compare sidebar list with `git branch` output | All local branches are shown in the sidebar            | [ ]  |
| 10.1.3 | Branch name in status bar  | Look at the status bar                        | Current branch name is displayed with accent color     | [ ]  |

### 10.2 Remote Branches

| #      | Test Case                 | Steps                                              | Expected Result                                                      | Pass |
| ------ | ------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- | ---- |
| 10.2.1 | Remote branches section   | Open a repo with remote tracking branches          | "Remote Branches" section appears in sidebar listing remote branches | [ ]  |
| 10.2.2 | No remote section if none | Open a repo with no remotes (e.g., freshly init'd) | No "Remote Branches" section is shown                                | [ ]  |

### 10.3 Tracking Information

| #      | Test Case          | Steps                                                                      | Expected Result                                                                       | Pass |
| ------ | ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---- |
| 10.3.1 | Ahead count shown  | 1. Make commits locally that haven't been pushed 2. Open/refresh in Kommit | Ahead count (e.g., arrow up with number) is displayed next to branch or in status bar | [ ]  |
| 10.3.2 | Behind count shown | 1. Have a branch that is behind its upstream 2. Open/refresh in Kommit     | Behind count (e.g., arrow down with number) is displayed                              | [ ]  |
| 10.3.3 | Ahead and behind   | Branch is both ahead and behind upstream                                   | Both ahead and behind counts are shown                                                | [ ]  |
| 10.3.4 | No tracking info   | Open a branch with no upstream configured                                  | No ahead/behind arrows or counts are shown                                            | [ ]  |

### 10.4 Detached HEAD

| #      | Test Case             | Steps                                                                    | Expected Result                                                       | Pass |
| ------ | --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---- |
| 10.4.1 | Detached HEAD display | 1. Externally run `git checkout <commit-hash>` 2. Open/refresh in Kommit | Branch displays as "HEAD (detached)" or similar indication. No crash. | [ ]  |

---

## 11. Layout & Theme

### 11.1 Title Bar

| #      | Test Case           | Steps                         | Expected Result                          | Pass |
| ------ | ------------------- | ----------------------------- | ---------------------------------------- | ---- |
| 11.1.1 | Title bar visible   | Open a repo to see App Layout | 32px title bar at top with "Kommit" text | [ ]  |
| 11.1.2 | Title bar draggable | Click and drag the title bar  | Window moves (custom drag region works)  | [ ]  |

### 11.2 Sidebar

| #      | Test Case            | Steps                                           | Expected Result                                                             | Pass |
| ------ | -------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| 11.2.1 | Sidebar content      | Open a repo                                     | Sidebar contains: repo name, current branch, branches list, changes summary | [ ]  |
| 11.2.2 | Collapsible sections | Look for expandable/collapsible branch sections | Branch sections can be collapsed and expanded                               | [ ]  |
| 11.2.3 | Changes summary      | Open a dirty repo                               | Sidebar footer shows staged/modified/untracked counts                       | [ ]  |
| 11.2.4 | No changes summary   | Open a clean repo                               | No changes summary shown (or shows "clean")                                 | [ ]  |

### 11.3 Status Bar

| #      | Test Case           | Steps                                             | Expected Result                                                                  | Pass |
| ------ | ------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- | ---- |
| 11.3.1 | Left side content   | Open a repo                                       | Status bar left side shows: branch name, upstream arrows (if applicable), status | [ ]  |
| 11.3.2 | Right side content  | Open a repo                                       | Status bar right side shows: repo path, "Kommit v0.1.0"                          | [ ]  |
| 11.3.3 | Loading indicator   | During a loading operation (e.g., opening a repo) | A loading indicator briefly appears in the status bar                            | [ ]  |
| 11.3.4 | Error in status bar | Trigger an error state                            | Error message appears in the status bar                                          | [ ]  |

### 11.4 Dark Theme

| #      | Test Case         | Steps                                                          | Expected Result                                                | Pass |
| ------ | ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | ---- |
| 11.4.1 | Dark background   | Observe overall appearance                                     | Background uses dark Catppuccin colors (dark blue-gray tones)  | [ ]  |
| 11.4.2 | Text contrast     | Read all text in the UI                                        | Text is light-colored and readable against the dark background | [ ]  |
| 11.4.3 | Custom scrollbars | Scroll a long list (if available) or observe scrollbar styling | Scrollbars use custom dark styling, not default OS scrollbars  | [ ]  |
| 11.4.4 | Selection color   | Select text in the UI (if possible)                            | Selection uses accent color highlighting                       | [ ]  |
| 11.4.5 | Accent colors     | Look at active/highlighted elements (current branch, buttons)  | Accent colors (blue/lavender tones) are applied consistently   | [ ]  |

---

## 12. Error Handling

### 12.1 Git Not Installed

| #      | Test Case     | Steps                                                                                         | Expected Result                                                           | Pass |
| ------ | ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---- |
| 12.1.1 | Git not found | 1. Temporarily rename or remove `git` from PATH 2. Launch the app 3. Try to open a repository | A clear error message indicates git is not installed or not found in PATH | [ ]  |

### 12.2 Deleted Repository

| #      | Test Case              | Steps                                                                                             | Expected Result                                                 | Pass |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---- |
| 12.2.1 | Repo directory deleted | 1. Open a repo in Kommit 2. Delete the repo's `.git` folder externally 3. Try to refresh/interact | Error is handled gracefully. No crash. Error message displayed. | [ ]  |

### 12.3 Error Display

| #      | Test Case        | Steps                                                 | Expected Result                                                  | Pass |
| ------ | ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------- | ---- |
| 12.3.1 | Error visibility | Trigger any error (e.g., open non-git dir)            | Error message is visible and clearly styled (red/warning colors) | [ ]  |
| 12.3.2 | Error clears     | 1. Trigger an error 2. Perform a successful operation | Previous error message is cleared                                | [ ]  |

---

## 13. Cross-Platform (if testing on multiple OS)

| #      | Test Case              | Steps                                                                   | Expected Result                                                       | Pass |
| ------ | ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ---- |
| 13.1.1 | Windows paths          | Open a repo with a Windows-style path (e.g., `C:\Users\dev\repo`)       | Path is handled correctly. Repo name is extracted properly.           | [ ]  |
| 13.1.2 | Unix paths             | (Linux/Mac) Open a repo with a Unix-style path (e.g., `/home/dev/repo`) | Path is handled correctly. Repo name is extracted properly.           | [ ]  |
| 13.1.3 | External links         | If any links exist in the UI, click one                                 | Link opens in the system default browser, not inside the Electron app | [ ]  |
| 13.1.4 | Hidden child processes | (Windows) Perform any git operation                                     | No `cmd.exe` / console windows flash on screen (`windowsHide: true`)  | [ ]  |

---

## Test Summary

| Section                    | Test Cases | Passed | Failed | Skipped |
| -------------------------- | ---------- | ------ | ------ | ------- |
| 1. Pre-flight Verification | 6          |        |        |         |
| 2. Application Launch      | 7          |        |        |         |
| 3. Welcome Screen          | 6          |        |        |         |
| 4. Open Repository         | 14         |        |        |         |
| 5. Init Repository         | 6          |        |        |         |
| 6. Clone Repository        | 11         |        |        |         |
| 7. Recent Repositories     | 7          |        |        |         |
| 8. Repository Switching    | 5          |        |        |         |
| 9. Git Status Display      | 6          |        |        |         |
| 10. Branch Display         | 9          |        |        |         |
| 11. Layout & Theme         | 13         |        |        |         |
| 12. Error Handling         | 4          |        |        |         |
| 13. Cross-Platform         | 4          |        |        |         |
| **Total**                  | **98**     |        |        |         |

---

## Notes & Issues Found

Use this section to document any bugs, issues, or observations discovered during testing.

| #   | Test Case # | Severity | Description | Steps to Reproduce |
| --- | ----------- | -------- | ----------- | ------------------ |
|     |             |          |             |                    |
|     |             |          |             |                    |
|     |             |          |             |                    |
