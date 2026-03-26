# Kommit Phase 2 Manual Testing Guide

## Overview

Phase 2 implements the commit graph visualization with lane assignment, filtering, search, keyboard navigation, and commit detail panel.

**Test Environment:**

- Requires a git repository with commits, branches, and merge history
- Test on a repository with at least 50+ commits for virtualization testing
- Test with various branch structures (linear, merges, multiple branches)

---

## 1. Commit Graph Rendering

### 1.1 Basic Graph Display

**Test:** Open a repository and verify the commit graph renders correctly

- [✅] Commit graph appears in the main content area
- [✅] Each commit shows: graph visualization (node + edges), abbreviated hash, subject, author, and relative date
- [✅] Commits are ordered chronologically (newest first)
- [✅] Graph lanes (columns) are assigned correctly for linear history

### 1.2 Merge Visualization

**Test:** View repository with merge commits

- [✅] Merge commits show curved lines connecting parent branches
- [✅] Linear parent (first parent) continues on same lane
- [✅] Additional parents show merge edges from different columns
- [✅] Colors are distinct for different branches

### 1.3 Branch Colors

**Test:** Verify branch colors are deterministic

- [✅] Same branch name always gets same color across sessions
- [✅] 10 distinct colors cycle for different branches
- [✅] Colors are visible against dark background

### 1.4 Ref Labels (Branches & Tags)

**Test:** View commits with branches and tags

- [✅] Branch names appear as badges next to commit message
- [✅] Tags appear with different styling (if present)
- [✅] Remote branches (e.g., `origin/main`) are distinguished
- [✅] Multiple refs on same commit are all visible

---

## 2. Virtualization

### 2.1 Performance with Large History

**Test:** Open repository with 1000+ commits

- [ ] Initial load is fast (< 2 seconds)
- [ ] Scrolling is smooth without stuttering
- [ ] Only visible commits are rendered (check dev tools DOM)
- [ ] Scrolling up/down maintains smooth performance

### 2.2 Infinite Scroll / Pagination

**Test:** Scroll to bottom of commit list

- [ ] More commits load automatically when reaching 80% scroll
- [ ] Loading indicator appears during fetch
- [ ] No duplicate commits appear
- [ ] Scrolling continues smoothly after load

---

## 3. Filtering & Search

### 3.1 Branch Filter

**Test:** Use branch filter input

- [ ] Type branch name (e.g., `main`)
- [ ] Graph updates to show only commits from that branch
- [ ] `--all` flag is disabled when filtering by branch
- [ ] Clearing filter restores all branches

### 3.2 Author Filter

**Test:** Use author filter input

- [ ] Type author name or email fragment
- [ ] Graph filters to show only commits by matching authors
- [ ] Partial matches work (e.g., "John" matches "John Doe")
- [ ] Clearing filter restores all commits

### 3.3 Search by Message

**Test:** Use search input

- [ ] Type commit message substring (e.g., "bugfix")
- [ ] Graph shows only commits with matching subjects
- [ ] Search is case-insensitive
- [ ] Clearing search restores all commits

### 3.4 Clear Filters Button

**Test:** Apply multiple filters, then click "Clear Filters"

- [ ] All filters are reset to empty
- [ ] Graph returns to showing all commits from all branches
- [ ] Clear button only appears when filters are active

---

## 4. Commit Selection & Detail Panel

### 4.1 Select Commit

**Test:** Click on a commit row

- [ ] Row highlights with tertiary background color
- [ ] CommitDetail panel appears on the right side
- [ ] Panel shows commit hash, author, date, and message
- [ ] Panel shows parent commit hashes (if any)

### 4.2 Changed Files List

**Test:** Select a commit with file changes

- [ ] Changed files list appears in detail panel
- [ ] Each file shows path and status icon
- [ ] Status icons correctly represent: Added (A), Modified (M), Deleted (D), Renamed (R), Copied (C)
- [ ] File paths are readable and truncated if too long

### 4.3 Root Commit

**Test:** Select the initial commit (no parents)

- [ ] Detail panel shows "(Initial commit)" instead of parent hash
- [ ] Changed files list shows all files as "Added"
- [ ] No errors in console

### 4.4 Merge Commit

**Test:** Select a merge commit (2+ parents)

- [ ] Detail panel lists all parent hashes
- [ ] Changed files show merge resolution changes
- [ ] Panel clearly indicates this is a merge

---

## 5. Keyboard Navigation

### 5.1 Arrow Key Navigation

**Test:** Click a commit, then use arrow keys

- [ ] Down arrow selects next commit
- [ ] Up arrow selects previous commit
- [ ] Selection wraps at top/bottom (or stops)
- [ ] Selected commit auto-scrolls into view if needed

### 5.2 Navigation Focus

**Test:** Use keyboard navigation

