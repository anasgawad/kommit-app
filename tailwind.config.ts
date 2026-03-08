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
          danger: 'var(--color-danger)',
        },
        // Git graph branch colors
        branch: {
          0: '#4EC9B0',
          1: '#CE9178',
          2: '#DCDCAA',
          3: '#C586C0',
          4: '#569CD6',
          5: '#9CDCFE',
          6: '#D7BA7D',
          7: '#F44747',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
