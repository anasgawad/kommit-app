# Manual Tests — Phase 4: Stash, Interactive Rebase & Conflict Resolution

These tests verify Phase 4 features end-to-end in the running Electron application.
Run `npm run dev` before starting. All tests assume a real git repository is open.

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

## MT4-1: Stash Panel — Navigation

**Steps:**

1. Click the Stash icon in the Activity Bar (left sidebar).

**Expected:**

- The Stash panel opens in the main content area.
- An empty state message is shown (e.g. "No stashes").

---

## MT4-2: Stash Panel — Save a Stash

**Setup:** Make an uncommitted change:

```bash
echo "dirty" >> file.txt
```

**Steps:**

1. Open the Stash panel.
2. Click "Save Stash" (or equivalent button).
3. Enter a message when prompted (e.g. "my stash").
4. Confirm.

**Expected:**

- The stash appears in the list with the message "my stash".
- Running `git stash list` in the terminal shows `stash@{0}: On main: my stash`.
- The working tree is clean.

---

## MT4-3: Stash Panel — Apply a Stash

**Setup:** Have at least one stash saved (see MT4-2).

**Steps:**

1. Click on a stash entry in the list.
2. Click "Apply".

**Expected:**

- The stash changes are re-applied to the working tree.
- The stash remains in the list (apply does not remove it).
- `git status` shows the file as modified.

---

## MT4-4: Stash Panel — Pop a Stash

**Setup:** Have at least one stash saved. Ensure the working tree is clean first:

```bash
git checkout -- .
```

**Steps:**

1. Click on a stash entry.
2. Click "Pop".

**Expected:**

- The stash changes are applied.
- The stash is removed from the list.
- `git stash list` shows one fewer stash.

---

## MT4-5: Stash Panel — Drop a Stash

**Setup:** Have at least one stash saved.

**Steps:**

1. Click on a stash entry.
2. Click "Drop".
3. Confirm the deletion dialog.

**Expected:**

- The stash is removed from the list without applying changes.
- `git stash list` no longer shows that stash.

---

## MT4-6: Stash Panel — Diff Preview

**Steps:**

1. Save a stash with some changes.
2. Click on the stash entry in the list.

**Expected:**

- A diff preview is shown in the panel, displaying which files and lines changed.

---

## MT4-7: Rebase Panel — Navigation

**Steps:**

1. Click the Rebase icon in the Activity Bar.

**Expected:**

- The Rebase panel opens.
- If no rebase is in progress, the commit list and "Start Rebase" controls are shown.

---

## MT4-8: Rebase Panel — Start an Interactive Rebase

**Setup:** Create multiple commits:

```bash
echo "line2" >> file.txt && git add . && git commit -m "commit 2"
echo "line3" >> file.txt && git add . && git commit -m "commit 3"
echo "line4" >> file.txt && git add . && git commit -m "commit 4"
```

**Steps:**

1. Open the Rebase panel.
2. Select a base commit (e.g. the initial commit or HEAD~3).
3. Review the listed commits — each should have a dropdown action (pick, squash, fixup, reword, drop, edit).
4. Change one commit's action to "squash".
5. Click "Start Rebase".

**Expected:**

- The rebase begins. If it completes without conflict, the graph updates to show the squashed history.
- Running `git log --oneline` shows fewer commits.

---

## MT4-9: Rebase Panel — Abort Rebase

**Setup:** Start a rebase that pauses mid-way (e.g. due to a conflict or an "edit" action).

**Steps:**

1. While a rebase is in progress, open the Rebase panel.
2. The panel shows a progress bar (e.g. "Step 1 of 3") and Abort / Continue / Skip buttons.
3. Click "Abort".

**Expected:**

- The rebase is aborted.
- `git status` shows a clean state at the pre-rebase HEAD.
- The `.git/rebase-merge` directory no longer exists.

---

## MT4-10: Rebase Panel — Continue Rebase

**Setup:** Start a rebase that pauses with an "edit" action. Manually make the desired change, then stage it:

```bash
git add .
```

**Steps:**

1. Open the Rebase panel.
2. Click "Continue".

**Expected:**

- The rebase advances to the next step (or completes).
- Progress bar updates accordingly.

---

## MT4-11: Conflict Resolution — Navigate to Conflicts Panel

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

**Steps:**

1. Open Kommit and open `/tmp/kommit-test`.
2. Click the Conflicts icon in the Activity Bar.

**Expected:**

- The Conflicts panel opens.
- `conflict.txt` appears in the conflicted files list.

---

## MT4-12: Conflict Resolution — 3-Way Viewer

**Steps:**

1. Click on `conflict.txt` in the conflict file list.

**Expected:**

- Three panes are shown: **Ours** (main branch), **Base** (common ancestor), **Theirs** (feature branch).
- A **Result** pane is shown for editing the resolution.
- Conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) are NOT shown in the individual panes — each pane shows only its version.

---

## MT4-13: Conflict Resolution — Accept Ours

**Steps:**

1. In the conflict viewer for `conflict.txt`, click "Accept Ours".

**Expected:**

- The Result pane fills with the "ours" (main) content: `main line`.

---

## MT4-14: Conflict Resolution — Accept Theirs

**Steps:**

1. Click "Accept Theirs".

**Expected:**

- The Result pane fills with the "theirs" (feature) content: `feature line`.

---

## MT4-15: Conflict Resolution — Mark Resolved

**Setup:** Accept one side or manually edit the Result pane to remove all conflict markers.

**Steps:**

1. Click "Mark Resolved".

**Expected:**

- The file is staged (`git add conflict.txt` equivalent).
- `conflict.txt` is removed from the conflicts list.
- Running `git status` shows `conflict.txt` as "modified" (staged), no longer conflicted.

---

## MT4-16: Conflict Resolution — Remaining Conflict Count

**Setup:** Create a conflict with multiple files:

```bash
echo "a" > a.txt && git add . && git commit -m "a"
# (repeat conflict setup for multiple files)
```

**Steps:**

1. Open the Conflicts panel.

**Expected:**

- The panel shows the count of conflicted files.
- As files are resolved, the count decreases.
- When all files are resolved, an empty state or "All conflicts resolved" message is shown.

---

## MT4-17: Error Handling — Stash Pop Conflict

**Setup:** Save a stash, modify the same lines in the working tree, then try to pop.

**Steps:**

1. Click "Pop" on the stash.

**Expected:**

- An error message is shown in the UI (e.g. "Stash pop failed: conflict").
- The working tree is not corrupted.

---

## MT4-18: Cross-Feature — Stash Before Rebase

**Steps:**

1. Make some uncommitted changes.
2. Stash them via the Stash panel.
3. Start an interactive rebase via the Rebase panel.
4. After rebase completes, pop the stash.

**Expected:**

- All operations work independently without interfering with each other.
- The working tree ends up with the stashed changes re-applied on top of the rebased history.
