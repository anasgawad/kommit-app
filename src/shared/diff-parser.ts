// ============================================================
// Kommit — Diff Parser (Shared)
// Parse unified diff output into structured DiffFile[]
// Usable in both main process and renderer (no Node.js deps)
// ============================================================

import type { DiffFile, DiffHunk, DiffLine } from './types'

/**
 * Parse unified diff output (from `git diff` or `git diff --cached`) into structured DiffFile[].
 *
 * Handles:
 * - Added, deleted, modified files
 * - Renamed/copied files (--- a/oldPath / +++ b/newPath)
 * - Binary files
 * - Multiple hunks per file
 * - Line numbers for context, add and delete lines
 */
export function parseDiff(raw: string): DiffFile[] {
  if (!raw || raw.trim().length === 0) return []

  const files: DiffFile[] = []
  // Split on "diff --git" or "diff --cc" header lines to get per-file blocks
  const fileBlocks = raw
    .split(/^(?=diff --(?:git|cc|combined) )/m)
    .filter((b) => b.trim().length > 0)

  for (const block of fileBlocks) {
    const lines = block.split('\n')

    // Parse the diff --git header: diff --git a/<path> b/<path>
    // Also handle combined diff: diff --cc <path>
    const diffCcMatch = lines[0].match(/^diff --(?:cc|combined) (.+)$/)
    const diffGitMatch = lines[0].match(/^diff --git a\/(.*) b\/(.*)$/)
    if (!diffGitMatch && !diffCcMatch) continue

    let oldPath = diffCcMatch ? diffCcMatch[1] : (diffGitMatch as RegExpMatchArray)[1]
    let newPath = diffCcMatch ? diffCcMatch[1] : (diffGitMatch as RegExpMatchArray)[2]
    let status: DiffFile['status'] = 'modified'
    let isBinary = false
    let similarityIndex: number | undefined

    // Scan index/similarity/rename lines before the first hunk or --- line
    let lineIdx = 1
    while (
      lineIdx < lines.length &&
      !lines[lineIdx].startsWith('@@') &&
      !lines[lineIdx].startsWith('--- ')
    ) {
      const l = lines[lineIdx]
      if (l.startsWith('new file mode')) {
        status = 'added'
      } else if (l.startsWith('deleted file mode')) {
        status = 'deleted'
      } else if (l.startsWith('similarity index')) {
        const m = l.match(/(\d+)%/)
        if (m) similarityIndex = parseInt(m[1], 10)
      } else if (l.startsWith('rename from ')) {
        status = 'renamed'
        oldPath = l.slice('rename from '.length).trim()
      } else if (l.startsWith('rename to ')) {
        newPath = l.slice('rename to '.length).trim()
      } else if (l.startsWith('Binary files')) {
        isBinary = true
        status = 'binary'
      }
      lineIdx++
    }

    // Parse --- and +++ lines (may override paths for renames/copies shown inline)
    if (lineIdx < lines.length && lines[lineIdx].startsWith('--- ')) {
      const fromLine = lines[lineIdx].slice(4)
      if (fromLine !== '/dev/null') {
        // Strip "a/" prefix
        oldPath = fromLine.startsWith('a/') ? fromLine.slice(2) : fromLine
      }
      lineIdx++
    }
    if (lineIdx < lines.length && lines[lineIdx].startsWith('+++ ')) {
      const toLine = lines[lineIdx].slice(4)
      if (toLine !== '/dev/null') {
        // Strip "b/" prefix
        newPath = toLine.startsWith('b/') ? toLine.slice(2) : toLine
      }
      lineIdx++
    }

    const hunks: DiffHunk[] = []
    // Combined diffs (diff --cc) use @@@ headers and two-character prefixes
    const isCombined = !!diffCcMatch

    // Parse hunks
    while (lineIdx < lines.length) {
      const hunkHeader = lines[lineIdx]
      // Match regular @@ or combined @@@ hunk headers
      const hunkMatch = isCombined
        ? hunkHeader.match(/^@@@ -\d+(?:,\d+)? -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@@(.*)$/)
        : hunkHeader.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/)
      if (!hunkMatch) {
        lineIdx++
        continue
      }

      const oldStart = parseInt(hunkMatch[1], 10)
      const oldLines = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1
      const newStart = parseInt(hunkMatch[3], 10)
      const newLines = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1
      const header = hunkHeader

      const hunkLines: DiffLine[] = []
      lineIdx++

      let oldLineNum = oldStart
      let newLineNum = newStart

      while (lineIdx < lines.length) {
        const hunkLine = lines[lineIdx]
        // Stop at next hunk or next file diff
        if (hunkLine.startsWith('@@') || hunkLine.startsWith('diff --')) break

        if (isCombined) {
          // Combined diff: two-character prefix
          // '++' = present in result (context for both parents)
          // '+' + ' ' or ' ' + '+' = added relative to one parent → treat as add
          // '-' in either column = removed → treat as delete
          const p0 = hunkLine[0]
          const p1 = hunkLine[1]
          const content = hunkLine.slice(2)
          if (p0 === '+' && p1 === '+') {
            hunkLines.push({
              type: 'context',
              content,
              oldLineNumber: oldLineNum++,
              newLineNumber: newLineNum++
            })
          } else if (p0 === '+' || p1 === '+') {
            hunkLines.push({ type: 'add', content, newLineNumber: newLineNum++ })
          } else if (p0 === '-' || p1 === '-') {
            hunkLines.push({ type: 'delete', content, oldLineNumber: oldLineNum++ })
          } else if (p0 === ' ' && p1 === ' ') {
            hunkLines.push({
              type: 'context',
              content,
              oldLineNumber: oldLineNum++,
              newLineNumber: newLineNum++
            })
          }
        } else {
          if (hunkLine.startsWith('+')) {
            hunkLines.push({
              type: 'add',
              content: hunkLine.slice(1),
              newLineNumber: newLineNum++
            })
          } else if (hunkLine.startsWith('-')) {
            hunkLines.push({
              type: 'delete',
              content: hunkLine.slice(1),
              oldLineNumber: oldLineNum++
            })
          } else if (hunkLine.startsWith(' ') || hunkLine === '') {
            hunkLines.push({
              type: 'context',
              content: hunkLine.length > 0 ? hunkLine.slice(1) : '',
              oldLineNumber: oldLineNum++,
              newLineNumber: newLineNum++
            })
          }
          // Skip "\ No newline at end of file" lines
        }

        lineIdx++
      }

      hunks.push({ oldStart, oldLines, newStart, newLines, header, lines: hunkLines })
    }

    files.push({ oldPath, newPath, status, hunks, isBinary, similarityIndex })
  }

  return files
}
