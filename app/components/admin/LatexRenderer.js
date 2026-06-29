'use client'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Renders a string that may contain LaTeX ($$, $, \[, \(), images, tables
export function renderLatex(text) {
  if (!text) return null
  const S = '\u0024' // $
  const SS = S + S   // $$
  const re = new RegExp(
    '(' +
    '\\' + S + '\\' + S + '[\\s\\S]*?\\' + S + '\\' + S +
    '|\\' + S + '[^' + S + '\\n]+?\\' + S +
    '|\\\\\\[[\\s\\S]*?\\\\\\]' +
    '|\\\\\\([\\s\\S]*?\\\\\\)' +
    ')',
    'g'
  )
  const parts = text.split(re)
  return parts.map((part, i) => {
    let latex = null
    let displayMode = false
    if (part.startsWith(SS) && part.endsWith(SS) && part.length > 4) {
      latex = part.slice(2, -2).trim(); displayMode = true
    } else if (part.startsWith(S) && part.endsWith(S) && part.length > 2 && !part.startsWith(SS)) {
      latex = part.slice(1, -1).trim(); displayMode = false
    } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
      latex = part.slice(2, -2).trim(); displayMode = true
    } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
      latex = part.slice(2, -2).trim(); displayMode = false
    }
    if (latex !== null) {
      try {
        const html = katex.renderToString(latex, { displayMode, throwOnError: false, output: 'html' })
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
      } catch { return <span key={i}>{part}</span> }
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
  })
}

// A single GFM table row -> array of cell strings.
function parseTableRow(line) {
  let l = line.trim()
  if (l.startsWith('|')) l = l.slice(1)
  if (l.endsWith('|')) l = l.slice(0, -1)
  return l.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim())
}

// Split text into alternating { type:'text' } and { type:'table', rows } blocks.
function splitTableBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let buf = []
  const flush = () => { if (buf.length) { blocks.push({ type: 'text', value: buf.join('\n') }); buf = [] } }
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    const next = lines[i + 1]
    const isSep = next != null && next.includes('|') && /-/.test(next) && /^[\s|:-]+$/.test(next.trim())
    if (line.includes('|') && isSep) {
      flush()
      const rows = [parseTableRow(line)]
      let k = i + 2
      while (k < lines.length && lines[k].includes('|') && lines[k].trim()) { rows.push(parseTableRow(lines[k])); k++ }
      blocks.push({ type: 'table', rows })
      i = k
    } else { buf.push(line); i++ }
  }
  flush()
  return blocks
}

// Render a table cell honoring <br> as a line break, so multi-value cells (e.g. College Board
// "ways to enter answer": 3.5 / 3.50 / 7/2) stack vertically instead of running together.
function renderCell(c) {
  const segs = String(c == null ? '' : c).split(/<br\s*\/?>/gi)
  return segs.map((s, i) => <span key={i}>{i > 0 && <br />}{renderLatex(s)}</span>)
}

function TableBlock({ rows }) {
  if (!rows || !rows.length) return null
  const [head, ...body] = rows
  return (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>{head.map((c, i) => <th key={i} className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left font-semibold">{renderCell(c)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-gray-300 px-3 py-1.5 align-top">{renderCell(c)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

// Render a non-table text segment: images + LaTeX. <br> becomes a newline (whitespace-pre-wrap).
function renderTextSegment(part, key) {
  part = String(part || '').replace(/<br\s*\/?>/gi, '\n')
  const imgParts = part.split(/(!\[.*?\]\(.*?\))/g)
  return (
    <span key={key}>
      {imgParts.map((p, idx) => {
        const imgMatch = p.match(/!\[.*?\]\((.*?)\)/)
        if (imgMatch) {
          return (
            <div key={idx} className="my-2">
              <img src={imgMatch[1]} alt="Question" className="max-w-full h-auto rounded border" onError={e => { e.target.style.border = '2px solid red' }} />
            </div>
          )
        }
        return <span key={idx}>{renderLatex(p)}</span>
      })}
    </span>
  )
}

// Full renderer: images + tables + LaTeX
export function renderContent(text) {
  if (!text) return null
  // NOTE: do NOT convert <br> to \n here — that would split table rows that use <br> inside
  // cells for line breaks. <br> is handled per-block: in cells (renderCell) and text (renderTextSegment).
  const blocks = splitTableBlocks(text)
  return (
    <div className="whitespace-pre-wrap">
      {blocks.map((b, i) => (b.type === 'table' ? <TableBlock key={i} rows={b.rows} /> : renderTextSegment(b.value, i)))}
    </div>
  )
}
