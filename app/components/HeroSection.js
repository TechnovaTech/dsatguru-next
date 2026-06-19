'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { FiArrowRight, FiPlay } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import FloatingContactButtons from './FloatingContactButtons'

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
    post: '',
    sub: 'Personalized study plans, 4,000+ realistic Digital SAT practice questions, and proven strategies to raise your score by 200+ points.',
  },
  {
    photo: '/f33d646a-2fab-4cb5-9a0f-bdfdeb5c4d9f.png',
    alt: 'Affordable premium Digital SAT preparation from $20 per month with live classes and adaptive tests — DSATGURU',
    pre: 'Premium SAT Prep,',
    highlight: 'Affordable Price',
    post: '',
    sub: 'Elite Digital SAT preparation, live online classes, and 25+ adaptive practice tests — without the premium price tag.',
  },
  {
    photo: '/be5a1c49-657c-4ef0-94e7-5879bf183f93.png',
    alt: 'Experience a real Digital SAT practice test with DSATGURU adaptive engine, timed sections and instant scoring',
    pre: 'Experience the',
    highlight: 'Real Digital SAT',
    post: '',
    sub: 'Practice on an exact replica of test day with our adaptive engine, timed sections, and instant Digital SAT scoring.',
  },
]

const stats = [
  { value: '4,000+', label: 'Practice Questions' },
  { value: '99%+', label: 'Success Rate' },
  { value: '10+', label: 'Years Experience' },
]

const avatars = [
  { i: 'JD', c: 'bg-indigo-600' },
  { i: 'MR', c: 'bg-blue-600' },
  { i: 'AT', c: 'bg-teal-600' },
  { i: 'SK', c: 'bg-slate-700' },
]

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
    <section className="relative w-full overflow-hidden bg-white">
      <FloatingContactButtons />

      {/* Background decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/70 via-white to-white" />
        <div className="absolute -right-24 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-28 pt-32 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-36 lg:pt-40">
        {/* ===== LEFT ===== */}
        <div className="text-center lg:text-left">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <span className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} size={12} />
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
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl xl:text-[3.4rem]">
                {slide.pre}{' '}
                <span className="relative">
                  <span className="dg-gradient-text">{slide.highlight}</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 9C75 3 225 3 298 9" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
                {slide.post ? <> {slide.post}</> : null}
              </h1>

              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-slate-600 lg:mx-0 lg:text-lg">
                {slide.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <button
              onClick={scrollToPlans}
              className="dg-shine group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              Start your DSAT journey
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="/demo-test"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700"
            >
              <FiPlay size={14} className="text-indigo-600" /> Try Free Demo Test
            </a>
          </div>

          <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-between lg:justify-start lg:gap-10">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {avatars.map((a) => (
                  <span
                    key={a.i}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow ${a.c}`}
                  >
                    {a.i}
                  </span>
                ))}
              </div>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={liveCount}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="font-bold text-slate-900 tabular-nums"
                  >
                    {liveCount.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
                students improved
              </p>
            </div>

            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ===== RIGHT (branded ad poster — photo is swappable) ===== */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -right-4 top-6 hidden h-[88%] w-[85%] rotate-3 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-600 lg:block" />
          <div className="absolute -left-6 bottom-2 h-40 w-40 rounded-full bg-indigo-100 blur-2xl" />

          <div className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl shadow-indigo-900/15">
            <div className="relative aspect-[5/4] w-full">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <Image
                    src={slide.photo}
                    alt={slide.alt}
                    fill
                    priority
                    sizes="(min-width:1024px) 45vw, 90vw"
                    className="object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* live status pill */}
          <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-100 bg-white/95 px-4 py-2 shadow-xl backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-700">Live classes running now</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative z-10 border-t border-slate-100 bg-white/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-slate-100 px-6">
          {stats.map((s) => (
            <div key={s.label} className="px-2 py-6 text-center">
              <div className="text-2xl font-extrabold text-slate-900 md:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-slate-500 md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
