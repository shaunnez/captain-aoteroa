import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface hierarchy (dark)
        'surface':                  '#0e0e0e',
        'surface-dim':              '#0e0e0e',
        'surface-bright':           '#2b2c2c',
        'surface-container-lowest': '#000000',
        'surface-container-low':    '#131313',
        'surface-container':        '#191a1a',
        'surface-container-high':   '#1f2020',
        'surface-container-highest':'#252626',
        'surface-variant':          '#252626',

        // Content on surfaces
        'on-surface':         '#e7e5e5',
        'on-surface-variant': '#acabaa',
        'on-background':      '#e7e5e5',

        // Primary
        'primary':           '#c6c6c7',
        'primary-dim':       '#b8b9b9',
        'primary-container': '#454747',
        'on-primary':        '#3f4041',

        // Secondary
        'secondary':           '#9d9e9e',
        'secondary-container': '#3a3c3c',

        // Tertiary (accent/gold)
        'tertiary':           '#ffe792',
        'tertiary-container': '#ffd709',

        // Error
        'error':           '#ee7d77',
        'error-container': '#7f2927',
        'on-error':        '#490106',

        // Outlines
        'outline':         '#767575',
        'outline-variant': '#484848',

        // Inverse
        'inverse-surface':    '#fcf9f8',
        'inverse-on-surface': '#565555',

        // Legacy (kept for form validation compatibility)
        'brand-error': '#9d2020',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body:     ['Plus Jakarta Sans', 'sans-serif'],
        label:    ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        body: ['1.125rem', { lineHeight: '1.75' }],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg:      '0.25rem',
        xl:      '0.5rem',
        full:    '0.75rem',
        pill:    '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config
