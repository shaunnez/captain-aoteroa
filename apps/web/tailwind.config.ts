import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-purple':      '#493276',
        'brand-purple-dark': '#2c1e47',
        'brand-navy':        '#253e51',
        'brand-sand':        '#fdfdf0',
        'brand-black':       '#1e1c20',
        'brand-error':       '#9d2020',
      },
      fontFamily: {
        sans:  ['Roboto', 'Arial', 'Helvetica', 'sans-serif'],
        serif: ['Roboto Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        body: ['1.125rem', { lineHeight: '1.75' }],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config
