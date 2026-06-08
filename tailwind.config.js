/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        ink: 'var(--text-primary)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        border: 'var(--border)',
        mood: {
          1: 'var(--mood-1)',
          2: 'var(--mood-2)',
          3: 'var(--mood-3)',
          4: 'var(--mood-4)',
          5: 'var(--mood-5)',
          6: 'var(--mood-6)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"PingFang SC"',
          '"Source Han Sans SC"',
          '"Noto Sans CJK SC"',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          '"Source Han Serif SC"',
          '"Noto Serif CJK SC"',
          'Georgia',
          'serif',
        ],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.04)',
        lift: '0 4px 12px rgba(0,0,0,.06)',
      },
      transitionTimingFunction: {
        quiet: 'cubic-bezier(.22,.61,.36,1)',
      },
      transitionDuration: {
        quiet: '200ms',
      },
    },
  },
  plugins: [],
};
