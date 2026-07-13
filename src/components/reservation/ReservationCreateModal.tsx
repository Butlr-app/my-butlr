import { useEffect, useRef, useState } from 'react'
import {
  CalendarOff,
  FileCheck2,
  FilePlus2,
  Hotel,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Select } from '@/components/ui/Select'
import { DateInput } from '@/components/ui/DateInput'
import { ContractFilePicker } from '@/components/contract/ContractFilePicker'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Property, Reservation } from '@/lib/types'
import { useAuth } from '@/lib/authContext'
import {
  uploadAndAnalyzeContractFiles,
  extractContractPrefillData,
  extractContractText,
  validateContractFiles,
  type ContractAnalysisProgress,
  type ContractPrefillData,
} from '@/lib/contractFiles'
import { analyzeContractWithVision } from '@/lib/contractVision'
import { useNavigate } from 'react-router-dom'
import {
  blockReasonLabels,
  buildReservationInsertPayload,
  validateReservationInput,
  type BookingKind,
  type ContractMode,
  type ReservationFormInput,
} from '@/lib/reservationWorkflow'
import {
  calculateStayQuote,
  fetchPropertyPricing,
  formatPrice,
  type StayQuote,
} from '@/lib/propertyPricing'

interface ContractOption {
  value: ContractMode
  title: string
  description: string
  icon: typeof FilePlus2
}

const contractOptions: ContractOption[] = [
  {
    value: 'to_prepare',
    title: 'Contrat à préparer',
    description: 'Le contrat doit être créé et envoyé au client.',
    icon: FilePlus2,
  },
  {
    value: 'already_done',
    title: 'Contrat déjà fait',
    description: 'Le contrat existe déjà ou a déjà été signé.',
    icon: FileCheck2,
  },
  {
    value: 'concierge',
    title: 'Contrat par la conciergerie',
    description: 'La conciergerie prend en charge le contrat.',
    icon: Hotel,
  },
  {
    value: 'none',
    title: 'Aucun contrat',
    description: 'Bloquer uniquement les dates du calendrier.',
    icon: CalendarOff,
  },
]

const blockReasons: { value: BookingKind; label: string }[] = Object
  .entries(blockReasonLabels)
  .map(([value, label]) => ({ value: value as BookingKind, label }))

interface ReservationCreateModalProps {
  open: boolean
  onClose: () => void
  properties: Property[]
  onCreated: (reservation: Reservation) => void
}

