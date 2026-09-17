'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiEye, FiEyeOff, FiPrinter, FiChevronLeft, FiFileText, FiSearch, FiBookOpen,
} from 'react-icons/fi'
import { FaFolder } from 'react-icons/fa'
import { apiGet } from '../_components/api'
import { PageHeader, Loading, EmptyState, ErrorState } from '../_components/ui'
import ExamPaper from '../_components/ExamPaper'
// Same KaTeX renderer the bank browser uses, so $..$ math renders in the paper.
import { renderContent as renderMath } from '../../components/admin/LatexRenderer'

// Shown in the printed PDF footer and as the document title while printing,
// so the browser's PDF header/filename carries the site branding + IGCSE.
const PDF_BRAND = 'Best SAT Preparation Online | Digital SAT Exam Prep | IGCSE'

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

export default function ExamPaperPage() {
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
      setError(''); setLoading(false)
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
    setPaperMeta(p); setView('paper'); setLoading(true); setError(''); setItems([]); setShowAnswers(false)
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
    return (
      <div>
        <div className="no-print">
          <PageHeader
            title={paper ? paper.subject : 'Exam Paper'}
            subtitle="Printable IGCSC exam paper — candidate header, instructions and answer spaces."
            actions={
              <div className="flex items-center gap-2">
                <button onClick={back} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <FiChevronLeft size={15} /> Back
                </button>
                <button onClick={() => setShowAnswers((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {showAnswers ? <><FiEyeOff size={15} /> Hide mark scheme</> : <><FiEye size={15} /> Show mark scheme</>}
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  <FiPrinter size={15} /> Print
                </button>
              </div>
            }
          />
        </div>
        {error && <div className="mb-4 no-print"><ErrorState message={error} /></div>}
        {loading ? <Loading label="Building paper…" /> : (!error && paper && paper.questions.length > 0) ? (
          <div className="exam-print-root">
            <ExamPaper paper={paper} showAnswers={showAnswers} />
          </div>
        ) : !error ? (
          <EmptyState icon={FiFileText} title="This paper has no questions" hint="Go back and pick another paper." />
        ) : null}
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
        title="Exam Paper"
        subtitle="Browse the bank like folders — pick a subject, drill into its papers, and print any of them."
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
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{r.name}</span>
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
