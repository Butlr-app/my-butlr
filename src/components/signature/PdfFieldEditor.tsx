import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import {
  createFieldDraft,
  signatureFieldLabels,
  type SignatureFieldDraft,
  type SignatureRecipientDraft,
} from '@/lib/signatureWorkflow'
import type { SignatureFieldType } from '@/lib/types'

interface PdfFieldEditorProps {
  documentUrl: string
  recipients: SignatureRecipientDraft[]
  fields: SignatureFieldDraft[]
  onChange: (fields: SignatureFieldDraft[]) => void
}

export function PdfFieldEditor({
  documentUrl,
  recipients,
  fields,
  onChange,
}: PdfFieldEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const renderId = useRef(0)
  const [pdf, setPdf] = useState<Awaited<ReturnType<typeof loadPdf>> | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [recipientKey, setRecipientKey] = useState(recipients[0]?.key ?? '')
  const [fieldType, setFieldType] = useState<SignatureFieldType>('signature')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    loadPdf(documentUrl).then(loaded => {
      if (!active) return
      setPdf(loaded)
      setLoading(false)
    }).catch(loadError => {
      if (!active) return
      setError(loadError instanceof Error ? loadError.message : 'PDF illisible.')
      setLoading(false)
    })
    return () => { active = false }
  }, [documentUrl])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    const currentRender = ++renderId.current
    pdf.getPage(pageNumber).then(async page => {
      if (currentRender !== renderId.current || !canvasRef.current) return
      const viewport = page.getViewport({ scale: 1.25 })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      await page.render({ canvas, canvasContext: context, viewport }).promise
    })
  }, [pdf, pageNumber])

  useEffect(() => {
    if (!recipients.some(recipient => recipient.key === recipientKey)) {
      setRecipientKey(recipients[0]?.key ?? '')
    }
  }, [recipients, recipientKey])

  const addField = () => {
    if (!recipientKey) return
    onChange([...fields, createFieldDraft({
      recipientKey,
      fieldType,
      pageNumber,
      index: fields.filter(field => field.pageNumber === pageNumber).length,
    })])
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragging || !overlayRef.current) return
    const rect = overlayRef.current.getBoundingClientRect()
    const field = fields.find(item => item.id === dragging.id)
    if (!field) return
    const x = (event.clientX - rect.left - dragging.offsetX) / rect.width
    const y = (event.clientY - rect.top - dragging.offsetY) / rect.height
    onChange(fields.map(item => item.id === field.id ? {
      ...item,
      x: Math.max(0, Math.min(1 - item.width, x)),
      y: Math.max(0, Math.min(1 - item.height, y)),
    } : item))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Select
          label="Signataire"
          value={recipientKey}
          onChange={event => setRecipientKey(event.target.value)}
          options={recipients.map(recipient => ({
            value: recipient.key,
            label: recipient.name || recipient.email || 'Signataire',
          }))}
        />
        <Select
          label="Champ"
          value={fieldType}
          onChange={event => setFieldType(event.target.value as SignatureFieldType)}
          options={Object.entries(signatureFieldLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Button className="self-end" onClick={addField} disabled={!recipientKey}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPageNumber(page => Math.max(1, page - 1))}
          disabled={pageNumber === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          Page {pageNumber} / {pdf?.numPages ?? '…'}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPageNumber(page => Math.min(pdf?.numPages ?? page, page + 1))}
          disabled={!pdf || pageNumber === pdf.numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-auto rounded-md border border-border bg-muted/30 p-3">
        {loading && <p className="p-12 text-center text-sm text-muted-foreground">Chargement du PDF…</p>}
        {error && <p role="alert" className="p-6 text-sm text-destructive">{error}</p>}
        <div
          ref={overlayRef}
          className="relative mx-auto w-fit touch-none shadow-lg"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        >
          <canvas ref={canvasRef} className={loading || error ? 'hidden' : 'block max-w-none'} />
          {!loading && !error && fields
            .filter(field => field.pageNumber === pageNumber)
            .map(field => {
              const recipientIndex = recipients.findIndex(item => item.key === field.recipientKey)
              return (
                <div
                  key={field.id}
                  onPointerDown={event => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDragging({
                      id: field.id,
                      offsetX: event.clientX - rect.left,
                      offsetY: event.clientY - rect.top,
                    })
                  }}
                  className="absolute flex cursor-move select-none items-center justify-between gap-1 overflow-hidden rounded border-2 border-info bg-info-soft/90 px-2 text-[10px] font-medium text-info"
                  style={{
                    left: `${field.x * 100}%`,
                    top: `${field.y * 100}%`,
                    width: `${field.width * 100}%`,
                    height: `${field.height * 100}%`,
                  }}
                >
                  <span className="truncate">
                    {signatureFieldLabels[field.fieldType]}
                    {' · '}
                    {recipients[recipientIndex]?.name || `Signataire ${recipientIndex + 1}`}
                  </span>
                  <button
                    type="button"
                    aria-label="Supprimer le champ"
                    className="shrink-0 cursor-pointer"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => onChange(fields.filter(item => item.id !== field.id))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

async function loadPdf(url: string) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  return pdfjs.getDocument({ url }).promise
}
