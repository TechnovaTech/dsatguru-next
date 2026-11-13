'use client'
// The written section as a printable answer sheet: brand header, candidate
// details, instructions, then each question with ruled space under it. The
// layout drops the portal header on this route, and html.print-mode lifts the
// site-wide print block for as long as the page is open.
//
// On screen the page wears the `.ig` paper theme (it renders outside the portal
// shell); the sheet itself stays WHITE with near-black ink so the printed paper
// is always black on white.
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FiArrowLeft, FiPrinter, FiRefreshCw } from 'react-icons/fi'
import { apiGet } from '../../../_components/api'
import { Loading, ErrorState } from '../../../_components/ui'
import { renderContent } from '../../../../components/admin/LatexRenderer'
import { siteFontVars } from '../../../../components/siteFonts'

// The browser puts the document title in the PDF header and file name.
const PDF_BRAND = 'Best SAT Preparation Online | Digital SAT Exam Prep | IGCSE'
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
    <div className={`${siteFontVars} ig min-h-screen px-3 pb-28 pt-6 sm:px-6 sm:pt-10 print:min-h-0 print:bg-white print:!p-0`}>
      {loading ? (
        <div className="no-print"><Loading label="Preparing your paper…" /></div>
      ) : error ? (
        <div className="no-print mx-auto max-w-xl space-y-4 pt-10">
          <ErrorState message={error} />
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 border border-line-strong px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink hover:bg-ink/5"
          >
            <FiRefreshCw size={15} /> Try again
          </button>
        </div>
      ) : !questions.length ? (
        <div className="no-print mx-auto max-w-xl border border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm font-semibold text-ink">This section has no questions to print.</p>
        </div>
      ) : (
        <div className="exam-print-root">
          <div
            className="mx-auto max-w-[820px] border border-line bg-white p-5 sm:p-10 print:max-w-none print:border-0 print:!p-0"
            style={PAPER_FONT}
          >
            {/* Brand + section */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-11 w-11 items-center justify-center bg-cta font-display text-lg text-on-cta">
                  iG
                </span>
                <div>
                  <div className="display text-xl leading-tight text-ink">IGCSC</div>
                  <div className="font-code text-[10px] uppercase tracking-[0.16em] text-ink-2">Assessment Suite</div>
                </div>
              </div>
              <div className="text-right font-code text-xs text-ink-2">
                <div className="text-sm font-bold text-ink">Section B — Written</div>
                <div>Ref. {reference}</div>
              </div>
            </div>

            {/* Title */}
            <div className="mt-5 text-center">
              <div className="break-words text-xl font-bold tracking-tight text-ink">{paper.title || 'Test paper'}</div>
              {paper.unit && <div className="mt-0.5 break-words text-sm font-semibold text-ink-2">{paper.unit}</div>}
            </div>

            {/* Candidate */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <div className="mb-1 font-code text-[11px] uppercase tracking-[0.08em] text-ink-2">Candidate name</div>
                <div className="h-9 truncate border border-line-strong bg-white px-3 text-sm font-semibold leading-9 text-ink">
                  {candidate}
                </div>
              </div>
              <div>
                <div className="mb-1 font-code text-[11px] uppercase tracking-[0.08em] text-ink-2">Attempt reference</div>
                <div className="h-9 border border-line-strong bg-white px-3 font-code leading-9 text-sm font-semibold tracking-wider text-ink">
                  {reference}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 border border-line-strong bg-white p-4">
              <div className="font-code text-[11px] font-bold uppercase tracking-[0.08em] text-ink">Instructions to candidates</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {INSTRUCTIONS.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>

            {/* Questions */}
            <div className="mt-8 space-y-9">
              {questions.map((q) => (
                <div key={q._id || q.n} className="exam-q text-[15px] leading-relaxed text-ink">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 font-bold">{q.n}</span>
                    <div className="min-w-0 flex-1 overflow-x-auto break-words print:overflow-visible">{renderContent(String(q.text || ''))}</div>
                    {q.marks ? (
                      <span className="flex-shrink-0 whitespace-nowrap font-code text-sm text-ink-2">[{q.marks}]</span>
                    ) : null}
                  </div>
                  {q.image ? (
                    <div className="mt-3 pl-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={q.image} alt="" className="max-h-[420px] max-w-full border border-line-strong" />
                    </div>
                  ) : null}
                  <div className="mt-4 pl-6" aria-hidden="true">
                    {Array.from({ length: answerLines(q.marks) }).map((_, i) => (
                      <div key={i} className="h-8 border-b border-line-strong" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-10 border-t border-line pt-4 text-center font-code text-[10px] uppercase tracking-[0.08em] text-muted">
              <div>END OF SECTION · IGCSC Assessment Suite</div>
              <div className="mt-1 normal-case tracking-normal">{PDF_BRAND}</div>
            </div>
          </div>
        </div>
      )}

      {/* Floating toolbar - never printed */}
      <div className="no-print fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div className="flex items-center gap-2 border border-line-strong bg-surface p-1.5">
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-ink-2 transition hover:bg-ink/5 hover:text-ink"
          >
            <FiArrowLeft size={15} /> Back
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="inline-flex items-center gap-1.5 bg-cta px-5 py-2.5 text-sm font-medium text-on-cta transition hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiPrinter size={15} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
