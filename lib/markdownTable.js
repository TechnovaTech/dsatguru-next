// Convert pasted text into a GitHub-flavored markdown table — trying hard to "just work"
// for the messy ways tables arrive (spreadsheets, HTML, and especially PDF copies).
//
// Three detection modes, in order:
//  1) GRID   — lines already split into cells by Tab / 2+ spaces / pipes. Columns auto.
//  2) NUMERIC — a data table where each row ends with the same count of numbers
//               (e.g. "teacher 37 16 47"). Columns = 1 label + N numbers, auto-detected.
//               Multi-line wrapped labels ("television\nnews anchor 24 9 67") are merged,
//               and the leading header lines (often wrapped across lines in PDFs) are
//               best-effort grouped into the columns.
//  3) FLAT   — one cell per line with no other signal; grouped into rows of `columns`.

const cleanLines = (raw) => String(raw || '').split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim().length)

const numToken = (t) => /^[-+]?\d+(?:\.\d+)?%?$/.test(t)

const trailingNumberCount = (line) => {
  const toks = line.trim().split(/\s+/)
  let k = 0
  for (let i = toks.length - 1; i >= 0; i--) { if (numToken(toks[i])) k++; else break }
  return k
}

const gridSplit = (line) => {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  if (/\S\s{2,}\S/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim()).filter((c) => c.length)
  if (line.includes('|')) return line.split('|').map((c) => c.trim()).filter((c) => c.length)
  return [line.trim()]
}

const isGrid = (lines) => lines.some((l) => gridSplit(l).length > 1)

// Detect a "label + N trailing numbers" table; returns { rows, cols } or null.
function smartNumeric(lines) {
  const counts = lines.map(trailingNumberCount)
  const positive = counts.filter((c) => c > 0)
  if (positive.length < 2) return null

  // Most common trailing-number count (ties -> larger).
  const freq = {}
  positive.forEach((c) => { freq[c] = (freq[c] || 0) + 1 })
  let K = 0, best = 0
  for (const c of Object.keys(freq)) { const n = Number(c); if (freq[c] > best || (freq[c] === best && n > K)) { best = freq[c]; K = n } }
  if (K < 1) return null
  const dataCount = counts.filter((c) => c === K).length
  if (dataCount < 2 || dataCount / lines.length < 0.3) return null

  const firstDataIdx = counts.findIndex((c) => c === K)
  if (firstDataIdx < 0) return null

  // Header region ends at the last leading line containing '%' (column markers); any
  // leading lines after that are a wrapped label belonging to the first data row.
  let hEnd = -1
  for (let i = 0; i < firstDataIdx; i++) if (lines[i].includes('%')) hEnd = i
  const headerLines = lines.slice(0, hEnd >= 0 ? hEnd + 1 : firstDataIdx).map((s) => s.trim())
  let pending = (hEnd >= 0 ? lines.slice(hEnd + 1, firstDataIdx) : []).map((s) => s.trim()).join(' ').trim()

  const body = []
  for (let i = firstDataIdx; i < lines.length; i++) {
    const line = lines[i]
    if (trailingNumberCount(line) === K) {
      const toks = line.trim().split(/\s+/)
      const nums = toks.slice(toks.length - K)
      const labelToks = toks.slice(0, toks.length - K)
      const label = ((pending ? pending + ' ' : '') + labelToks.join(' ')).trim()
      body.push([label, ...nums])
      pending = ''
    } else {
      pending = (pending ? pending + ' ' : '') + line.trim()
    }
  }
  if (!body.length) return null

  const cols = K + 1
  let header
  if (headerLines.length === cols) {
    header = headerLines
  } else if (!headerLines.length) {
    header = Array(cols).fill('')
  } else {
    // Tables with "(%)" markers: first line is the label-column header; rejoin the rest and
    // split into the K data-column headers at each ")" boundary (handles PDF line wrapping).
    let built = null
    if (headerLines.some((l) => l.includes('%')) && headerLines.length > 1) {
      const rest = headerLines.slice(1).join(' ')
      const parts = rest.split(/(?<=\))\s+/).map((s) => s.trim()).filter(Boolean)
      if (parts.length === K) built = [headerLines[0], ...parts]
    }
    if (built) {
      header = built
    } else {
      // Best-effort: spread the wrapped header lines across the columns.
      header = []
      const per = Math.ceil(headerLines.length / cols)
      for (let i = 0; i < cols; i++) header.push(headerLines.slice(i * per, (i + 1) * per).join(' ').trim())
    }
  }
  return { rows: [header, ...body], cols }
}

// A pasted GFM markdown table (has a |---|---| separator row). Parse it directly so we keep
// <br> line breaks inside cells and DROP the separator row instead of treating it as data.
// Bold markers (**, __) are stripped — table headers are already styled bold when rendered.
function parseMarkdownTable(raw) {
  const lines = String(raw || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length)
  if (lines.length < 2) return null
  const sepIdx = lines.findIndex((l, i) => i > 0 && l.includes('|') && /-/.test(l) && /^[\s|:-]+$/.test(l))
  if (sepIdx < 1) return null
  const splitRow = (l) => {
    let s = l.trim()
    if (s.startsWith('|')) s = s.slice(1)
    if (s.endsWith('|')) s = s.slice(0, -1)
    return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').replace(/\*\*/g, '').replace(/__/g, '').trim())
  }
  const rows = lines.filter((l, i) => i !== sepIdx && l.includes('|')).map(splitRow)
  if (!rows.length) return null
  const cols = Math.max(...rows.map((r) => r.length))
  if (cols < 2) return null
  return { rows, cols }
}

// 'grid' | 'numeric' | 'flat' | 'empty' — lets the UI decide whether to ask for columns.
export function detectTableMode(raw) {
  const lines = cleanLines(raw)
  if (!lines.length) return 'empty'
  if (parseMarkdownTable(raw)) return 'grid'
  if (isGrid(lines)) return 'grid'
  if (smartNumeric(lines)) return 'numeric'
  return 'flat'
}

export function textToMarkdownTable(raw, columns) {
  const lines = cleanLines(raw)
  if (!lines.length) return ''

  let rows, cols
  const mt = parseMarkdownTable(raw)
  if (mt) {
    rows = mt.rows
    cols = mt.cols
  } else if (isGrid(lines)) {
    rows = lines.map(gridSplit)
    cols = Math.max(...rows.map((r) => r.length))
  } else {
    const sn = smartNumeric(lines)
    if (sn) {
      rows = sn.rows
      cols = sn.cols
    } else {
      cols = Math.max(1, Math.min(12, Number(columns) || 1))
      const cells = lines.map((l) => l.trim())
      rows = []
      for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols))
    }
  }
  if (!rows.length) return ''

  const esc = (c) => String(c).replace(/\|/g, '\\|')
  const pad = (r) => { const c = [...r]; while (c.length < cols) c.push(''); return c }
  const toRow = (r) => '| ' + pad(r).map(esc).join(' | ') + ' |'
  const header = toRow(rows[0])
  const sep = '| ' + Array(cols).fill('---').join(' | ') + ' |'
  const body = rows.slice(1).map(toRow)
  return [header, sep, ...body].join('\n')
}
