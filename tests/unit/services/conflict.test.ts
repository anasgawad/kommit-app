// ============================================================
// Kommit — Unit Tests: GitService Conflict Resolution Operations
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitService } from '../../../src/main/services/git'
import { GitError } from '../../../src/shared/types'

vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn()
}))

import * as fsPromises from 'node:fs/promises'

const mockReadFile = vi.mocked(fsPromises.readFile)

describe('GitService.getConflictedFiles()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should list files with conflict markers', async () => {
    vi.spyOn(service as any, 'exec').mockResolvedValue('src/app.ts\nsrc/utils.ts\n')
    mockReadFile.mockResolvedValue('<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch')

    const files = await service.getConflictedFiles('/repo')
    expect(files.length).toBeGreaterThan(0)
    expect(files[0].path).toBeDefined()
    expect(files[0].conflictCount).toBeGreaterThan(0)
  })

  it('should identify conflict type (content)', async () => {
    vi.spyOn(service as any, 'exec').mockResolvedValue('conflicted.ts\n')
    mockReadFile.mockResolvedValue('<<<<<<< HEAD\nline a\n=======\nline b\n>>>>>>> branch')

    const files = await service.getConflictedFiles('/repo')
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('conflicted.ts')
  })
})

describe('GitService.getConflictFileContent()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should return ours, base, and theirs content', async () => {
    const execSpy = vi.spyOn(service as any, 'exec')
    execSpy
      .mockResolvedValueOnce('base content') // :1:file
      .mockResolvedValueOnce('our content') // :2:file
      .mockResolvedValueOnce('their content') // :3:file

    mockReadFile.mockResolvedValue(
      '<<<<<<< HEAD\nour content\n=======\ntheir content\n>>>>>>> branch'
    )

    const result = await service.getConflictFileContent('/repo', 'file.ts')
    expect(result.base).toBe('base content')
    expect(result.ours).toBe('our content')
    expect(result.theirs).toBe('their content')
    expect(result.result).toContain('<<<<<<< HEAD')
  })

  it('should handle missing stages gracefully', async () => {
    vi.spyOn(service as any, 'exec').mockRejectedValue(new Error('no stage'))
    mockReadFile.mockResolvedValue('')

    const result = await service.getConflictFileContent('/repo', 'file.ts')
    expect(result.base).toBe('')
    expect(result.ours).toBe('')
    expect(result.theirs).toBe('')
  })
})

describe('GitService.markResolved()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should stage resolved file', async () => {
    const execSpy = vi.spyOn(service as any, 'exec').mockResolvedValue('')
    mockReadFile.mockResolvedValue('clean content with no conflict markers')

    await service.markResolved('/repo', 'file.ts')
    expect(execSpy).toHaveBeenCalledWith(['add', '--', 'file.ts'], '/repo')
  })

  it('should reject file still containing conflict markers', async () => {
    vi.spyOn(service as any, 'exec').mockResolvedValue('')
    mockReadFile.mockResolvedValue(
      '<<<<<<< HEAD\nstill conflicted\n=======\nother side\n>>>>>>> branch'
    )

    await expect(service.markResolved('/repo', 'file.ts')).rejects.toThrow('conflict markers')
  })
})

describe('GitService.writeResolvedFile()', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    vi.restoreAllMocks()
  })

  it('should write resolved content to the file', async () => {
    ;(fsPromises.writeFile as any).mockResolvedValue(undefined)
    await service.writeResolvedFile('/repo', 'file.ts', 'resolved content')
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('file.ts'),
      'resolved content',
      'utf8'
    )
  })
})
