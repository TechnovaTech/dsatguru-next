'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiEye, FiEyeOff, FiPrinter, FiChevronLeft, FiBookOpen, FiFileText, FiLayers,
} from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, EmptyState, ErrorState, Badge } from '../_components/ui'
import ExamPaper from '../_components/ExamPaper'
// Same KaTeX renderer the bank browser uses, so $..$ math renders in the paper.
import { renderContent as renderMath } from '../../components/admin/LatexRenderer'

// Shown in the printed PDF footer and as the document title while printing,
// so the browser's PDF header/filename carries the site branding + IGCSE.
const PDF_BRAND = 'Best SAT Preparation Online | Digital SAT Exam Prep | IGCSE'

const CURRICULUM_TONE = {
  IGCSE: 'indigo', IBDP: 'violet', 'A-Level': 'blue', 'US Curriculum': 'green', Competition: 'amber', Other: 'slate',
}

// A sourceFolder is the raw export path of one worksheet ("01_IGCSE Physics/
// Cambridge/Motion, Forces & Energy/(MCQ) Easy"). Prettify it for display.
function folderLabel(folder, topic, subtopic) {
  const segs = String(folder || '')
    .split('/')
    .map((s) => s.replace(/^\d+[_.)\s-]*/, '').trim())
    .filter(Boolean)
  if (segs.length) return segs.slice(-2).join(' — ')
  return [topic, subtopic].filter(Boolean).join(' — ') || 'General'
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export default function ExamPaperPage() {
  const [view, setView] = useState('subjects')          // subjects | papers | paper
  const [subjects, setSubjects] = useState([])
  const [sel, setSel] = useState(null)                  // { curriculum, subject }
  const [papers, setPapers] = useState([])
  const [paperMeta, setPaperMeta] = useState(null)      // the clicked paper row
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)
  // Guards against a slow earlier fetch overwriting a newer view's data
  // (e.g. open paper A, go back, open paper B, then A's response lands last).
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

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const res = await apiGet('/api/igcsc/exam-papers?mode=subjects')
        setSubjects(res.subjects || [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const openSubject = async (s) => {
    const seq = ++reqSeq.current
    setSel(s); setView('papers'); setLoading(true); setError(''); setPapers([])
    try {
      const p = new URLSearchParams({ mode: 'papers', curriculum: s.curriculum, subject: s.subject })
      const res = await apiGet(`/api/igcsc/exam-papers?${p.toString()}`)
      if (seq !== reqSeq.current) return
      setPapers(res.papers || [])
    } catch (e) { if (seq === reqSeq.current) setError(e.message) }
    finally { if (seq === reqSeq.current) setLoading(false) }
  }

  const openPaper = async (p) => {
    const seq = ++reqSeq.current
    setPaperMeta(p); setView('paper'); setLoading(true); setError(''); setItems([]); setShowAnswers(false)
    try {
      const q = new URLSearchParams({ mode: 'paper', curriculum: sel.curriculum, subject: sel.subject, folder: p.folder })
      const res = await apiGet(`/api/igcsc/exam-papers?${q.toString()}`)
      if (seq !== reqSeq.current) return
      setItems(res.items || [])
    } catch (e) { if (seq === reqSeq.current) setError(e.message) }
    finally { if (seq === reqSeq.current) setLoading(false) }
  }

  // Build the printable paper object from the raw bank questions.
  const paper = useMemo(() => {
    if (view !== 'paper' || !sel || !paperMeta) return null
    const totalMarks = items.reduce((a, q) => a + (Number(q.marks) || (q.isMCQ ? 1 : 0)), 0)
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

  const back = () => {
    ++reqSeq.current                       // drop any in-flight response
    setError(''); setLoading(false)
    if (view === 'paper') { setView('papers'); setItems([]); setPaperMeta(null) }
    else if (view === 'papers') { setView('subjects'); setPapers([]); setSel(null) }
  }

  /* ============================ Subjects view ============================ */
  if (view === 'subjects') {
    return (
      <div>
        <PageHeader title="Exam Paper" subtitle="Pick a subject, then a paper — every paper prints as a clean IGCSC exam PDF." />
        {error && <div className="mb-4"><ErrorState message={error} /></div>}
        {loading ? <Loading label="Loading subjects…" /> : subjects.length === 0 ? (
          <EmptyState icon={FiBookOpen} title="No questions in the bank yet" hint="Import questions to generate exam papers." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <button key={`${s.curriculum}|${s.subject}`} onClick={() => openSubject(s)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <Badge tone={CURRICULUM_TONE[s.curriculum] || 'slate'}>{s.curriculum}</Badge>
                  <FiFileText className="text-slate-300" size={18} />
                </div>
                <div className="mt-3 text-lg font-extrabold text-slate-900">{s.subject}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {s.papers.toLocaleString()} papers · {s.questions.toLocaleString()} questions
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ============================= Papers view ============================= */
  if (view === 'papers') {
    return (
      <div>
        <PageHeader
          title={`${sel.curriculum} ${sel.subject}`}
          subtitle="Every paper below prints as its own exam PDF, in original paper order."
          actions={
            <button onClick={back} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <FiChevronLeft size={15} /> All subjects
            </button>
          }
        />
        {error && <div className="mb-4"><ErrorState message={error} /></div>}
        {loading ? <Loading label="Loading papers…" /> : papers.length === 0 ? (
          <EmptyState icon={FiLayers} title="No papers found" />
        ) : (
          <Card>
            <div className="divide-y divide-slate-100">
              {papers.map((p) => (
                <button key={p.n} onClick={() => openPaper(p)}
                  className="flex w-full items-center gap-4 px-2 py-3 text-left transition hover:bg-slate-50">
                  <span className="flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-extrabold text-indigo-700">P{p.n}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{folderLabel(p.folder, p.topic, p.subtopic)}</span>
                    <span className="block truncate text-xs text-slate-500">{p.course}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs font-semibold text-slate-500">{p.count} Qs</span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  /* ============================= Paper view ============================= */
  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={paper ? paper.subject : 'Exam Paper'}
          subtitle="Printable IGCSC exam paper — candidate header, instructions and answer spaces."
          actions={
            <div className="flex items-center gap-2">
              <button onClick={back} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <FiChevronLeft size={15} /> Papers
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
