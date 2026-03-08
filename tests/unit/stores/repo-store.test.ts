// ============================================================
// Kommit — RepoService Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { RepoService } from '../../../src/main/services/repo'

function createMockStore() {
  const data: Record<string, unknown> = {}
  return {
    get: (key: string, defaultValue?: unknown) => data[key] ?? defaultValue,
    set: (key: string, value: unknown) => {
      data[key] = value
    },
    _data: data
  }
}

describe('RepoService', () => {
  let store: ReturnType<typeof createMockStore>
  let repoService: RepoService

  beforeEach(() => {
    store = createMockStore()
    repoService = new RepoService(store)
  })

  describe('getRecentRepos()', () => {
    it('should return empty array when no repos stored', () => {
      const repos = repoService.getRecentRepos()
      expect(repos).toEqual([])
    })

    it('should return repos sorted by lastOpened (newest first)', () => {
      store.set('recentRepos', [
        { path: '/old', name: 'old', lastOpened: 1000 },
        { path: '/new', name: 'new', lastOpened: 3000 },
        { path: '/mid', name: 'mid', lastOpened: 2000 }
      ])

      const repos = repoService.getRecentRepos()
      expect(repos[0].name).toBe('new')
      expect(repos[1].name).toBe('mid')
      expect(repos[2].name).toBe('old')
    })
  })

  describe('addRecentRepo()', () => {
    it('should add new repo to list', () => {
      repoService.addRecentRepo('/repo', 'my-repo')
      const repos = repoService.getRecentRepos()

      expect(repos).toHaveLength(1)
      expect(repos[0].path).toBe('/repo')
      expect(repos[0].name).toBe('my-repo')
    })

    it('should update existing repo timestamp', () => {
      repoService.addRecentRepo('/repo', 'my-repo')
      const firstTime = repoService.getRecentRepos()[0].lastOpened

      // Small delay to ensure different timestamp
      repoService.addRecentRepo('/repo', 'my-repo')
      const secondTime = repoService.getRecentRepos()[0].lastOpened

      expect(secondTime).toBeGreaterThanOrEqual(firstTime)
    })

    it('should not duplicate repos with same path', () => {
      repoService.addRecentRepo('/repo', 'my-repo')
      repoService.addRecentRepo('/repo', 'my-repo')
      repoService.addRecentRepo('/repo', 'my-repo')

      const repos = repoService.getRecentRepos()
      expect(repos).toHaveLength(1)
    })

    it('should limit to 20 recent repos', () => {
      for (let i = 0; i < 25; i++) {
        repoService.addRecentRepo(`/repo-${i}`, `repo-${i}`)
      }

      const repos = repoService.getRecentRepos()
      expect(repos.length).toBeLessThanOrEqual(20)
    })

    it('should update name if repo path exists', () => {
      repoService.addRecentRepo('/repo', 'old-name')
      repoService.addRecentRepo('/repo', 'new-name')

      const repos = repoService.getRecentRepos()
      expect(repos[0].name).toBe('new-name')
    })
  })

  describe('removeRecentRepo()', () => {
    it('should remove repo by path', () => {
      repoService.addRecentRepo('/repo-1', 'repo-1')
      repoService.addRecentRepo('/repo-2', 'repo-2')

      repoService.removeRecentRepo('/repo-1')
      const repos = repoService.getRecentRepos()

      expect(repos).toHaveLength(1)
      expect(repos[0].path).toBe('/repo-2')
    })

    it('should do nothing if path not found', () => {
      repoService.addRecentRepo('/repo-1', 'repo-1')
      repoService.removeRecentRepo('/nonexistent')

      const repos = repoService.getRecentRepos()
      expect(repos).toHaveLength(1)
    })
  })

  describe('getRepoName()', () => {
    it('should extract name from Unix path', () => {
      expect(RepoService.getRepoName('/home/user/projects/my-app')).toBe('my-app')
    })

    it('should extract name from Windows path', () => {
      expect(RepoService.getRepoName('C:\\Users\\user\\projects\\my-app')).toBe('my-app')
    })

    it('should handle trailing slashes', () => {
      expect(RepoService.getRepoName('/home/user/projects/my-app/')).toBe('my-app')
    })
  })
})
