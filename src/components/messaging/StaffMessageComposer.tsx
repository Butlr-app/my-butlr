import { useRef, useState } from 'react'
import { Check, ImagePlus, Send, ShoppingBag, Sparkles, X } from 'lucide-react'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { Button } from '@/components/ui/Button'
import { appendSpeechTranscript } from '@/lib/speechDraft'
import { formatCatalogPrice, type BoutiqueCatalogEntry } from '@/lib/boutique'
import type { PropertyServiceItem } from '@/lib/propertyServices'
import {
  buildProductCardPayload,
  buildServiceCardPayload,
  type StayMessageInput,
} from '@/lib/stayMessaging'
import { localizeServiceName, resolveServiceOffer } from '@/lib/propertyServices'
import { staffUploadStayMessageImage } from '@/lib/uploadStayMessageImage'

type ComposerMode = 'text' | 'product' | 'service' | 'image'

interface StaffMessageComposerProps {
  userId: string
  draft: string
  onDraftChange: (value: string) => void
  busy: boolean
  products: BoutiqueCatalogEntry[]
  services: PropertyServiceItem[]
  onSend: (input: StayMessageInput) => Promise<boolean>
}

export function StaffMessageComposer({
  userId,
  draft,
  onDraftChange,
  busy,
  products,
  services,
  onSend,
}: StaffMessageComposerProps) {
  const [mode, setMode] = useState<ComposerMode>('text')
  const [speechInterim, setSpeechInterim] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<BoutiqueCatalogEntry | null>(null)
  const [selectedService, setSelectedService] = useState<PropertyServiceItem | null>(null)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const composedDraft = speechInterim ? appendSpeechTranscript(draft, speechInterim) : draft

  const resetAttachments = () => {
    setMode('text')
    setSelectedProduct(null)
    setSelectedService(null)
    setPendingImageUrl(null)
    setPendingImagePath(null)
  }

  const handleSend = async () => {
    if (busy || uploading) return
    setUploadError('')

    if (mode === 'product' && selectedProduct) {
      const sent = await onSend({
        body: composedDraft.trim() || undefined,
        messageType: 'product_card',
        payload: buildProductCardPayload(selectedProduct),
      })
      if (!sent) return
      onDraftChange('')
      setSpeechInterim('')
      resetAttachments()
      return
    }

    if (mode === 'service' && selectedService) {
      try {
        const sent = await onSend({
          body: composedDraft.trim() || undefined,
          messageType: 'service_card',
          payload: buildServiceCardPayload(selectedService),
        })
        if (!sent) return
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Envoi impossible.')
        return
      }
      onDraftChange('')
      setSpeechInterim('')
      resetAttachments()
      return
    }

    if (mode === 'image' && pendingImageUrl && pendingImagePath) {
      const sent = await onSend({
        body: composedDraft.trim() || undefined,
        messageType: 'image',
        payload: {
          storage_path: pendingImagePath,
          ...(pendingImageUrl ? { image_url: pendingImageUrl } : {}),
        },
      })
      if (!sent) return
      onDraftChange('')
      setSpeechInterim('')
      resetAttachments()
      return
    }

    if (!composedDraft.trim()) return
    const sent = await onSend({ body: composedDraft.trim(), messageType: 'text' })
    if (!sent) return
    onDraftChange('')
    setSpeechInterim('')
  }

  const handleImagePick = async (file: File | undefined) => {
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const { url, storagePath, error } = await staffUploadStayMessageImage(file, userId)
      if (error || !storagePath) {
        setUploadError(error?.message ?? 'Téléversement impossible.')
        return
      }
      setPendingImageUrl(url ?? URL.createObjectURL(file))
      setPendingImagePath(storagePath)
      setMode('image')
      setSelectedProduct(null)
      setSelectedService(null)
    } finally {
      setUploading(false)
    }
  }

  const canSend =
    (mode === 'product' && selectedProduct)
    || (mode === 'service' && selectedService)
    || (mode === 'image' && pendingImageUrl && pendingImagePath)
    || composedDraft.trim().length > 0

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'product' ? 'primary' : 'secondary'}
          disabled={busy || uploading || products.length === 0}
          onClick={() => {
            setMode('product')
            setSelectedService(null)
            setPendingImageUrl(null)
            setPendingImagePath(null)
          }}
        >
          <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
          Produit
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'service' ? 'primary' : 'secondary'}
          disabled={busy || uploading || services.length === 0}
          onClick={() => {
            setMode('service')
            setSelectedProduct(null)
            setPendingImageUrl(null)
            setPendingImagePath(null)
          }}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Sortie / activité
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
          Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            void handleImagePick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {mode === 'product' && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {products.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Aucun produit boutique activé pour cette villa.</p>
          ) : (
            products.map(entry => {
              const selected = selectedProduct?.item.id === entry.item.id
              return (
              <button
                key={entry.item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedProduct(entry)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                  selected
                    ? 'border-foreground bg-foreground/[0.06] ring-1 ring-foreground/20'
                    : 'border-transparent hover:bg-muted/60'
                }`}
              >
                <span className="relative shrink-0">
                  {entry.item.images[0] ? (
                    <img src={entry.item.images[0]} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs">—</span>
                  )}
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{entry.item.title}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                    {formatCatalogPrice(entry.item, entry.assignment, entry.item.currency)}
                  </span>
                </span>
                {selected && (
                  <span className="shrink-0 text-[11px] font-semibold text-foreground">Sélectionné</span>
                )}
              </button>
              )
            })
          )}
        </div>
      )}

      {mode === 'service' && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {services.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Aucune activité conciergerie activée.</p>
          ) : (
            services.map(item => {
              const offer = resolveServiceOffer(item.service, item.assignment)
              const selected = selectedService?.service.id === item.service.id
              return (
              <button
                key={item.assignment!.id}
                type="button"
                aria-pressed={selected}
                disabled={!item.assignment?.id}
                onClick={() => setSelectedService(item)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                  selected
                    ? 'border-foreground bg-foreground/[0.06] ring-1 ring-foreground/20'
                    : 'border-transparent hover:bg-muted/60'
                }`}
              >
                <span className="relative shrink-0">
                  {item.service.image_url ? (
                    <img src={item.service.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs">—</span>
                  )}
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {localizeServiceName(offer.displayName || item.assignment?.offer_title || item.service.name)}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                    {offer.pricing.displayLabel}
                  </span>
                </span>
                {selected && (
                  <span className="shrink-0 text-[11px] font-semibold text-foreground">Sélectionné</span>
                )}
              </button>
              )
            })
          )}
        </div>
      )}

      {pendingImageUrl && (
        <div className="relative inline-block">
          <img src={pendingImageUrl} alt="" className="h-24 rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => {
              setPendingImageUrl(null)
              setPendingImagePath(null)
              setMode('text')
            }}
            className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
            aria-label="Retirer la photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <VoiceInputButton
          disabled={busy || uploading}
          size="sm"
          ariaLabel="Dicter une réponse"
          onInterim={transcript => setSpeechInterim(transcript)}
          onFinal={transcript => {
            setSpeechInterim('')
            setVoiceError('')
            onDraftChange(appendSpeechTranscript(draftRef.current, transcript))
          }}
          onError={message => setVoiceError(message)}
        />
        <textarea
          rows={2}
          value={composedDraft}
          onChange={e => {
            setSpeechInterim('')
            setVoiceError('')
            onDraftChange(e.target.value)
          }}
          placeholder={
            mode === 'product'
              ? 'Message d’accompagnement (optionnel)…'
              : mode === 'service'
                ? 'Présentez cette sortie au voyageur…'
                : 'Répondre au voyageur…'
          }
          className="min-h-[44px] flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-info/20"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
        />
        <Button disabled={busy || uploading || !canSend} onClick={() => void handleSend()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {(voiceError || uploadError) && (
        <p className="text-sm text-destructive">{voiceError || uploadError}</p>
      )}
    </div>
  )
}
