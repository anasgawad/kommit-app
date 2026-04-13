# Kommit Phase 3 Manual Testing Guide

## Overview

Phase 3 implements core Git operations: staging & committing, diff viewer with Shiki syntax highlighting, branch operations, tag management, and context menu actions (checkout, cherry-pick, revert, reset).

**Test Environment:**

- Requires a git repository with commits, branches, and changes
- Test on a repository you control so you can freely stage, commit, and branch
- Do NOT test on repositories with important uncommitted work unless you are confident

---

## 1. Activity Bar — Changes View Switch

### 1.1 Changes Icon

**Test:** Verify the Changes icon appears in the ActivityBar

- [✅] ActivityBar shows a file-diff icon below the history (clock) icon
- [✅] Hovering shows tooltip "Changes (working tree & staging)"
- [ ] Clicking while no repo is open does nothing (icon is dimmed/disabled) N/A

### 1.2 View Switching

**Test:** Click the Changes icon and History icon to switch views

- [✅] Clicking Changes icon switches main content area to the Changes view (working tree + diff viewer)
- [✅] Clicking History icon switches back to the commit graph
- [✅] Active icon is highlighted with accent color
- [✅] Switching views does not lose the selected file in WorkingTree

### 1.3 Staged File Badge

**Test:** Stage a file and observe the badge

- [✅] When files are staged, a numeric badge appears on the Changes icon
- [✅] Badge shows the correct count of staged files
- [✅] Badge disappears when all files are unstaged

---

## 2. Working Tree Panel

### 2.1 File Sections

**Test:** Open a repository with mixed changes

