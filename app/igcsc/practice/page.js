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
        <PageHeader eyebrow="Practice" title="Practice" subtitle="Pick what you want to work on and answer questions from the bank." />
        {error && <div className="mb-4"><ErrorState message={error} /></div>}
        {loading && !facets ? <Loading label="Loading the question bank…" /> : (
          <div className="max-w-2xl space-y-4 border border-line bg-surface p-6">
            <Select label="Curriculum" value={pick.curriculum} onChange={(v) => choose({ curriculum: v })}
              options={facets?.curricula || []} anyLabel="Any curriculum" />
            <Select label="Subject" value={pick.subject} onChange={(v) => choose({ subject: v })}
              options={facets?.subjects || []} anyLabel="Any subject" />
            <Select label="Topic" value={pick.topic} onChange={(v) => choose({ topic: v })}
              options={facets?.topics || []} anyLabel="Any topic" />
            <Select label="Difficulty" value={pick.difficulty} onChange={(v) => choose({ difficulty: v })}
              options={facets?.difficulties || []} anyLabel="Any difficulty" />

            <div>
              <label className="mb-1.5 block font-code text-[11px] uppercase tracking-[0.12em] text-muted">How many questions</label>
              <div className="flex gap-2">
                {COUNTS.map((c) => (
                  <button key={c} onClick={() => setPick({ ...pick, count: c })}
                    className={`px-4 py-2 font-code text-sm tabular-nums transition-colors ${pick.count === c ? 'bg-cta text-on-cta' : 'border border-line text-muted hover:border-ink hover:text-ink'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-sm text-muted">
                {facets?.available != null
                  ? <><span className="font-code font-semibold tabular-nums text-ink">{facets.available.toLocaleString()}</span> questions match</>
                  : ''}
              </p>
              <button onClick={start} disabled={busy}
                className="flex h-11 items-center gap-2 bg-cta px-5 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover disabled:opacity-60">
                {busy ? <><FiLoader className="animate-spin" size={15} /> Starting…</> : <><FiPlay size={15} /> Start practice</>}
              </button>
            </div>
            <p className="font-code text-[11px] text-subtle">
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
            <p className="font-code text-[12px] uppercase tracking-[0.08em] text-ink">Question {idx + 1} of {questions.length}</p>
            <p className="text-xs text-muted">{[q.topic, q.subtopic].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex items-center gap-2">
            {q.difficulty && <Badge tone={q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Hard' ? 'red' : 'amber'}>{q.difficulty}</Badge>}
            <span className="font-code text-[11px] tabular-nums text-muted">{answered}/{questions.length} answered</span>
          </div>
        </div>

        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="border border-line bg-surface p-6">
          <div className="text-[15px] leading-relaxed text-ink">{renderMath(String(q.questionText || ''))}</div>
          {q.questionImage && <img src={q.questionImage} alt="" className="mt-4 max-h-96 max-w-full border border-line" />}

          <div className="mt-5 space-y-2">
            {opts.map((L) => {
              const chosen = answers[q._id] === L
              return (
                <button key={L} onClick={() => setAnswers((a) => ({ ...a, [q._id]: chosen ? '' : L }))}
                  className={`flex w-full items-start gap-3 border p-3 text-left transition-colors ${chosen ? 'border-brand bg-brand-50' : 'border-line hover:border-line-strong hover:bg-ink/5'}`}>
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-code text-xs font-semibold ${chosen ? 'bg-brand text-on-brand' : 'bg-sunken text-ink-2'}`}>{L}</span>
                  <span className="text-sm text-ink-2">{renderMath(String(q.options[L]))}</span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <div className="mt-4"><ErrorState message={error} /></div>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
            className="flex items-center gap-1.5 border border-line-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:opacity-40">
            <FiChevronLeft size={15} /> Previous
          </button>
          {idx < questions.length - 1 ? (
            <button onClick={() => setIdx((i) => i + 1)}
              className="flex items-center gap-1.5 bg-cta px-4 py-2 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover">
              Next <FiChevronRight size={15} />
            </button>
          ) : (
            <button onClick={submit} disabled={busy}
              className="flex items-center gap-1.5 bg-brand px-5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-60">
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
      <div className="mb-5 border border-line bg-surface p-6 text-center">
        <p className="font-code text-[11px] uppercase tracking-[0.12em] text-muted">Your result</p>
        <p className="display mt-2 text-[56px] leading-none text-ink">{result?.percentage}<span className="text-[32px]">%</span></p>
        <p className="mt-2 text-sm text-muted">
          <span className="font-code tabular-nums">{result?.correct} of {result?.total}</span> correct · Grade <span className="font-code font-semibold text-ink">{result?.grade}</span>
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button onClick={() => { setStage('setup'); setResult(null) }}
            className="bg-cta px-4 py-2 text-sm font-medium text-on-cta transition-colors hover:bg-cta-hover">
            Practise again
          </button>
          <button onClick={() => router.push('/igcsc/my-results')}
            className="border border-line-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5">
            See all my results
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(result?.responses || []).map((r, i) => {
          const q = byId.get(String(r.questionId))
          return (
            <div key={i} className={`border border-l-2 p-4 ${r.isCorrect ? 'border-line border-l-positive bg-positive/5' : 'border-line border-l-negative bg-negative/5'}`}>
              <div className="mb-2 flex items-center gap-2">
                {r.isCorrect ? <FiCheckCircle className="text-positive" size={16} /> : <FiXCircle className="text-negative" size={16} />}
                <span className="font-code text-[11px] uppercase tracking-[0.08em] text-ink-2">Question {i + 1}</span>
                {r.topic && <span className="text-xs text-subtle">· {r.topic}</span>}
              </div>
              {q && <div className="text-sm text-ink">{renderMath(String(q.questionText || ''))}</div>}
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
                <span className="text-muted">
                  Your answer: <span className={`font-code font-semibold ${r.isCorrect ? 'text-positive' : 'text-negative'}`}>{r.selectedAnswer || '—'}</span>
                </span>
                {!r.isCorrect && (
                  <span className="text-muted">Correct: <span className="font-code font-semibold text-positive">{r.correctAnswer}</span></span>
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
      <label className="mb-1.5 block font-code text-[11px] uppercase tracking-[0.12em] text-muted">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink">
        <option value="">{anyLabel}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
