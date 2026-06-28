// Convert pasted text into a GitHub-flavored markdown table.
// Rows = lines; columns = split by Tab (how spreadsheets/HTML tables copy) or, failing
// that, 2+ spaces. The first row becomes the header. Used by the test editors' "Table" button.
export function textToMarkdownTable(raw) {
  const lines = String(raw || '').split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim().length)
  if (!lines.length) return ''

  const splitCells = (line) => {
    if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
    if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim()).filter((c) => c.length)
    if (line.includes('|')) return line.split('|').map((c) => c.trim()).filter((c) => c.length)
    return [line.trim()]
  }

  const rows = lines.map(splitCells)
  const cols = Math.max(...rows.map((r) => r.length))
  if (cols < 1) return ''
  const esc = (c) => String(c).replace(/\|/g, '\\|')
  const pad = (r) => { const c = [...r]; while (c.length < cols) c.push(''); return c }
  const toRow = (r) => '| ' + pad(r).map(esc).join(' | ') + ' |'

  const header = toRow(rows[0])
  const sep = '| ' + Array(cols).fill('---').join(' | ') + ' |'
  const body = rows.slice(1).map(toRow)
  return [header, sep, ...body].join('\n')
}
