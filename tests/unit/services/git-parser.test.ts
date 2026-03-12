// ============================================================
// Kommit — Git Parser Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { parseStatus, parseLog, parseBranches } from '../../../src/main/services/git-parser'

describe('parseStatus()', () => {
  it('should parse clean working tree', () => {
    const raw = '# branch.oid abc123\n# branch.head main\n'
    const status = parseStatus(raw)

    expect(status.branch).toBe('main')
    expect(status.isClean).toBe(true)
    expect(status.staged).toHaveLength(0)
    expect(status.unstaged).toHaveLength(0)
    expect(status.untracked).toHaveLength(0)
    expect(status.conflicted).toHaveLength(0)
  })

  it('should parse staged added file', () => {
    const raw = '# branch.head main\n1 A. N... 000000 100644 100644 0000000 abc1234 newfile.ts\n'
    const status = parseStatus(raw)

    expect(status.staged).toHaveLength(1)
    expect(status.staged[0].path).toBe('newfile.ts')
    expect(status.staged[0].indexStatus).toBe('A')
    expect(status.staged[0].isStaged).toBe(true)
  })

  it('should parse staged modified file', () => {
    const raw = '# branch.head main\n1 M. N... 100644 100644 100644 abc1234 def5678 src/app.ts\n'
    const status = parseStatus(raw)

    expect(status.staged).toHaveLength(1)
    expect(status.staged[0].indexStatus).toBe('M')
  })

  it('should parse staged deleted file', () => {
    const raw = '# branch.head main\n1 D. N... 100644 000000 000000 abc1234 0000000 old.ts\n'
    const status = parseStatus(raw)

    expect(status.staged).toHaveLength(1)
    expect(status.staged[0].indexStatus).toBe('D')
  })

  it('should parse unstaged modifications', () => {
    const raw = '# branch.head main\n1 .M N... 100644 100644 100644 abc1234 def5678 src/app.ts\n'
    const status = parseStatus(raw)

    expect(status.unstaged).toHaveLength(1)
    expect(status.unstaged[0].workTreeStatus).toBe('M')
    expect(status.unstaged[0].isStaged).toBe(false)
  })

  it('should parse file that is both staged and unstaged', () => {
    const raw = '# branch.head main\n1 MM N... 100644 100644 100644 abc1234 def5678 src/app.ts\n'
    const status = parseStatus(raw)

    expect(status.staged).toHaveLength(1)
    expect(status.unstaged).toHaveLength(1)
    expect(status.staged[0].path).toBe('src/app.ts')
    expect(status.unstaged[0].path).toBe('src/app.ts')
  })

  it('should parse untracked files', () => {
    const raw = '# branch.head main\n? src/newfile.ts\n? docs/readme.md\n'
    const status = parseStatus(raw)

    expect(status.untracked).toHaveLength(2)
    expect(status.untracked[0].path).toBe('src/newfile.ts')
    expect(status.untracked[1].path).toBe('docs/readme.md')
  })

  it('should parse renamed files', () => {
    const raw =
      '# branch.head main\n2 R. N... 100644 100644 100644 abc1234 def5678 R100 new-name.ts\told-name.ts\n'
    const status = parseStatus(raw)

    expect(status.staged).toHaveLength(1)
    expect(status.staged[0].path).toBe('new-name.ts')
    expect(status.staged[0].originalPath).toBe('old-name.ts')
    expect(status.staged[0].indexStatus).toBe('R')
  })

  it('should parse merge conflicts (UU)', () => {
    const raw =
      '# branch.head main\nu UU N... 100644 100644 100644 100644 abc1234 def5678 ghi9012 conflicted.ts\n'
    const status = parseStatus(raw)

    expect(status.conflicted).toHaveLength(1)
    expect(status.conflicted[0].isConflicted).toBe(true)
    expect(status.conflicted[0].path).toBe('conflicted.ts')
  })

  it('should parse branch tracking info (ahead/behind)', () => {
    const raw = [
      '# branch.oid abc123',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +5 -2',
      ''
    ].join('\n')
    const status = parseStatus(raw)

    expect(status.tracking).not.toBeNull()
    expect(status.tracking!.ahead).toBe(5)
    expect(status.tracking!.behind).toBe(2)
    expect(status.tracking!.remoteName).toBe('origin')
    expect(status.tracking!.remoteBranch).toBe('main')
  })

  it('should handle detached HEAD state', () => {
    const raw = '# branch.oid abc123\n# branch.head (detached)\n'
    const status = parseStatus(raw)

    expect(status.isDetachedHead).toBe(true)
    expect(status.branch).toBe('HEAD (detached)')
  })

  it('should handle empty input', () => {
    const status = parseStatus('')
    expect(status.isClean).toBe(true)
    expect(status.branch).toBe('')
  })

  it('should correctly set isClean flag', () => {
    // With changes
    const dirty = parseStatus('# branch.head main\n? newfile.ts\n')
    expect(dirty.isClean).toBe(false)

    // Without changes
    const clean = parseStatus('# branch.head main\n')
    expect(clean.isClean).toBe(true)
  })
})