- [✅] Staged section shows all files that are indexed (git add'd)
- [✅] Unstaged section shows modified tracked files
- [✅] Untracked section shows new files not yet added
- [✅] Conflicted section appears only when a merge conflict exists
- [✅] Sections collapse/expand when clicking their header
- [✅] Empty sections are not shown (or clearly labeled as empty) N/A

### 2.2 Staging Files

**Test:** Stage and unstage individual files

- [✅] Clicking the "+" icon (or stage button) on an unstaged file adds it to staged section
- [✅] Clicking the "−" icon on a staged file removes it from staged section
- [✅] After staging, running `git status` in terminal confirms the change
- [✅] Stage All button stages all unstaged/untracked files at once
- [✅] Unstage All button unstages all staged files at once

### 2.3 Discarding Changes

**Test:** Discard unstaged changes

- [✅] Discard button on an unstaged file reverts its working tree changes
- [✅] A confirmation is shown before discarding (or not — note behavior)
- [✅] After discard, file no longer appears in unstaged section
- [✅] Staged files cannot be discarded without unstaging first

### 2.4 File Selection & Diff Loading

**Test:** Click a file to view its diff

- [✅] Clicking a file in any section highlights it as selected
- [✅] Clicking a staged file loads the staged diff (git diff --cached)
- [✅] Clicking an unstaged file loads the unstaged diff (git diff)
- [✅] Clicking a new untracked file shows it as a fully added diff
- [✅] DiffViewer updates to show the selected file's diff

---

## 3. Diff Viewer

### 3.1 Inline View

**Test:** View a modified file in inline mode

- [✅] Diff viewer shows the file path in the toolbar
- [✅] Added lines are highlighted in green
- [✅] Deleted lines are highlighted in red
- [✅] Context lines are neutral
- [✅] Line numbers are shown for both old and new sides
- [✅] Hunk headers (e.g., `@@ -1,4 +1,5 @@`) are visible

### 3.2 Side-by-Side View

**Test:** Switch to side-by-side mode

- [✅] Clicking "Split" toggle switches to side-by-side layout
- [✅] Old (left) side shows deleted lines and context
- [✅] New (right) side shows added lines and context
- [✅] Line numbers align correctly on both sides
- [✅] Clicking "Inline" switches back

### 3.3 Syntax Highlighting

**Test:** View a TypeScript or JavaScript file diff

- [✅] Code is syntax-highlighted (colors for keywords, strings, etc.)
- [✅] Highlighting loads asynchronously (brief delay is acceptable)
- [✅] After highlight loads, diff re-renders with colors in place

### 3.4 Binary Files

**Test:** Modify a binary file (e.g., an image) and view its diff

- [✅] Diff viewer shows "Binary file — no diff available" message
- [✅] No crash or garbled output

### 3.5 Multiple Files (File Tabs)

**Test:** Create a diff with changes in multiple files, then load via context

- [✅] When a diff spans multiple files, file tabs appear below the toolbar
- [✅] Clicking a tab switches to that file's diff
- [✅] The active tab is highlighted
- [✅] For single-file diffs, no tabs are shown

### 3.6 Hunk-Level Staging

**Test:** Stage a single hunk from the diff viewer

- [✅] When in Changes view with an unstaged file selected, each hunk shows a "Stage hunk" button
- [✅] Clicking "Stage hunk" applies only that hunk to the index
- [✅] After staging a hunk, the working tree status updates correctly
- [✅] The diff viewer refreshes to reflect the partially staged file

---

## 4. Commit Form

### 4.1 Basic Commit

**Test:** Stage a file and commit it

- [✅] Subject input is present with placeholder "Summary (required)"
- [✅] Body textarea is present with placeholder "Description (optional)"
- [✅] Commit button is disabled when subject is empty
- [✅] Commit button is disabled when there are no staged changes
- [✅] Typing a subject and having staged files enables the Commit button
- [✅] Clicking Commit creates a new commit (verify with `git log`)
- [✅] After commit, subject/body inputs are cleared
- [✅] After commit, staged section is empty

### 4.2 Commit with Body

**Test:** Commit with a multi-line message

- [✅] Enter subject and body text
- [✅] After commit, `git log --format="%B"` shows subject + blank line + body

### 4.3 72-Character Warning

**Test:** Type a subject longer than 72 characters

- [✅] Warning text appears: "Subject exceeds 72 characters (NN/72)"
- [✅] Input border changes to yellow/warning color
- [✅] Can still commit (it's a warning, not a hard limit)

### 4.4 Ctrl+Enter Shortcut

**Test:** Use keyboard shortcut to commit

- [✅] With cursor in subject input, pressing Ctrl+Enter commits (if enabled)
- [✅] With cursor in body textarea, pressing Ctrl+Enter commits (if enabled)

### 4.5 Amend Commit

**Test:** Amend the last commit

- [✅] Checking "Amend last commit" checkbox changes button label to "Amend Commit"
- [✅] With amend checked, Commit button is enabled even without a subject (uses existing message)
- [✅] After amend, `git log -1` shows the amended commit

### 4.6 Error Display

**Test:** Attempt to commit with nothing staged (if possible to trigger)

- [✅] Any commit error is shown below the amend checkbox
- [✅] Error message is readable (not truncated)

---

## 5. Sidebar — Branch Context Menu

### 5.1 Double-Click to Checkout

**Test:** Double-click a branch name in the sidebar

- [✅] Double-clicking a local branch checks it out
- [✅] ActivityBar / StatusBar updates to show new current branch
- [✅] Commit graph updates to reflect HEAD position

### 5.2 Right-Click Context Menu

**Test:** Right-click a branch in the sidebar

- [✅] Context menu appears with options: Checkout, Merge into current, Rename, Delete
- [✅] Clicking Checkout checks out the branch
- [ ] Clicking Merge into current merges that branch into HEAD

### 5.3 Rename Branch

**Test:** Rename a local branch via context menu

- [ ] Clicking Rename shows an inline text input pre-filled with current name
- [ ] Pressing Enter applies the rename
- [ ] Pressing Escape cancels
- [ ] After rename, sidebar reflects new name

### 5.4 Delete Branch

**Test:** Delete a local branch via context menu

- [ ] Clicking Delete removes the branch
- [ ] Deleting current branch is prevented (or shows a clear error)

---

## 6. Sidebar — Tags Section

### 6.1 Tags List

**Test:** Open a repository that has tags

- [ ] Tags section appears in the sidebar, collapsible
- [ ] Tags show name and abbreviated hash
- [ ] Annotated tags show their message (if short enough)
- [ ] Lightweight tags are visually distinct from annotated tags (or labeled)

### 6.2 No Tags State

**Test:** Open a repository with no tags

- [ ] Tags section shows "No tags" or is collapsed/hidden cleanly

---

## 7. Commit Graph Context Menu Actions

### 7.1 Checkout

**Test:** Right-click a commit and choose Checkout

- [ ] Checkout puts HEAD in detached-HEAD state at that commit
- [ ] StatusBar / sidebar update to reflect detached HEAD

### 7.2 Cherry-Pick

**Test:** Right-click a commit and choose Cherry-Pick

- [ ] Cherry-pick applies that commit's changes to the current branch
- [ ] Commit graph refreshes and shows the new cherry-picked commit at HEAD
- [ ] If conflict, an error banner is shown

### 7.3 Revert

**Test:** Right-click a commit and choose Revert

- [ ] Revert creates a new "Revert" commit undoing the selected commit
- [ ] Commit graph refreshes and shows the revert commit

### 7.4 Reset

**Test:** Right-click a commit and choose Reset

- [ ] Reset dialog appears with three options: Soft, Mixed, Hard
- [ ] Each option has a short description
- [ ] Clicking Soft reset keeps changes staged
- [ ] Clicking Mixed reset unstages changes but keeps working tree
- [ ] Clicking Hard reset discards all changes
- [ ] After reset, commit graph updates to reflect new HEAD

### 7.5 Context Error Banner

**Test:** Trigger an error (e.g., cherry-pick with conflict)

- [ ] A dismissible error banner appears at the top of the commit graph
- [ ] The error message is readable

---

## 8. Refresh After Operations

### 8.1 Auto-Refresh

**Test:** After every operation, verify the UI refreshes

- [ ] After commit: working tree panel shows no staged files; graph shows new commit
- [ ] After branch checkout: sidebar updates current branch highlight
- [ ] After reset: graph and working tree both update
- [ ] F5 / Ctrl+R manually triggers full refresh of graph + status

---

## Summary Checklist

| Area                                                  | Tests  | Status |
| ----------------------------------------------------- | ------ | ------ |
| Activity Bar Changes view                             | 3      |        |
| Working Tree panel                                    | 4      |        |
| Diff Viewer (inline/split/highlight/binary/tabs/hunk) | 6      |        |
| Commit Form (basic/body/warning/amend/error)          | 6      |        |
| Sidebar branch context menu                           | 4      |        |
| Sidebar tags section                                  | 2      |        |
| Commit graph context menu actions                     | 5      |        |
| Refresh after operations                              | 1      |        |
| **Total**                                             | **31** |        |
