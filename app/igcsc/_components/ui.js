'use client'
// Shared UI primitives for the IGCSC portal — keeps every page cohesive and short.
// Editorial, like the public site: warm paper, hairline rules, a serif for
// display, a mono for labels and numbers, one vermilion accent.
import { FiInbox, FiLoader } from 'react-icons/fi'

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 font-code text-[11px] uppercase tracking-[0.12em] text-muted">{eyebrow}</p>
        )}
        <h1 className="display text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.1] text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// Icon tint per tone — the same semantic colours the whole site uses.
const TONES = {
  indigo: 'text-brand',
  violet: 'text-brand',
  blue: 'text-calm',
  cyan: 'text-calm',
  emerald: 'text-positive',
  amber: 'text-star',
  rose: 'text-negative',
  slate: 'text-ink-2',
}

export function StatCard({ label, value, icon: Icon, tone = 'indigo', hint }) {
  return (
    <div className="flex items-center gap-4 border border-line bg-surface p-4">
      {Icon && (
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center bg-sunken ${TONES[tone] || TONES.indigo}`}>
          <Icon size={18} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-code text-xl font-medium tabular-nums text-ink">{value}</p>
        <p className="truncate font-code text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
        {hint && <p className="truncate text-xs text-subtle">{hint}</p>}
      </div>
    </div>
  )
}

export function Card({ children, className = '', title, action }) {
  return (
    <div className={`border border-line bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h3 className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

const BADGE_TONES = {
  green: 'bg-[#2f7d4514] text-positive',
  emerald: 'bg-[#2f7d4514] text-positive',
  red: 'bg-[#b4231814] text-negative',
  rose: 'bg-[#b4231814] text-negative',
  amber: 'bg-[#b7791f1a] text-[#8a5a12]',
  blue: 'bg-[#3f6b6414] text-calm',
  cyan: 'bg-[#3f6b6414] text-calm',
  indigo: 'bg-brand-50 text-brand',
  violet: 'bg-brand-soft text-brand',
  slate: 'bg-sunken text-ink-2',
}

export function Badge({ children, tone = 'slate' }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-line px-2.5 py-0.5 font-code text-[11px] uppercase tracking-[0.08em] ${BADGE_TONES[tone] || BADGE_TONES.slate}`}>
      {children}
    </span>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted">
      <FiLoader className="animate-spin text-brand" size={26} />
      <p className="font-code text-[11px] uppercase tracking-[0.12em]">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon = FiInbox, title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center bg-sunken text-subtle">
        <Icon size={22} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="border border-negative/30 bg-[#b4231814] px-5 py-4 text-sm font-medium text-negative">
      {message}
    </div>
  )
}

// Table shell — hairline rules, an eyebrow header row, mono-friendly cells.
export function Table({ columns, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line font-code text-[11px] uppercase tracking-[0.1em] text-muted">
            {columns.map((c, i) => (
              <th key={i} className={`whitespace-nowrap px-4 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  )
}

export function Pill({ children }) {
  return <span className="rounded-full bg-sunken px-2 py-0.5 font-code text-[11px] text-ink-2">{children}</span>
}
