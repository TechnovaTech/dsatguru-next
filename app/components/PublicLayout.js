'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MotionConfig } from 'framer-motion'
import { Inter, Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google'
import Image from 'next/image'
import Header from './Header'
import Footer from './Footer'
import ScrollReveal from './site/ScrollReveal'
// Redesign fonts (serif headings, sans body, mono labels) — shared with the IGCSC portal.
import { siteFontVars } from './siteFonts'

// Fonts of the previous design, still used by the pages that are not redesigned yet.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-jakarta', display: 'swap' })
// Body copy across the public site.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' })
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
      <div className={`${siteFontVars} ${inter.variable} ${jakarta.variable} ${playfair.variable} site relative min-h-screen`}>
        <ScrollReveal />
        {/* Homepage hero backdrop, desktop only. It lives here rather than inside
            HeroSection so it can sit BEHIND the header and the announcement bar -
            the hero is rendered inside <main>, which starts below them. On phones
            the photo is a CSS background on the hero section itself (`.hero-photo`
            in app/site.css), so the dark area ends exactly where the copy does. */}
        {pathname === '/' && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-[46rem] overflow-hidden lg:block">
            <Image
              src="/hero-bg.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-right"
            />
            {/* Desktop: fade only the left, where the copy sits. The right stays
                clear so the student is not greyed out. */}
            <div className="absolute inset-0 bg-gradient-to-r from-page via-page/45 to-transparent" />
            {/* Fades the photo into the page below it, so there is no hard seam. */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-page" />
          </div>
        )}
        <Header />
        {redesigned ? (
          <main className="relative z-10 overflow-x-clip">{children}</main>
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
