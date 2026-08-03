// RFC 4180 CSV serialization; objects/arrays JSON-encoded so a nested field
// never breaks the row shape. CRLF line endings for Excel.
function escapeCell(value: unknown): string {
  if (value == null) return ''
  let raw = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // SECURITY: neutralize spreadsheet formula injection — a cell starting with
  // = + - @ or a control char executes in Excel/Sheets; prefix a quote to force text.
  if (/^[=+\-@\t\r]/.test(raw)) raw = `'${raw}`
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

/** Union of keys across all rows, preserving first-seen order. */
function unionKeys(rows: Record<string, unknown>[]): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
    }
  }
  return keys
}

/** Serialize flat records to CSV. Columns default to the union of row keys;
    pass an explicit list to fix order/subset. */
export function toCsv(
  rows: Record<string, unknown>[],
  columns?: string[],
): string {
  const cols = columns ?? unionKeys(rows)
  if (cols.length === 0) return ''
  const lines = [cols.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(cols.map((col) => escapeCell(row[col])).join(','))
  }
  return lines.join('\r\n')
}

export function downloadFile(
  content: string,
  filename: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Free the object URL, else the Blob lingers until the page reloads.
  URL.revokeObjectURL(url)
}
