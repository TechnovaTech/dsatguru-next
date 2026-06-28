// Convert pasted text into a GitHub-flavored markdown table.
//
// Two paste shapes are supported:
//  1) GRID paste (from a spreadsheet / HTML table): each line is a row, cells separated
//     by Tab, 2+ spaces, or pipes. Column count is detected automatically.
//  2) FLAT paste (one cell per line, no delimiter): the cells are grouped into rows using
//     the `columns` argument (so 15 cells with columns=3 -> a 5x3 table). The first row
//     becomes the header in both cases.
export function isGridPaste(raw) {
  const lines = String(raw || '').split(/\r?\n/).filter((l) => l.trim().length)
  return lines.some((l) => l.includes('\t') || /\S\s{2,}\S/.test(l) || (l.match(/\|/g) || []).length >= 1)
}

export function textToMarkdownTable(raw, columns) {
  const lines = String(raw || '').split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim().length)
  if (!lines.length) return ''

  const splitGrid = (line) => {
    if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
    if (/\S\s{2,}\S/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim()).filter((c) => c.length)
    if (line.includes('|')) return line.split('|').map((c) => c.trim()).filter((c) => c.length)
    return [line.trim()]
  }

  const gridRows = lines.map(splitGrid)
  const maxCells = Math.max(...gridRows.map((r) => r.length))

  let rows, cols
  if (maxCells > 1) {
    rows = gridRows
    cols = maxCells
  } else {
    cols = Math.max(1, Math.min(12, Number(columns) || 1))
    const cells = lines.map((l) => l.trim())
    rows = []
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols))
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
