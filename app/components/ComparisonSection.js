'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuCheck, LuCrown, LuX } from 'react-icons/lu'
import { Reveal } from './site/motion'
import { Eyebrow, cn } from './site/ui'

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
    <span className="grid size-7 place-items-center bg-brand text-on-brand" aria-label="Yes">
      <LuCheck className="size-4" />
    </span>
  ) : (
    <span className="grid size-7 place-items-center border border-line text-subtle" aria-label="No">
      <LuX className="size-4" />
    </span>
  )
}

function Value({ value, kind, brand }) {
  if (kind === 'bool') return <Mark ok={value === true} />
  if (value === false || value == null) return <Mark ok={false} />
  return <span className={cn('font-code text-[15px]', brand ? 'font-medium text-brand' : 'text-ink-2')}>{value}</span>
}

export default function ComparisonSection() {
  const [sel, setSel] = useState(0)
  const comp = competitors[sel]

  return (
    <div className="mt-20 sm:mt-28">
      <Reveal className="mx-auto max-w-[760px] text-center">
        <Eyebrow center>Compare</Eyebrow>
        <h2 className="display mt-6 text-balance text-[2.3rem] leading-[1.04] sm:text-[2.9rem] lg:text-[3.3rem]">
          DSATGURU <em className="accent">vs. the rest.</em>
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-relaxed text-muted">
          Pick any prep service and see how DSATGURU stacks up — same elite resources, a fraction of the cost.
        </p>
      </Reveal>

      {/* Competitor selector */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Compare with">
        <span className="mr-1 font-code text-[12px] uppercase tracking-[0.1em] text-muted">Compare with:</span>
        {competitors.map((c, i) => (
          <button
            key={c.name}
            type="button"
            role="tab"
            aria-selected={sel === i}
            onClick={() => setSel(i)}
            className={cn(
              'h-10 border px-4 text-[14.5px] font-medium transition-colors',
              sel === i ? 'border-ink bg-cta text-on-cta' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Comparison table */}
      <Reveal className="mx-auto mt-8 max-w-[880px] border border-line bg-surface">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-line">
          <div className="p-4 font-code text-[12px] uppercase tracking-[0.1em] text-muted sm:px-6">Feature</div>
          <div className="flex items-center justify-center gap-2 bg-brand-soft p-4 text-center">
            <LuCrown className="size-4 text-brand" />
            <span className="text-[15px] font-semibold text-ink">DSATGURU</span>
          </div>
          <div className="p-4 text-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={comp.name}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="inline-block text-[15px] font-semibold text-ink-2"
              >
                {comp.name}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-line last:border-b-0">
            <div className="p-3.5 text-[14.5px] text-ink-2 sm:px-6">{r.label}</div>
            <div className="flex h-full items-center justify-center bg-brand-50 p-3.5">
              <Value value={dsg[r.key]} kind={r.kind} brand />
            </div>
            <div className="flex justify-center p-3.5">
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
          </div>
        ))}

        <div className="flex items-center justify-center gap-2 border-t border-line bg-canvas p-4 text-[14.5px] font-medium text-ink">
          <LuCrown className="size-4 text-brand" />
          DSATGURU leads on every feature — for far less.
        </div>
      </Reveal>
    </div>
  )
}