- [ ] Arrow keys work when graph area has focus
- [ ] Typing in filter inputs doesn't trigger arrow navigation
- [ ] Pressing Escape (if implemented) clears selection

---

## 6. Context Menu

### 6.1 Right-Click Menu

**Test:** Right-click on a commit

- [ ] Context menu appears at cursor position
- [ ] Menu shows options: Checkout, Cherry-pick, Reset, Revert
- [ ] Menu closes when clicking outside

### 6.2 Context Menu Actions (Stubs)

**Test:** Click each context menu action

- [ ] Actions are labeled but don't execute (stubs for Phase 3+)
- [ ] Clicking an action closes the menu
- [ ] No errors appear in console

---

## 7. Edge Cases & Error Handling

### 7.1 Empty Repository

**Test:** Open a newly initialized repository with no commits

- [ ] Graph shows empty state or appropriate message
- [ ] No errors in console
- [ ] Toolbar remains usable

### 7.2 Single Commit

**Test:** View repository with only one commit

- [ ] Commit renders with node but no edges
- [ ] No visual glitches
- [ ] Detail panel works normally

### 7.3 Very Long Commit Messages

**Test:** View commit with 200+ character subject

- [ ] Message is truncated with ellipsis
- [ ] Full message visible in detail panel
- [ ] No layout overflow

### 7.4 Special Characters in Refs

**Test:** View branches/tags with special characters

- [ ] Ref names render correctly (e.g., `feature/foo-bar`, `v1.0.0`)
- [ ] No encoding issues

---

## 8. Integration with Repo Store

### 8.1 Switch Repository

**Test:** Open a different repository

- [ ] Graph clears and loads new repository's history
- [ ] Store state resets (filters, selection)
- [ ] No stale data from previous repo

### 8.2 Refresh After External Changes

**Test:** Make a commit in external tool, then refresh Kommit

- [ ] New commit appears at top of graph
- [ ] Graph structure updates correctly
- [ ] Selection persists if still valid

---

## 9. Lane Assignment Algorithm Verification

### 9.1 Linear History

**Test:** View repository with simple linear history (A -> B -> C)

- [ ] All commits in same lane (column 0)
- [ ] Straight vertical lines connecting commits

### 9.2 Single Branch Off Main

**Test:** View repository: main (A -> B), feature (B -> C)

- [ ] Main commits in column 0
- [ ] Feature commits in column 1
- [ ] Diagonal line from B to C

### 9.3 Merge Back to Main

**Test:** View feature branch merged back to main

- [ ] Merge commit shows convergence of lanes
- [ ] After merge, main continues in original column
- [ ] No lane gaps or overlaps

### 9.4 Multiple Concurrent Branches

**Test:** Repository with 3+ active branches

- [ ] Each branch gets distinct column
- [ ] Colors distinguish branches
- [ ] Lanes compact after branches merge

### 9.5 Octopus Merge (3+ parents)

**Test:** View octopus merge commit (rare, but git supports)

- [ ] All parent edges rendered
- [ ] No visual overlap
- [ ] Commit detail shows all parents

---

## 10. Performance & Stability

### 10.1 Rapid Scrolling

**Test:** Scroll up and down quickly

- [ ] No visual tearing or flashing
- [ ] Graph remains responsive
- [ ] Memory usage stable (check Task Manager)

### 10.2 Rapid Filter Changes

**Test:** Type quickly in filter inputs, delete, retype

- [ ] Debouncing prevents excessive API calls (if implemented)
- [ ] No race conditions or stale data
- [ ] Final filter state is correct

### 10.3 Memory Leaks

**Test:** Use app for 10+ minutes with heavy interaction

- [ ] Memory usage doesn't grow unbounded
- [ ] No performance degradation over time

---

## Test Summary Checklist

**Before marking Phase 2 complete, verify:**

- [ ] All 105 unit tests pass (`npm test`)
- [ ] All 33 component tests pass
- [ ] All 8 E2E tests pass (when implemented)
- [ ] Build succeeds with no errors (`npm run build`)
- [ ] All manual test scenarios above pass
- [ ] No console errors during normal usage
- [ ] Performance is acceptable on 1000+ commit repository

---

## Known Limitations (Phase 2)

These are expected limitations to be addressed in later phases:

- Context menu actions are stubs (functionality in Phase 3+)
- No diff view yet (Phase 3)
- No branch management UI (Phase 3)
- No commit/amend actions yet (Phase 3)
- No stash UI (Phase 4)
- No interactive rebase (Phase 4)
- No remote operations UI (Phase 5)

---

## Reporting Issues

If any test fails, document:

1. Exact steps to reproduce
2. Expected vs actual behavior
3. Repository structure (branch layout, commit count)
4. Console errors (if any)
5. Screenshot or video if visual issue
