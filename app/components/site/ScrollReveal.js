'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/*
 * Reveal-on-scroll for the public site: cards, panels and headings fade up as they
 * come into view.
 *
 * It picks its targets by selector rather than by a prop on each element, so no
 * page or section markup has to change. Progressive enhancement: the elements are
 * visible in the HTML and this only hides them once it is sure it can animate them
 * — if the script never runs, nothing is ever hidden.
 *
 * Three things it deliberately does NOT touch:
 *   - the first section (the hero), which is on screen at load and already has its
 *     own framer-motion entrance,
 *   - anything already inside another target, so a card inside a panel is not
 *     animated twice,
 *   - anything already on screen at mount, which would otherwise flash out and
 *     back in.
 * The classes come off again once the transition has run, so a revealed card is an
 * ordinary element afterwards and its own :hover transition is not overridden.
 */

const TARGETS = ['[class~="bg-surface"]', '[class~="bg-panel"]', '[class~="lift"]', '.display']
const SELECTOR = TARGETS.map((t) => `.site main section ${t}`).join(', ')
const INNER = TARGETS.join(', ')
const SETTLE = 750 // a little over the 0.65s CSS transition
const FAILSAFE = 4000

export default function ScrollReveal() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const timers = new Set()
    const clear = (el) => {
      el.classList.remove('sr', 'sr-in')
      el.style.transitionDelay = ''
    }
    const show = (el) => {
      if (!el.classList.contains('sr')) return
      el.classList.add('sr-in')
      const t = setTimeout(() => clear(el), SETTLE)
      timers.add(t)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.unobserve(entry.target)
          show(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    )

    const firstSection = document.querySelector('.site main section')
    const hidden = []

    for (const el of document.querySelectorAll(SELECTOR)) {
      if (firstSection?.contains(el)) continue
      if (el.parentElement?.closest(INNER)) continue
      // Already on screen: leave it alone rather than flash it out and back in.
      const box = el.getBoundingClientRect()
      if (box.top < window.innerHeight * 0.92 && box.bottom > 0) continue

      // Cascade the cards that share a row.
      const peers = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0
      el.style.transitionDelay = `${Math.min(Math.max(peers, 0), 4) * 70}ms`
      el.classList.add('sr')
      hidden.push(el)
      observer.observe(el)
    }

    // If anything is still hidden after a few seconds (an observer that never fired,
    // a page that cannot scroll), show it rather than leave content invisible.
    const failsafe = setTimeout(() => hidden.forEach(show), FAILSAFE)

    return () => {
      clearTimeout(failsafe)
      timers.forEach(clearTimeout)
      observer.disconnect()
      hidden.forEach(clear)
    }
  }, [pathname])

  return null
}
