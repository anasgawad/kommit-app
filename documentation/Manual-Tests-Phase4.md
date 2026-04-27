# Kommit Phase 4 Manual Testing Guide

## Overview

Phase 4 implements stash management, interactive rebase, and conflict resolution.

**Test Environment:**

- Requires a git repository with commits, branches, and changes
- Test on a repository you control so you can freely stash, rebase, and create conflicts
- Do NOT test on repositories with important uncommitted work unless you are confident

---

## Setup: Create a Test Repository

```bash
mkdir /tmp/kommit-test && cd /tmp/kommit-test
git init
git config user.email "test@example.com"
git config user.name "Test User"
echo "line1" > file.txt
git add . && git commit -m "initial commit"
```

Open `/tmp/kommit-test` in Kommit via the Welcome screen.

---

## 1. Stash Panel — Navigation

### 1.1 Empty State

**Test:** Open the Stash panel with no stashes

- [✅] Clicking the Stash icon in the Activity Bar opens the Stash panel
- [✅] An empty state message is shown (e.g. "No stashes")

---

## 2. Stash Panel — Save a Stash

### 2.1 Save Stash

**Setup:** Make an uncommitted change:

```bash
echo "dirty" >> file.txt
```

**Test:** Save a stash with a message

- [✅] Clicking "Save Stash" (or equivalent button) opens a prompt for a message
- [✅] Entering a message (e.g. "my stash") and confirming creates the stash
- [✅] The stash appears in the list with the message "my stash"
- [✅] Running `git stash list` in the terminal shows `stash@{0}: On main: my stash`
- [✅] The working tree is clean after stashing

---

## 3. Stash Panel — Apply a Stash

### 3.1 Apply

**Setup:** Have at least one stash saved (see section 2).

**Test:** Apply a stash without removing it

- [✅] Clicking on a stash entry in the list selects it
- [✅] Clicking "Apply" re-applies the stash changes to the working tree
- [✅] The stash remains in the list (apply does not remove it)
- [✅] `git status` shows the file as modified

---

## 4. Stash Panel — Pop a Stash

### 4.1 Pop

**Setup:** Have at least one stash saved. Ensure the working tree is clean first:

```bash
git checkout -- .
```

**Test:** Pop a stash (apply and remove)

- [✅] Clicking on a stash entry and clicking "Pop" applies the changes
- [✅] The stash is removed from the list after popping
- [✅] `git stash list` shows one fewer stash

---

## 5. Stash Panel — Drop a Stash

### 5.1 Drop

**Setup:** Have at least one stash saved.

**Test:** Drop a stash without applying it

- [✅] Clicking on a stash entry and clicking "Drop" shows a confirmation dialog
- [✅] Confirming removes the stash from the list without applying changes
- [✅] `git stash list` no longer shows that stash
- [✅] Dismissing the confirmation dialog leaves the stash intact

---

## 6. Stash Panel — Diff Preview

### 6.1 Diff Preview

**Test:** View the diff of a stash

- [✅] Saving a stash with some changes and clicking on the stash entry shows a diff preview
- [✅] The diff preview displays which files and lines changed

---

## 7. Rebase Panel — Navigation

### 7.1 Rebase Panel Opens

**Test:** Open the Rebase panel

- [✅] Clicking the Rebase icon in the Activity Bar opens the Rebase panel
- [✅] If no rebase is in progress, the commit list and "Start Rebase" controls are shown

---

## 8. Rebase Panel — Start an Interactive Rebase

### 8.1 Start Rebase

**Setup:** Create multiple commits:

```bash
echo "line2" >> file.txt && git add . && git commit -m "commit 2"
echo "line3" >> file.txt && git add . && git commit -m "commit 3"
echo "line4" >> file.txt && git add . && git commit -m "commit 4"
```

**Test:** Start an interactive rebase and squash commits

- [✅] Opening the Rebase panel and selecting a base commit (e.g. HEAD~3) lists the commits
- [✅] Each commit has a dropdown action (pick, squash, fixup, reword, drop, edit)
- [✅] Changing one commit's action to "squash" and clicking "Start Rebase" begins the rebase
- [✅] If it completes without conflict, the graph updates to show the squashed history
- [✅] Running `git log --oneline` shows fewer commits

---

## 9. Rebase Panel — Abort Rebase

### 9.1 Abort

**Setup:** Start a rebase that pauses mid-way (e.g. due to a conflict or an "edit" action).

**Test:** Abort an in-progress rebase

- [✅] While a rebase is in progress, the Rebase panel shows a progress bar (e.g. "Step 1 of 3")
- [✅] Abort, Continue, and Skip buttons are visible
- [✅] Clicking "Abort" aborts the rebase
- [✅] `git status` shows a clean state at the pre-rebase HEAD
- [✅] The `.git/rebase-merge` directory no longer exists

---

