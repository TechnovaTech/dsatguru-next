'use client'
// Shared UI primitives for the IGCSC portal — keeps every page cohesive and short.
// Palette mirrors DsatGuru: indigo/blue accents on a slate canvas.
import { FiInbox, FiLoader } from 'react-icons/fi'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  indigo: 'from-indigo-500 to-indigo-600',
  blue: 'from-blue-500 to-blue-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
  violet: 'from-violet-500 to-purple-600',
  cyan: 'from-cyan-500 to-sky-600',
  slate: 'from-slate-600 to-slate-700',
}

export function StatCard({ label, value, icon: Icon, tone = 'indigo', hint }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${TONES[tone] || TONES.indigo} text-white shadow-sm`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </div>
  )
}

export function Card({ children, className = '', title, action }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

const BADGE_TONES = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-100 text-violet-700',
}

export function Badge({ children, tone = 'slate' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone] || BADGE_TONES.slate}`}>
      {children}
    </span>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
      <FiLoader className="animate-spin" size={28} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon = FiInbox, title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={26} />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
      {message}
    </div>
  )
}

// Table shell — consistent header + zebra rows across every page.
export function Table({ columns, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
            {columns.map((c, i) => (
              <th key={i} className={`whitespace-nowrap px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">{children}</tbody>
      </table>
      {empty}
    </div>
  )
}

export function Pill({ children }) {
  return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{children}</span>
}
