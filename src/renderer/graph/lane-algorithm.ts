// ============================================================
// Kommit — Lane Assignment Algorithm
// Assigns columns (swim lanes) to commits for graph visualization
// Color propagation inspired by VS Code Git Graph
// ============================================================

import type { Commit, GraphRow, GraphEdge } from '@shared/types'
import { getBranchColor, BRANCH_COLORS } from './colors'

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
 *    - First parent continues the lane; additional parents (merges) get new lanes
 *    - Colors propagate through lanes (all commits on same lane share color)
 *    - Stale lanes (parents that never arrive) are cleaned up
 * 2. Pass 2: Compute edges by connecting each commit to its parents
 *    - Edge color = the lane color of the child commit's lane for first parent,
 *      or the target lane color for merge parents
 * 3. Pass 3: Compute pass-through edges for same-column intermediate rows only
 *    - Cross-column edges are rendered as full Bezier paths by the SVG overlay,
 *      so no pass-throughs are needed for them
 */
export function assignLanes(commits: Commit[]): GraphRow[] {
  if (commits.length === 0) return []

  // Pass 1: Assign columns with lane-based color propagation
  const lanes: (string | null)[] = []
  const laneColors: (string | null)[] = [] // Color per lane, propagated through commits
  const rows: GraphRow[] = []
  const hashToRowIndex = new Map<string, number>()

  // Track which color indices are in use, for reuse when lanes are freed
  // colorEndRow[i] = the last row where color index i was used
  const colorEndRow: number[] = []

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]

    // Find lane expecting this commit hash
    let col = lanes.indexOf(commit.hash)
    let color: string

    if (col !== -1) {
      // Lane found — inherit its color
      color = laneColors[col]!
    } else {
      // Not expected by any lane — find a free lane or create one
      col = lanes.indexOf(null)
      if (col === -1) {
        col = lanes.length
        lanes.push(null)
        laneColors.push(null)
      }
      // Assign a new color for this lane based on the commit's branch ref
      color = getLaneColor(commit, i, colorEndRow)
      laneColors[col] = color
    }

    // Lane now expects first parent (if any), keeping same color
    if (commit.parents.length > 0) {
      lanes[col] = commit.parents[0]
      // Color stays the same — first parent continues the lane
    } else {
      // Root commit — free the lane
      lanes[col] = null
      laneColors[col] = null
      // Record that this color is now available for reuse
      recordColorEnd(color, i, colorEndRow)
    }

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
          laneColors.push(null)
        }
        lanes[parentCol] = parentHash
        // Merge parent gets its own color (based on the merge parent's eventual branch)
        laneColors[parentCol] = getMergeParentColor(parentCol, i, colorEndRow)
      }
    }

    // Compact trailing nulls
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop()
      laneColors.pop()
    }

    // Store the row
    rows.push({
      commit,
      column: col,
      color,
      edges: [],
      passThroughEdges: [],
      incomingEdges: []
    })
    hashToRowIndex.set(commit.hash, i)
  }

  // Post-pass 1: Clean up stale lanes
  // Any lane still expecting a hash that isn't in hashToRowIndex will never arrive
  // (pagination boundary or filtered out). We don't need to modify lane assignments
  // since they're already computed, but this information helps understand the graph.

  // Pass 2: Compute edges
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const commit = row.commit

    for (let p = 0; p < commit.parents.length; p++) {
      const parentHash = commit.parents[p]
      const parentRowIndex = hashToRowIndex.get(parentHash)
      if (parentRowIndex === undefined) {
        // Parent not in this commit list (filtered out or not yet loaded)
        continue
      }

      const parentRow = rows[parentRowIndex]
      const fromColumn = row.column
      const toColumn = parentRow.column

      // Edge color: first parent uses the lane color (continues the branch),
      // merge parents use the child's lane color (the merge line comes from the child)
      const color = p === 0 ? row.color : row.color

      const edge: GraphEdge = {
        fromColumn,
        toColumn,
        fromRow: i,
        toRow: parentRowIndex,
        color
      }

      row.edges.push(edge)
      parentRow.incomingEdges.push(edge)
    }
  }

  // Pass 3: Compute pass-through edges for same-column intermediate rows ONLY
  // Cross-column edges are rendered as full continuous Bezier paths by GraphSvgOverlay,
  // so they do NOT need pass-through segments (which would appear as disconnected lines).
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    for (const edge of row.edges) {
      if (edge.fromColumn === edge.toColumn) {
        // Same-column edges: draw vertical line through all intermediate rows
        for (let intermediateRow = i + 1; intermediateRow < edge.toRow; intermediateRow++) {
          const intermediate = rows[intermediateRow]
          const column = edge.fromColumn

          const exists = intermediate.passThroughEdges.some((pte) => pte.column === column)
          if (!exists) {
            intermediate.passThroughEdges.push({ column, color: edge.color })
          }
        }
      }
      // Cross-column edges: NO pass-throughs generated.
      // The SVG overlay renders the full Bezier curve from child to parent.
    }
  }

  return rows
}

