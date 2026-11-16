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
 * One fixed hero, as in the reference design — no rotation, so the headline is
 * always fully opaque (the old three-slide carousel spent part of every cycle
 * mid-crossfade, which is what made the heading look washed out).
 * To change the art: swap the `photo` path with any image in /public.
 */
const slide = {
  photo: '/hero-student2.png',
  alt: 'Maximize your Digital SAT score with DSATGURU — 200+ point score guarantee and 4,000+ practice questions',
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
    <section className="relative overflow-hidden border-b border-line">
      <FloatingContact />

      {/* ===== HERO BAND =====
          Its own positioning context, so the artwork can bleed to the viewport edge
          without running behind the stats card underneath it. */}
      <div className="relative">
        {/* One very faint dot field, masked out before it reaches the copy. The mesh
            blooms and blurred halos belonged to the previous theme; this one gets its
            depth from hairlines and whitespace instead. */}
        <div className="dot-grid pointer-events-none absolute inset-0 z-0 opacity-[0.55] [mask-image:radial-gradient(ellipse_at_82%_18%,#000,transparent_58%)]" />

      <Container className="relative z-10 grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.02fr_1fr] lg:gap-20 lg:py-28">
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

          <div>
            <h1 className="display mt-7 text-balance text-[2.75rem] leading-[1.06] sm:text-[3.6rem] lg:text-[4.15rem]">
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

        {/* ===== ARTWORK =====
            Back inside the grid rather than bleeding off the viewport edge. Contained
            and floated on a soft halo, it reads as a product shot instead of a poster,
            which was the main thing the client objected to.
            It keeps a dark panel of its own because the cut-out's white hoodie and
            white "Dream Big" lettering would disappear on the pale mesh page. */}
        <div className="relative">
          <div className="relative z-10 overflow-hidden rounded-[var(--radius-card)] border border-line bg-[var(--art-bg)] p-2.5">
            {/* object-contain, never cover: the checklist on the left and the
                "Dream Big / Score High" lettering on the right run to the very edges
                of the frame (content bbox is 99% x 96% of the file), so any cropping
                eats them immediately. */}
            <div className="relative aspect-[3/2] overflow-hidden rounded-[10px]">
              <Image
                src={slide.photo}
                alt={slide.alt}
                fill
                priority
                sizes="(min-width:1024px) 46vw, 92vw"
                className="object-contain object-center"
              />
            </div>
          </div>
          {/* live status badge */}
          <div className="absolute -bottom-3.5 left-6 z-20 flex items-center gap-2 rounded-[8px] border border-line bg-surface px-3.5 py-2 text-[12px] font-medium text-muted">
            <span className="animate-live size-2 rounded-full bg-positive" />
            Live classes running now
          </div>
        </div>
      </Container>
      </div>

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
