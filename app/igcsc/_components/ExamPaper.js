'use client'
// Reusable, ORIGINAL exam-paper layout for the IGCSC platform — a standard
// question-paper format (candidate header, instructions, numbered questions,
// marks, answer lines). Content-neutral: it renders whatever `paper` you pass.
export default function ExamPaper({ paper, showAnswers = false }) {
  const { brand = 'IGCSC', subject, unit, paperCode, duration, totalMarks, materials, instructions = [], questions = [], footerBrand = '' } = paper || {}
  const ui = { fontFamily: 'system-ui, sans-serif' }

  return (
    <div className="mx-auto max-w-[820px] rounded-lg bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-10"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* ===== Header ===== */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-lg font-black text-white" style={ui}>iG</span>
          <div>
            <div className="text-lg font-extrabold text-slate-900" style={ui}>{brand}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600" style={ui}>Assessment Suite</div>
          </div>
        </div>
        <div className="text-right text-xs text-slate-600" style={ui}>
          {subject && <div className="text-sm font-bold text-slate-900">{subject}</div>}
          {paperCode && <div>{paperCode}</div>}
          {duration && <div>Time allowed: {duration}</div>}
          {totalMarks != null && <div>Total: {totalMarks} marks</div>}
        </div>
      </div>

      {/* ===== Title band ===== */}
      <div className="mt-5 text-center">
        {subject && <div className="text-xl font-extrabold tracking-tight text-slate-900">{subject}</div>}
        {unit && <div className="mt-0.5 text-sm font-semibold text-slate-600">{unit}</div>}
      </div>

      {/* ===== Materials / equipment ===== */}
      {materials && (
        <div className="mt-4 rounded border border-slate-300 px-4 py-2 text-sm text-slate-700">
          <span className="font-bold" style={ui}>You must have: </span>{materials}
        </div>
      )}

      {/* ===== Candidate name ===== */}
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
        {['First Name', 'Last Name'].map((l) => (
          <div key={l}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500" style={ui}>{l}</div>
            <div className="h-9 rounded border border-slate-300 bg-slate-50/60" />
          </div>
        ))}
      </div>

      {/* ===== Instructions ===== */}
      {instructions.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700" style={ui}>Instructions to candidates</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {instructions.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </div>
      )}

      {/* ===== Questions ===== */}
      <div className="mt-7 space-y-8">
        {questions.map((q) => (
          <div key={q.n} className="exam-q text-[15px] leading-relaxed text-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5"><span className="font-bold">{q.n}</span><span>{q.text}</span></div>
              {q.marks ? <span className="whitespace-nowrap text-sm text-slate-500" style={ui}>[{q.marks}]</span> : null}
            </div>

            {q.image && (
              <div className="mt-2.5 pl-6">
                <img src={q.image} alt="" className="max-h-[420px] max-w-full rounded border border-slate-200" />
              </div>
            )}

            {q.type === 'mcq' && q.options && (
              <div className="mt-2.5 space-y-2 pl-6">
                {q.options.map((o, i) => {
                  // Options can be plain strings or { letter, node } pairs; the
                  // pair form keeps each option's REAL letter (A stays A even if
                  // B is missing) so the mark scheme's letter always matches.
                  const letter = (o && typeof o === 'object' && !o.$$typeof && o.letter) || 'ABCDEF'[i]
                  const body = (o && typeof o === 'object' && !o.$$typeof && 'node' in o) ? o.node : o
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-slate-400 text-xs" style={ui}>{letter}</span>
                      <span>{body}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {q.parts && (
              <div className="mt-2.5 space-y-4 pl-6">
                {q.parts.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2"><span className="font-semibold">({p.label})</span><span>{p.text}</span></div>
                      {p.marks ? <span className="whitespace-nowrap text-sm text-slate-500" style={ui}>[{p.marks}]</span> : null}
                    </div>
                    <div className="mt-2 space-y-4">
                      {Array.from({ length: p.lines || 2 }).map((_, li) => <div key={li} className="border-b border-dotted border-slate-300" />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {q.type === 'structured' && !q.parts && (
              <div className="mt-2.5 space-y-4 pl-6">
                {Array.from({ length: q.lines || 3 }).map((_, li) => <div key={li} className="border-b border-dotted border-slate-300" />)}
              </div>
            )}

            {showAnswers && q.answer && (
              <div className="mt-2.5 ml-6 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" style={ui}>
                <span className="font-bold">Mark scheme: </span>{q.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400" style={ui}>
        <div>END OF PAPER · {brand} Assessment Suite</div>
        {footerBrand && <div className="mt-1">{footerBrand}</div>}
      </div>
    </div>
  )
}