describe('parseLog()', () => {
  it('should parse a single commit with all fields', () => {
    const raw =
      'abc123def456789\x00abc123d\x00parent1hash\x00John Doe\x00john@example.com\x002024-01-15T10:30:00+00:00\x00feat: add new feature\x00HEAD -> main\x00\x00'

    const commits = parseLog(raw)

    expect(commits).toHaveLength(1)
    expect(commits[0].hash).toBe('abc123def456789')
    expect(commits[0].abbreviatedHash).toBe('abc123d')
    expect(commits[0].parents).toEqual(['parent1hash'])
    expect(commits[0].author).toBe('John Doe')
    expect(commits[0].authorEmail).toBe('john@example.com')
    expect(commits[0].authorDate).toBeInstanceOf(Date)
    expect(commits[0].subject).toBe('feat: add new feature')
    expect(commits[0].refs).toContain('HEAD -> main')
  })

  it('should parse multiple commits', () => {
    const raw = [
      'hash1\x00h1\x00\x00Author1\x00a@b.com\x002024-01-01T00:00:00Z\x00Commit 1\x00\x00\x00',
      'hash2\x00h2\x00hash1\x00Author2\x00c@d.com\x002024-01-02T00:00:00Z\x00Commit 2\x00\x00\x00',
      'hash3\x00h3\x00hash2\x00Author3\x00e@f.com\x002024-01-03T00:00:00Z\x00Commit 3\x00\x00\x00'
    ].join('')

    const commits = parseLog(raw)
    expect(commits).toHaveLength(3)
  })

  it('should handle root commit (no parents)', () => {
    const raw =
      'hash1\x00h1\x00\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Root commit\x00\x00\x00'
    const commits = parseLog(raw)
    expect(commits[0].parents).toEqual([])
  })

  it('should handle merge commit (two parents)', () => {
    const raw =
      'hash1\x00h1\x00parent1 parent2\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Merge branch\x00\x00\x00'
    const commits = parseLog(raw)
    expect(commits[0].parents).toEqual(['parent1', 'parent2'])
  })

  it('should handle octopus merge (3+ parents)', () => {
    const raw =
      'hash1\x00h1\x00p1 p2 p3\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Octopus\x00\x00\x00'
    const commits = parseLog(raw)
    expect(commits[0].parents).toEqual(['p1', 'p2', 'p3'])
  })

  it('should parse multiple ref decorations', () => {
    const raw =
      'hash1\x00h1\x00\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Commit\x00HEAD -> main, tag: v1.0, origin/main\x00\x00'
    const commits = parseLog(raw)
    expect(commits[0].refs).toHaveLength(3)
    expect(commits[0].refs).toContain('HEAD -> main')
    expect(commits[0].refs).toContain('tag: v1.0')
    expect(commits[0].refs).toContain('origin/main')
  })

  it('should handle commit with no refs', () => {
    const raw =
      'hash1\x00h1\x00parent\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00Commit\x00\x00\x00'
    const commits = parseLog(raw)
    expect(commits[0].refs).toEqual([])
  })

  it('should return empty array for empty input', () => {
    expect(parseLog('')).toEqual([])
    expect(parseLog('   ')).toEqual([])
  })

  it('should handle special characters in subject', () => {
    const raw =
      'hash1\x00h1\x00\x00Author\x00a@b.com\x002024-01-01T00:00:00Z\x00fix: handle "quotes" & <brackets> and $pecial\x00\x00\x00'
    const commits = parseLog(raw)
    expect(commits[0].subject).toBe('fix: handle "quotes" & <brackets> and $pecial')
  })
})

describe('parseBranches()', () => {
  it('should parse local branches', () => {
    const localRaw =
      'main\tabc123\torigin/main\t\t*\tLatest commit\nfeature\tdef456\t\t\t \tFeature work\n'
    const branches = parseBranches(localRaw, '')
    const local = branches.filter((b) => !b.isRemote)

    expect(local).toHaveLength(2)
    expect(local[0].name).toBe('main')
    expect(local[1].name).toBe('feature')
  })

  it('should parse remote branches', () => {
    const remoteRaw = 'origin/main\tabc123\t\t\t \tLatest\norigin/develop\tdef456\t\t\t \tDev\n'
    const branches = parseBranches('', remoteRaw)
    const remote = branches.filter((b) => b.isRemote)

    expect(remote).toHaveLength(2)
    expect(remote[0].name).toBe('origin/main')
    expect(remote[1].name).toBe('origin/develop')
  })

  it('should identify current branch with * marker', () => {
    const localRaw = 'main\tabc123\t\t\t*\tCommit\nother\tdef456\t\t\t \tCommit\n'
    const branches = parseBranches(localRaw, '')

    expect(branches[0].isCurrent).toBe(true)
    expect(branches[1].isCurrent).toBe(false)
  })

  it('should parse tracking info (ahead/behind)', () => {
    const localRaw = 'main\tabc123\torigin/main\t[ahead 3, behind 2]\t*\tCommit\n'
    const branches = parseBranches(localRaw, '')

    expect(branches[0].tracking).toBeDefined()
    expect(branches[0].tracking!.ahead).toBe(3)
    expect(branches[0].tracking!.behind).toBe(2)
  })

  it('should parse upstream reference', () => {
    const localRaw = 'main\tabc123\torigin/main\t\t*\tCommit\n'
    const branches = parseBranches(localRaw, '')

    expect(branches[0].upstream).toBe('origin/main')
  })

  it('should handle branch with no upstream', () => {
    const localRaw = 'local-only\tabc123\t\t\t \tCommit\n'
    const branches = parseBranches(localRaw, '')

    expect(branches[0].upstream).toBeUndefined()
  })

  it('should handle empty input', () => {
    const branches = parseBranches('', '')
    expect(branches).toEqual([])
  })

  it('should combine local and remote branches', () => {
    const localRaw = 'main\tabc123\t\t\t*\tCommit\n'
    const remoteRaw = 'origin/main\tabc123\t\t\t \tCommit\n'
    const branches = parseBranches(localRaw, remoteRaw)

    expect(branches).toHaveLength(2)
    expect(branches.filter((b) => !b.isRemote)).toHaveLength(1)
    expect(branches.filter((b) => b.isRemote)).toHaveLength(1)
  })
})
