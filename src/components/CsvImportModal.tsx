import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { parseCsv, readFileAsText, type CsvParseResult, type ColumnMapping } from '@/lib/importExport'
import { Upload, X, FileText, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  targetTable: 'reservations' | 'properties'
  targetFields: { key: string; label: string; required?: boolean }[]
  onSuccess?: () => void
}

type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'done'

export function CsvImportModal({ open, onClose, targetTable, targetFields, onSuccess }: CsvImportModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<CsvParseResult | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')

  const reset = () => {
    setStep('upload')
    setParsed(null)
    setMappings([])
    setImportedCount(0)
    setError('')
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    try {
      const text = await readFileAsText(file)
      const result = parseCsv(text)
      if (result.headers.length === 0 || result.rows.length === 0) {
        setError('CSV file is empty or invalid')
        return
      }
      setParsed(result)

      // Auto-map matching columns
      const autoMappings: ColumnMapping[] = targetFields
        .map(field => {
          const match = result.headers.find(h =>
            h.toLowerCase().replace(/[_\s]/g, '') === field.key.toLowerCase().replace(/[_\s]/g, '')
          )
          return match ? { csvColumn: match, targetField: field.key } : { csvColumn: '', targetField: field.key }
        })
      setMappings(autoMappings)
      setStep('preview')
    } catch {
      setError('Failed to parse CSV file')
    }
  }

  const handleImport = async () => {
    if (!parsed) return
    setStep('importing')

    const validMappings = mappings.filter(m => m.csvColumn)
    const records = parsed.rows.map(row => {
      const record: Record<string, string> = {}
      for (const mapping of validMappings) {
        const idx = parsed.headers.indexOf(mapping.csvColumn)
        if (idx !== -1 && row[idx] !== undefined) {
          record[mapping.targetField] = row[idx]
        }
      }
      return record
    }).filter(r => Object.keys(r).length > 0)

    // Batch import in chunks of 50
    const batchSize = 50
    let imported = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error: insertError } = await supabase.from(targetTable).insert(batch)
      if (insertError) {
        setError(`Import error at row ${i + 1}: ${insertError.message}`)
        setStep('mapping')
        return
      }
      imported += batch.length
    }

    setImportedCount(imported)
    setStep('done')
    toast(`${imported} ${t('importExport.recordsImported')}`, 'success')
    onSuccess?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {t('importExport.importCsv')} — {targetTable}
          </h2>
          <button onClick={() => { reset(); onClose() }} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>
        )}

        {step === 'upload' && (
          <div className="text-center py-8 space-y-3">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('importExport.selectFile')}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <Button onClick={() => fileRef.current?.click()}>
              <FileText className="w-4 h-4 mr-2" />
              {t('importExport.chooseFile')}
            </Button>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {parsed.headers.length} {t('importExport.columns')}, {parsed.rows.length} {t('importExport.rows')}
            </p>
            <div className="overflow-x-auto max-h-48 border border-border rounded">
              <table className="text-xs w-full">
                <thead className="bg-muted">
                  <tr>
                    {parsed.headers.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>{t('common.cancel')}</Button>
              <Button size="sm" onClick={() => setStep('mapping')}>
                {t('importExport.mapColumns')} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && parsed && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('importExport.mapColumnsDesc')}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {targetFields.map(field => {
                const mapping = mappings.find(m => m.targetField === field.key)
                return (
                  <div key={field.key} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-32 truncate">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <select
                      value={mapping?.csvColumn ?? ''}
                      onChange={e => {
                        setMappings(prev => prev.map(m =>
                          m.targetField === field.key ? { ...m, csvColumn: e.target.value } : m
                        ))
                      }}
                      className="flex-1 h-7 text-xs border border-border rounded px-2 bg-background"
                    >
                      <option value="">— skip —</option>
                      {parsed.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('preview')}>{t('common.back')}</Button>
              <Button size="sm" onClick={handleImport}>
                {t('importExport.import')} ({parsed.rows.length} {t('importExport.rows')})
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('importExport.importing')}...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-8 h-8 mx-auto text-green-600" />
            <p className="text-sm font-medium">{importedCount} {t('importExport.recordsImported')}</p>
            <Button size="sm" onClick={() => { reset(); onClose() }}>{t('common.close')}</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
