// ============================================================
// Kommit — Branch Color Assignment
// Deterministic color mapping for branches (GitKraken-inspired vibrant palette)
// ============================================================

/**
 * 10 predefined branch colors - vibrant, high-saturation colors
 * designed to pop against dark backgrounds (GitKraken-inspired)
 */
export const BRANCH_COLORS: string[] = [
  '#0BC4E2', // cyan - primary, eye-catching
  '#2ECC71', // emerald green - success, main branch
  '#F1C40F', // vivid yellow - attention
  '#E74C3C', // vibrant red - danger, alerts
  '#9B59B6', // rich purple - feature branches
  '#E67E22', // warm orange - in-progress
  '#1ABC9C', // teal - secondary
  '#FF6B81', // coral pink - accent
  '#3498DB', // bright blue - info
  '#F39C12' // amber - warning
]

/**
 * Gets a deterministic color for a branch name using djb2 hash.
 * Same branch name always returns the same color.
 * Empty/detached HEAD defaults to bright blue (index 8).
 */
export function getBranchColor(branchName: string): string {
  if (!branchName || branchName.trim() === '') {
    return BRANCH_COLORS[8] // bright blue default for detached HEAD
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
    return 'text-branch-8' // bright blue default
  }

  const hash = djb2Hash(branchName)
  const colorIndex = hash % BRANCH_COLORS.length
  return `text-branch-${colorIndex}`
}

/**
 * Gets the default color for commits without branch refs (detached HEAD, etc.)
 */
export function getDefaultColor(): string {
  return BRANCH_COLORS[8] // bright blue
}

/**
 * Gets a deterministic color for a ref string as it appears in git log %D output.
 * Handles "HEAD -> branchname", "origin/branchname", "tag: v1.0", etc.
 * Strips remote prefixes so local and remote refs for the same branch get the same color.
 */
export function getRefColor(ref: string): string {
  const trimmed = ref.trim()
  if (!trimmed || trimmed === 'HEAD') return BRANCH_COLORS[8]

  // Extract branch name from "HEAD -> branchname"
  let branchRef = trimmed
  if (trimmed.startsWith('HEAD -> ')) {
    branchRef = trimmed.slice('HEAD -> '.length)
  }

  // Strip tag prefix
  if (branchRef.startsWith('tag: ')) {
    branchRef = branchRef.slice('tag: '.length)
  }

  // Strip known remote prefixes (origin/, upstream/, etc.)
  const slashIdx = branchRef.indexOf('/')
  if (slashIdx !== -1) {
    const firstSegment = branchRef.slice(0, slashIdx)
    const knownRemotes = ['origin', 'upstream', 'fork', 'remote']
    if (knownRemotes.includes(firstSegment)) {
      branchRef = branchRef.slice(slashIdx + 1)
    }
  }

  return getBranchColor(branchRef)
}
