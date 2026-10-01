'use client'
// Tutors hand papers to students: pick students on the left, papers on the
// right, set a due date, assign. Each (paper, student) pair is one row for
// good, so assigning again only updates its due date and note - and an
// assigned paper opens for the student whether or not it is on sale.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FiSearch, FiCheck, FiX, FiSend, FiUsers, FiFileText, FiCalendar, FiMessageSquare,
  FiRefreshCw, FiTrash2, FiLoader, FiAlertTriangle, FiCheckCircle, FiCheckSquare, FiInbox,
} from 'react-icons/fi'
import { apiGet, apiSend } from '../_components/api'
import { PageHeader, Card, Badge, Loading, EmptyState, ErrorState, Table } from '../_components/ui'
import { ATTEMPT_STATUS } from '../../../lib/igcscStoreShared'

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_DANGER =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50'
const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400'

// The API takes at most 50 students and 50 papers per request; a bigger
// selection goes in batches.
const BATCH = 50
const PAGE_SIZE = 30
const NOTE_MAX = 300
const CHIPS_SHOWN = 8
const DAY_MS = 86400000

const DIFF_TONE = { Easy: 'green', Medium: 'blue', Hard: 'amber', 'Very Hard': 'rose' }
const SALE_OPTIONS = [
  { id: '', label: 'All papers' },
  { id: 'published', label: 'On sale' },
  { id: 'unpublished', label: 'Not on sale' },
]
const FORMAT_OPTIONS = [
  { id: '', label: 'Any format' },
  { id: 'mcq', label: 'Online MCQ only' },
  { id: 'written', label: 'Written only' },
  { id: 'mixed', label: 'MCQ + written' },
]

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function chunk(list, n) {
  const out = []
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n))
  return out
}

// A due date picked without a time arrives as midnight UTC; it means the
// whole of that day, in that day's own calendar.
const isDateOnly = (t) => t % DAY_MS === 0

function fmtDate(d, withDay = false) {
  if (!d) return ''
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return ''
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  if (withDay) opts.weekday = 'short'
  if (isDateOnly(t.getTime())) opts.timeZone = 'UTC'
  return t.toLocaleDateString(undefined, opts)
}

function dueTime(d) {
  if (!d) return Infinity
  const t = new Date(d).getTime()
  if (!Number.isFinite(t)) return Infinity
  return isDateOnly(t) ? t + DAY_MS - 1 : t
}

// Handed-in work is never overdue, however late it was.
function isOverdue(a) {
  if (!a || a.revokedAt) return false
  const s = a.latestAttempt?.status
  if (s === 'grading' || s === 'needs_review' || s === 'completed') return false
  const t = dueTime(a.dueAt)
  return Number.isFinite(t) && t < Date.now()
}

