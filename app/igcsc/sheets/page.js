'use client'
// Practice Sheets, for students: every sheet and period material staff have
// uploaded into the Question Bank's Miscellaneous folders, topic by topic.
// Staff see the same page with hidden sheets included.
import { useEffect, useMemo, useState } from 'react'
import { FiFolder, FiSearch } from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Loading, EmptyState, ErrorState } from '../_components/ui'
import { SheetSlots } from '../_components/SheetWorkspace'
import { folderCrumbs, bySlot } from '../../../lib/igcscSheetsShared'

export default function PracticeSheetsPage() {
  const [sheets, setSheets] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [subj, setSubj] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await apiGet('/api/igcsc/sheets?mode=all')
        if (alive) setSheets(r.sheets || [])
      } catch (e) {
        if (alive) { setError(e.message); setSheets([]) }
      }
    })()
    return () => { alive = false }
  }, [])

  const subjects = useMemo(
    () => [...new Set((sheets || []).map((s) => `${s.curriculum} ${s.subject}`))].sort(),
    [sheets],
  )

  // One group per bank folder, in subject then folder order.
  const groups = useMemo(() => {
    const map = new Map()
    for (const s of sheets || []) {
      const key = `${s.curriculum}|${s.subject}|${s.folder}`
      if (!map.has(key)) {
        map.set(key, { key, subjectLabel: `${s.curriculum} ${s.subject}`, crumbs: folderCrumbs(s.folder), sheets: [] })
      }
      map.get(key).sheets.push(s)
    }
    const list = [...map.values()]
    for (const g of list) g.sheets.sort(bySlot)
    list.sort((a, b) => a.key.localeCompare(b.key))
    return list
  }, [sheets])

  const term = q.trim().toLowerCase()
  const shown = groups.filter((g) =>
    (!subj || g.subjectLabel === subj) &&
    (!term || [g.subjectLabel, ...g.crumbs, ...g.sheets.map((s) => s.title)].join(' ').toLowerCase().includes(term)))

  return (
    <div>
      <PageHeader title="Practice Sheets" subtitle="Sheets and period materials your tutors uploaded, topic by topic." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {sheets === null ? (
        <Loading label="Loading sheets…" />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState icon={FiFolder} title="No practice sheets yet" hint="Your tutors have not uploaded any sheets yet. Check back soon." />
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[16rem] flex-1 sm:flex-none">
              <FiSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics or sheets…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none" />
            </div>
            {subjects.length > 1 && ['', ...subjects].map((s) => (
              <button key={s || 'all'} type="button" onClick={() => setSubj(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  subj === s ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {s || 'All subjects'}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {shown.map((g) => (
              <section key={g.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <header className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <FiFolder size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{g.crumbs[g.crumbs.length - 1] || g.subjectLabel}</h2>
                    <p className="truncate text-xs text-slate-400">{[g.subjectLabel, ...g.crumbs].join(' › ')}</p>
                  </div>
                </header>
                <SheetSlots sheets={g.sheets} readOnly />
              </section>
            ))}
            {shown.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                No topic or sheet matches that search.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
