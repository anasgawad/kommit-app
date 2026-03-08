// ============================================================
// Kommit — Git Output Parsers
// Parse machine-readable git output into typed structures
// ============================================================

import {
  GitStatus,
  FileStatus,
  FileStatusCode,
  BranchTrackingInfo,
  Commit,
  Branch
} from '@shared/types'

/**
 * Parse `git status --porcelain=v2 --branch` output.
 *
 * Porcelain v2 format:
 *   # branch.oid <hash>
 *   # branch.head <name>
 *   # branch.upstream <upstream>
 *   # branch.ab +<ahead> -<behind>
 *   1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>          (ordinary changed)
 *   2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>\t<origPath>  (renamed/copied)
 *   u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path> (unmerged)
 *   ? <path>                                                   (untracked)
 *   ! <path>                                                   (ignored)
 */
export function parseStatus(raw: string): GitStatus {
  const lines = raw.split('\n').filter((l) => l.length > 0)

  let branch = ''
  let isDetachedHead = false
  let tracking: BranchTrackingInfo | null = null
  const staged: FileStatus[] = []
  const unstaged: FileStatus[] = []
  const untracked: FileStatus[] = []
  const conflicted: FileStatus[] = []

  for (const line of lines) {
    // Branch headers
    if (line.startsWith('# branch.head ')) {
      branch = line.slice('# branch.head '.length)
      if (branch === '(detached)') {
        isDetachedHead = true
        branch = 'HEAD (detached)'
      }
      continue
    }

    if (line.startsWith('# branch.upstream ')) {
      if (!tracking) tracking = { ahead: 0, behind: 0 }
      const upstream = line.slice('# branch.upstream '.length)
      const parts = upstream.split('/')
      tracking.remoteName = parts[0]
      tracking.remoteBranch = parts.slice(1).join('/')
      continue
    }

    if (line.startsWith('# branch.ab ')) {
      if (!tracking) tracking = { ahead: 0, behind: 0 }
      const match = line.match(/\+(\d+)\s+-(\d+)/)
      if (match) {
        tracking.ahead = parseInt(match[1], 10)
        tracking.behind = parseInt(match[2], 10)
      }
      continue
    }

    // Skip other branch headers (oid, etc.)
    if (line.startsWith('#')) continue

    // Untracked
    if (line.startsWith('? ')) {
      untracked.push({
        path: line.slice(2),
        indexStatus: '.',
        workTreeStatus: FileStatusCode.Untracked,
        isStaged: false,
        isConflicted: false
      })
      continue
    }

    // Ignored
    if (line.startsWith('! ')) continue

    // Unmerged (conflicts)
    if (line.startsWith('u ')) {
      const parts = line.split(/\s+/)
      const xy = parts[1]
      const path = parts[parts.length - 1]
      conflicted.push({
        path,
        indexStatus: xy[0] as FileStatusCode,
        workTreeStatus: xy[1] as FileStatusCode,
        isStaged: false,
        isConflicted: true
      })
      continue
    }

    // Ordinary changed entries (type "1")
    if (line.startsWith('1 ')) {
      const parts = line.split(/\s+/)
      const xy = parts[1]
      const path = parts[parts.length - 1]
      const indexStatus = xy[0] as FileStatusCode | '.'
      const workTreeStatus = xy[1] as FileStatusCode | '.'

      if (indexStatus !== '.') {
        staged.push({
          path,
          indexStatus,
          workTreeStatus: '.',
          isStaged: true,
          isConflicted: false
        })
      }

      if (workTreeStatus !== '.') {
        unstaged.push({
          path,
          indexStatus: '.',
          workTreeStatus,
          isStaged: false,
          isConflicted: false
        })
      }
      continue
    }

    // Renamed/copied entries (type "2")
    if (line.startsWith('2 ')) {
      const parts = line.split(/\s+/)
      const xy = parts[1]
      const pathPart = parts.slice(8).join(' ')
      const [newPath, oldPath] = pathPart.split('\t')
      const indexStatus = xy[0] as FileStatusCode | '.'
      const workTreeStatus = xy[1] as FileStatusCode | '.'

      if (indexStatus !== '.') {
        staged.push({
          path: newPath,
          originalPath: oldPath,
          indexStatus,
          workTreeStatus: '.',
          isStaged: true,
          isConflicted: false
        })
      }

      if (workTreeStatus !== '.') {
        unstaged.push({
          path: newPath,
          originalPath: oldPath,
          indexStatus: '.',
          workTreeStatus,
          isStaged: false,
          isConflicted: false
        })
      }
      continue
    }
  }

  return {
    branch,
    isDetachedHead,
    tracking,
    staged,
    unstaged,
    untracked,
    conflicted,
    isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && conflicted.length === 0
  }
}

/**
 * Parse `git log --format=<NUL-delimited>` output.
 * Format: %H%x00%h%x00%P%x00%an%x00%ae%x00%aI%x00%s%x00%D%x00%x00
 * Records separated by double-NUL (\0\0), fields by single NUL (\0).
 */
export function parseLog(raw: string): Commit[] {
  if (!raw || raw.trim().length === 0) {
    return []
  }

  const records = raw.split('\0\0').filter((r) => r.trim().length > 0)

  return records.map((record) => {
    const fields = record.replace(/^\n/, '').split('\0')

    const [hash, abbreviatedHash, parents, author, authorEmail, authorDateStr, subject, refsStr] =
      fields

    return {
      hash: hash ?? '',
      abbreviatedHash: abbreviatedHash ?? '',
      parents: parents && parents.trim().length > 0 ? parents.trim().split(' ') : [],
      author: author ?? '',
      authorEmail: authorEmail ?? '',
      authorDate: new Date(authorDateStr ?? 0),
      subject: subject ?? '',
      refs: refsStr && refsStr.trim().length > 0
        ? refsStr.split(',').map((r) => r.trim()).filter(Boolean)
        : []
    }
  })
}

/**
 * Parse `git branch --format=<NUL-delimited>` output.
 * Format: %(refname:short)%x00%(objectname:short)%x00%(upstream:short)%x00%(upstream:track)%x00%(HEAD)%x00%(subject)
 */
export function parseBranches(localRaw: string, remoteRaw: string): Branch[] {
  const branches: Branch[] = []

  const parseLines = (raw: string, isRemote: boolean) => {
    if (!raw || raw.trim().length === 0) return

    const lines = raw.split('\n').filter((l) => l.trim().length > 0)

    for (const line of lines) {
      const fields = line.split('\0')
      const [name, lastCommitHash, upstream, trackingStr, headMarker, lastCommitSubject] = fields

      if (!name) continue

      let tracking: BranchTrackingInfo | undefined
      if (trackingStr && trackingStr.length > 0) {
        const match = trackingStr.match(/ahead (\d+)/)
        const behindMatch = trackingStr.match(/behind (\d+)/)
        tracking = {
          ahead: match ? parseInt(match[1], 10) : 0,
          behind: behindMatch ? parseInt(behindMatch[1], 10) : 0
        }
      }

      branches.push({
        name: name.trim(),
        isRemote,
        isCurrent: headMarker?.trim() === '*',
        isHead: headMarker?.trim() === '*',
        upstream: upstream && upstream.trim().length > 0 ? upstream.trim() : undefined,
        tracking,
        lastCommitHash: lastCommitHash?.trim(),
        lastCommitSubject: lastCommitSubject?.trim()
      })
    }
  }

  parseLines(localRaw, false)
  parseLines(remoteRaw, true)

  return branches
}
