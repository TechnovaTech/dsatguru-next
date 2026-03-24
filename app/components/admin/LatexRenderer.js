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

// Full renderer: images + tables + LaTeX
export function renderContent(text) {
  if (!text) return null
  const normalized = text.replace(/<br\s*\/?>/gi, '\n')
  const imgParts = normalized.split(/(!\[.*?\]\(.*?\))/g)
  return (
    <div className="whitespace-pre-wrap">
      {imgParts.map((part, idx) => {
        const imgMatch = part.match(/!\[.*?\]\((.*?)\)/)
        if (imgMatch) {
          return (
            <div key={idx} className="my-2">
              <img src={imgMatch[1]} alt="Question" className="max-w-full h-auto rounded border" onError={e => { e.target.style.border = '2px solid red' }} />
            </div>
          )
        }
        return <span key={idx}>{renderLatex(part)}</span>
      })}
    </div>
  )
}
