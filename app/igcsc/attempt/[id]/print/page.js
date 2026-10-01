'use client'
// The written section as a printable answer sheet: brand header, candidate
// details, instructions, then each question with ruled space under it. The
// layout drops the portal header on this route, and html.print-mode lifts the
// site-wide print block for as long as the page is open.
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiPrinter, FiRefreshCw } from 'react-icons/fi'
import { apiGet } from '../../../_components/api'
import { Loading, ErrorState } from '../../../_components/ui'
import { renderContent } from '../../../../components/admin/LatexRenderer'

// The browser puts the document title in the PDF header and file name.
const PDF_BRAND = 'Best SAT Preparation Online | Digital SAT Exam Prep | IGCSE'
const UI_FONT = { fontFamily: 'system-ui, sans-serif' }
const PAPER_FONT = { fontFamily: 'Georgia, "Times New Roman", serif' }

const INSTRUCTIONS = [
  'Answer every question, in the spaces provided or on separate paper.',
  'Write the question number next to every answer, for example 7 or 7(b).',
  'Write in dark ink, on one side of the paper only.',
  'The number of marks for each question is shown in brackets [ ].',
  'When you finish, photograph every page and upload the photos.',
]

// Two lines a mark, within reason.
function answerLines(marks) {
  return Math.min(12, Math.max(3, (Number(marks) || 0) * 2))
}

export default function WrittenPrintPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.documentElement.classList.add('print-mode')
    return () => document.documentElement.classList.remove('print-mode')
  }, [])

  useEffect(() => {
    const prev = document.title
    document.title = PDF_BRAND
    return () => { document.title = prev }
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await apiGet(`/api/igcsc/attempts/${encodeURIComponent(id)}/written`)
      setData(res)
    } catch (e) {
      setError(e.message || 'Could not load the paper.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Opened in a new tab there is nothing to go back to: go to the test instead.
  const back = () => {
    if (window.history.length > 1) router.back()
    else router.push(`/igcsc/attempt/${encodeURIComponent(id)}`)
  }

  const questions = Array.isArray(data?.questions) ? data.questions : []
  const paper = data?.paper || {}
  const candidate = data?.candidate?.name || data?.attempt?.userName || ''
  const reference = String(data?.attempt?._id || id).slice(-6).toUpperCase()
  const ready = !loading && !error && questions.length > 0

  return (
    <div className="min-h-screen bg-slate-100 px-3 pb-28 pt-6 sm:px-6 sm:pt-10 print:min-h-0 print:bg-white print:!p-0">
      {loading ? (
        <div className="no-print"><Loading label="Preparing your paper…" /></div>
      ) : error ? (
        <div className="no-print mx-auto max-w-xl space-y-4 pt-10">
          <ErrorState message={error} />
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <FiRefreshCw size={15} /> Try again
          </button>
        </div>
      ) : !questions.length ? (
        <div className="no-print mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">This section has no questions to print.</p>
        </div>
      ) : (
        <div className="exam-print-root">
          <div
            className="mx-auto max-w-[820px] rounded-lg bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:p-10 print:max-w-none print:!p-0"
            style={PAPER_FONT}
          >
            {/* Brand + section */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-lg font-black text-white"
                  style={UI_FONT}
                >
                  iG
                </span>
                <div>
                  <div className="text-lg font-extrabold text-slate-900" style={UI_FONT}>IGCSC</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600" style={UI_FONT}>Assessment Suite</div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-600" style={UI_FONT}>
                <div className="text-sm font-bold text-slate-900">Section B — Written</div>
                <div>Ref. {reference}</div>
              </div>
            </div>

            {/* Title */}
            <div className="mt-5 text-center">
              <div className="break-words text-xl font-extrabold tracking-tight text-slate-900">{paper.title || 'Test paper'}</div>
              {paper.unit && <div className="mt-0.5 break-words text-sm font-semibold text-slate-600">{paper.unit}</div>}
            </div>

            {/* Candidate */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3" style={UI_FONT}>
              <div className="sm:col-span-2">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Candidate name</div>
                <div className="h-9 truncate rounded border border-slate-300 bg-slate-50/60 px-3 text-sm font-semibold leading-9 text-slate-900">
                  {candidate}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attempt reference</div>
                <div className="h-9 rounded border border-slate-300 bg-slate-50/60 px-3 font-mono leading-9 text-sm font-semibold tracking-wider text-slate-900">
                  {reference}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700" style={UI_FONT}>Instructions to candidates</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {INSTRUCTIONS.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>

            {/* Questions */}
            <div className="mt-8 space-y-9">
              {questions.map((q) => (
                <div key={q._id || q.n} className="exam-q text-[15px] leading-relaxed text-slate-900">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 font-bold">{q.n}</span>
                    <div className="min-w-0 flex-1 overflow-x-auto break-words print:overflow-visible">{renderContent(String(q.text || ''))}</div>
                    {q.marks ? (
                      <span className="flex-shrink-0 whitespace-nowrap text-sm text-slate-500" style={UI_FONT}>[{q.marks}]</span>
                    ) : null}
                  </div>
                  {q.image ? (
                    <div className="mt-3 pl-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={q.image} alt="" className="max-h-[420px] max-w-full rounded border border-slate-200" />
                    </div>
                  ) : null}
                  <div className="mt-4 pl-6" aria-hidden="true">
                    {Array.from({ length: answerLines(q.marks) }).map((_, i) => (
                      <div key={i} className="h-8 border-b border-slate-300" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-10 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400" style={UI_FONT}>
              <div>END OF SECTION · IGCSC Assessment Suite</div>
              <div className="mt-1">{PDF_BRAND}</div>
            </div>
          </div>
        </div>
      )}

      {/* Floating toolbar - never printed */}
      <div className="no-print fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur" style={UI_FONT}>
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <FiArrowLeft size={15} /> Back
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiPrinter size={15} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
