'use client'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  FaChalkboardTeacher, FaCertificate, FaBookOpen, FaClock, FaRegCalendarCheck, FaChartLine,
} from 'react-icons/fa'
import { FiCheck, FiArrowRight, FiStar } from 'react-icons/fi'

export default function ProgramPageTemplate({ program }) {
  useEffect(() => {
    document.title = program.seoTitle || `${program.title} | DSATGURU`
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.name = 'description'
      document.head.appendChild(metaDescription)
    }
    metaDescription.content = program.seoDescription || program.overview
  }, [program])

  const features = [
    {
      icon: <FaChalkboardTeacher size={24} />,
      title: 'Expert-Led Sessions',
      desc: `Learn from instructors who specialise in ${program.examLabel} preparation and understand the demands of ${program.title}.`,
      grad: 'from-indigo-600 to-indigo-700',
    },
    {
      icon: <FaCertificate size={24} />,
      title: 'Score-Focused Approach',
      desc: `${program.title} focuses on the skills and strategies that move your score, not just theory.`,
      grad: 'from-blue-600 to-blue-700',
    },
    {
      icon: <FaBookOpen size={24} />,
      title: 'Structured Resources',
      desc: `Guided practice, strategy notes, and review material designed to support the full ${program.title} journey.`,
      grad: 'from-teal-600 to-teal-700',
    },
  ]

  const infoCards = [
    {
      icon: <FaClock size={22} />,
      title: 'Flexible yet structured',
      desc: `Smart pacing designed around busy student schedules and the exact demands of ${program.title}.`,
      tint: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: <FaRegCalendarCheck size={22} />,
      title: 'Clear next steps',
      desc: `Know exactly what to revise or practise after each class or test in ${program.title}.`,
      tint: 'bg-emerald-100 text-emerald-600',
    },
  ]

  return (
    <section className="dg w-full bg-white text-slate-900">
      {/* ===== HERO ===== */}
      <div className="relative -mt-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="absolute -right-24 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute inset-0 dg-grid-bg opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-36 lg:grid-cols-2 lg:gap-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-600 shadow-sm backdrop-blur">
              <FiStar /> {program.highlightTag}
            </span>
            <h1 className="mt-5 whitespace-pre-line text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">{program.overview}</p>

            <ul className="mt-7 grid gap-2.5">
              {program.keyPoints?.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <FiCheck size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="dg-shine group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                Talk to an Advisor
                <FiArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/demo-test"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700"
              >
                Try Free Demo Test
              </Link>
            </div>
          </div>

          {/* Branded graphic (no stock photos) */}
          <motion.div
            initial={{ opacity: 1, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-tr from-indigo-400/25 to-blue-400/25 blur-2xl" />
            <Image
              src={program.heroArt || '/course-hero-art.png'}
              alt={`${program.title} — DSATGURU`}
              width={900}
              height={980}
              priority
              className="relative w-full rounded-[2rem] shadow-2xl shadow-indigo-900/20"
            />
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-16 lg:px-12">
        {/* Overview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
            Overview
          </span>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900 md:text-3xl">
            {program.title} <span className="dg-gradient-text">Overview</span>
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
            {program.title} is designed to give you a clear, step-by-step path from where you are today to your target
            score. You will know exactly what to study, how to practise, and how to measure your improvement over time
            for this specific program.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.grad} text-white shadow-lg transition-transform group-hover:scale-110`}>
                {item.icon}
              </div>
              <h4 className="mt-5 font-bold text-slate-900">{item.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Score improvement banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-700 p-8 text-white shadow-xl"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <FaChartLine size={24} />
            </span>
            <div>
              <h5 className="text-xl font-extrabold md:text-2xl">Score Improvement for {program.title}</h5>
              <p className="mt-1 text-sm text-white/90">
                This plan is structured so you always know what you&apos;re working toward — from your first lesson to
                your final practice test.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info cards (icon-based, no stock photos) */}
        <div className="grid gap-6 md:grid-cols-2">
          {infoCards.map((c, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${c.tint}`}>
                {c.icon}
              </span>
              <div>
                <h5 className="font-bold text-slate-900">{c.title}</h5>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{c.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Designed for */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center"
        >
          <h3 className="text-xl font-bold text-slate-900">
            Designed for Ambitious {program.examLabel} Students
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            Students who commit to {program.title} report feeling more confident, more prepared, and more in control of
            their scores on test day.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-700 px-8 py-14 text-center text-white shadow-2xl"
        >
          <div className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-blue-300/20 blur-2xl" />
          <h3 className="relative text-2xl font-extrabold md:text-3xl">Ready to Plan Your {program.title}?</h3>
          <p className="relative mx-auto mt-3 max-w-2xl text-sm text-white/90 md:text-base">
            Take the next step, or explore other DSAT and PSAT options from the menu. Our team is happy to help you build
            the right plan for your goals.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-indigo-600 shadow-lg transition-transform hover:-translate-y-0.5">
              Get Started <FiArrowRight />
            </Link>
            <Link href="/demo-test" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">
              Free Demo Test
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
