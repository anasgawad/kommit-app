// ============================================================
// Kommit — Avatar Utilities
// Generate initials-based avatars with deterministic colors
// ============================================================

/**
 * 12 avatar background colors - softer, darker shades
 * designed for white text readability
 */
const AVATAR_COLORS: string[] = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#A855F7' // purple
]

/**
 * Extracts initials from a name.
 * "John Doe" -> "JD"
 * "alice" -> "A"
 * "John Jacob Jingleheimer Schmidt" -> "JJ" (first two words)
 */
export function getInitials(name: string): string {
  if (!name || name.trim() === '') {
    return '?'
  }

  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    // Single word - take first letter (uppercase)
    return words[0].charAt(0).toUpperCase()
  }

  // Multiple words - take first letter of first two words
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

/**
 * Gets a deterministic background color for an avatar based on the name.
 * Same name always returns the same color.
 */
export function getAvatarColor(name: string): string {
  if (!name || name.trim() === '') {
    return AVATAR_COLORS[10] // blue default
  }

  const hash = djb2Hash(name.toLowerCase())
  const colorIndex = hash % AVATAR_COLORS.length
  return AVATAR_COLORS[colorIndex]
}

/**
 * Gets a Tailwind CSS class for avatar background color.
 */
export function getAvatarColorClass(name: string): string {
  if (!name || name.trim() === '') {
    return 'bg-avatar-10' // blue default
  }

  const hash = djb2Hash(name.toLowerCase())
  const colorIndex = hash % AVATAR_COLORS.length
  return `bg-avatar-${colorIndex}`
}

/**
 * djb2 hash function for strings (simple, fast, good distribution)
 * Returns a positive integer
 */
function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
  }
  return Math.abs(hash)
}
