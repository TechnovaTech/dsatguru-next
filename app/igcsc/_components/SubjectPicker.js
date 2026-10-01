'use client'
import { useMemo, useState } from 'react'
import { FiSearch, FiX, FiPlus } from 'react-icons/fi'
import { IGCSE_SUBJECT_GROUPS, IGCSE_SUBJECTS } from '../../../lib/igcseSubjects'

// Picking a student's IGCSE subjects.
//
// The full catalogue is about seventy entries, which is far too many to lay out
// as a wall of buttons, so: what is chosen stays pinned at the top, the rest is
// searchable and grouped the way Cambridge groups them, and anything missing can
// simply be typed in — a subject is stored as its plain name, so the list never
// has to be exhaustive to be usable.
//
// Module scope on purpose: a component declared inside another is a new type on
// every render, and React would rebuild the search box after each keystroke —
// which is how an input loses focus mid-word.
export default function SubjectPicker({ value = [], onChange }) {
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState('')

  const toggle = (s) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])

  const addCustom = () => {
    const s = custom.trim()
    if (!s) return
    // Match an existing entry case-insensitively rather than creating a near
    // duplicate like "physics" alongside "Physics".
    const known = [...IGCSE_SUBJECTS, ...value].find((x) => x.toLowerCase() === s.toLowerCase())
    const name = known || s
    if (!value.includes(name)) onChange([...value, name])
    setCustom('')
  }

  // Anything already on the profile that is not in the catalogue still belongs
  // on screen, or editing someone would quietly drop it.
  const extras = useMemo(() => value.filter((s) => !IGCSE_SUBJECTS.includes(s)), [value])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const all = extras.length
      ? [...IGCSE_SUBJECT_GROUPS, { group: 'Added by you', subjects: extras }]
      : IGCSE_SUBJECT_GROUPS
    if (!needle) return all
    return all
      .map((g) => ({ ...g, subjects: g.subjects.filter((s) => s.toLowerCase().includes(needle)) }))
      .filter((g) => g.subjects.length)
  }, [q, extras])

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Subjects</span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-[11px] font-medium text-slate-400 hover:text-rose-600">
            Clear all
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 rounded-lg bg-indigo-50/60 p-2">
          {value.map((s) => (
            <button key={s} type="button" onClick={() => toggle(s)}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              title="Remove">
              {s} <FiX size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-2">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${IGCSE_SUBJECTS.length} IGCSE subjects…`}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="max-h-52 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
        {groups.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-slate-400">
            Nothing matches “{q}”. Type it below to add it anyway.
          </p>
        ) : groups.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{g.group}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.subjects.map((s) => (
                <button key={s} type="button" onClick={() => toggle(s)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    value.includes(s) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          // Enter inside a form would submit it; here it should add the subject.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Not listed? Type a subject and add it"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <FiPlus size={14} /> Add
        </button>
      </div>
    </div>
  )
}
