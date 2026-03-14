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
      // Split by spaces (not tabs) to preserve tab between newPath and oldPath
      const parts = line.split(/ +/)
      const xy = parts[1]
      // parts[8] is the X<score> field (e.g., R100, C095)
      // parts[9] onward is "newPath\toldPath"
      const pathPart = parts.slice(9).join(' ')
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
    isClean:
      staged.length === 0 &&
      unstaged.length === 0 &&
      untracked.length === 0 &&
      conflicted.length === 0
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

  // Split by NUL bytes
  const parts = raw.split('\0')

  // Group into records of 8 fields each
  // Format: hash, abbrevHash, parents, author, email, date, subject, refs
  // After refs, there's an empty string (from trailing \0\0 record separator)
  const commits: Commit[] = []

  for (let i = 0; i + 7 < parts.length; i += 9) {
    // Skip if this looks like an empty record separator
    if (parts[i].trim().length === 0) {
      continue
    }

    const [hash, abbreviatedHash, parents, author, authorEmail, authorDateStr, subject, refsStr] =
      parts.slice(i, i + 8)

    commits.push({
      hash: (hash ?? '').trim(),
      abbreviatedHash: (abbreviatedHash ?? '').trim(),
      parents: parents && parents.trim().length > 0 ? parents.trim().split(' ') : [],
      author: (author ?? '').trim(),
      authorEmail: (authorEmail ?? '').trim(),
      authorDate: new Date(authorDateStr ?? 0),
      subject: (subject ?? '').trim(),
      refs:
        refsStr && refsStr.trim().length > 0
          ? refsStr
              .split(',')
              .map((r) => r.trim())
              .filter(Boolean)
          : []
    })
  }

  return commits
}

/**
 * Parse `git branch --format=<TAB-delimited>` output.
 * Format: %(refname:short)%09%(objectname:short)%09%(upstream:short)%09%(upstream:track)%09%(HEAD)%09%(subject)
 * Note: Uses tab delimiter due to Git for Windows not supporting %x00 in branch --format
 */
export function parseBranches(localRaw: string, remoteRaw: string): Branch[] {
  const branches: Branch[] = []

  const parseLines = (raw: string, isRemote: boolean) => {
    if (!raw || raw.trim().length === 0) return

    const lines = raw.split('\n').filter((l) => l.trim().length > 0)

    for (const line of lines) {
      const fields = line.split('\t')
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
