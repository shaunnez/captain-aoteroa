import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode surface scale
        'surface-lowest':  'var(--color-surface-container-lowest)',
        'surface-low':     'var(--color-surface-container-low)',
        'surface':         'var(--color-surface)',
        'surface-high':    'var(--color-surface-container-high)',
        'surface-highest': 'var(--color-surface-container-highest)',
        'bg':              'var(--color-background)',
        // Primary
        'primary':         'var(--color-primary)',
        'primary-cont':    'var(--color-primary-container)',
        'primary-fixed':   'var(--color-primary-fixed)',
        'inv-primary':     'var(--color-inverse-primary)',
        // Secondary / tertiary
        'secondary':       'var(--color-secondary)',
        'secondary-cont':  'var(--color-secondary-container)',
        'tertiary':        'var(--color-tertiary)',
        'tertiary-cont':   'var(--color-tertiary-container)',
        // Text
        'on-surface':      'var(--color-on-surface)',
        'on-surface-var':  'var(--color-on-surface-variant)',
        // Borders
        'outline':         'var(--color-outline)',
        'outline-var':     'var(--color-outline-variant)',
        // Error
        'error':           'var(--color-error)',
        // Legacy aliases (keep for any pages not yet migrated)
        'brand-purple':      '#1c0070',
        'brand-purple-dark': '#311b92',
        'brand-navy':        '#311b92',
        'brand-sand':        '#fdf9ee',
        'brand-black':       '#1c1c15',
        'brand-error':       '#ba1a1a',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Noto Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        body: ['1.125rem', { lineHeight: '1.75' }],
      },
      borderRadius: {
        pill: '9999px',
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      backdropBlur: {
        nav: '12px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
