/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        black: 'var(--color-black)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
        yellow: 'var(--color-primary)',
        'yellow-hover': 'var(--color-primary-hover)',
        'yellow-dark': 'var(--color-primary-dark)',
        'primary-container': 'var(--color-primary)',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      maxWidth: {
        page: '1440px',
      },
      borderRadius: {
        DEFAULT: '4px',
        card: '6px',
        modal: '8px',
      },
      transitionTimingFunction: {
        invi: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      zIndex: {
        content: '10',
        sticky: '100',
        header: '1000',
        overlay: '2000',
        modal: '3000',
      },
    },
  },
  plugins: [],
}
