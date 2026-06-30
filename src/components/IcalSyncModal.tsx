import { useState, useRef, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { readFileAsText } from '@/lib/importExport'
import {
  generateIcs,
  downloadIcs,
  parseIcs,
  findConflicts,
  guestNameFromSummary,
  type ParsedIcsEvent,
} from '@/lib/ical'
import type { Reservation, Property } from '@/lib/useSupabase'
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react'

interface IcalSyncModalProps {
  open: boolean
  onClose: () => void
  reservations: Reservation[]
  properties: Property[]
  onImport: (rows: Array<Partial<Reservation>>) => Promise<void>
}

type Tab = 'export' | 'import'

interface ImportRow {
  event: ParsedIcsEvent
  guestName: string
  conflicts: Reservation[]
  include: boolean
}

export function IcalSyncModal({ open, onClose, reservations, properties, onImport }: IcalSyncModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('export')
  const [exportPropertyId, setExportPropertyId] = useState('')
  const [importPropertyId, setImportPropertyId] = useState('')
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const propertyOptions = useMemo(
    () => properties.map(p => ({ value: p.id, label: p.name })),
    [properties]
  )

  const reset = () => {
    setRows(null)
    setError('')
    setImporting(false)
  }

  const handleClose = () => {
    reset()
    setTab('export')
    onClose()
  }

  const handleExport = () => {
    const property = properties.find(p => p.id === exportPropertyId)
    const ics = generateIcs(reservations, properties, {
      propertyId: exportPropertyId || undefined,
      calendarName: property ? `My Butlr — ${property.name}` : 'My Butlr — All reservations',
    })
    const slug = property ? property.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'all'
    downloadIcs(ics, `mybutlr-${slug}.ics`)
    toast(t('ical.exported'))
  }

  const recomputeConflicts = (events: ParsedIcsEvent[], propertyId: string) => {
    return events.map<ImportRow>(event => {
      const conflicts = findConflicts(
        { property_id: propertyId || null, arrival: event.arrival, departure: event.departure },
        reservations
      )
      return {
        event,
        guestName: guestNameFromSummary(event.summary),
        conflicts,
        include: conflicts.length === 0 && !event.cancelled,
      }
    })
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const text = await readFileAsText(file)
      await loadText(text)
    } catch {
      setError(t('ical.parseError'))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const loadText = async (text: string) => {
    const events = parseIcs(text)
    if (events.length === 0) {
      setError(t('ical.noEvents'))
      setRows(null)
      return
    }
    setRows(recomputeConflicts(events, importPropertyId))
  }

  const handleImportPropertyChange = (value: string) => {
    setImportPropertyId(value)
    if (rows) {
      setRows(recomputeConflicts(rows.map(r => r.event), value))
    }
  }

  const toggleRow = (idx: number) => {
    setRows(prev =>
      prev ? prev.map((r, i) => (i === idx ? { ...r, include: !r.include } : r)) : prev
    )
  }

  const handleImport = async () => {
    if (!rows) return
    const selected = rows.filter(r => r.include)
    if (selected.length === 0) {
      toast(t('ical.nothingSelected'), 'error')
      return
    }
    setImporting(true)
    try {
      await onImport(
        selected.map(r => ({
          guest_name: r.guestName,
          property_id: importPropertyId || null,
          arrival: r.event.arrival,
          departure: r.event.departure,
          guests_count: 1,
          status: 'confirmed' as Reservation['status'],
          total_amount: 0,
          notes: r.event.description ? `Imported via iCal. ${r.event.description}` : 'Imported via iCal',
        }))
      )
      toast(t('ical.imported').replace('{count}', String(selected.length)))
      handleClose()
    } catch (err) {
      toast((err as Error).message, 'error')
      setImporting(false)
    }
  }

  const includedCount = rows?.filter(r => r.include).length ?? 0
  const conflictCount = rows?.filter(r => r.conflicts.length > 0).length ?? 0

  return (
    <Modal open={open} onClose={handleClose} title={t('ical.title')} className="max-w-2xl">
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setTab('export')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'export' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('ical.exportTab')}
        </button>
        <button
          onClick={() => setTab('import')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'import' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('ical.importTab')}
        </button>
      </div>

      {tab === 'export' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('ical.exportHelp')}</p>
          <Select
            label={t('ical.property')}
            value={exportPropertyId}
            onChange={e => setExportPropertyId(e.target.value)}
            options={[{ value: '', label: t('ical.allProperties') }, ...propertyOptions]}
          />
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> {t('ical.downloadIcs')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('ical.importHelp')}</p>
          <Select
            label={t('ical.targetProperty')}
            value={importPropertyId}
            onChange={e => handleImportPropertyChange(e.target.value)}
            options={[{ value: '', label: t('ical.unassigned') }, ...propertyOptions]}
          />

          <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={handleFile} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> {t('ical.chooseFile')}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {rows && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{rows.length} {t('ical.events')}</span>
                {conflictCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" /> {conflictCount} {t('ical.conflicts')}
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {rows.map((row, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                      row.conflicts.length > 0 ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={row.include}
                      onChange={() => toggleRow(idx)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{row.guestName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.event.arrival} → {row.event.departure}
                      </p>
                      {row.conflicts.length > 0 && (
                        <p className="flex items-center gap-1 text-xs text-amber-700 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          {t('ical.conflictWith')} {row.conflicts.map(c => c.guest_name).join(', ')}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {includedCount} {t('ical.willImport')}
                </p>
                <Button onClick={handleImport} disabled={importing || includedCount === 0}>
                  {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {t('ical.importSelected')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