function todayInput() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// A date picked here means the end of that day where the tutor is.
function dueIso(value) {
  if (!value) return null
  const d = new Date(`${value}T23:59:59`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Where a tutor goes to look at a sitting: the marking screen while the
// written part is with the marker or a tutor, the result once it is final.
function attemptHref(la) {
  if (!la?._id) return ''
  if (la.status === 'completed') return `/igcsc/attempt/${la._id}/result`
  if (la.status === 'grading' || la.status === 'needs_review') return `/igcsc/grading/${la._id}`
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────

function Tick({ on }) {
  return (
    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
      {on && <FiCheck size={13} />}
    </span>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-xs font-semibold text-indigo-700">
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} className="flex-shrink-0 rounded-full p-0.5 transition hover:bg-indigo-100" aria-label={`Remove ${label}`}>
        <FiX size={12} />
      </button>
    </span>
  )
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT} pl-9`}
      />
    </div>
  )
}

function StudentRow({ s, picked, onToggle }) {
  const initials = (s.name || s.email || '?').trim().slice(0, 2).toUpperCase()
  const suspended = s.isActive === false
  return (
    <button
      type="button"
      onClick={() => { if (!suspended) onToggle(s) }}
      disabled={suspended}
      title={suspended ? 'Suspended - reactivate them in Users to assign work' : undefined}
      aria-pressed={picked}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${picked ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
    >
      <Tick on={picked} />
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-xs font-bold text-white">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{s.name || 'Unnamed student'}</span>
        <span className="block truncate text-xs text-slate-400">{s.email}</span>
      </span>
      {s.yearGroup && (
        <span className="hidden flex-shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 sm:inline">{s.yearGroup}</span>
      )}
      {s.isActive === false && <Badge tone="slate">Inactive</Badge>}
    </button>
  )
}

function PaperRow({ p, picked, onToggle }) {
  const bits = [
    p.mcqCount ? `${p.mcqCount} MCQ` : '',
    p.writtenCount ? `${p.writtenCount} written` : '',
    p.totalMarks ? `${p.totalMarks} marks` : '',
    p.durationMin ? `${p.durationMin} min` : '',
  ].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onToggle(p)}
      aria-pressed={picked}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${picked ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
    >
      <Tick on={picked} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800">{p.title || 'Untitled paper'}</span>
          {p.difficulty && <Badge tone={DIFF_TONE[p.difficulty] || 'slate'}>{p.difficulty}</Badge>}
          {!p.isPublished && <Badge tone="slate">Not on sale</Badge>}
        </span>
        {p.unit && <span className="mt-0.5 block truncate text-xs text-slate-500">{p.unit}</span>}
        <span className="mt-1 block text-[11px] text-slate-400">
          {[p.curriculum, p.subject].filter(Boolean).join(' · ')}{bits ? ` · ${bits}` : ''}
        </span>
        {!p.clean && p.holdReason && (
          <span className="mt-1 flex items-start gap-1 text-[11px] font-medium text-amber-700">
            <FiAlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> {p.holdReason}
          </span>
        )}
      </span>
    </button>
  )
}

function AttemptCell({ la }) {
  if (!la) return <span className="text-xs text-slate-400">Not started</span>
  const st = ATTEMPT_STATUS[la.status] || { label: la.status || 'Unknown', tone: 'slate' }
  const body = (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={st.tone}>{st.label}</Badge>
      {la.percentage != null && (
        <span className="text-xs font-bold text-slate-700">{la.percentage}%{la.grade ? ` · ${la.grade}` : ''}</span>
      )}
    </span>
  )
  const href = attemptHref(la)
  return href ? <Link href={href} className="transition hover:opacity-75">{body}</Link> : body
}

function DueLabel({ a }) {
  if (!a.dueAt) return <span className="text-xs text-slate-400">No due date</span>
  const overdue = isOverdue(a)
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs ${overdue ? 'font-bold text-rose-600' : 'font-medium text-slate-600'}`}>
      {overdue ? <FiAlertTriangle size={12} /> : <FiCalendar size={12} />}
      {overdue ? 'Overdue · ' : ''}{fmtDate(a.dueAt, true)}
    </span>
  )
}

function RevokeButton({ a, onRevoke }) {
  if (a.revokedAt) return <Badge tone="slate">Removed {fmtDate(a.revokedAt)}</Badge>
  return (
    <button
      type="button"
      onClick={() => onRevoke(a)}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
    >
      <FiTrash2 size={13} /> Revoke
    </button>
  )
}

function AssignmentRow({ a, onRevoke }) {
  return (
    <tr className={a.revokedAt ? 'bg-slate-50/60 opacity-70' : 'hover:bg-slate-50/60'}>
      <td className="px-4 py-3 align-top">
        <div className="max-w-[200px] truncate font-semibold text-slate-800">{a.student?.name || 'Unknown student'}</div>
        <div className="max-w-[200px] truncate text-xs text-slate-400">{a.student?.email}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="max-w-[260px] truncate font-semibold text-slate-800">{a.paper?.title || 'Paper'}</div>
        <div className="max-w-[260px] truncate text-xs text-slate-500">{a.paper?.unit}</div>
      </td>
      <td className="px-4 py-3 align-top"><DueLabel a={a} /></td>
      <td className="px-4 py-3 align-top"><AttemptCell la={a.latestAttempt} /></td>
      <td className="px-4 py-3 align-top">
        <div className="whitespace-nowrap text-xs text-slate-600">{fmtDate(a.createdAt)}</div>
        {a.assignedByName && <div className="max-w-[140px] truncate text-xs text-slate-400">by {a.assignedByName}</div>}
        {a.note && (
          <div className="mt-1 max-w-[200px] truncate text-xs italic text-slate-400" title={a.note}>“{a.note}”</div>
        )}
      </td>
      <td className="px-4 py-3 text-right align-top"><RevokeButton a={a} onRevoke={onRevoke} /></td>
    </tr>
  )
}

