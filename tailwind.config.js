/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'],
      },
      animation: {
        'progress-indeterminate': 'progress-indeterminate 1s infinite linear',
      },
      keyframes: {
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)', width: '20%' },
          '50%': { transform: 'translateX(0%)', width: '50%' },
          '100%': { transform: 'translateX(200%)', width: '20%' },
        }
      }
    },
  },
  plugins: [],
}

