'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiEdit3, FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle, FiLoader, FiPlay } from 'react-icons/fi'
import { apiGet, apiSend } from '../_components/api'
import { PageHeader, Loading, EmptyState, ErrorState, Badge } from '../_components/ui'
import { renderContent as renderMath } from '../../components/admin/LatexRenderer'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const COUNTS = [5, 10, 20, 30]

export default function IgcscPracticePage() {
  const router = useRouter()
  const [stage, setStage] = useState('setup')     // setup | attempt | result
  const [facets, setFacets] = useState(null)
  const [pick, setPick] = useState({ curriculum: '', subject: '', topic: '', difficulty: '', count: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})       // qid -> letter
  const [idx, setIdx] = useState(0)
  const [startedAt, setStartedAt] = useState(null)
  const [result, setResult] = useState(null)

  const loadFacets = useCallback(async (sel) => {
    setLoading(true); setError('')
    try {
      const p = new URLSearchParams()
      if (sel?.curriculum) p.set('curriculum', sel.curriculum)
      if (sel?.subject) p.set('subject', sel.subject)
      const res = await apiGet(`/api/igcsc/practice?${p.toString()}`)
      setFacets(res)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadFacets(pick) }, [loadFacets]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (patch) => {
    const next = { ...pick, ...patch }
    // Narrowing the curriculum invalidates a subject chosen under the old one.
    if (patch.curriculum !== undefined) { next.subject = ''; next.topic = '' }
    if (patch.subject !== undefined) next.topic = ''
    setPick(next)
    if (patch.curriculum !== undefined || patch.subject !== undefined) loadFacets(next)
  }

  const start = async () => {
    setBusy(true); setError('')
    try {
      const res = await apiSend('/api/igcsc/practice', 'POST', pick)
      setSessionId(res.sessionId)
      setQuestions(res.questions || [])
      setAnswers({})
      setIdx(0)
      setStartedAt(Date.now())
      setStage('attempt')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
      const per = questions.length ? Math.round(elapsed / questions.length) : 0
      const res = await apiSend('/api/igcsc/practice', 'PATCH', {
        sessionId,
        responses: questions.map((q) => ({
          questionId: q._id,
          selectedAnswer: answers[q._id] || '',
          timeSpent: per,
        })),
      })
      setResult(res)
      setStage('result')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const answered = useMemo(() => Object.values(answers).filter(Boolean).length, [answers])

  /* ─────────────────────────── setup ─────────────────────────── */
  if (stage === 'setup') {
    return (
      <div>
        <PageHeader title="Practice" subtitle="Pick what you want to work on and answer questions from the bank." />
        {error && <div className="mb-4"><ErrorState message={error} /></div>}
        {loading && !facets ? <Loading label="Loading the question bank…" /> : (
          <div className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <Select label="Curriculum" value={pick.curriculum} onChange={(v) => choose({ curriculum: v })}
              options={facets?.curricula || []} anyLabel="Any curriculum" />
            <Select label="Subject" value={pick.subject} onChange={(v) => choose({ subject: v })}
              options={facets?.subjects || []} anyLabel="Any subject" />
            <Select label="Topic" value={pick.topic} onChange={(v) => choose({ topic: v })}
              options={facets?.topics || []} anyLabel="Any topic" />
            <Select label="Difficulty" value={pick.difficulty} onChange={(v) => choose({ difficulty: v })}
              options={facets?.difficulties || []} anyLabel="Any difficulty" />

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">How many questions</label>
              <div className="flex gap-2">
                {COUNTS.map((c) => (
                  <button key={c} onClick={() => setPick({ ...pick, count: c })}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${pick.count === c ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                {facets?.available != null
                  ? <><span className="font-bold text-slate-700">{facets.available.toLocaleString()}</span> questions match</>
                  : ''}
              </p>
              <button onClick={start} disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {busy ? <><FiLoader className="animate-spin" size={15} /> Starting…</> : <><FiPlay size={15} /> Start practice</>}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Only multiple-choice questions can be marked automatically, so that is what practice serves.
            </p>
          </div>
        )}
      </div>
    )
  }

  /* ────────────────────────── attempt ────────────────────────── */
  if (stage === 'attempt') {
    const q = questions[idx]
    if (!q) return <EmptyState icon={FiEdit3} title="Nothing to answer" />
    const opts = LETTERS.filter((L) => q.options?.[L] && String(q.options[L]).trim())
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Question {idx + 1} of {questions.length}</p>
            <p className="text-xs text-slate-500">{[q.topic, q.subtopic].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex items-center gap-2">
            {q.difficulty && <Badge tone={q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Hard' ? 'red' : 'amber'}>{q.difficulty}</Badge>}
            <span className="text-xs font-semibold text-slate-500">{answered}/{questions.length} answered</span>
          </div>
        </div>

        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-[15px] leading-relaxed text-slate-800">{renderMath(String(q.questionText || ''))}</div>
          {q.questionImage && <img src={q.questionImage} alt="" className="mt-4 max-h-96 max-w-full rounded-lg border border-slate-200" />}

          <div className="mt-5 space-y-2">
            {opts.map((L) => {
              const chosen = answers[q._id] === L
              return (
                <button key={L} onClick={() => setAnswers((a) => ({ ...a, [q._id]: chosen ? '' : L }))}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${chosen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${chosen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{L}</span>
                  <span className="text-sm text-slate-700">{renderMath(String(q.options[L]))}</span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="mt-4"><ErrorState message={error} /></div>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            <FiChevronLeft size={15} /> Previous
          </button>
          {idx < questions.length - 1 ? (
            <button onClick={() => setIdx((i) => i + 1)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Next <FiChevronRight size={15} />
            </button>
          ) : (
            <button onClick={submit} disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? <><FiLoader className="animate-spin" size={15} /> Submitting…</> : 'Submit answers'}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ─────────────────────────── result ────────────────────────── */
  const byId = new Map(questions.map((q) => [q._id, q]))
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your result</p>
        <p className="mt-1 text-5xl font-extrabold text-slate-900">{result?.percentage}%</p>
        <p className="mt-1 text-sm text-slate-500">
          {result?.correct} of {result?.total} correct · Grade <span className="font-bold text-slate-700">{result?.grade}</span>
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button onClick={() => { setStage('setup'); setResult(null) }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Practise again
          </button>
          <button onClick={() => router.push('/igcsc/my-results')}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            See all my results
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(result?.responses || []).map((r, i) => {
          const q = byId.get(String(r.questionId))
          return (
            <div key={i} className={`rounded-xl border p-4 ${r.isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}>
              <div className="mb-2 flex items-center gap-2">
                {r.isCorrect ? <FiCheckCircle className="text-emerald-600" size={16} /> : <FiXCircle className="text-rose-600" size={16} />}
                <span className="text-xs font-bold text-slate-600">Question {i + 1}</span>
                {r.topic && <span className="text-xs text-slate-400">· {r.topic}</span>}
              </div>
              {q && <div className="text-sm text-slate-800">{renderMath(String(q.questionText || ''))}</div>}
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
                <span className="text-slate-500">
                  Your answer: <span className={`font-bold ${r.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{r.selectedAnswer || '—'}</span>
                </span>
                {!r.isCorrect && (
                  <span className="text-slate-500">Correct: <span className="font-bold text-emerald-700">{r.correctAnswer}</span></span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Module scope: a component declared inside the page would remount on every
// keystroke and steal focus.
function Select({ label, value, onChange, options, anyLabel }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none">
        <option value="">{anyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