function AssignmentCard({ a, onRevoke }) {
  return (
    <div className={`px-4 py-4 ${a.revokedAt ? 'bg-slate-50/60 opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{a.student?.name || 'Unknown student'}</div>
          <div className="truncate text-xs text-slate-400">{a.student?.email}</div>
        </div>
        <div className="flex-shrink-0"><RevokeButton a={a} onRevoke={onRevoke} /></div>
      </div>
      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2">
        <div className="break-words text-sm font-semibold text-slate-800">{a.paper?.title || 'Paper'}</div>
        {a.paper?.unit && <div className="break-words text-xs text-slate-500">{a.paper.unit}</div>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <DueLabel a={a} />
        <AttemptCell la={a.latestAttempt} />
      </div>
      <div className="mt-2 text-xs text-slate-400">
        Assigned {fmtDate(a.createdAt)}{a.assignedByName ? ` by ${a.assignedByName}` : ''}
      </div>
      {a.note && <p className="mt-1 break-words text-xs italic text-slate-500">“{a.note}”</p>}
    </div>
  )
}

function ConfirmDialog({ title, children, confirmLabel, danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={() => { if (!busy) onCancel() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? BTN_DANGER : BTN_PRIMARY}>
            {busy && <FiLoader className="animate-spin" size={14} />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PaperAssignPage() {
  // Students
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState('')
  const [studentQ, setStudentQ] = useState('')
  const [pickedStudents, setPickedStudents] = useState({}) // id -> { name, email }

  // Papers
  const [papers, setPapers] = useState([])
  const [paperMeta, setPaperMeta] = useState({ total: 0, page: 1, pages: 1 })
  const [facets, setFacets] = useState([])
  const [papersLoading, setPapersLoading] = useState(true)
  const [papersError, setPapersError] = useState('')
  const [curriculum, setCurriculum] = useState('')
  const [subject, setSubject] = useState('')
  const [paperQ, setPaperQ] = useState('')
  const [paperSearch, setPaperSearch] = useState('')
  const [sale, setSale] = useState('')
  const [format, setFormat] = useState('')
  const [pickedPapers, setPickedPapers] = useState({}) // id -> { title, unit, isPublished }

  // Assigning
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [flash, setFlash] = useState(null) // { tone: 'green' | 'red', text }

  // Current assignments
  const [assignments, setAssignments] = useState([])
  const [asgLoading, setAsgLoading] = useState(true)
  const [asgError, setAsgError] = useState('')
  const [showRevoked, setShowRevoked] = useState(false)
  const [asgQ, setAsgQ] = useState('')
  const [revoking, setRevoking] = useState(null)
  const [revokeBusy, setRevokeBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const list = await apiGet('/api/igcsc/students?role=student')
        if (alive) setStudents(Array.isArray(list) ? list : [])
      } catch (e) {
        if (alive) setStudentsError(e.message)
      } finally {
        if (alive) setStudentsLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setPaperSearch(paperQ.trim()), 300)
    return () => clearTimeout(t)
  }, [paperQ])

  // Only the newest request may write: a slow page-1 answer must not land on
  // top of the filter the tutor has since chosen.
  const paperSeq = useRef(0)
  const loadPapers = useCallback(async (page) => {
    const my = ++paperSeq.current
    setPapersLoading(true)
    setPapersError('')
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (curriculum) qs.set('curriculum', curriculum)
      if (subject) qs.set('subject', subject)
      if (paperSearch) qs.set('q', paperSearch)
      if (sale) qs.set('status', sale)
      if (format) qs.set('format', format)
      const data = await apiGet(`/api/igcsc/admin/papers?${qs.toString()}`)
      if (my !== paperSeq.current) return
      const list = Array.isArray(data?.papers) ? data.papers : []
      setPapers((prev) => {
        if (page <= 1) return list
        const seen = new Set(prev.map((p) => p._id))
        return [...prev, ...list.filter((p) => !seen.has(p._id))]
      })
      setPaperMeta({ total: data?.total || 0, page: data?.page || page, pages: data?.pages || 1 })
      if (Array.isArray(data?.facets)) setFacets(data.facets)
    } catch (e) {
      if (my === paperSeq.current) setPapersError(e.message)
    } finally {
      if (my === paperSeq.current) setPapersLoading(false)
    }
  }, [curriculum, subject, paperSearch, sale, format])

  useEffect(() => { loadPapers(1) }, [loadPapers])

  const loadAssignments = useCallback(async () => {
    setAsgLoading(true)
    try {
      const data = await apiGet(`/api/igcsc/paper-assignments${showRevoked ? '?all=1' : ''}`)
      setAssignments(Array.isArray(data?.assignments) ? data.assignments : [])
      setAsgError('')
    } catch (e) {
      setAsgError(e.message)
    } finally {
      setAsgLoading(false)
    }
  }, [showRevoked])

  useEffect(() => { loadAssignments() }, [loadAssignments])

  const shownStudents = useMemo(() => {
    const n = studentQ.trim().toLowerCase()
    if (!n) return students
    return students.filter((s) => `${s.name || ''} ${s.email || ''} ${s.yearGroup || ''}`.toLowerCase().includes(n))
  }, [students, studentQ])

  const subjects = useMemo(
    () => (facets.find((f) => f.curriculum === curriculum)?.subjects || []),
    [facets, curriculum],
  )

  const shownAssignments = useMemo(() => {
    const n = asgQ.trim().toLowerCase()
    if (!n) return assignments
    return assignments.filter((a) =>
      `${a.student?.name || ''} ${a.student?.email || ''} ${a.paper?.title || ''} ${a.paper?.unit || ''}`.toLowerCase().includes(n))
  }, [assignments, asgQ])

  const asgStats = useMemo(() => {
    const live = assignments.filter((a) => !a.revokedAt)
    return {
      active: live.length,
      overdue: live.filter(isOverdue).length,
      done: live.filter((a) => a.latestAttempt?.status === 'completed').length,
    }
  }, [assignments])

  const toggleStudent = useCallback((s) => {
    setPickedStudents((prev) => {
      const next = { ...prev }
      if (next[s._id]) delete next[s._id]
      else next[s._id] = { name: s.name || s.email || 'Student', email: s.email || '' }
      return next
    })
  }, [])

  const togglePaper = useCallback((p) => {
    setPickedPapers((prev) => {
      const next = { ...prev }
      if (next[p._id]) delete next[p._id]
      else next[p._id] = { title: p.title || 'Paper', unit: p.unit || '', isPublished: !!p.isPublished }
      return next
    })
  }, [])

  const closeRevoke = useCallback(() => setRevoking(null), [])

  const studentIds = Object.keys(pickedStudents)
  const paperIds = Object.keys(pickedPapers)
  const offSale = Object.values(pickedPapers).filter((p) => !p.isPublished).length

  // A suspended student cannot be given work - select-all leaves them out,
  // as the row button does.
  const pickableStudents = shownStudents.filter((s) => s.isActive !== false)
  const allStudentsShownPicked = pickableStudents.length > 0 && pickableStudents.every((s) => pickedStudents[s._id])
  const toggleAllStudents = () => {
    setPickedStudents((prev) => {
      const next = { ...prev }
      if (allStudentsShownPicked) pickableStudents.forEach((s) => { delete next[s._id] })
      else pickableStudents.forEach((s) => { next[s._id] = { name: s.name || s.email || 'Student', email: s.email || '' } })
      return next
    })
  }

  const allPapersShownPicked = papers.length > 0 && papers.every((p) => pickedPapers[p._id])
  const toggleAllPapers = () => {
    setPickedPapers((prev) => {
      const next = { ...prev }
      if (allPapersShownPicked) papers.forEach((p) => { delete next[p._id] })
      else papers.forEach((p) => { next[p._id] = { title: p.title || 'Paper', unit: p.unit || '', isPublished: !!p.isPublished } })
      return next
    })
  }

  const unpickStudent = (id) => setPickedStudents((prev) => {
    const next = { ...prev }
    delete next[id]
    return next
  })
  const unpickPaper = (id) => setPickedPapers((prev) => {
    const next = { ...prev }
    delete next[id]
    return next
  })

  const assign = async () => {
    if (!studentIds.length || !paperIds.length || assigning) return
    setAssigning(true)
    setFlash(null)
    const base = { dueAt: dueIso(due), note: note.trim().slice(0, NOTE_MAX) }
    let done = 0
    try {
      for (const s of chunk(studentIds, BATCH)) {
        for (const p of chunk(paperIds, BATCH)) {
          const res = await apiSend('/api/igcsc/paper-assignments', 'POST', { ...base, studentIds: s, paperIds: p })
          done += Number(res?.assigned) || 0
        }
      }
      setFlash({
        tone: 'green',
        text: `Assigned ${plural(paperIds.length, 'paper')} to ${plural(studentIds.length, 'student')}. They will find ${paperIds.length === 1 ? 'it' : 'them'} under My Tests.`,
      })
      // The class usually gets the next set too, so the students stay picked.
      setPickedPapers({})
      loadAssignments()
    } catch (e) {
      // Assigning is an upsert, so trying again after a partial failure is safe.
      setFlash({ tone: 'red', text: done ? `${plural(done, 'assignment')} made, then this went wrong: ${e.message} Try again to finish.` : e.message })
      if (done) loadAssignments()
    } finally {
      setAssigning(false)
    }
  }

  const revoke = async () => {
    const target = revoking
    if (!target) return
    setRevokeBusy(true)
    try {
      await apiSend(`/api/igcsc/paper-assignments?id=${encodeURIComponent(target._id)}`, 'DELETE')
      setFlash({ tone: 'green', text: `${target.paper?.title || 'The paper'} is no longer assigned to ${target.student?.name || 'that student'}.` })
      setRevoking(null)
      loadAssignments()
    } catch (e) {
      setFlash({ tone: 'red', text: e.message })
      setRevoking(null)
    } finally {
      setRevokeBusy(false)
    }
  }

  const pickedStudentList = Object.entries(pickedStudents)
  const pickedPaperList = Object.entries(pickedPapers)
  const canAssign = studentIds.length > 0 && paperIds.length > 0 && !assigning
  const assignLabel = studentIds.length && paperIds.length
    ? `Assign ${plural(paperIds.length, 'paper')} to ${plural(studentIds.length, 'student')}`
    : 'Assign papers'

  return (
    <div>
      <PageHeader
        title="Assigned"
        subtitle="Every paper you have given students, and how they did. To give one paper, open it in the Question Bank and press Assign; to give many papers to many students at once, use the form below."
        actions={(
          <Link href="/igcsc/grading" className={BTN_SECONDARY}>
            <FiCheckSquare size={15} /> Marking queue
          </Link>
        )}
      />

      {flash && (
        <div className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${flash.tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <span className="flex min-w-0 items-start gap-2">
            {flash.tone === 'green' ? <FiCheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <FiAlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
            <span className="min-w-0 break-words">{flash.text}</span>
          </span>
          <button type="button" onClick={() => setFlash(null)} className="flex-shrink-0 rounded-lg p-1 transition hover:bg-white/60" aria-label="Dismiss">
            <FiX size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1 · Students */}
        <Card
          title={<span className="flex items-center gap-2"><FiUsers size={15} className="text-indigo-500" /> 1 · Students</span>}
          action={studentIds.length ? <Badge tone="indigo">{studentIds.length} chosen</Badge> : null}
        >
          <div className="space-y-3 border-b border-slate-100 p-4">
            <SearchBox value={studentQ} onChange={setStudentQ} placeholder="Search by name, email or year" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={toggleAllStudents}
                disabled={!shownStudents.length}
                className="font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:text-slate-300"
              >
                {allStudentsShownPicked ? 'Unselect' : 'Select'} {studentQ.trim() ? 'these' : 'all'} ({shownStudents.length})
              </button>
              {studentIds.length > 0 && (
                <button type="button" onClick={() => setPickedStudents({})} className="font-semibold text-slate-500 transition hover:text-slate-700">
                  Clear selection
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[440px] divide-y divide-slate-50 overflow-y-auto">
            {studentsLoading ? (
              <Loading label="Loading students…" />
            ) : studentsError ? (
              <div className="p-4"><ErrorState message={studentsError} /></div>
            ) : shownStudents.length === 0 ? (
              <EmptyState
                icon={FiUsers}
                title={students.length ? 'No student matches that search' : 'No students yet'}
                hint={students.length ? 'Try part of their name or email.' : 'Students appear here once they sign up or an admin adds them.'}
              />
            ) : (
              shownStudents.map((s) => (
                <StudentRow key={s._id} s={s} picked={!!pickedStudents[s._id]} onToggle={toggleStudent} />
              ))
            )}
          </div>
        </Card>

        {/* 2 · Papers */}
        <Card
          title={<span className="flex items-center gap-2"><FiFileText size={15} className="text-indigo-500" /> 2 · Papers</span>}
          action={paperIds.length ? <Badge tone="indigo">{paperIds.length} chosen</Badge> : null}
        >
          <div className="space-y-3 border-b border-slate-100 p-4">
            <SearchBox value={paperQ} onChange={setPaperQ} placeholder="Search title, unit or topic" />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={curriculum}
                onChange={(e) => { setCurriculum(e.target.value); setSubject('') }}
                className={INPUT}
                aria-label="Curriculum"
              >
                <option value="">All curricula</option>
                {facets.map((f) => <option key={f.curriculum} value={f.curriculum}>{f.curriculum}</option>)}
              </select>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!curriculum}
                className={INPUT}
                aria-label="Subject"
              >
                <option value="">{curriculum ? 'All subjects' : 'Pick a curriculum'}</option>
                {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.subject} ({s.papers})</option>)}
              </select>
              <select value={sale} onChange={(e) => setSale(e.target.value)} className={INPUT} aria-label="On sale">
                {SALE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className={INPUT} aria-label="Format">
                {FORMAT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={toggleAllPapers}
                disabled={!papers.length}
                className="font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:text-slate-300"
              >
                {allPapersShownPicked ? 'Unselect' : 'Select'} the {papers.length} shown
              </button>
              <span className="text-slate-400">{paperMeta.total} matching</span>
              {paperIds.length > 0 && (
                <button type="button" onClick={() => setPickedPapers({})} className="font-semibold text-slate-500 transition hover:text-slate-700">
                  Clear selection
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[440px] divide-y divide-slate-50 overflow-y-auto">
            {papersLoading && papers.length === 0 ? (
              <Loading label="Loading papers…" />
            ) : papersError && papers.length === 0 ? (
              <div className="p-4"><ErrorState message={papersError} /></div>
            ) : papers.length === 0 ? (
              <EmptyState
                icon={FiFileText}
                title="No papers match"
                hint={facets.length ? 'Clear the search or pick another subject.' : 'An admin needs to sync the catalogue in Store & Pricing first.'}
              />
            ) : (
              <>
                {papers.map((p) => (
                  <PaperRow key={p._id} p={p} picked={!!pickedPapers[p._id]} onToggle={togglePaper} />
                ))}
                {papersError && <div className="p-4"><ErrorState message={papersError} /></div>}
                {paperMeta.page < paperMeta.pages && (
                  <div className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => loadPapers(paperMeta.page + 1)}
                      disabled={papersLoading}
                      className={BTN_SECONDARY}
                    >
                      {papersLoading ? <FiLoader className="animate-spin" size={14} /> : null}
                      Load more ({paperMeta.total - papers.length} left)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 3 · Assign */}
      <Card className="mt-6" title={<span className="flex items-center gap-2"><FiSend size={15} className="text-indigo-500" /> 3 · Due date and note</span>}>
        <div className="space-y-5 p-5">
          {(pickedStudentList.length > 0 || pickedPaperList.length > 0) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Students</p>
                <div className="flex flex-wrap gap-1.5">
                  {pickedStudentList.length === 0 && <span className="text-xs text-slate-400">None chosen yet</span>}
                  {pickedStudentList.slice(0, CHIPS_SHOWN).map(([id, s]) => (
                    <Chip key={id} label={s.name} onRemove={() => unpickStudent(id)} />
                  ))}
                  {pickedStudentList.length > CHIPS_SHOWN && (
                    <span className="self-center text-xs font-semibold text-slate-500">+{pickedStudentList.length - CHIPS_SHOWN} more</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Papers</p>
                <div className="flex flex-wrap gap-1.5">
                  {pickedPaperList.length === 0 && <span className="text-xs text-slate-400">None chosen yet</span>}
                  {pickedPaperList.slice(0, CHIPS_SHOWN).map(([id, p]) => (
                    <Chip key={id} label={p.unit ? `${p.title} · ${p.unit}` : p.title} onRemove={() => unpickPaper(id)} />
                  ))}
                  {pickedPaperList.length > CHIPS_SHOWN && (
                    <span className="self-center text-xs font-semibold text-slate-500">+{pickedPaperList.length - CHIPS_SHOWN} more</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <FiCalendar size={13} /> Due date <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input type="date" value={due} min={todayInput()} onChange={(e) => setDue(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5"><FiMessageSquare size={13} /> Note for the students <span className="font-normal text-slate-400">(optional)</span></span>
                <span className="font-normal text-slate-400">{note.length}/{NOTE_MAX}</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                rows={2}
                maxLength={NOTE_MAX}
                placeholder="e.g. Do Section A in one sitting, then upload Section B by Friday."
                className={`${INPUT} resize-y`}
              />
            </label>
          </div>

          {offSale > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
              <FiAlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              {offSale === 1 ? 'One of these papers is' : `${offSale} of these papers are`} not on sale. Assigned students can still open {offSale === 1 ? 'it' : 'them'}.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {studentIds.length && paperIds.length
                ? `${studentIds.length * paperIds.length} assignment${studentIds.length * paperIds.length === 1 ? '' : 's'}. Assigning a paper a student already has updates its due date and note.`
                : 'Choose at least one student and one paper.'}
            </p>
            <button type="button" onClick={assign} disabled={!canAssign} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
              {assigning ? <FiLoader className="animate-spin" size={15} /> : <FiSend size={15} />}
              {assigning ? 'Assigning…' : assignLabel}
            </button>
          </div>
        </div>
      </Card>

      {/* Current assignments */}
      <Card
        className="mt-8"
        title="Current assignments"
        action={(
          <button type="button" onClick={loadAssignments} disabled={asgLoading} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50" aria-label="Refresh">
            <FiRefreshCw size={15} className={asgLoading ? 'animate-spin' : ''} />
          </button>
        )}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{asgStats.active} active</span>
            <span className={`rounded-full px-3 py-1 ${asgStats.overdue ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{asgStats.overdue} overdue</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{asgStats.done} marked</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="sm:w-64"><SearchBox value={asgQ} onChange={setAsgQ} placeholder="Search student or paper" /></div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showRevoked}
                onChange={(e) => setShowRevoked(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
              />
              Show revoked
            </label>
          </div>
        </div>

        {asgLoading && assignments.length === 0 ? (
          <Loading label="Loading assignments…" />
        ) : asgError && assignments.length === 0 ? (
          <div className="p-4"><ErrorState message={asgError} /></div>
        ) : shownAssignments.length === 0 ? (
          <EmptyState
            icon={FiInbox}
            title={assignments.length ? 'Nothing matches that search' : 'No papers assigned yet'}
            hint={assignments.length ? 'Try a student name or a paper title.' : 'Assignments you make above show up here with each student\'s progress.'}
          />
        ) : (
          <>
            {asgError && <div className="px-4 pt-4"><ErrorState message={asgError} /></div>}
            <div className="divide-y divide-slate-100 md:hidden">
              {shownAssignments.map((a) => <AssignmentCard key={a._id} a={a} onRevoke={setRevoking} />)}
            </div>
            <div className="hidden md:block">
              <Table
                columns={[
                  { label: 'Student' },
                  { label: 'Paper' },
                  { label: 'Due' },
                  { label: 'Latest attempt' },
                  { label: 'Assigned' },
                  { label: '', align: 'right' },
                ]}
              >
                {shownAssignments.map((a) => <AssignmentRow key={a._id} a={a} onRevoke={setRevoking} />)}
              </Table>
            </div>
            {assignments.length >= 300 && (
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">Showing the 300 most recent assignments.</p>
            )}
          </>
        )}
      </Card>

      {revoking && (
        <ConfirmDialog
          title="Revoke this assignment?"
          confirmLabel="Revoke"
          danger
          busy={revokeBusy}
          onConfirm={revoke}
          onCancel={closeRevoke}
        >
          <strong className="text-slate-800">{revoking.student?.name || 'This student'}</strong> will no longer be able to open{' '}
          <strong className="text-slate-800">{revoking.paper?.title || 'this paper'}</strong> through this assignment, unless they
          bought it themselves. Anything they have already handed in is kept. You can assign it again at any time.
        </ConfirmDialog>
      )}
    </div>
  )
}
