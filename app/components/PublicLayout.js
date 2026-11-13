'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'framer-motion'
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import Header from './Header'
import Footer from './Footer'
// Redesign fonts (serif headings, sans body, mono labels) — shared with the IGCSC portal.
import { siteFontVars } from './siteFonts'

// Fonts of the previous design, still used by the pages that are not redesigned yet.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-jakarta', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-playfair', display: 'swap' })

// Pages that use the redesign. The other public pages (blog, demo test, the SAT info pages…) keep their previous
// white page area inside the new header and footer until they are redesigned too.
const REDESIGNED = ['/', '/about', '/contact', '/login', '/register', '/forgot-password', '/enrollment/']
const isRedesigned = (path) => REDESIGNED.some((p) => (p.endsWith('/') && p !== '/' ? path.startsWith(p) : path === p))

export default function PublicLayout({ children }) {
  const pathname = usePathname() || '/'
  const redesigned = isRedesigned(pathname)

  // The page behind the site follows the theme (no white strip past the footer); removed again when leaving.
  useEffect(() => {
    document.documentElement.classList.add('site-page')
    return () => document.documentElement.classList.remove('site-page')
  }, [])

  // Spotlight cards: pass the pointer position to the card under it (CSS draws the glow).
  useEffect(() => {
    const move = (e) => {
      const card = e.target.closest?.('[data-spotlight]')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--sx', `${e.clientX - r.left}px`)
      card.style.setProperty('--sy', `${e.clientY - r.top}px`)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${siteFontVars} ${jakarta.variable} ${playfair.variable} site min-h-screen`}>
        <Header />
        {redesigned ? (
          <main className="overflow-x-clip">{children}</main>
        ) : (
          <main className="dg overflow-x-clip bg-white pt-6 text-slate-900 antialiased" style={{ colorScheme: 'light', fontFamily: 'var(--font-jakarta), sans-serif' }}>
            {children}
          </main>
        )}
        <Footer />
      </div>
    </MotionConfig>
  )
}
