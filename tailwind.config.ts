/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kommit: {
          bg: 'var(--color-bg)',
          'bg-secondary': 'var(--color-bg-secondary)',
          'bg-tertiary': 'var(--color-bg-tertiary)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          border: 'var(--color-border)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)'
        },
        // Git graph branch colors - vibrant GitKraken-inspired palette
        branch: {
          0: '#0BC4E2', // cyan
          1: '#2ECC71', // emerald green
          2: '#F1C40F', // vivid yellow
          3: '#E74C3C', // vibrant red
          4: '#9B59B6', // rich purple
          5: '#E67E22', // warm orange
          6: '#1ABC9C', // teal
          7: '#FF6B81', // coral pink
          8: '#3498DB', // bright blue (default)
          9: '#F39C12' // amber
        },
        // Avatar background colors - softer shades for white text readability
        avatar: {
          0: '#6366F1', // indigo
          1: '#8B5CF6', // violet
          2: '#EC4899', // pink
          3: '#EF4444', // red
          4: '#F97316', // orange
          5: '#F59E0B', // amber
          6: '#84CC16', // lime
          7: '#22C55E', // green
          8: '#14B8A6', // teal
          9: '#06B6D4', // cyan
          10: '#3B82F6', // blue
          11: '#A855F7' // purple
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
}
