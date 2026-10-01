'use client'
// The Question Bank: every paper in the bank, laid out like folders. Open a
// subject, then a folder, then a paper - print it, or hand it to students.
// This used to be the Exam Paper page; /igcsc/exam-paper now redirects here.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FiEye, FiEyeOff, FiPrinter, FiChevronLeft, FiFileText, FiSearch, FiBookOpen,
  FiSend, FiX, FiCheckCircle, FiLoader, FiAlertTriangle, FiUsers, FiCalendar, FiMessageSquare,
} from 'react-icons/fi'
import { FaFolder } from 'react-icons/fa'
import { apiGet, apiGetSafe, apiSend } from '../_components/api'
import { igcscUser } from '../_components/auth'
import { PageHeader, Loading, EmptyState, ErrorState, Badge } from '../_components/ui'
import ExamPaper from '../_components/ExamPaper'
// Same KaTeX renderer the bank browser uses, so $..$ math renders in the paper.
import { renderContent as renderMath } from '../../components/admin/LatexRenderer'
import { formatPrice } from '../../../lib/igcscStoreShared'

// Shown in the printed PDF footer and as the document title while printing,
// so the browser's PDF header/filename carries the site branding + IGCSE.
const PDF_BRAND = 'Best SAT Preparation Online | Digital SAT Exam Prep | IGCSE'

// The assignments API takes at most 50 students per request; more go in batches.
const BATCH = 50
const NOTE_MAX = 300

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white enabled:hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function pretty(seg) {
  return String(seg || '').replace(/^\d+[_.)\s-]*/, '').trim() || String(seg || '')
}

// A sourceFolder is the raw export path of one worksheet. Prettify for display.
function folderLabel(folder, topic, subtopic) {
  const segs = String(folder || '').split('/').map(pretty).filter(Boolean)
  if (segs.length) return segs.slice(-2).join(' — ')
  return [topic, subtopic].filter(Boolean).join(' — ') || 'General'
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// A paper's difficulty: the stored field when set, else the "— Easy/Medium/…"
// suffix many source folders carry.
function paperDifficulty(p) {
  if (p.difficulty) return p.difficulty
  const m = String(p.folder || '').match(/\b(Very Hard|Easy|Medium|Hard)\s*$/i)
  return m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()) : ''
}

function chunk(list, n) {
  const out = []
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n))
  return out
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

// Why a paper cannot be assigned yet, in a few words - or '' when it can.
// Assigning needs the Store's record of the paper (Sync makes it) and at least
// one question the system can mark.
function assignBlock(meta, isAdmin) {
  if (!meta) return ''
  if (!meta.paperId) return isAdmin ? 'Run Sync in Store first' : 'Ask an admin to run Sync in Store first'
  if (meta.markable === 0) return 'No question in this paper can be marked yet'
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────

// A paper's place in the Store, at a glance, on its row in the browser.
function SalePills({ p, currency }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {p.onSale ? (
        <Badge tone="green">On sale · {formatPrice(p.price, currency)}</Badge>
      ) : (
        <span title={p.paperId ? 'Students cannot buy it from the Store' : 'Not in the Store yet - run Sync in Store'}>
          <Badge tone="slate">Not on sale</Badge>
        </span>
      )}
      {p.held && (
        <span title={p.holdReason || 'Held back from sale'}><Badge tone="amber">Held</Badge></span>
      )}
    </span>
  )
}

