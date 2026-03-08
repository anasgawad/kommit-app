// ============================================================
// Kommit — Repository Management Service
// Handles recent repos, opening, and persistence
// ============================================================

import { RepoInfo } from '@shared/types'

const MAX_RECENT_REPOS = 20

/**
 * Manages the list of recently opened repositories.
 * Uses electron-store for persistence (injected to avoid direct dependency in tests).
 */
export class RepoService {
  private store: {
    get: (key: string, defaultValue?: unknown) => unknown
    set: (key: string, value: unknown) => void
  }

  constructor(store: {
    get: (key: string, defaultValue?: unknown) => unknown
    set: (key: string, value: unknown) => void
  }) {
    this.store = store
  }

  /**
   * Get the list of recently opened repositories.
   */
  getRecentRepos(): RepoInfo[] {
    return (this.store.get('recentRepos', []) as RepoInfo[]).sort(
      (a, b) => b.lastOpened - a.lastOpened
    )
  }

  /**
   * Add or update a repository in the recent list.
   */
  addRecentRepo(path: string, name: string): void {
    const repos = this.getRecentRepos()
    const existing = repos.findIndex((r) => r.path === path)

    if (existing !== -1) {
      repos[existing].lastOpened = Date.now()
      repos[existing].name = name
    } else {
      repos.unshift({ path, name, lastOpened: Date.now() })
    }

    // Keep only the most recent repos
    const trimmed = repos.slice(0, MAX_RECENT_REPOS)
    this.store.set('recentRepos', trimmed)
  }

  /**
   * Remove a repository from the recent list.
   */
  removeRecentRepo(path: string): void {
    const repos = this.getRecentRepos()
    const filtered = repos.filter((r) => r.path !== path)
    this.store.set('recentRepos', filtered)
  }

  /**
   * Extract repository name from path.
   */
  static getRepoName(repoPath: string): string {
    const normalized = repoPath.replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? 'unknown'
  }
}