## 10. Rebase Panel — Continue Rebase

### 10.1 Continue

**Setup:** Start a rebase that pauses with an "edit" action. Manually make the desired change, then stage it:

```bash
git add .
```

**Test:** Continue an in-progress rebase

- [✅] Clicking "Continue" in the Rebase panel advances the rebase to the next step (or completes it)
- [✅] The progress bar updates accordingly

---

## 11. Conflict Resolution — Navigate to Conflicts Panel

### 11.1 Conflicts Panel

**Setup:** Create a merge conflict:

```bash
cd /tmp/kommit-test
git checkout -b feature
echo "feature line" > conflict.txt
git add . && git commit -m "feature change"
git checkout main
echo "main line" > conflict.txt
git add . && git commit -m "main change"
git merge feature   # This will conflict
```

**Test:** Open the Conflicts panel

- [ ] Clicking the Conflicts icon in the Activity Bar opens the Conflicts panel
- [ ] `conflict.txt` appears in the conflicted files list

---

## 12. Conflict Resolution — 3-Way Viewer

### 12.1 Three-Pane View

**Test:** View a conflicted file in the 3-way viewer

- [ ] Clicking on `conflict.txt` in the conflict file list opens the 3-way viewer
- [ ] Three panes are shown: **Ours** (main branch), **Base** (common ancestor), **Theirs** (feature branch)
- [ ] A **Result** pane is shown for editing the resolution
- [ ] Conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) are NOT shown in the individual panes

---

## 13. Conflict Resolution — Accept Ours

### 13.1 Accept Ours

**Test:** Resolve a conflict by accepting the current branch version

- [ ] Clicking "Accept Ours" fills the Result pane with the "ours" (main) content: `main line`

---

## 14. Conflict Resolution — Accept Theirs

### 14.1 Accept Theirs

**Test:** Resolve a conflict by accepting the incoming branch version

- [ ] Clicking "Accept Theirs" fills the Result pane with the "theirs" (feature) content: `feature line`

---

## 15. Conflict Resolution — Mark Resolved

### 15.1 Mark Resolved

**Setup:** Accept one side or manually edit the Result pane to remove all conflict markers.

**Test:** Mark a conflict as resolved

- [ ] Clicking "Mark Resolved" stages the file (`git add conflict.txt` equivalent)
- [ ] `conflict.txt` is removed from the conflicts list
- [ ] Running `git status` shows `conflict.txt` as "modified" (staged), no longer conflicted

---

## 16. Conflict Resolution — Remaining Conflict Count

### 16.1 Count Updates

**Setup:** Create a conflict with multiple files.

**Test:** Verify the conflict count decreases as files are resolved

- [ ] The Conflicts panel shows the count of conflicted files
- [ ] As files are resolved, the count decreases
- [ ] When all files are resolved, an empty state or "All conflicts resolved" message is shown

---

## 17. Error Handling — Stash Pop Conflict

### 17.1 Pop Conflict Error

**Setup:** Save a stash, modify the same lines in the working tree, then try to pop.

**Test:** Pop a stash that conflicts with the working tree

- [ ] Clicking "Pop" on the stash shows an error message in the UI (e.g. "Stash pop failed: conflict")
- [ ] The working tree is not corrupted

---

## 18. Cross-Feature — Stash Before Rebase

### 18.1 Stash + Rebase + Pop

**Test:** Verify stash and rebase work independently

- [ ] Making uncommitted changes and stashing them via the Stash panel cleans the working tree
- [ ] Starting an interactive rebase via the Rebase panel completes successfully
- [ ] Popping the stash after rebase re-applies the stashed changes on top of the rebased history
- [ ] All operations work independently without interfering with each other

---

## Summary Checklist

| Area                                    | Tests  | Status |
| --------------------------------------- | ------ | ------ |
| Stash Panel — navigation & empty state  | 1      |        |
| Stash Panel — save                      | 1      |        |
| Stash Panel — apply                     | 1      |        |
| Stash Panel — pop                       | 1      |        |
| Stash Panel — drop                      | 1      |        |
| Stash Panel — diff preview              | 1      |        |
| Rebase Panel — navigation               | 1      |        |
| Rebase Panel — start interactive rebase | 1      |        |
| Rebase Panel — abort                    | 1      |        |
| Rebase Panel — continue                 | 1      |        |
| Conflict Resolution — panel navigation  | 1      |        |
| Conflict Resolution — 3-way viewer      | 1      |        |
| Conflict Resolution — accept ours       | 1      |        |
| Conflict Resolution — accept theirs     | 1      |        |
| Conflict Resolution — mark resolved     | 1      |        |
| Conflict Resolution — count updates     | 1      |        |
| Error Handling — stash pop conflict     | 1      |        |
| Cross-Feature — stash + rebase + pop    | 1      |        |
| **Total**                               | **18** |        |
