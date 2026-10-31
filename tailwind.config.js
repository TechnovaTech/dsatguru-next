/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

// Public-site redesign colours. Each reads a CSS variable set on the `.site` wrapper (app/site.css), so they only
// mean something inside the public pages. The names are new ones, so no existing Tailwind colour changes.
// <alpha-value> keeps opacity modifiers such as bg-ink/5 working with CSS variables.
const token = (name) => `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`
const siteColors = Object.fromEntries(
  [
    'page', 'surface', 'canvas', 'sunken', 'ink', 'ink-2', 'muted', 'subtle', 'line', 'line-strong',
    'brand', 'brand-hover', 'brand-press', 'brand-soft', 'brand-50', 'on-brand', 'cta', 'cta-hover', 'on-cta',
    'calm', 'star', 'positive', 'negative',
    'panel', 'panel-ink', 'panel-ink-2', 'panel-muted', 'panel-subtle', 'panel-line', 'panel-soft', 'panel-accent',
  ].map((n) => [n, token(n)]),
)

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: siteColors,
      fontFamily: {
        display: ['var(--font-site-serif)', 'Georgia', 'serif'],
        site: ['var(--font-site-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        code: ['var(--font-site-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [
    // Short laptop screens (wide but not tall), as on the redesign.
    plugin(({ addVariant }) => {
      addVariant('short', '@media (min-width: 1024px) and (max-height: 860px)')
    }),
  ],
}
