'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { FaStar } from 'react-icons/fa'
import { LuArrowRight, LuPlay } from 'react-icons/lu'
import FloatingContact from './site/FloatingContact'
import { CountUp } from './site/motion'
import { Container, Eyebrow, cn } from './site/ui'

/*
 * Carousel of branded ad posters. Each slide has its own left-side copy + SEO alt.
 * To change a slide: swap the `photo` path with any image in /public.
 */
const slides = [
  {
    photo: '/bf16b129-1144-4d6b-93e7-73fd37085477.png',
    alt: 'Maximize your Digital SAT score with DSATGURU — 200+ point score guarantee and 4,000+ practice questions',
    pre: 'Boost Your',
    highlight: 'Digital SAT Score',
    sub: 'Personalized study plans, 4,000+ realistic Digital SAT practice questions, and proven strategies to raise your score by 200+ points.',
  },
  {
    photo: '/f33d646a-2fab-4cb5-9a0f-bdfdeb5c4d9f.png',
    alt: 'Affordable premium Digital SAT preparation from $20 per month with live classes and adaptive tests — DSATGURU',
    pre: 'Premium SAT Prep,',
    highlight: 'Affordable Price',
    sub: 'Elite Digital SAT preparation, live online classes, and 25+ adaptive practice tests — without the premium price tag.',
  },
  {
    photo: '/be5a1c49-657c-4ef0-94e7-5879bf183f93.png',
    alt: 'Experience a real Digital SAT practice test with DSATGURU adaptive engine, timed sections and instant scoring',
    pre: 'Experience the',
    highlight: 'Real Digital SAT',
    sub: 'Practice on an exact replica of test day with our adaptive engine, timed sections, and instant Digital SAT scoring.',
  },
]

const stats = [
  { value: '4,000+', label: 'Practice Questions' },
  { value: '99%+', label: 'Success Rate' },
  { value: '10+', label: 'Years Experience' },
]

const avatars = ['JD', 'MR', 'AT', 'SK']

// Live student counter — real value from the backend (base 150 + registered students).
const COUNT_START = 150

export default function HeroSection({ landingPlanRef }) {
  const [current, setCurrent] = useState(0)
  const [liveCount, setLiveCount] = useState(COUNT_START)

  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 7000)
    return () => clearInterval(t)
  }, [])

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

  const slide = slides[current]
  const scrollToPlans = () => landingPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="relative border-b border-line">
      <FloatingContact />
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_70%_30%,#000,transparent_70%)]" />

      <Container className="relative grid items-center gap-12 py-14 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
        {/* ===== LEFT ===== */}
        <div>
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

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="display mt-7 text-balance text-[2.9rem] leading-[0.98] sm:text-[4rem] lg:text-[4.6rem]">
                {slide.pre} <em className="accent text-brand">{slide.highlight}</em>
              </h1>
              <p className="mt-6 max-w-[540px] text-[17.5px] leading-relaxed text-ink-2">{slide.sub}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap gap-3">
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

          <div className="mt-9 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-6">
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
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn('h-1.5 transition-all duration-300', i === current ? 'w-8 bg-brand' : 'w-3 bg-line-strong hover:bg-muted')}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ===== RIGHT (branded ad poster — photo is swappable) ===== */}
        <div className="relative">
          <div className="relative border border-line bg-surface p-2.5 shadow-[0_40px_80px_-40px_#000000cc]">
            <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <Image src={slide.photo} alt={slide.alt} fill priority sizes="(min-width:1024px) 45vw, 90vw" className="object-cover" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          {/* live status badge */}
          <div className="absolute -bottom-4 left-6 flex items-center gap-2 border border-line bg-surface px-3.5 py-2 font-code text-[12px] uppercase tracking-[0.08em] text-ink-2 shadow-[0_16px_32px_-16px_#000000b3]">
            <span className="animate-live size-2 rounded-full bg-[#22c55e]" />
            Live classes running now
          </div>
        </div>
      </Container>

      {/* Stats strip */}
      <div className="border-t border-line">
        <Container className="grid grid-cols-3 divide-x divide-line">
          {stats.map((s) => (
            <div key={s.label} className="px-2 py-7 text-center sm:py-9">
              <CountUp value={s.value} className="display block text-[2.4rem] leading-none sm:text-[3.4rem]" />
              <span className="mt-2 block font-code text-[11px] uppercase tracking-[0.12em] text-muted sm:text-[12px]">{s.label}</span>
            </div>
          ))}
        </Container>
      </div>
    </section>
  )
}
