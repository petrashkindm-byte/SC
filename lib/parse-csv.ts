/** Разбор одной строки CSV с кавычками по RFC-стилю. */
export function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      result.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}

export function parseCsvToRecords(text: string): Record<string, string>[] {
  const normalized = text.replace(/^\uFEFF/, '').trim()
  if (!normalized) return []

  const lines = normalized.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const records: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? ''
    })
    records.push(row)
  }

  return records
}
