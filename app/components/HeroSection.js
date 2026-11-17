'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaStar } from 'react-icons/fa'
import { LuArrowRight, LuPlay } from 'react-icons/lu'
import FloatingContact from './site/FloatingContact'
import { CountUp } from './site/motion'
import { Container, Eyebrow, cn } from './site/ui'

/*
 * One fixed hero - no rotation, so the headline is always fully opaque (the old
 * three-slide carousel spent part of every cycle mid-crossfade, which is what
 * made the heading look washed out).
 *
 * The hero artwork is no longer rendered here: it is the full-bleed backdrop in
 * PublicLayout (`/hero-bg.png`), which has to live there so it can sit behind
 * the header as well. `photo`/`alt` were dropped with it.
 */
const slide = {
  pre: 'Boost Your',
  highlight: 'Digital SAT Score',
  sub: 'Personalized study plans, 4,000+ realistic Digital SAT practice questions, and proven strategies to raise your score by 200+ points.',
}

const stats = [
  { value: '4,000+', label: 'Practice Questions' },
  { value: '99%+', label: 'Success Rate' },
  { value: '10+', label: 'Years Experience' },
  { value: '24/7', label: 'Online Support' },
]

const avatars = ['JD', 'MR', 'AT', 'SK']

// Live student counter — real value from the backend (base 150 + registered students).
const COUNT_START = 150

export default function HeroSection({ landingPlanRef }) {
  const [liveCount, setLiveCount] = useState(COUNT_START)

  // Real student count from the backend — updates whenever new students register.
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/stats/students', { cache: 'no-store' })
        const data = await res.json()
        if (active && typeof data.count === 'number') {
          setLiveCount((c) => Math.max(c, data.count))
        }
      } catch {
        /* keep current value on error */
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const scrollToPlans = () => landingPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="hero-photo relative overflow-hidden">
      <FloatingContact />

      <Container className="relative z-10 py-16 sm:py-20 lg:py-28">
        {/* Held to the left half from lg up: the backdrop photo puts its subject on
            the right, and the copy must not sit on top of her. */}
        <div className="hero-on-photo max-w-[560px] lg:max-w-[48%]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Eyebrow n="01">Digital SAT & PSAT prep · online</Eyebrow>
            <span className="inline-flex items-center gap-2 text-[13.5px] text-ink-2">
              <span className="flex gap-0.5 text-star">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} size={11} />
                ))}
              </span>
              Rated 4.9/5 by our students
            </span>
          </div>

          <div>
            <h1 className="display mt-7 text-balance text-[2.3rem] leading-[1.08] sm:text-[3.6rem] lg:text-[4.15rem]">
              {slide.pre} <em className="accent text-brand">{slide.highlight}</em>
            </h1>
            <p className="mt-6 max-w-[520px] text-[17px] leading-[1.75] text-muted">{slide.sub}</p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollToPlans}
              className="group inline-flex h-[52px] items-center gap-2 bg-brand px-7 text-[15.5px] font-medium text-on-brand transition-colors hover:bg-brand-hover active:translate-y-px"
            >
              Start your DSAT journey
              <LuArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="/demo-test"
              className="inline-flex h-[52px] items-center gap-2 border border-line-strong px-7 text-[15.5px] font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
            >
              <LuPlay className="size-4 text-brand" /> Try Free Demo Test
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-7">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {avatars.map((a) => (
                  <span key={a} className="grid size-9 place-items-center border-2 border-page bg-sunken font-code text-[11px] text-ink-2">
                    {a}
                  </span>
                ))}
              </div>
              <p className="flex items-center gap-2 text-[14.5px] text-muted">
                <span className="animate-live size-2 rounded-full bg-[#22c55e]" aria-hidden />
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={liveCount}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="display text-[22px] leading-none text-ink"
                  >
                    {liveCount.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
                students improved
              </p>
            </div>
          </div>
        </div>

        {/* live status badge */}
        <p className="mt-10 inline-flex items-center gap-2 rounded-[8px] border border-line bg-surface px-3.5 py-2 text-[12px] font-medium text-muted">
          <span className="animate-live size-2 rounded-full bg-positive" />
          Live classes running now
        </p>
      </Container>

      {/* Stats strip — a white card floating over the hero, as in the reference. */}
      <Container className="relative z-10 pb-20 sm:pb-24">
        {/* Two-up on phones, four across from sm — `divide-x` alone would draw a rule
            down the middle of the stacked rows, so the vertical rules are applied per
            cell instead. */}
        <div className="grid grid-cols-2 rounded-[var(--radius-card)] border border-line bg-surface sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                'px-3 py-9 text-center sm:py-11',
                i % 2 === 1 && 'border-l border-line',
                i >= 2 && 'border-t border-line sm:border-t-0',
                'sm:border-l sm:first:border-l-0',
              )}
            >
              <CountUp value={s.value} className="display block text-[2.4rem] leading-none sm:text-[3.4rem]" />
              <span className="mt-2 block font-code text-[11px] uppercase tracking-[0.12em] text-muted sm:text-[12px]">{s.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
