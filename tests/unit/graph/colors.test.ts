// ============================================================
// Kommit — Color Assignment Tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { getBranchColor, BRANCH_COLORS } from '../../../src/renderer/graph/colors'

describe('Color Assignment', () => {
  it('should assign deterministic color per branch name', () => {
    const color1a = getBranchColor('main')
    const color1b = getBranchColor('main')

    expect(color1a).toBe(color1b)

    const color2a = getBranchColor('feature/new-ui')
    const color2b = getBranchColor('feature/new-ui')

    expect(color2a).toBe(color2b)
  })

  it('should produce visually distinct colors for common branch names', () => {
    const branchNames = ['main', 'develop', 'feature/auth', 'bugfix/issue-123', 'release/v1.0']
    const colors = branchNames.map((name) => getBranchColor(name))

    // All colors should be valid hex colors
    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(BRANCH_COLORS).toContain(color)
    })

    // At least 3 different colors for 5 branches (probabilistic, but reasonable)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBeGreaterThanOrEqual(3)
  })

  it('should handle unnamed branches (detached HEAD)', () => {
    const color1 = getBranchColor('')
    const color2 = getBranchColor('   ') // whitespace only

    // Should return a valid color (default bright blue at index 8)
    expect(BRANCH_COLORS).toContain(color1)
    expect(BRANCH_COLORS).toContain(color2)
    expect(color1).toBe(color2) // Both should default to same color
    expect(color1).toBe(BRANCH_COLORS[8]) // Bright blue default (#3498DB)
  })

  it('should return same color for same branch across calls', () => {
    const branchName = 'feature/graph-rendering'
    const colors: string[] = []

    for (let i = 0; i < 100; i++) {
      colors.push(getBranchColor(branchName))
    }

    // All 100 calls should return the same color
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(1)
    expect(colors[0]).toBe(colors[99])
  })
})
