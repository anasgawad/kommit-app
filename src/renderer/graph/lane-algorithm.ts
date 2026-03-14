// ============================================================
// Kommit — Lane Assignment Algorithm
// Assigns columns (swim lanes) to commits for graph visualization
// ============================================================

import type { Commit, GraphRow, GraphEdge, PassThroughEdge } from '@shared/types'
import { getBranchColor } from './colors'

/**
 * Assigns lanes (columns) to commits and computes edges between them.
 * Commits must be in topological order (as returned by git log --topo-order).
 *
 * Time complexity: O(n) where n = number of commits
 * Space complexity: O(n) for the output GraphRow array
 *
 * Algorithm:
 * 1. Pass 1: Assign columns using a lane tracking array
 *    - Each lane tracks which commit hash it "expects" next
 *    - First parent continues the lane
 *    - Additional parents (merges) get new lanes
 *    - Compact trailing nulls after each commit
 * 2. Pass 2: Compute edges by connecting each commit to its parents
 * 3. Pass 3: Compute pass-through edges for intermediate rows
 *    - For each edge spanning multiple rows, mark all intermediate rows
 *      with a pass-through edge so they draw continuation lines
 */
export function assignLanes(commits: Commit[]): GraphRow[] {
  if (commits.length === 0) return []

  console.log('[Lane Algorithm] Processing', commits.length, 'commits')
  console.log(
    '[Lane Algorithm] First 3 commits:',
    commits.slice(0, 3).map((c) => ({
      hash: c.hash.substring(0, 8),
      parents: c.parents.map((p) => p.substring(0, 8))
    }))
  )

  // Pass 1: Assign columns
  const lanes: (string | null)[] = []
  const rows: GraphRow[] = []
  const hashToRowIndex = new Map<string, number>()

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]

    // Debug first few commits
    if (i < 5) {
      console.log(
        `[Lane] Commit ${i}:`,
        commit.hash.substring(0, 8),
        'parents:',
        commit.parents.map((p) => p.substring(0, 8))
      )
      console.log(
        `[Lane] Current lanes:`,
        lanes.map((l) => (l ? l.substring(0, 8) : 'null'))
      )
      // Check if this commit hash matches any lane
      const matchingLane = lanes.findIndex((l) => l === commit.hash)
      console.log(`[Lane] Looking for commit hash in lanes: ${matchingLane}`)
    }

    // Find lane expecting this commit hash
    let col = lanes.indexOf(commit.hash)
    if (col === -1) {
      // Not found, try to find a free lane
      col = lanes.indexOf(null)
      if (col === -1) {
        // No free lanes, add new one
        col = lanes.length
        lanes.push(null)
      }
    }

    if (i < 5) {
      console.log(`[Lane] Assigned column ${col} to commit ${commit.hash.substring(0, 8)}`)
    }

    // Lane now expects first parent (if any)
    lanes[col] = commit.parents[0] ?? null

    // Additional parents (merges) get their own lanes
    for (let j = 1; j < commit.parents.length; j++) {
      const parentHash = commit.parents[j]
      let parentCol = lanes.indexOf(parentHash)
      if (parentCol === -1) {
        // Parent not already in a lane, find or create one
        parentCol = lanes.indexOf(null)
        if (parentCol === -1) {
          parentCol = lanes.length
          lanes.push(null)
        }
        lanes[parentCol] = parentHash
      }
    }

    // Compact trailing nulls
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop()
    }

    // Store the row (edges will be filled in pass 2)
    rows.push({ commit, column: col, edges: [], passThroughEdges: [], incomingEdges: [] })
    hashToRowIndex.set(commit.hash, i)
  }

  // Pass 2: Compute edges
  console.log('[Lane Algorithm] Pass 2: Computing edges')
  let edgesCreated = 0
  let parentsNotFound = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const commit = row.commit

    for (const parentHash of commit.parents) {
      const parentRowIndex = hashToRowIndex.get(parentHash)
      if (parentRowIndex === undefined) {
        // Parent not in this commit list (probably filtered out)
        if (i < 3) {
          console.log(
            `[Lane] Parent not found: child=${commit.hash.substring(0, 8)} parent=${parentHash.substring(0, 8)}`
          )
        }
        parentsNotFound++
        continue
      }

      const parentRow = rows[parentRowIndex]
      const fromColumn = row.column
      const toColumn = parentRow.column

      // Determine color: use branch color based on commit's primary ref
      const color = getEdgeColor(commit)

      const edge: GraphEdge = {
        fromColumn,
        toColumn,
        fromRow: i,
        toRow: parentRowIndex,
        color
      }

      // Add to child row's outgoing edges
      row.edges.push(edge)
      // Add to parent row's incoming edges
      parentRow.incomingEdges.push(edge)
      edgesCreated++
    }
  }

  console.log(
    `[Lane Algorithm] Pass 2 complete: ${edgesCreated} edges created, ${parentsNotFound} parents not found`
  )

  // Pass 3: Compute pass-through edges for intermediate rows
  console.log('[Lane Algorithm] Pass 3: Computing pass-through edges')
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // For each edge originating from this row
    for (const edge of row.edges) {
      if (edge.fromColumn === edge.toColumn) {
        // Same-column edges: draw vertical line through all intermediate rows
        for (let intermediateRow = i + 1; intermediateRow < edge.toRow; intermediateRow++) {
          const intermediate = rows[intermediateRow]
          const column = edge.fromColumn

          // Check if we already have this pass-through edge
          const exists = intermediate.passThroughEdges.some((pte) => pte.column === column)
          if (!exists) {
            intermediate.passThroughEdges.push({ column, color: edge.color })
          }
        }
      } else {
        // Cross-column edges (merges/branches):
        // The edge curves from fromColumn to toColumn in the first row (or first couple rows),
        // then continues vertically in the toColumn for remaining intermediate rows.
        //
        // Strategy: After the initial curve (1-2 rows), continue in destination column
        const curveRows = Math.min(2, edge.toRow - i) // Reserve 1-2 rows for the curve

        for (let intermediateRow = i + 1; intermediateRow < edge.toRow; intermediateRow++) {
          const intermediate = rows[intermediateRow]

          // After the curve transition, draw in destination column
          if (intermediateRow >= i + curveRows) {
            const column = edge.toColumn
            const exists = intermediate.passThroughEdges.some((pte) => pte.column === column)
            if (!exists) {
              intermediate.passThroughEdges.push({ column, color: edge.color })
            }
          }
          // During curve transition (first 1-2 rows), the curve path itself will handle drawing
        }
      }
    }
  }

  console.log(`[Lane Algorithm] Pass 3 complete`)
  console.log('[Lane Algorithm] Complete:', rows.length, 'rows processed')
  if (rows.length > 0) {
    console.log('[Lane Algorithm] Sample row 0:', {
      hash: rows[0].commit.hash.substring(0, 8),
      column: rows[0].column,
      edges: rows[0].edges.length,
      passThroughEdges: rows[0].passThroughEdges.length,
      incomingEdges: rows[0].incomingEdges.length
    })
  }

  return rows
}

/**
 * Determines the edge color for a commit based on its refs.
 * Uses the first branch name found in refs, or defaults to blue if none.
 */
function getEdgeColor(commit: Commit): string {
  if (commit.refs.length === 0) {
    return getBranchColor('') // default color for detached HEAD
  }

  // Find first branch ref (non-tag, non-HEAD)
  for (const ref of commit.refs) {
    const trimmed = ref.trim()
    if (
      trimmed &&
      !trimmed.startsWith('tag:') &&
      trimmed !== 'HEAD' &&
      !trimmed.startsWith('HEAD ->')
    ) {
      // Remove "origin/" or other remote prefixes for color consistency
      const branchName = trimmed.replace(/^[^/]+\//, '')
      return getBranchColor(branchName)
    }
  }

  // Fallback: use first ref
  return getBranchColor(commit.refs[0])
}

/**
 * Calculates the maximum column index across all rows.
 * Useful for determining the width of the graph area.
 */
export function getMaxColumn(rows: GraphRow[]): number {
  if (rows.length === 0) return 0
  return Math.max(...rows.map((row) => row.column))
}
