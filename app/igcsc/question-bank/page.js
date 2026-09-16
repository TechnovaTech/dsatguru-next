'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  FiDatabase, FiBookOpen, FiSearch, FiChevronLeft, FiChevronRight, FiEye, FiX,
  FiCheckCircle, FiLayers, FiAward,
} from 'react-icons/fi'
import { apiGet } from '../_components/api'
import { PageHeader, Card, Loading, Badge, EmptyState, ErrorState, StatCard, Table } from '../_components/ui'
// Same KaTeX renderer the DSAT bank uses, so $..$ / $$..$$ math renders instead of
// showing raw LaTeX source.
import { renderContent as renderMath } from '../../components/admin/LatexRenderer'

const PAGE = 25
const DIFF_TONE = { Easy: 'green', Medium: 'amber', Hard: 'rose', 'Very Hard': 'rose' }
const EMPTY_F = { curriculum: '', subject: '', course: '', topic: '', difficulty: '', isMCQ: '', q: '' }

export default function QuestionBankPage() {
  const [data, setData] = useState({ items: [], total: 0, facets: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skip, setSkip] = useState(0)
  const [f, setF] = useState(EMPTY_F)
  const [term, setTerm] = useState('')
  const [preview, setPreview] = useState(null)      // question shown in the modal
  const [showAnswer, setShowAnswer] = useState(false)

  const load = useCallback(async (nextSkip = 0, filters = f) => {
    setLoading(true); setError('')
    try {
      const p = new URLSearchParams({ limit: String(PAGE), skip: String(nextSkip), facets: '1' })
      for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v)
      const res = await apiGet(`/api/igcsc/questions?${p.toString()}`)
      setData((prev) => ({ ...res, facets: res.facets || prev.facets }))
      setSkip(nextSkip)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [f])

  useEffect(() => { load(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close the preview on Escape, like the DSAT bank modal.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPreview(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const apply = (patch) => { const nf = { ...f, ...patch }; setF(nf); load(0, nf) }
  const facets = data.facets || { curricula: [], subjects: [], courses: [], topics: [], difficulties: [] }
  const rows = data.items || []
  const page = Math.floor(skip / PAGE) + 1
  const pages = Math.max(1, Math.ceil((data.total || 0) / PAGE))
  const openPreview = (q) => { setPreview(q); setShowAnswer(false) }

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Real exam questions — IGCSE, IBDP, A-Level, US Curriculum and competitions, with full mark schemes."
      />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Questions" value={(data.total || 0).toLocaleString()} icon={FiDatabase} tone="violet" hint="matching current filters" />
        <StatCard label="Curricula" value={(facets.curricula || []).length} icon={FiLayers} tone="indigo" />
        <StatCard label="Topics" value={facets.topics.length} icon={FiBookOpen} tone="blue" />
        <StatCard label="Difficulty bands" value={facets.difficulties.length} icon={FiAward} tone="emerald" />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <label className="xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') apply({ q: term }) }}
                placeholder="Search question text, topic or ID…"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </label>
          <Sel label="Curriculum" value={f.curriculum} onChange={(v) => apply({ curriculum: v, subject: '', course: '', topic: '' })} opts={facets.curricula || []} />
          <Sel label="Subject" value={f.subject} onChange={(v) => apply({ subject: v, course: '', topic: '' })} opts={facets.subjects} />
          <Sel label="Course" value={f.course} onChange={(v) => apply({ course: v, topic: '' })} opts={facets.courses || []} />
          <Sel label="Topic" value={f.topic} onChange={(v) => apply({ topic: v })} opts={facets.topics} />
          <Sel label="Difficulty" value={f.difficulty} onChange={(v) => apply({ difficulty: v })} opts={facets.difficulties} />
          <Sel label="Type" value={f.isMCQ} onChange={(v) => apply({ isMCQ: v })} opts={[{ v: 'true', l: 'MCQ' }, { v: 'false', l: 'Structured' }]} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${(data.total || 0).toLocaleString()} result${data.total === 1 ? '' : 's'}`}
          </span>
          <button
            onClick={() => { setTerm(''); setF(EMPTY_F); load(0, EMPTY_F) }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >Reset filters</button>
        </div>
      </Card>

      {/* Questions table (DSAT-style listing) */}
      <div className="mt-6">
        <Card className="!p-0">
          {loading ? <Loading label="Loading questions…" /> : (
            <Table
              columns={[
                { label: 'ID' }, { label: 'Curriculum' }, { label: 'Subject' },
                { label: 'Topic / Subtopic' }, { label: 'Difficulty' }, { label: 'Type' },
                { label: 'Marks' }, { label: 'Question' }, { label: '', align: 'right' },
              ]}
              empty={rows.length === 0 ? <EmptyState icon={FiDatabase} title="No questions found" hint="Try clearing the filters or search." /> : null}
            >
              {rows.map((q) => (
                <tr key={q._id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{q.sourceId}</td>
                  <td className="whitespace-nowrap px-4 py-3">{q.curriculum ? <Badge tone="cyan">{q.curriculum}</Badge> : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{q.subject || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[220px] truncate font-medium text-slate-800" title={q.topic}>{q.topic || '—'}</div>
                    {q.subtopic && q.subtopic !== q.topic && (
                      <div className="max-w-[220px] truncate text-xs text-slate-400" title={q.subtopic}>{q.subtopic}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {q.difficulty ? <Badge tone={DIFF_TONE[q.difficulty] || 'slate'}>{q.difficulty}</Badge> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3"><Badge tone={q.isMCQ ? 'violet' : 'slate'}>{q.isMCQ ? 'MCQ' : 'Structured'}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{q.marks > 0 ? q.marks : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[320px] truncate text-slate-600">
                      {String(q.questionText || '').replace(/\$+/g, '').replace(/\s+/g, ' ').slice(0, 90) || '(image only)'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => openPreview(q)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <FiEye /> View
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}

          {/* Pagination */}
          {!loading && rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <span className="text-xs text-slate-500">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={skip === 0}
                  onClick={() => load(Math.max(0, skip - PAGE))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:enabled:bg-slate-50"
                ><FiChevronLeft /> Prev</button>
                <button
                  disabled={page >= pages}
                  onClick={() => load(skip + PAGE)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:enabled:bg-slate-50"
                >Next <FiChevronRight /></button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Preview modal — full question, options and mark scheme with rendered maths */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {preview.curriculum && <Badge tone="cyan">{preview.curriculum}</Badge>}
                <Badge tone="blue">{preview.subject}</Badge>
                {preview.course && <Badge tone="slate">{preview.course}</Badge>}
                {preview.topic && <Badge tone="indigo">{preview.topic}</Badge>}
                {preview.difficulty && <Badge tone={DIFF_TONE[preview.difficulty] || 'slate'}>{preview.difficulty}</Badge>}
                <Badge tone={preview.isMCQ ? 'violet' : 'slate'}>{preview.isMCQ ? 'MCQ' : 'Structured'}</Badge>
                {preview.marks > 0 && <Badge tone="amber">{preview.marks} mark{preview.marks > 1 ? 's' : ''}</Badge>}
              </div>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <FiX size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <p className="mb-3 font-mono text-xs text-slate-400">ID {preview.sourceId}</p>

              {preview.questionText && (
                <div className="text-sm leading-relaxed text-slate-800">{renderMath(preview.questionText)}</div>
              )}
              {preview.questionImage && (
                <img src={preview.questionImage} alt="Question figure" className="mt-4 max-w-full rounded-lg border border-slate-100" loading="lazy" />
              )}

              {preview.isMCQ && (
                <div className="mt-4 space-y-2">
                  {['A', 'B', 'C', 'D', 'E'].map((L) => {
                    const txt = preview.options?.[L]
                    if (!txt) return null
                    const isRight = showAnswer && String(preview.correctAnswer).trim().toUpperCase() === L
                    return (
                      <div key={L} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${isRight ? 'border border-emerald-300 bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-700'}`}>
                        <span className="font-bold">{L}.</span>
                        <span className="flex-1">{renderMath(String(txt))}</span>
                        {isRight && <FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-600" />}
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => setShowAnswer((s) => !s)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <FiEye /> {showAnswer ? 'Hide answer & mark scheme' : 'Show answer & mark scheme'}
              </button>

              {showAnswer && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  {preview.correctAnswer && (
                    <div className="text-sm font-bold text-emerald-900">
                      Answer: <span className="font-extrabold">{renderMath(String(preview.correctAnswer))}</span>
                    </div>
                  )}
                  {preview.answerText && (
                    <div className="mt-2 text-sm leading-relaxed text-slate-800">{renderMath(preview.answerText)}</div>
                  )}
                  {!preview.correctAnswer && !preview.answerText && (
                    <p className="text-sm text-slate-500">No answer was published with this question.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Sel({ label, value, onChange, opts }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All</option>
        {opts.map((o) => {
          const v = typeof o === 'string' ? o : o.v
          const l = typeof o === 'string' ? o : o.l
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </label>
  )
}