/**
 * Determines the lane color for a new lane based on the commit's refs.
 * Uses VS Code Git Graph-style color reuse: picks a color that hasn't been
 * used since a previous branch ended.
 */
function getLaneColor(commit: Commit, rowIndex: number, colorEndRow: number[]): string {
  // If the commit has branch refs, use a deterministic color from that branch name
  if (commit.refs.length > 0) {
    for (const ref of commit.refs) {
      const trimmed = ref.trim()
      if (
        trimmed &&
        !trimmed.startsWith('tag:') &&
        trimmed !== 'HEAD' &&
        !trimmed.startsWith('HEAD ->')
      ) {
        const branchName = trimmed.replace(/^[^/]+\//, '')
        return getBranchColor(branchName)
      }
    }
  }

  // No useful ref — pick an available color (one whose previous branch has ended)
  return getAvailableColor(rowIndex, colorEndRow)
}

/**
 * Gets a color for a merge parent lane. Picks from the available color pool
 * to avoid using the same color as the parent lane.
 */
function getMergeParentColor(_laneIndex: number, rowIndex: number, colorEndRow: number[]): string {
  return getAvailableColor(rowIndex, colorEndRow)
}

/**
 * VS Code Git Graph-style color reuse: finds a color whose previous branch
 * ended before this row, so the color can be reused without confusion.
 * If no color is available, cycles through the palette.
 */
function getAvailableColor(rowIndex: number, colorEndRow: number[]): string {
  for (let i = 0; i < colorEndRow.length; i++) {
    if (rowIndex > colorEndRow[i]) {
      // This color is available — its previous branch ended before this row
      colorEndRow[i] = Infinity // Mark as in-use until freed
      return BRANCH_COLORS[i % BRANCH_COLORS.length]
    }
  }

  // No reusable color — allocate a new one
  const newIndex = colorEndRow.length
  colorEndRow.push(Infinity) // Mark as in-use
  return BRANCH_COLORS[newIndex % BRANCH_COLORS.length]
}

/**
 * Records that a color has been freed at a given row, making it available
 * for reuse by future lanes.
 */
function recordColorEnd(color: string, endRow: number, colorEndRow: number[]): void {
  const colorIndex = BRANCH_COLORS.indexOf(color)
  if (colorIndex !== -1 && colorIndex < colorEndRow.length) {
    colorEndRow[colorIndex] = endRow
  }
}

/**
 * Calculates the maximum column index across all rows.
 * Considers commit columns, edge destinations, and pass-through lanes.
 * Useful for determining the width of the graph area.
 */
export function getMaxColumn(rows: GraphRow[]): number {
  if (rows.length === 0) return 0
  let max = 0
  for (const row of rows) {
    max = Math.max(max, row.column)
    for (const edge of row.edges) {
      max = Math.max(max, edge.fromColumn, edge.toColumn)
    }
    for (const pt of row.passThroughEdges) {
      max = Math.max(max, pt.column)
    }
  }
  return max
}
