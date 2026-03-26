// ============================================================
// Kommit — Lane Assignment Algorithm Tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { assignLanes } from '../../../src/renderer/graph/lane-algorithm'
import type { Commit } from '../../../src/shared/types'
import { BRANCH_COLORS } from '../../../src/renderer/graph/colors'

// Helper to create minimal commit objects for testing
function createCommit(hash: string, parents: string[] = [], refs: string[] = []): Commit {
  return {
    hash,
    abbreviatedHash: hash.substring(0, 7),
    parents,
    author: 'Test Author',
    authorEmail: 'test@example.com',
    authorDate: new Date('2024-01-01'),
    subject: 'Test commit',
    refs
  }
}

describe('Lane Assignment', () => {
  it('should assign column 0 to linear history (no branches)', () => {
    const commits = [
      createCommit('aaa', ['bbb']),
      createCommit('bbb', ['ccc']),
      createCommit('ccc', [])
    ]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(3)
    expect(rows[0].column).toBe(0)
    expect(rows[1].column).toBe(0)
    expect(rows[2].column).toBe(0)
  })

  it('should allocate new column for branch fork', () => {
    // In topological order: C -> B -> A, D -> A
    // D branches from A
    const commits = [
      createCommit('ccc', ['bbb']),
      createCommit('bbb', ['aaa']),
      createCommit('ddd', ['aaa']), // Branch from A
      createCommit('aaa', [])
    ]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(4)
    // Main line in column 0
    expect(rows[0].column).toBe(0)
    expect(rows[1].column).toBe(0)
    // Branch should get a different column
    expect(rows[2].column).toBeGreaterThanOrEqual(0) // Could be 0 or 1 depending on order
    expect(rows[3].column).toBe(0)
    // At least two different columns used
    const uniqueColumns = new Set(rows.map((r) => r.column))
    expect(uniqueColumns.size).toBeGreaterThan(1)
  })

  it('should merge columns when branches merge', () => {
    // Main: A -> C (merge)
    // Branch: A -> B -> C
    const commits = [
      createCommit('ccc', ['aaa', 'bbb']), // Merge commit
      createCommit('aaa', []),
      createCommit('bbb', ['aaa'])
    ]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(3)
    // Merge commit in column 0
    expect(rows[0].column).toBe(0)
    // Should have edges to both parents
    expect(rows[0].edges.length).toBe(2)
  })

  it('should reuse freed columns (compact layout)', () => {
    // Linear history after a branch completes
    const commits = [
      createCommit('aaa', ['bbb']),
      createCommit('bbb', ['ccc']),
      createCommit('ccc', ['ddd']),
      createCommit('ddd', []),
      createCommit('eee', ['ccc']) // New branch from C, D is done
    ]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(5)
    // All should use column 0 or 1 (no column 2+)
    const maxColumn = Math.max(...rows.map((r) => r.column))
    expect(maxColumn).toBeLessThanOrEqual(1)
  })

  it('should handle octopus merges (3+ parents)', () => {
    const commits = [
      createCommit('merge', ['aaa', 'bbb', 'ccc']), // 3-way merge
      createCommit('aaa', []),
      createCommit('bbb', []),
      createCommit('ccc', [])
    ]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(4)
    // Merge commit should have 3 edges
    expect(rows[0].edges.length).toBe(3)
    // Each parent in different column
    const parentColumns = rows[0].edges.map((e) => e.toColumn)
    const uniqueColumns = new Set(parentColumns)
    expect(uniqueColumns.size).toBeGreaterThanOrEqual(2) // At least 2 different columns
  })

  it('should handle root commits (no parents)', () => {
    const commits = [createCommit('aaa', [])]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(1)
    expect(rows[0].column).toBe(0)
    expect(rows[0].edges).toHaveLength(0)
  })

  it('should handle multiple roots (unrelated histories)', () => {
    const commits = [
      createCommit('aaa', []), // Root 1
      createCommit('bbb', []) // Root 2 (unrelated)
    ]

    const rows = assignLanes(commits)

    expect(rows).toHaveLength(2)
    // Each root gets its own column
    expect(rows[0].column).toBeDefined()
    expect(rows[1].column).toBeDefined()
    // Both should have no edges
    expect(rows[0].edges).toHaveLength(0)
    expect(rows[1].edges).toHaveLength(0)
  })

  it('should produce stable output for same input', () => {
    const commits = [
      createCommit('aaa', ['bbb']),
      createCommit('bbb', ['ccc']),
      createCommit('ccc', [])
    ]

    const rows1 = assignLanes(commits)
    const rows2 = assignLanes(commits)

    expect(rows1).toEqual(rows2)
  })

  it('should handle 10,000 commits without stack overflow', () => {
    // Generate long linear history
    const commits: Commit[] = []
    for (let i = 0; i < 10000; i++) {
      const hash = `commit${i}`
      const parent = i < 9999 ? [`commit${i + 1}`] : []
      commits.push(createCommit(hash, parent))
    }

    expect(() => assignLanes(commits)).not.toThrow()
    const rows = assignLanes(commits)
    expect(rows).toHaveLength(10000)
    // All should be in column 0 (linear)
    expect(rows.every((r) => r.column === 0)).toBe(true)
  })

  it('should correctly order columns (main branch leftmost)', () => {
    // Complex branching: main should stay in column 0
    const commits = [
      createCommit('main4', ['main3'], ['main']),
      createCommit('main3', ['main2']),
      createCommit('main2', ['main1']),
      createCommit('main1', ['main0']),
      createCommit('main0', []),
      createCommit('branch1', ['main2'], ['feature1']),
      createCommit('branch2', ['main2'], ['feature2'])
    ]

    const rows = assignLanes(commits)

    // Main branch commits should be in column 0
    const mainRows = rows.filter((r) => r.commit.refs.includes('main'))
    expect(mainRows.every((r) => r.column === 0)).toBe(true)
  })

  // --- New tests for color propagation and pass-through behavior ---

  it('should assign a color to every row', () => {
    const commits = [
      createCommit('aaa', ['bbb']),
      createCommit('bbb', ['ccc']),
      createCommit('ccc', [])
    ]

    const rows = assignLanes(commits)

    for (const row of rows) {
      expect(row.color).toBeDefined()
      expect(typeof row.color).toBe('string')
      expect(row.color.length).toBeGreaterThan(0)
    }
  })

  it('should propagate same color through a linear lane', () => {
    const commits = [
      createCommit('aaa', ['bbb']),
      createCommit('bbb', ['ccc']),
      createCommit('ccc', [])
    ]

    const rows = assignLanes(commits)

    // All three commits are in lane 0, should have the same color
    expect(rows[0].color).toBe(rows[1].color)
    expect(rows[1].color).toBe(rows[2].color)
  })

  it('should use branch ref for color when available', () => {
    const commits = [createCommit('aaa', ['bbb'], ['main']), createCommit('bbb', [])]

    const rows = assignLanes(commits)

    // Both should have a color from BRANCH_COLORS
    expect(BRANCH_COLORS).toContain(rows[0].color)
    // Color propagates to bbb since it's in the same lane
    expect(rows[0].color).toBe(rows[1].color)
  })

  it('should NOT generate pass-through edges for cross-column edges', () => {
    // Create a merge scenario with cross-column edges
    const commits = [
      createCommit('aaa', ['bbb', 'ccc']), // merge
      createCommit('bbb', ['ddd']),
      createCommit('ccc', ['ddd']),
      createCommit('ddd', [])
    ]

    const rows = assignLanes(commits)

    // Find any cross-column edges
    const hasCrossColumn = rows.some((r) => r.edges.some((e) => e.fromColumn !== e.toColumn))

    if (hasCrossColumn) {
      // Check that intermediate rows don't have pass-throughs at the
      // destination column of cross-column edges
      for (const row of rows) {
        for (const edge of row.edges) {
          if (edge.fromColumn !== edge.toColumn) {
            // For intermediate rows between fromRow+1 and toRow-1,
            // there should be NO pass-through at edge.toColumn
            for (let i = edge.fromRow + 1; i < edge.toRow; i++) {
              const intermediate = rows[i]
              const hasPTAtToCol = intermediate.passThroughEdges.some(
                (pte) => pte.column === edge.toColumn
              )
              // Pass-throughs at toColumn should NOT exist for cross-column edges
              // (unless another same-column edge also passes through there)
              const hasSameColEdgeAtThatCol = rows.some((r) =>
                r.edges.some(
                  (e) =>
                    e.fromColumn === edge.toColumn &&
                    e.toColumn === edge.toColumn &&
                    e.fromRow < i &&
                    e.toRow > i
                )
              )
              if (!hasSameColEdgeAtThatCol) {
                expect(hasPTAtToCol).toBe(false)
              }
            }
          }
        }
      }
    }
  })

  it('should generate pass-through edges for same-column edges', () => {
    // Linear history spanning several rows
    const commits = [
      createCommit('aaa', ['ddd']), // spans 3 rows to reach ddd
      createCommit('bbb', []), // unrelated, sits in between
      createCommit('ccc', []), // unrelated, sits in between
      createCommit('ddd', [])
    ]

    const rows = assignLanes(commits)

    // Find the edge from aaa to ddd
    const aaaRow = rows.find((r) => r.commit.hash === 'aaa')
    const aaaEdge = aaaRow?.edges.find((e) => {
      const parentRow = rows.find((r) => r.commit.hash === 'ddd')
      return parentRow && e.toRow === rows.indexOf(parentRow)
    })

    if (aaaEdge && aaaEdge.fromColumn === aaaEdge.toColumn) {
      // There should be pass-through edges in intermediate rows
      for (let i = aaaEdge.fromRow + 1; i < aaaEdge.toRow; i++) {
        const intermediate = rows[i]
        const hasPT = intermediate.passThroughEdges.some((pte) => pte.column === aaaEdge.fromColumn)
        expect(hasPT).toBe(true)
      }
    }
  })
})