// One plain sentence under an open paper's title: is it on sale, and for how
// much. Assigning works either way, which is worth saying when it is not.
function SaleLine({ meta, currency, isAdmin, canAssign }) {
  let text = 'Not in the Store yet.'
  if (meta.paperId && meta.onSale) {
    text = Number(meta.price) ? `On sale in the Store for ${formatPrice(meta.price, currency)}.` : 'On sale in the Store, free.'
  } else if (meta.paperId) {
    text = canAssign ? 'Not on sale in the Store - students get it only if you assign it.' : 'Not on sale in the Store.'
  }
  const reason = String(meta.holdReason || '').trim().replace(/\.+$/, '')
  return (
    <>
      {text}
      {meta.held && <span className="text-amber-700"> Held back{reason ? `: ${reason}` : ''}.</span>}
      {isAdmin && (
        <>
          {' '}
          <Link href="/igcsc/store-admin" className="font-semibold text-indigo-600 hover:underline">Change in Store</Link>
        </>
      )}
    </>
  )
}

function StudentPick({ s, picked, onToggle }) {
  const off = s.isActive === false
  return (
    <label
      title={off ? 'This account is switched off. Turn it back on in Users to give them work.' : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        off ? 'cursor-not-allowed opacity-60' : picked ? 'cursor-pointer bg-indigo-50/70' : 'cursor-pointer hover:bg-slate-50'
      }`}
    >
      <input
        type="checkbox"
        checked={picked}
        disabled={off}
        onChange={() => onToggle(s._id)}
        className="h-4 w-4 flex-shrink-0 accent-indigo-600"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{s.name || 'Unnamed student'}</span>
        <span className="block truncate text-xs text-slate-400">{s.email}</span>
      </span>
      {s.yearGroup && (
        <span className="flex-shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{s.yearGroup}</span>
      )}
      {off && <Badge tone="slate">Inactive</Badge>}
    </label>
  )
}

// Hand one paper to students: tick them, optionally set a due date and a note,
// assign. Assigning again later only updates the due date and note.
function AssignDialog({ paperId, label, onClose }) {
  const [students, setStudents] = useState(null)     // null while loading
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(() => new Set())
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(0)                // how many it went to, once it worked
  // The dialog can close (browser Back) while an assignment is still sending.
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Every student, once; the search box filters this list in the browser.
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await apiGet('/api/igcsc/students?role=student')
        if (alive) setStudents(Array.isArray(res) ? res : [])
      } catch (e) {
        if (alive) { setLoadError(e.message); setStudents([]) }
      }
    }
    load()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || busy) return
      // Escape in a search box with text in it clears the box, not the dialog.
      if (e.target?.type === 'search' && e.target.value) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const term = q.trim().toLowerCase()
  const shown = useMemo(() => (students || []).filter((s) =>
    !term || [s.name, s.email, s.yearGroup].filter(Boolean).join(' ').toLowerCase().includes(term)), [students, term])
  // A switched-off account cannot be given work - the API refuses it.
  const pickable = shown.filter((s) => s.isActive !== false)
  const allShownPicked = pickable.length > 0 && pickable.every((s) => picked.has(s._id))
  const count = picked.size

  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const toggleShown = () => setPicked((prev) => {
    const next = new Set(prev)
    for (const s of pickable) {
      if (allShownPicked) next.delete(s._id)
      else next.add(s._id)
    }
    return next
  })

  const submit = async () => {
    const ids = [...picked]
    if (!ids.length || busy) return
    setBusy(true); setError('')
    let assigned = 0
    try {
      for (const part of chunk(ids, BATCH)) {
        const r = await apiSend('/api/igcsc/paper-assignments', 'POST', {
          studentIds: part, paperIds: [paperId], dueAt: dueIso(due), note: note.trim(),
        })
        assigned += Number(r?.assigned) || part.length
      }
      if (mounted.current) setDone(assigned)
    } catch (e) {
      // Assigning is safe to repeat: nobody gets a second copy.
      if (mounted.current) {
        setError(assigned
          ? `Assigned to ${plural(assigned, 'student')}, then it stopped: ${e.message} Press Assign again to finish.`
          : e.message)
      }
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  const again = () => { setDone(0); setPicked(new Set()); setError('') }
  const dismiss = () => { if (!busy) onClose() }

  let body
  if (done) {
    body = (
      <div className="px-5 py-8 text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <FiCheckCircle size={28} />
        </span>
        <p className="mt-4 text-base font-bold text-slate-900">
          Assigned to {plural(done, 'student')} — they will find it under My Tests.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/igcsc/paper-assign" className={BTN_SECONDARY}>See all assigned work</Link>
          <button type="button" onClick={again} className={BTN_SECONDARY}>Assign to more students</button>
          <button type="button" onClick={onClose} className={BTN_PRIMARY}>Done</button>
        </div>
      </div>
    )
  } else if (students === null) {
    body = <Loading label="Loading students…" />
  } else if (loadError) {
    body = <div className="p-5"><ErrorState message={loadError} /></div>
  } else if (students.length === 0) {
    body = (
      <div className="px-5 pb-8 text-center">
        <EmptyState icon={FiUsers} title="No students yet" hint="Once you add students, you can give them this paper from here." />
        <Link href="/igcsc/users" className={BTN_PRIMARY}>Add a student first</Link>
      </div>
    )
  } else {
    body = (
      <>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-slate-600">
            Tick the students who should do this paper. It is free for them, even if it is not on sale.
          </p>
          <div className="relative mt-3">
            <FiSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or year…" className={`${INPUT} pl-8`} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button type="button" onClick={toggleShown} disabled={!pickable.length}
              className="font-semibold text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline">
              {allShownPicked ? 'Unselect all shown' : `Select all shown (${pickable.length})`}
            </button>
            <span className="text-slate-500">
              {count} selected
              {count > 0 && (
                <>
                  {' · '}
                  <button type="button" onClick={() => setPicked(new Set())} className="font-semibold text-slate-600 hover:underline">Clear</button>
                </>
              )}
            </span>
          </div>
          <div className="mt-2 max-h-[38vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {shown.map((s) => (
              <StudentPick key={s._id} s={s} picked={picked.has(s._id)} onToggle={toggle} />
            ))}
            {shown.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No student matches “{q.trim()}”.</p>
            )}
          </div>

          <label className="mt-4 block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <FiCalendar size={12} /> Due date <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input type="date" value={due} min={todayInput()} onChange={(e) => setDue(e.target.value)} className={INPUT} />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <FiMessageSquare size={12} /> Note for the students <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <span className="font-normal text-slate-400">{note.length}/{NOTE_MAX}</span>
            </span>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))} maxLength={NOTE_MAX} rows={2}
              placeholder="e.g. Finish this before Friday's class" className={`${INPUT} resize-none`} />
          </label>
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          {error && <div className="mb-3"><ErrorState message={error} /></div>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className={BTN_SECONDARY}>Cancel</button>
            <button type="button" onClick={submit} disabled={!count || busy} className={BTN_PRIMARY}>
              {busy ? <FiLoader className="animate-spin" size={15} /> : <FiSend size={15} />}
              {count ? `Assign to ${plural(count, 'student')}` : 'Tick at least one student'}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div
      className="no-print fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-title"
      onClick={dismiss}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="assign-title" className="text-lg font-bold text-slate-900">Assign to students</h2>
            <p className="mt-0.5 truncate text-sm text-slate-500" title={label}>{label}</p>
          </div>
          <button type="button" onClick={dismiss} disabled={busy} aria-label="Close"
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40">
            <FiX size={18} />
          </button>
        </div>
        {body}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const [view, setView] = useState('browse')            // browse (columns) | paper
  const [subjects, setSubjects] = useState([])
  const [sel, setSel] = useState(null)                  // { curriculum, subject }
  const [papers, setPapers] = useState([])              // flat papers of the subject
  const [path, setPath] = useState([])                  // selected folder segments
  const [colQ, setColQ] = useState({})                  // per-column search text
  const [diff, setDiff] = useState('')                  // global difficulty chip
  const [paperMeta, setPaperMeta] = useState(null)
  const [items, setItems] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingPapers, setLoadingPapers] = useState(false)
  const [loading, setLoading] = useState(false)         // paper questions fetch
  const [error, setError] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [currency, setCurrency] = useState('usd')       // the Store's, for prices
  const [isAdmin, setIsAdmin] = useState(false)         // admins get links into the Store
  // Guards against a slow earlier fetch overwriting a newer view's data.
  const reqSeq = useRef(0)

  // Allow this one page to print (site-wide print is otherwise blocked).
  useEffect(() => {
    document.documentElement.classList.add('print-mode')
    return () => document.documentElement.classList.remove('print-mode')
  }, [])

  // While a paper is open, the tab/PDF title carries the site branding + IGCSE.
  useEffect(() => {
    if (view !== 'paper') return
    const prev = document.title
    document.title = PDF_BRAND
    return () => { document.title = prev }
  }, [view])

  // Browser Back closes an open paper back to the column browser instead of
  // leaving the page. Any popped/stale {ep:'paper'} entry (Forward, or a
  // reload while a paper was open) is neutralized so it can never desync the
  // view from history.
  useEffect(() => {
    const onPop = (e) => {
      ++reqSeq.current
      setError(''); setLoading(false); setAssignOpen(false)
      if (e.state?.ep === 'paper') window.history.replaceState(null, '')
      setView('browse'); setItems([]); setPaperMeta(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    (async () => {
      setLoadingSubjects(true); setError('')
      try {
        const res = await apiGet('/api/igcsc/exam-papers?mode=subjects')
        setSubjects(res.subjects || [])
      } catch (e) { setError(e.message) } finally { setLoadingSubjects(false) }
    })()
  }, [])

  // Who is looking, and the Store's currency so prices read right. Neither is
  // worth an error on screen if it cannot be fetched.
  useEffect(() => {
    setIsAdmin(igcscUser()?.role === 'admin')
    let alive = true
    const load = async () => {
      const r = await apiGetSafe('/api/igcsc/store/plans', null)
      if (alive && r?.currency) setCurrency(r.currency)
    }
    load()
    return () => { alive = false }
  }, [])

  const openSubject = async (s) => {
    const seq = ++reqSeq.current
    // Keep the subject-search text; clear only the folder-column searches.
    setSel(s); setPath([]); setColQ((q) => ({ s: q.s || '' })); setDiff(''); setPapers([]); setLoadingPapers(true); setError('')
    try {
      const p = new URLSearchParams({ mode: 'papers', curriculum: s.curriculum, subject: s.subject })
      const res = await apiGet(`/api/igcsc/exam-papers?${p.toString()}`)
      if (seq !== reqSeq.current) return
      setPapers(res.papers || [])
    } catch (e) { if (seq === reqSeq.current) setError(e.message) }
    finally { if (seq === reqSeq.current) setLoadingPapers(false) }
  }

  const openPaper = async (p) => {
    const seq = ++reqSeq.current
    window.history.pushState({ ep: 'paper' }, '')
    setPaperMeta(p); setView('paper'); setLoading(true); setError(''); setItems([]); setShowAnswers(false); setAssignOpen(false)
    try {
      const q = new URLSearchParams({ mode: 'paper', curriculum: sel.curriculum, subject: sel.subject, folder: p.folder })
      const res = await apiGet(`/api/igcsc/exam-papers?${q.toString()}`)
      if (seq !== reqSeq.current) return
      setItems(res.items || [])
    } catch (e) { if (seq === reqSeq.current) setError(e.message) }
    finally { if (seq === reqSeq.current) setLoading(false) }
  }

  const back = () => window.history.back()

  /* ---- Folder tree of the selected subject, built from the flat papers ---- */
  const tree = useMemo(() => {
    // Null-prototype maps: a folder segment named "constructor"/"__proto__"
    // must be a plain key, never an inherited Object member.
    const mkNode = () => ({ children: Object.create(null), papers: [] })
    const root = mkNode()
    for (const p of papers) {
      const segs = String(p.folder || '').split('/').filter(Boolean)
      let node = root
      for (const s of segs) {
        node = node.children[s] || (node.children[s] = mkNode())
      }
      node.papers.push(p)
    }
    return root
  }, [papers])

  const matchDiff = (p) => !diff || paperDifficulty(p) === diff
  // Question-paper count per node under the active difficulty chip, so empty
  // branches disappear while a filter is on.
  const nodeCounts = useMemo(() => {
    const map = new Map()
    const walk = (node) => {
      let c = node.papers.filter(matchDiff).length
      for (const k of Object.keys(node.children)) c += walk(node.children[k])
      map.set(node, c)
      return c
    }
    walk(tree)
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, diff])

  const diffs = useMemo(() => {
    const order = ['Easy', 'Medium', 'Hard', 'Very Hard']
    return [...new Set(papers.map(paperDifficulty).filter(Boolean))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }, [papers])

  const totalMarksOf = (list) => list.reduce((a, q) => a + (Number(q.marks) || (q.isMCQ ? 1 : 0)), 0)

  // Build the printable paper object from the raw bank questions.
  const paper = useMemo(() => {
    if (view !== 'paper' || !sel || !paperMeta) return null
    const totalMarks = totalMarksOf(items)
    const mins = clamp(Math.round((totalMarks * 2.5) / 5) * 5 || 45, 30, 180)
    const needsCalc = /math|physic|chem/i.test(sel.subject)
    return {
      brand: 'IGCSC',
      // Subject line carries the paper number as a "P" suffix: "IGCSE Biology P1".
      subject: `${sel.curriculum} ${sel.subject} P${paperMeta.n}`,
      unit: folderLabel(paperMeta.folder, paperMeta.topic, paperMeta.subtopic),
      duration: `${mins} minutes`,
      materials: needsCalc ? 'a scientific calculator and a ruler.' : 'a blue or black pen.',
      instructions: [
        'Write your first name and last name in the boxes above.',
        'Answer ALL questions in the spaces provided.',
        'The number of marks for each question is shown in brackets [ ].',
        'Write your answers in blue or black ink.',
      ],
      footerBrand: PDF_BRAND,
      questions: items.map((q, i) => {
        // Keep each option's REAL letter (A stays A even when B is empty) so
        // the printed mark-scheme letter always points at the right choice.
        const letters = ['A', 'B', 'C', 'D', 'E'].filter((L) => q.options?.[L] && String(q.options[L]).trim())
        const isMCQ = q.isMCQ && letters.length >= 2
        const answer = [q.correctAnswer, q.answerText].filter(Boolean).join(' — ')
        return {
          n: i + 1,
          type: isMCQ ? 'mcq' : 'structured',
          marks: Number(q.marks) || (isMCQ ? 1 : 0),
          text: renderMath(String(q.questionText || '')),
          image: q.questionImage || '',
          options: isMCQ ? letters.map((L) => ({ letter: L, node: renderMath(String(q.options[L])) })) : undefined,
          lines: isMCQ ? 0 : clamp((Number(q.marks) || 2) * 2, 3, 10),
          answer: answer ? renderMath(answer) : '',
        }
      }),
    }
  }, [view, sel, paperMeta, items])

  /* ============================== Paper view ============================== */
  if (view === 'paper') {
    const block = assignBlock(paperMeta, isAdmin)
    const assignLabel = sel && paperMeta
      ? `${sel.curriculum} ${sel.subject} P${paperMeta.n} — ${folderLabel(paperMeta.folder, paperMeta.topic, paperMeta.subtopic)}`
      : ''
    return (
      <div>
        <div className="no-print">
          <PageHeader
            title={paper ? paper.subject : 'Exam Paper'}
            subtitle={paperMeta ? <SaleLine meta={paperMeta} currency={currency} isAdmin={isAdmin} canAssign={!block} /> : null}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={back} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <FiChevronLeft size={15} /> Back
                </button>
                <button onClick={() => setShowAnswers((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {showAnswers ? <><FiEyeOff size={15} /> Hide mark scheme</> : <><FiEye size={15} /> Show mark scheme</>}
                </button>
                {/* The wrapper carries the reason too: some browsers show no
                    tooltip on a disabled button. */}
                <span title={block || undefined}>
                  <button onClick={() => setAssignOpen(true)} disabled={!!block}
                    title={block || 'Give this paper to one or more students'} className={BTN_PRIMARY}>
                    <FiSend size={15} /> Assign to students
                  </button>
                </span>
                <button onClick={() => window.print()} className={BTN_SECONDARY}>
                  <FiPrinter size={15} /> Print
                </button>
              </div>
            }
          />
          {block && paperMeta && (
            <div className="-mt-3 mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <FiAlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <span>
                {!paperMeta.paperId ? (
                  isAdmin ? (
                    <>This paper is not in the Store yet, so it cannot be assigned. Run Sync in{' '}
                      <Link href="/igcsc/store-admin" className="font-semibold underline">Store</Link> first.</>
                  ) : 'This paper is not in the Store yet, so it cannot be assigned. Ask an admin to run Sync in Store first.'
                ) : 'No question in this paper can be marked yet, so it cannot be assigned. You can still print it.'}
              </span>
            </div>
          )}
        </div>
        {error && <div className="mb-4 no-print"><ErrorState message={error} /></div>}
        {loading ? <Loading label="Building paper…" /> : (!error && paper && paper.questions.length > 0) ? (
          <div className="exam-print-root">
            <ExamPaper paper={paper} showAnswers={showAnswers} />
          </div>
        ) : !error ? (
          <EmptyState icon={FiFileText} title="This paper has no questions" hint="Go back and pick another paper." />
        ) : null}
        {assignOpen && paperMeta?.paperId && !block && (
          <AssignDialog paperId={paperMeta.paperId} label={assignLabel} onClose={() => setAssignOpen(false)} />
        )}
      </div>
    )
  }

  /* =========================== Column browser =========================== */
  // Column 0 = subjects. Columns 1..path.length+1 = the folder tree.
  const setSearch = (key, v) => setColQ((s) => ({ ...s, [key]: v }))
  const term = (key) => (colQ[key] || '').trim().toLowerCase()

  const subjRows = subjects.filter((s) =>
    !term('s') || `${s.curriculum} ${s.subject}`.toLowerCase().includes(term('s')))

  // Entries of the folder node at a given path depth.
  const nodeAt = (depth) => {
    let node = tree
    for (let i = 0; i < depth; i++) {
      node = node?.children[path[i]]
      if (!node) return null
    }
    return node
  }
  const columns = []
  if (sel && !loadingPapers && papers.length > 0) {
    for (let depth = 0; depth <= path.length; depth++) {
      const node = nodeAt(depth)
      if (!node) break
      // Search text is keyed by the folder PATH, not the column position, so a
      // term typed inside folder A never filters sibling folder B's column.
      const key = 'c:' + path.slice(0, depth).join('/')
      const rows = []
      // Papers sitting directly at this node (e.g. legacy '' folders).
      for (const p of node.papers) {
        if (matchDiff(p)) rows.push({ type: 'paper', p, name: 'General' })
      }
      for (const name of Object.keys(node.children).sort((a, b) => pretty(a).localeCompare(pretty(b)))) {
        const child = node.children[name]
        const total = nodeCounts.get(child) || 0
        if (total === 0) continue
        const hasKids = Object.keys(child.children).length > 0
        const own = child.papers.filter(matchDiff)
        if (hasKids) {
          rows.push({ type: 'dir', name, count: total })
          // Rare: a folder that has subfolders AND its own questions. When it
          // is the selected segment its own papers already show as "General"
          // in the next column — don't list them twice.
          if (path[depth] !== name) {
            for (const p of own) rows.push({ type: 'paper', p, name: `${pretty(name)} (this folder)` })
          }
        } else {
          for (const p of own) rows.push({ type: 'paper', p, name: pretty(name) })
        }
      }
      const title = depth === 0 ? `${sel.curriculum} ${sel.subject}` : pretty(path[depth - 1])
      const visible = rows.filter((r) =>
        !term(key) || (r.type === 'dir' ? pretty(r.name) : r.name).toLowerCase().includes(term(key)))
      columns.push({ depth, key, title, rows: visible, total: rows.length })
      // Stop before rendering an orphaned column for a selected folder that a
      // filter has emptied (or that no longer exists after a data change).
      if (depth < path.length) {
        const selChild = node.children[path[depth]]
        if (!selChild || (nodeCounts.get(selChild) || 0) === 0) break
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Open a subject, then a folder, then a paper. Print it, or assign it to students."
      />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {/* ---- Global difficulty chips ---- */}
      {sel && diffs.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {['', ...diffs].map((d) => (
            <button key={d || 'all'} onClick={() => setDiff(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                diff === d ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {d || 'All difficulties'}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* ---- Column 0: subjects ---- */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200/80 pr-4">
          <div className="relative mb-3">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={colQ.s || ''} onChange={(e) => setSearch('s', e.target.value)}
              placeholder="Search subjects…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none" />
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {loadingSubjects ? <Loading label="Loading…" /> : subjRows.map((s) => {
              const active = sel && sel.curriculum === s.curriculum && sel.subject === s.subject
              return (
                <button key={`${s.curriculum}|${s.subject}`} onClick={() => openSubject(s)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                    active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}>
                  <FaFolder size={16} className="flex-shrink-0 text-amber-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{s.curriculum} {s.subject}</span>
                  <span className="flex-shrink-0 text-[11px] text-slate-400">{s.papers.toLocaleString()}</span>
                </button>
              )
            })}
            {!loadingSubjects && subjRows.length === 0 && (
              <EmptyState icon={FiBookOpen} title="No subjects" />
            )}
          </div>
        </div>

        {/* ---- Folder columns ---- */}
        {sel && loadingPapers && (
          <div className="w-80 flex-shrink-0"><Loading label="Loading papers…" /></div>
        )}
        {columns.map((col) => (
          <div key={col.key} className="w-80 flex-shrink-0 border-r border-slate-200/80 pr-4 last:border-r-0 last:pr-0">
            <div className="relative mb-3">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={colQ[col.key] || ''} onChange={(e) => setSearch(col.key, e.target.value)}
                placeholder={`Search in "${col.title}"…`}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none" />
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {col.rows.map((r) => r.type === 'dir' ? (
                <button key={`d${r.name}`} onClick={() => setPath([...path.slice(0, col.depth), r.name])}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                    path[col.depth] === r.name ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}>
                  <FaFolder size={16} className="flex-shrink-0 text-amber-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{pretty(r.name)}</span>
                  <span className="flex-shrink-0 text-[11px] text-slate-400">{r.count}</span>
                </button>
              ) : (
                <button key={`p${r.p.n}`} onClick={() => openPaper(r.p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:bg-emerald-50/60">
                  <FaFolder size={16} className="flex-shrink-0 text-amber-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{r.name}</span>
                    <SalePills p={r.p} currency={currency} />
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-slate-400">{r.p.count} Qs</span>
                </button>
              ))}
              {col.rows.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  {col.total === 0 ? 'Nothing here for this filter' : 'No match for this search'}
                </div>
              )}
            </div>
          </div>
        ))}

        {!sel && !loadingSubjects && (
          <div className="flex w-80 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Pick a subject to browse its papers →
          </div>
        )}
      </div>
    </div>
  )
}
