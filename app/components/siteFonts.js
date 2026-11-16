// The editorial type trio (serif display, sans text, mono labels), loaded once and
// shared by every surface that uses the design system: the public site's `.site`
// wrapper and the IGCSC portal's `.ig` wrapper. Both read the same CSS variables,
// so the two surfaces can never drift apart in type.
import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif, Inter } from 'next/font/google'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-site-serif', display: 'swap' })
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-site-sans', display: 'swap' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-site-mono', display: 'swap' })
// The minimal theme's one typeface. Shared here so the IGCSC portal gets it as
// well as the public site, which loads its own copy through PublicLayout.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' })

/** Put on the wrapper element so the `--font-site-*` variables resolve inside it. */
export const siteFontVars = `${serif.variable} ${sans.variable} ${mono.variable} ${inter.variable}`
