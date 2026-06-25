/**
 * Lightweight CSV/PDF import/export utilities.
 * No external libraries for CSV — manual parsing/generation.
 * jsPDF is used for PDF export (already in project dependencies).
 */

// ─── CSV Export ───────────────────────────────────────────────

function escapeCsvValue(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map(c => escapeCsvValue(c.label)).join(',')
  const rows = data.map(row =>
    columns.map(c => escapeCsvValue(row[c.key])).join(',')
  )
  return [header, ...rows].join('\n')
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── CSV Import ───────────────────────────────────────────────

export interface CsvParseResult {
  headers: string[]
  rows: string[][]
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

export interface ColumnMapping {
  csvColumn: string
  targetField: string
}

export function mapCsvToRecords(
  parsed: CsvParseResult,
  mappings: ColumnMapping[]
): Record<string, string>[] {
  return parsed.rows.map(row => {
    const record: Record<string, string> = {}
    for (const mapping of mappings) {
      const csvIdx = parsed.headers.indexOf(mapping.csvColumn)
      if (csvIdx !== -1 && row[csvIdx] !== undefined) {
        record[mapping.targetField] = row[csvIdx]
      }
    }
    return record
  })
}

// ─── PDF Export ───────────────────────────────────────────────

export async function exportReportPdf(
  title: string,
  sections: { heading: string; content: string }[],
  metadata?: { date: string; generatedBy?: string }
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageWidth / 2, 25, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  const dateStr = metadata?.date ?? new Date().toLocaleDateString()
  doc.text(`Generated: ${dateStr}`, pageWidth / 2, 33, { align: 'center' })
  if (metadata?.generatedBy) {
    doc.text(`By: ${metadata.generatedBy}`, pageWidth / 2, 39, { align: 'center' })
  }
  doc.setTextColor(0)

  let y = 50

  for (const section of sections) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(section.heading, 15, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(section.content, pageWidth - 30)
    for (const line of lines) {
      if (y > 275) {
        doc.addPage()
        y = 20
      }
      doc.text(line, 15, y)
      y += 5
    }
    y += 8
  }

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

// ─── File reader helper ───────────────────────────────────────

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
