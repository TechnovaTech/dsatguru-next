'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { FaCheck, FaHeart, FaLightbulb, FaShieldAlt, FaUsers, FaRegClock, FaBookOpen, FaTrophy } from 'react-icons/fa'
import { FiArrowRight, FiCheck } from 'react-icons/fi'

function CountUp({ to, suffix = '', duration = 1600 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf
    let start
    const step = (t) => {
      if (!start) start = t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(eased * to))
      if (p < 1) raf = requestAnimationFrame(step)
      else setVal(to)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

const stats = [
  { icon: <FaRegClock />, to: 10, suffix: '+', label: 'Years Experience', grad: 'from-indigo-600 to-indigo-700' },
  { icon: <FaBookOpen />, to: 4000, suffix: '+', label: 'Practice Questions', grad: 'from-blue-600 to-blue-700' },
  { icon: <FaTrophy />, to: 99, suffix: '%', label: 'Success Rate', grad: 'from-teal-600 to-teal-700' },
  { icon: <FaUsers />, to: 10000, suffix: '+', label: 'Students Helped', grad: 'from-violet-600 to-fuchsia-600' },
]

const offers = [
  ['Expert Instructors', 'Top-notch teachers with proven success in DSAT/PSAT prep.'],
  ['Adaptive Practice Tests', 'The most realistic multistage adaptive tests available.'],
  ['Personalized Study Plans', 'Tailored to address your unique strengths and weaknesses.'],
  ['24/7 Support', 'Continuous guidance and mentorship every step of the way.'],
]

const whyCards = [
  {
    icon: <FaLightbulb size={24} />,
    grad: 'from-amber-500 to-orange-500',
    title: 'Proven Methods',
    description:
      "Evidence-based techniques — strategic answer elimination, precise passage mapping, spaced learning, active recall and interleaved practice — ensure you're fully prepared for every question.",
  },
  {
    icon: <FaCheck size={24} />,
    grad: 'from-emerald-500 to-teal-500',
    title: 'Affordable Options',
    description:
      'High-quality test prep should be accessible to everyone. Our budget-friendly plans make it easy to get the help you need without breaking the bank.',
  },
  {
    icon: <FaHeart size={24} />,
    grad: 'from-rose-500 to-pink-500',
    title: 'Unwavering Support',
    description:
      "From personalized study plans to 24/7 mentorship, we're with you at every step of your DSAT/PSAT journey.",
  },
]

const fadeUp = {
  hidden: { opacity: 1, y: 26 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

export default function About() {
  return (
    <section className="dg w-full bg-white text-slate-900">
      {/* ===== HERO ===== */}
      <div className="relative -mt-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="dg-blob absolute -right-24 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="dg-blob-slow absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-12 pt-40 text-center">
          <motion.span
            initial={{ opacity: 1, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm backdrop-blur"
          >
            About DSATGURU
          </motion.span>
          <motion.h1
            initial={{ opacity: 1, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl"
          >
            Helping You Achieve <span className="dg-gradient-text">Academic Excellence</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 1, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg"
          >
            At DSATGURU, we&apos;re passionate about helping students unlock their full potential and achieve their
            academic dreams. Our mission is simple: to provide the most effective, realistic, and affordable DSAT/PSAT
            preparation tools that empower students to excel on test day and beyond.
          </motion.p>
          <motion.div
            initial={{ opacity: 1, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/contact" className="dg-shine group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700">
              Talk to Us <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/demo-test" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700">
              Try Free Demo
            </Link>
          </motion.div>
        </div>

        {/* Animated stats */}
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-16">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                whileHover={{ y: -6 }}
                className="rounded-2xl border border-slate-100 bg-white/80 p-6 text-center shadow-lg backdrop-blur transition-shadow hover:shadow-xl"
              >
                <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow`}>
                  {s.icon}
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  <CountUp to={s.to} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-14 px-6 py-16 lg:px-12">
        {/* Who We Are + What We Offer */}
        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              Who We Are
            </span>
            <h4 className="mt-4 text-2xl font-extrabold text-slate-900">Educators who get it</h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              DSATGURU was founded by a team of experienced educators and test-prep experts who understand the challenges
              students face when preparing for standardized tests. We know that every student is unique, with different
              strengths, weaknesses, and learning styles. That&apos;s why we&apos;ve created a comprehensive suite of prep
              options designed to meet the needs of every learner, from beginners to advanced test-takers.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              What We Offer
            </span>
            <h4 className="mt-4 text-2xl font-extrabold text-slate-900">Everything you need to score higher</h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              We specialize in realistic, adaptive DSAT/PSAT practice tests and live online courses that mirror the actual
              exam — crafted to target knowledge gaps, build confidence, and boost scores.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {offers.map(([t, d], i) => (
                <motion.li
                  key={t}
                  custom={i}
                  variants={fadeUp}
                  className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white"><FiCheck size={11} /></span>
                  <span className="text-sm text-slate-700"><b className="text-slate-900">{t}:</b> {d}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Guarantee banner */}
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-700 p-10 text-center text-white shadow-2xl"
        >
          <div className="dg-blob pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div className="dg-blob-slow pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
          <motion.div
            initial={{ scale: 0, rotate: -20 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white"
          >
            <FaShieldAlt size={26} />
          </motion.div>
          <h4 className="relative text-2xl font-extrabold md:text-3xl">Our Guarantee*</h4>
          <p className="relative mx-auto mt-3 max-w-3xl text-sm text-white/90 md:text-base">
            We&apos;re so confident in the quality of our content and teaching methods that we guarantee* results. Whether
            you&apos;re aiming for a 200+ point increase* or a score of 1420+*, we stand by our promise.
          </p>
          <p className="relative mt-3 text-xs text-white/70">*Terms and conditions apply. Please contact us for details.</p>
        </motion.div>

        {/* Why Choose Us */}
        <div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              Why Us
            </span>
            <h3 className="mt-4 text-3xl font-extrabold text-slate-900 md:text-4xl">
              Why Choose <span className="dg-gradient-text">DSATGURU?</span>
            </h3>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyCards.map((item, idx) => (
              <motion.div
                key={idx}
                custom={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={{ y: -8 }}
                className="group rounded-2xl border border-slate-100 bg-white p-7 text-center shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.grad} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                  {item.icon}
                </div>
                <h4 className="mb-2 font-bold text-slate-900">{item.title}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 px-8 py-14 text-center"
        >
          <h4 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Get Started Today</h4>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
            Join us today and let DSATGURU help you score higher, stress less, and succeed more. Your journey to academic
            excellence starts here!
          </p>
          <Link
            href="/"
            className="dg-shine group relative mt-7 inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            Explore Our Courses <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
