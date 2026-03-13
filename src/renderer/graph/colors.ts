// ============================================================
// Kommit — Branch Color Assignment
// Deterministic color mapping for branches
// ============================================================

/**
 * 8 predefined branch colors matching tailwind.config.ts branch-0 through branch-7
 */
export const BRANCH_COLORS: string[] = [
  '#4EC9B0', // teal
  '#CE9178', // salmon
  '#DCDCAA', // yellow
  '#C586C0', // purple
  '#569CD6', // blue
  '#9CDCFE', // light blue
  '#D7BA7D', // gold
  '#F44747' // red
]

/**
 * Gets a deterministic color for a branch name using djb2 hash.
 * Same branch name always returns the same color.
 * Empty/detached HEAD defaults to blue (index 4).
 */
export function getBranchColor(branchName: string): string {
  if (!branchName || branchName.trim() === '') {
    return BRANCH_COLORS[4] // blue default for detached HEAD
  }

  const hash = djb2Hash(branchName)
  const colorIndex = hash % BRANCH_COLORS.length
  return BRANCH_COLORS[colorIndex]
}

/**
 * djb2 hash function for strings (simple, fast, good distribution)
 * Returns a positive integer
 */
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + charCode
    hash = (hash << 5) + hash + str.charCodeAt(i)
  }
  // Ensure positive
  return Math.abs(hash)
}

/**
 * Gets the Tailwind CSS class name for a branch color index.
 * Useful for applying colors via Tailwind utilities.
 */
export function getBranchColorClass(branchName: string): string {
  if (!branchName || branchName.trim() === '') {
    return 'text-branch-4' // blue default
  }

  const hash = djb2Hash(branchName)
  const colorIndex = hash % BRANCH_COLORS.length
  return `text-branch-${colorIndex}`
}
