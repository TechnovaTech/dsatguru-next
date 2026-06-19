'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaCheck, FaTimes, FaCrown } from 'react-icons/fa'

// DSATGURU offering
const dsg = {
  price: '$20/mo',
  access: '1 year',
  guarantee: '+200',
  live: true,
  tests: true,
  videos: true,
  explain: true,
  plan: true,
  trial: true,
  predictor: true,
  support: true,
}

const competitors = [
  { name: 'Kaplan', price: '$199', access: '6 months', guarantee: '+1', live: false, tests: false, videos: false, explain: false, plan: false, trial: false, predictor: false, support: false },
  { name: 'Princeton', price: '$299', access: '12 months', guarantee: '+160', live: false, tests: false, videos: false, explain: false, plan: false, trial: false, predictor: false, support: false },
  { name: 'PrepScholar', price: '$397', access: '12 months', guarantee: false, live: false, tests: false, videos: false, explain: false, plan: false, trial: false, predictor: false, support: false },
  { name: 'Testive', price: '$1596', access: '4 months', guarantee: false, live: false, tests: false, videos: false, explain: false, plan: false, trial: false, predictor: false, support: false },
]

const rows = [
  { label: 'Price', key: 'price', kind: 'text' },
  { label: 'Online Access', key: 'access', kind: 'text' },
  { label: 'Score Increase Guarantee', key: 'guarantee', kind: 'text' },
  { label: 'Live Classes', key: 'live', kind: 'bool' },
  { label: '25+ Multistage Adaptive Tests', key: 'tests', kind: 'bool' },
  { label: 'Content Videos with Quizzes', key: 'videos', kind: 'bool' },
  { label: 'Video & Text Explanations', key: 'explain', kind: 'bool' },
  { label: 'Study Plan (Weekly, Monthly)', key: 'plan', kind: 'bool' },
  { label: 'Free 4-Day Trial', key: 'trial', kind: 'bool' },
  { label: 'Approximate Score Predictor', key: 'predictor', kind: 'bool' },
  { label: '24/7 Support', key: 'support', kind: 'bool' },
]

function Mark({ ok }) {
  return ok ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <FaCheck size={13} />
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-500">
      <FaTimes size={13} />
    </span>
  )
}

function Value({ value, kind, brand }) {
  if (kind === 'bool') return <Mark ok={value === true} />
  if (value === false || value == null) return <Mark ok={false} />
  return <span className={brand ? 'font-extrabold text-indigo-600' : 'font-semibold text-slate-600'}>{value}</span>
}

export default function ComparisonSection() {
  const [sel, setSel] = useState(0)
  const comp = competitors[sel]

  return (
    <section className="w-full px-4 py-12 text-slate-800 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto mb-8 max-w-3xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
          Compare
        </span>
        <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
          DSATGURU <span className="dg-gradient-text">vs. the rest</span>
        </h3>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
          Pick any prep service and see how DSATGURU stacks up — same elite resources, a fraction of the cost.
        </p>
      </motion.div>

      {/* Competitor selector */}
      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm font-semibold text-slate-500">Compare with:</span>
        {competitors.map((c, i) => (
          <button
            key={c.name}
            onClick={() => setSel(i)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
              sel === i
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Comparison card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr] items-stretch">
          <div className="flex items-center px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-400">
            Feature
          </div>
          <div className="relative flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-4 text-white">
            <FaCrown className="text-amber-300" size={18} />
            <span className="text-sm font-extrabold sm:text-base">DSATGURU</span>
          </div>
          <div className="flex items-center justify-center px-3 py-4">
            <AnimatePresence mode="wait">
              <motion.span
                key={comp.name}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="text-sm font-extrabold text-slate-700 sm:text-base"
              >
                {comp.name}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Rows */}
        {rows.map((r, i) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className={`grid grid-cols-[1.5fr_1fr_1fr] items-center border-t border-slate-100 ${
              i % 2 ? 'bg-slate-50/40' : 'bg-white'
            }`}
          >
            <div className="px-5 py-3.5 text-sm font-medium text-slate-700">{r.label}</div>
            <div className="flex items-center justify-center bg-indigo-50/60 px-3 py-3.5">
              <Value value={dsg[r.key]} kind={r.kind} brand />
            </div>
            <div className="flex items-center justify-center px-3 py-3.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={comp.name + r.key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Value value={comp[r.key]} kind={r.kind} />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        {/* Winner footer */}
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-center text-sm font-bold text-white">
          <FaCrown className="text-amber-300" />
          DSATGURU leads on every feature — for far less.
        </div>
      </motion.div>
    </section>
  )
}