export function ReservationCreateModal({
  open,
  onClose,
  properties,
  onCreated,
}: ReservationCreateModalProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [propertyId, setPropertyId] = useState('')
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [contractMode, setContractMode] = useState<ContractMode | null>(null)
  const [bookingKind, setBookingKind] = useState<BookingKind>('owner_stay')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestsCount, setGuestsCount] = useState(1)
  const [totalAmount, setTotalAmount] = useState('')
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false)
  const [pricingQuote, setPricingQuote] = useState<StayQuote | null>(null)
  const [blockTitle, setBlockTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [contractFiles, setContractFiles] = useState<File[]>([])
  const [analysisProgress, setAnalysisProgress] = useState<ContractAnalysisProgress | null>(null)
  const [prefillAnalyzing, setPrefillAnalyzing] = useState(false)
  const [ocrPrefill, setOcrPrefill] = useState<ContractPrefillData | null>(null)
  const [ocrError, setOcrError] = useState('')
  const [preExtractedText, setPreExtractedText] = useState<Map<File, string>>(new Map())
  const [analysisSource, setAnalysisSource] = useState<'vision' | 'ocr' | null>(null)
  const analysisRun = useRef(0)
  const lastAutoPrefill = useRef<ContractPrefillData | null>(null)

  useEffect(() => {
    if (open && !propertyId && properties.length > 0) {
      setPropertyId(properties[0].id)
    }
  }, [open, properties, propertyId])

  const selectedProperty = properties.find(property => property.id === propertyId)

  useEffect(() => {
    if (
      !open
      || !propertyId
      || !arrival
      || !departure
      || departure <= arrival
      || contractMode === 'none'
    ) {
      setPricingQuote(null)
      return
    }

    let active = true
    fetchPropertyPricing(propertyId).then(result => {
      if (!active || !result.settings || result.error) return
      const quote = calculateStayQuote({
        arrival,
        departure,
        guests: guestsCount,
        settings: result.settings,
        seasons: result.seasons,
        overrides: result.overrides,
      })
      setPricingQuote(quote)
      if (!priceManuallyEdited && !totalAmount) {
        setTotalAmount(quote.total.toFixed(2))
      }
    })

    return () => { active = false }
  }, [
    open,
    propertyId,
    arrival,
    departure,
    contractMode,
    guestsCount,
    priceManuallyEdited,
    totalAmount,
  ])

  const reset = () => {
    setPropertyId(properties[0]?.id ?? '')
    setArrival('')
    setDeparture('')
    setContractMode(null)
    setBookingKind('owner_stay')
    setGuestName('')
    setGuestEmail('')
    setGuestPhone('')
    setGuestsCount(1)
    setTotalAmount('')
    setPriceManuallyEdited(false)
    setPricingQuote(null)
    setBlockTitle('')
    setNotes('')
    setError('')
    setContractFiles([])
    setAnalysisProgress(null)
    setPrefillAnalyzing(false)
    setOcrPrefill(null)
    setOcrError('')
    setPreExtractedText(new Map())
    setAnalysisSource(null)
    lastAutoPrefill.current = null
    analysisRun.current += 1
  }

  const applyContractPrefill = (prefill: ContractPrefillData) => {
    const previous = lastAutoPrefill.current
    setOcrPrefill(prefill)
    setGuestName(current =>
      !current.trim() || current === previous?.guestName ? prefill.guestName ?? '' : current
    )
    setGuestEmail(current =>
      !current.trim() || current === previous?.guestEmail ? prefill.guestEmail ?? '' : current
    )
    setGuestPhone(current =>
      !current.trim() || current === previous?.guestPhone ? prefill.guestPhone ?? '' : current
    )
    setArrival(current =>
      !current || current === previous?.arrival ? prefill.arrival ?? '' : current
    )
    setDeparture(current =>
      !current || current === previous?.departure ? prefill.departure ?? '' : current
    )
    if (
      prefill.totalAmount !== null
      && (!priceManuallyEdited || Number(totalAmount) === previous?.totalAmount)
    ) {
      setTotalAmount(prefill.totalAmount.toFixed(2))
    }
    lastAutoPrefill.current = prefill
  }

  const handleContractFilesChange = async (files: File[]) => {
    setContractFiles(files)
    setOcrPrefill(null)
    setOcrError('')
    setPreExtractedText(new Map())
    setAnalysisSource(null)
    const run = ++analysisRun.current

    if (files.length === 0) {
      setPrefillAnalyzing(false)
      setAnalysisProgress(null)
      return
    }
    const validationError = validateContractFiles(files)
    if (validationError) {
      setOcrError(validationError)
      return
    }

    setPrefillAnalyzing(true)
    try {
      setAnalysisProgress({
        fileName: files.length === 1 ? files[0].name : `${files.length} fichiers`,
        phase: 'extract',
        progress: 15,
      })
      const vision = await analyzeContractWithVision(files)
      if (analysisRun.current !== run) return
      applyContractPrefill(vision.prefill)
      setAnalysisSource('vision')
      setAnalysisProgress({
        fileName: files.length === 1 ? files[0].name : `${files.length} fichiers`,
        phase: 'completed',
        progress: 100,
      })
    } catch {
      try {
      const extracted = new Map<File, string>()
      const texts: string[] = []
      for (const file of files) {
        const text = await extractContractText(file, progress => {
          if (analysisRun.current === run) setAnalysisProgress(progress)
        })
        extracted.set(file, text)
        texts.push(text)
      }
      if (analysisRun.current !== run) return

      const prefill = extractContractPrefillData(texts.join('\n'))
      setPreExtractedText(extracted)
      applyContractPrefill(prefill)
      setAnalysisSource('ocr')
      setAnalysisProgress({
        fileName: files.length === 1 ? files[0].name : `${files.length} fichiers`,
        phase: 'completed',
        progress: 100,
      })
      } catch (analysisError) {
        if (analysisRun.current !== run) return
        setOcrError(analysisError instanceof Error
          ? analysisError.message
          : 'Impossible d’analyser ce contrat.')
      }
    } finally {
      if (analysisRun.current === run) setPrefillAnalyzing(false)
    }
  }

  const close = () => {
    if (saving) return
    reset()
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const input: ReservationFormInput = {
      propertyId,
      arrival,
      departure,
      contractMode,
      bookingKind,
      guestName,
      guestEmail,
      guestPhone,
      guestsCount,
      totalAmount,
      blockTitle,
      notes,
      propertyMaxGuests: selectedProperty?.max_guests,
    }
    const validationError = validateReservationInput(input)

    if (validationError) {
      setError(validationError)
      return
    }

    if (contractMode !== 'none' && pricingQuote) {
      if (pricingQuote.unavailableDates.length > 0) {
        setError('Cette période contient des dates indisponibles dans le calendrier tarifaire.')
        return
      }
      if (pricingQuote.nights < pricingQuote.minimumStay) {
        setError(`Le séjour minimum pour cette date est de ${pricingQuote.minimumStay} nuits.`)
        return
      }
    }

    if (contractMode === 'already_done' || contractMode === 'concierge') {
      const fileError = validateContractFiles(contractFiles)
      if (fileError) {
        setError(fileError)
        return
      }
    }

    if (!user) {
      setError('Votre session a expiré. Reconnectez-vous pour continuer.')
      return
    }

    setSaving(true)

    const { data: conflicts, error: conflictError } = await supabase
      .from('reservations')
      .select('id')
      .eq('property_id', propertyId)
      .neq('status', 'cancelled')
      .lt('arrival', departure)
      .gt('departure', arrival)
      .limit(1)

    if (conflictError) {
      setSaving(false)
      setError(conflictError.message)
      return
    }

    if (conflicts && conflicts.length > 0) {
      setSaving(false)
      setError('Ces dates chevauchent déjà une réservation ou un blocage existant.')
      return
    }

    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert(buildReservationInsertPayload(input))
      .select('*')
      .single()

    if (insertError || !data) {
      setSaving(false)
      setError(insertError?.message ?? 'Impossible de créer la réservation.')
      return
    }

    const property = properties.find(item => item.id === propertyId)
    const createdReservation = {
      ...(data as Reservation),
      properties: property ? { name: property.name } : null,
    }

    if (contractMode === 'already_done' || contractMode === 'concierge') {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('reservation_id', data.id)
        .eq('type', 'rental')
        .single()

      if (contractError || !contract) {
        setSaving(false)
        setError(contractError?.message ?? 'Le dossier du contrat n’a pas pu être créé.')
        return
      }

      try {
        await uploadAndAnalyzeContractFiles({
          reservationId: data.id,
          contractId: contract.id,
          userId: user.id,
          source: contractMode === 'already_done' ? 'owner_upload' : 'concierge_upload',
          files: contractFiles,
          preExtractedText,
          onProgress: setAnalysisProgress,
        })
      } catch (uploadError) {
        const { data: storedFiles } = await supabase
          .from('contract_files')
          .select('storage_path')
          .eq('reservation_id', data.id)
        const paths = (storedFiles ?? []).map(file => file.storage_path)
        if (paths.length > 0) {
          await supabase.storage.from('contract-files').remove(paths)
        }
        await supabase.from('reservations').delete().eq('id', data.id)
        setSaving(false)
        setError(uploadError instanceof Error
          ? uploadError.message
          : 'Impossible de transférer ou d’analyser le contrat.')
        return
      }
    }

    setSaving(false)
    onCreated(createdReservation)
    reset()
    onClose()

    if (contractMode === 'to_prepare') {
      navigate(`/app/contracts/generate?reservation=${data.id}`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nouvelle réservation"
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Propriété"
              value={propertyId}
              onChange={event => setPropertyId(event.target.value)}
              options={properties.map(property => ({
                value: property.id,
                label: property.name,
              }))}
              required
            />
            <DateInput
              label="Arrivée"
              value={arrival}
              onChange={setArrival}
              required
            />
            <DateInput
              label="Départ"
              min={arrival || undefined}
              value={departure}
              onChange={setDeparture}
              required
            />
          </div>
        </section>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            Comment souhaitez-vous gérer le contrat ?
          </legend>
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
            {contractOptions.map(option => {
              const Icon = option.icon
              const selected = contractMode === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setContractMode(option.value)}
                  className={cn(
                    'flex min-h-24 cursor-pointer items-start gap-3 rounded-md border p-4 text-left transition-colors',
                    selected
                      ? 'border-foreground bg-muted'
                      : 'border-border bg-card hover:border-foreground/40',
                  )}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {contractMode === 'none' && (
          <section className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
            <Select
              label="Motif du blocage"
              value={bookingKind}
              onChange={event => setBookingKind(event.target.value as BookingKind)}
              options={blockReasons}
            />
            <Input
              label="Libellé"
              value={blockTitle}
              onChange={event => setBlockTitle(event.target.value)}
              placeholder={blockReasons.find(reason => reason.value === bookingKind)?.label}
            />
          </section>
        )}

        {contractMode === 'to_prepare' && (
          <section className="rounded-md border border-info/30 bg-info-soft p-4">
            <p className="text-sm font-medium text-foreground">Préparation complète après validation</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              La réservation préremplira le modèle de contrat. Vous pourrez compléter toutes les
              clauses, générer le PDF puis l’enregistrer dans le dossier du client.
            </p>
          </section>
        )}

        {(contractMode === 'already_done' || contractMode === 'concierge') && (
          <section className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">
                {contractMode === 'already_done'
                  ? 'Importer le contrat existant'
                  : 'Transférer le contrat de la conciergerie'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Les PDF et images seront conservés dans un espace privé. Le texte et les
                informations clés seront extraits par Vision, avec OCR local de secours.
              </p>
            </div>
            <ContractFilePicker
              files={contractFiles}
              onChange={handleContractFilesChange}
              disabled={saving || prefillAnalyzing}
              error={ocrError}
            />
            {prefillAnalyzing && (
              <p className="text-xs text-info">
                Analyse visuelle du contrat et préremplissage des informations…
              </p>
            )}
            {analysisProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="truncate">{analysisProgress.fileName}</span>
                  <span>{analysisProgress.phase === 'ocr' ? 'OCR' : 'Analyse'} {analysisProgress.progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-foreground transition-[width] duration-200"
                    style={{ width: `${analysisProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
            {ocrPrefill && !prefillAnalyzing && (
              <div className="rounded-md border border-success/30 bg-success-soft p-3">
                <p className="text-sm font-medium text-success">
                  Données détectées et préremplies
                  {analysisSource === 'vision' ? ' par Vision' : ' par OCR'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {ocrPrefill.guestName && <span>Client : {ocrPrefill.guestName}</span>}
                  {ocrPrefill.guestEmail && <span>· {ocrPrefill.guestEmail}</span>}
                  {ocrPrefill.guestPhone && <span>· {ocrPrefill.guestPhone}</span>}
                  {ocrPrefill.arrival && ocrPrefill.departure && (
                    <span>· Séjour : {ocrPrefill.arrival} → {ocrPrefill.departure}</span>
                  )}
                  {ocrPrefill.totalAmount !== null && (
                    <span>· Montant : {ocrPrefill.totalAmount.toLocaleString('fr-FR')} €</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Vérifiez les champs avant de créer la réservation.
                </p>
              </div>
            )}
          </section>
        )}

        {contractMode && contractMode !== 'none' && (
          <section className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nom du client"
                value={guestName}
                onChange={event => setGuestName(event.target.value)}
                required
              />
              <NumberStepper
                label="Nombre de voyageurs"
                value={guestsCount}
                onChange={setGuestsCount}
                min={1}
                max={selectedProperty?.max_guests ?? 50}
              />
              <Input
                label="E-mail (optionnel)"
                type="email"
                value={guestEmail}
                onChange={event => setGuestEmail(event.target.value)}
              />
              <Input
                label="Téléphone (optionnel)"
                type="tel"
                value={guestPhone}
                onChange={event => setGuestPhone(event.target.value)}
              />
              <Input
                label={`Montant total (${pricingQuote?.currency ?? 'EUR'})`}
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={event => {
                  setTotalAmount(event.target.value)
                  setPriceManuallyEdited(true)
                }}
              />
            </div>
            {pricingQuote && (
              <div className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Estimation automatique</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pricingQuote.nights} nuit{pricingQuote.nights > 1 ? 's' : ''}
                      {' · '}
                      minimum {pricingQuote.minimumStay}
                    </p>
                  </div>
                  <p className="font-mono text-lg font-semibold">
                    {formatPrice(pricingQuote.total, pricingQuote.currency)}
                  </p>
                </div>
                <div className="mt-3 grid gap-1 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>Hébergement : {formatPrice(pricingQuote.accommodationSubtotal, pricingQuote.currency)}</span>
                  <span>Ménage : {formatPrice(pricingQuote.cleaningFee, pricingQuote.currency)}</span>
                  {pricingQuote.discountAmount > 0 && (
                    <span>Remise {pricingQuote.discountRate}% : −{formatPrice(pricingQuote.discountAmount, pricingQuote.currency)}</span>
                  )}
                  {pricingQuote.extraGuestFee > 0 && <span>Voyageurs supplémentaires : {formatPrice(pricingQuote.extraGuestFee, pricingQuote.currency)}</span>}
                  {pricingQuote.touristTax > 0 && <span>Taxe de séjour : {formatPrice(pricingQuote.touristTax, pricingQuote.currency)}</span>}
                </div>
              </div>
            )}
          </section>
        )}

        {contractMode && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Notes (optionnel)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Informations complémentaires…"
              className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving || prefillAnalyzing || properties.length === 0}>
            {saving
              ? analysisProgress ? 'Analyse du contrat…' : 'Création…'
              : contractMode === 'none'
                ? 'Bloquer les dates'
                : contractMode === 'to_prepare'
                  ? 'Créer et préparer le contrat'
                  : 'Créer et analyser le contrat'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
