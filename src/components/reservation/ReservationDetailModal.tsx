import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText, Pencil, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Select } from '@/components/ui/Select'
import { LoadingState } from '@/components/EmptyState'
import { ReservationPaymentPanel } from '@/components/reservation/ReservationPaymentPanel'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { paymentStatusLabel } from '@/lib/reservationPayments'
import {
  fetchStayReserveByReservation,
  formatReserveAmount,
  stayReserveStatusLabels,
  type StayReserve,
} from '@/lib/stayReserve'
import {
  blockReasonLabels,
  buildAgencyRequestDecisionPayload,
  buildReservationUpdatePayload,
  isPendingAgencyClientRequest,
  reservationStatusLabels,
  validateReservationUpdate,
  type AgencyRequestDecision,
  type ReservationStatus,
} from '@/lib/reservationWorkflow'
import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/lib/types'
import { usePermissions } from '@/lib/permissionsContext'
import { useRole } from '@/lib/roleContext'
import { formatMaskedAmount } from '@/lib/permissions'

const contractModeLabels: Record<string, string> = {
  to_prepare: 'À préparer',
  already_done: 'Déjà fait',
  concierge: 'Conciergerie',
  none: 'Sans contrat',
}

interface ReservationDetailModalProps {
  open: boolean
  loading?: boolean
  reservation: Reservation | null
  dateFormat?: string | null
  onClose: () => void
  onUpdated: (reservation: Reservation) => void
}

function isGuestBooking(reservation: Reservation): boolean {
  return reservation.booking_kind === 'guest'
}

export function ReservationDetailModal({
  open,
  loading = false,
  reservation,
  dateFormat,
  onClose,
  onUpdated,
}: ReservationDetailModalProps) {
  const { can } = usePermissions()
  const { role } = useRole()
  const canViewAmounts = can('reservation_amounts')
  const canViewContracts = can('contracts')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [error, setError] = useState('')
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [stayReserve, setStayReserve] = useState<StayReserve | null>(null)
  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    arrival: '',
    departure: '',
    guestsCount: 1,
    totalAmount: '',
    notes: '',
    status: 'confirmed' as ReservationStatus,
    guestLanguage: 'fr',
  })

  useEffect(() => {
    if (!reservation) {
      setEditing(false)
      setError('')
      return
    }

    setForm({
      guestName: reservation.guest_name ?? '',
      guestEmail: reservation.guest_email ?? '',
      guestPhone: reservation.guest_phone ?? '',
      arrival: reservation.arrival,
      departure: reservation.departure,
      guestsCount: reservation.guests_count,
      totalAmount: String(reservation.total_amount ?? ''),
      notes: reservation.notes ?? '',
      status: reservation.status as ReservationStatus,
      guestLanguage: reservation.guest_language ?? 'fr',
    })
    setEditing(false)
    setError('')
  }, [reservation?.id, open])

  useEffect(() => {
    if (!open || !reservation || !isGuestBooking(reservation)) {
      setStayReserve(null)
      return
    }

    fetchStayReserveByReservation(reservation.id).then(({ data }) => {
      setStayReserve((data as StayReserve | null) ?? null)
    })
  }, [open, reservation?.id])

  useEffect(() => {
    if (!open || !reservation || !isGuestBooking(reservation)) {
      setPortalToken(null)
      return
    }

    if (reservation.portal_access_token) {
      setPortalToken(reservation.portal_access_token)
      return
    }

    supabase
      .from('reservations')
      .select('portal_access_token')
      .eq('id', reservation.id)
      .maybeSingle()
      .then(({ data }) => setPortalToken(data?.portal_access_token ?? null))
  }, [open, reservation?.id, reservation?.portal_access_token])

  const handleClose = () => {
    if (saving || cancelling || deciding) return
    setEditing(false)
    setError('')
    onClose()
  }

  const decideAgencyRequest = async (decision: AgencyRequestDecision) => {
    if (!reservation || !isPendingAgencyClientRequest(reservation)) return
    if (role === 'agency') return

    const confirmLabel = decision === 'approve'
      ? 'Confirmer cette demande agence ?'
      : 'Refuser cette demande agence ?'
    if (!confirm(confirmLabel)) return

    setDeciding(true)
    setError('')

    const { data, error: updateError } = await supabase
      .from('reservations')
      .update(buildAgencyRequestDecisionPayload(decision))
      .eq('id', reservation.id)
      .select('*, properties(name, max_guests)')
      .single()

    setDeciding(false)

    if (updateError || !data) {
      setError(
        updateError?.message
          ?? (decision === 'approve'
            ? 'Impossible de confirmer cette demande.'
            : 'Impossible de refuser cette demande.'),
      )
      return
    }

    onUpdated(data as Reservation)
  }

  const handleSave = async () => {
    if (!reservation) return

    const guestBooking = isGuestBooking(reservation)
    const propertyMaxGuests = (reservation.properties as { max_guests?: number } | null | undefined)?.max_guests
    const validationError = validateReservationUpdate({
      ...form,
      propertyMaxGuests,
    }, guestBooking)

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    const { data: conflicts, error: conflictError } = await supabase
      .from('reservations')
      .select('id')
      .eq('property_id', reservation.property_id)
      .not('status', 'in', '("cancelled","completed")')
      .neq('id', reservation.id)
      .lt('arrival', form.departure)
      .gt('departure', form.arrival)
      .limit(1)

    if (conflictError) {
      setSaving(false)
      setError(conflictError.message)
      return
    }

    if (conflicts && conflicts.length > 0) {
      setSaving(false)
      setError('Ces dates chevauchent déjà une autre réservation ou un blocage.')
      return
    }

    const { data, error: updateError } = await supabase
      .from('reservations')
      .update(buildReservationUpdatePayload(form, guestBooking))
      .eq('id', reservation.id)
      .select('*, properties(name, max_guests)')
      .single()

    setSaving(false)

    if (updateError || !data) {
      setError(updateError?.message ?? 'Impossible de mettre à jour la réservation.')
      return
    }

    const updated = data as Reservation
    onUpdated(updated)
    setEditing(false)
  }

  const cancelReservation = async () => {
    if (!reservation || reservation.status === 'cancelled') return
    if (!confirm('Annuler cette réservation ?')) return

    setCancelling(true)
    setError('')

    const { data, error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservation.id)
      .select('*, properties(name, max_guests)')
      .single()

    setCancelling(false)

    if (updateError || !data) {
      setError(updateError?.message ?? 'Impossible d’annuler cette réservation.')
      return
    }

    onUpdated(data as Reservation)
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={reservation ? (editing ? 'Modifier la réservation' : 'Détail de la réservation') : 'Réservation'}
      className="max-w-2xl"
    >
      {loading ? (
        <LoadingState label="Chargement…" />
      ) : !reservation ? (
        <p className="text-sm text-muted-foreground">Réservation introuvable.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={reservation.status === 'confirmed' ? 'success' : reservation.status === 'cancelled' ? 'destructive' : 'warning'}>
                {reservationStatusLabels[reservation.status as ReservationStatus] ?? reservation.status}
              </Badge>
              {isPendingAgencyClientRequest(reservation) && (
                <Badge variant="info">Demande agence</Badge>
              )}
              {isGuestBooking(reservation) && (
                <Badge variant={
                  reservation.payment_status === 'paid' ? 'success'
                    : reservation.payment_status === 'partial' ? 'warning'
                      : 'muted'
                }>
                  {paymentStatusLabel(reservation.payment_status)}
                </Badge>
              )}
            </div>
            {reservation.status !== 'cancelled' && !editing && role !== 'agency' && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>

          {isPendingAgencyClientRequest(reservation) && !editing && (
            <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Demande agence immobilière</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {role === 'agency'
                    ? 'En attente de validation par le propriétaire.'
                    : 'Validez ou refusez cette demande de séjour client.'}
                </p>
              </div>
              {role !== 'agency' && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => decideAgencyRequest('reject')}
                    disabled={deciding || saving || cancelling}
                  >
                    {deciding ? 'Traitement…' : 'Refuser'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => decideAgencyRequest('approve')}
                    disabled={deciding || saving || cancelling}
                  >
                    {deciding ? 'Traitement…' : 'Confirmer'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {editing ? (
            <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
              <Input
                label={isGuestBooking(reservation) ? 'Nom du client' : 'Libellé'}
                value={form.guestName}
                onChange={event => setForm(current => ({ ...current, guestName: event.target.value }))}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateInput
                  label="Arrivée"
                  value={form.arrival}
                  onChange={value => setForm(current => ({ ...current, arrival: value }))}
                  required
                />
                <DateInput
                  label="Départ"
                  min={form.arrival || undefined}
                  value={form.departure}
                  onChange={value => setForm(current => ({ ...current, departure: value }))}
                  required
                />
              </div>
              {isGuestBooking(reservation) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="E-mail"
                    type="email"
                    value={form.guestEmail}
                    onChange={event => setForm(current => ({ ...current, guestEmail: event.target.value }))}
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={form.guestPhone}
                    onChange={event => setForm(current => ({ ...current, guestPhone: event.target.value }))}
                  />
                  <NumberStepper
                    label="Voyageurs"
                    value={form.guestsCount}
                    onChange={value => setForm(current => ({ ...current, guestsCount: value }))}
                    min={1}
                    max={(reservation.properties as { max_guests?: number } | null)?.max_guests ?? 50}
                  />
                  {canViewAmounts && (
                    <Input
                      label="Montant total (€)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.totalAmount}
                      onChange={event => setForm(current => ({ ...current, totalAmount: event.target.value }))}
                    />
                  )}
                  <Select
                    label="Langue du voyageur"
                    value={form.guestLanguage}
                    onChange={event => setForm(current => ({ ...current, guestLanguage: event.target.value }))}
                    options={[
                      { value: 'fr', label: 'Français' },
                      { value: 'en', label: 'English' },
                    ]}
                  />
                </div>
              )}
              <Select
                label="Statut"
                value={form.status}
                onChange={event => setForm(current => ({
                  ...current,
                  status: event.target.value as ReservationStatus,
                }))}
                options={Object.entries(reservationStatusLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {isGuestBooking(reservation) ? 'Client' : 'Motif'}
                  </p>
                  <p className="mt-1 text-sm font-medium">{reservation.guest_name}</p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Propriété</p>
                  <p className="mt-1 text-sm font-medium">{reservation.properties?.name}</p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Arrivée</p>
                  <p className="mt-1 font-mono text-sm">
                    {formatDateForDisplay(reservation.arrival, dateFormat)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Départ</p>
                  <p className="mt-1 font-mono text-sm">
                    {formatDateForDisplay(reservation.departure, dateFormat)}
                  </p>
                </div>
              </div>

              {!isGuestBooking(reservation) && (
                <p className="text-sm text-muted-foreground">
                  {blockReasonLabels[reservation.booking_kind as keyof typeof blockReasonLabels] ?? 'Blocage de dates'}
                </p>
              )}

              {isGuestBooking(reservation) && (
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Voyageurs</p>
                    <p className="mt-1 text-sm">{reservation.guests_count}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Montant</p>
                    <p className="mt-1 text-sm">
                      {formatMaskedAmount(reservation.total_amount, canViewAmounts)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Langue</p>
                    <p className="mt-1 text-sm">
                      {reservation.guest_language === 'en' ? 'English' : 'Français'}
                    </p>
                  </div>
                  {reservation.guest_email && (
                    <p className="text-sm text-muted-foreground">{reservation.guest_email}</p>
                  )}
                  {reservation.guest_phone && (
                    <p className="text-sm text-muted-foreground">{reservation.guest_phone}</p>
                  )}
                </div>
              )}

              {reservation.notes && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground">{reservation.notes}</p>
                </div>
              )}
            </>
          )}

          {!editing && (
            <>
              {canViewContracts && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Contrat</p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant={
                      reservation.contract_mode === 'already_done' ? 'success'
                        : reservation.contract_mode === 'concierge' ? 'info'
                          : 'muted'
                    }>
                      {contractModeLabels[reservation.contract_mode] ?? reservation.contract_status}
                    </Badge>
                    {reservation.contract_mode === 'to_prepare' && (
                      <Link
                        to={`/app/contracts/generate?reservation=${reservation.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                        onClick={handleClose}
                      >
                        Préparer le contrat
                      </Link>
                    )}
                    {(reservation.contract_mode === 'already_done' || reservation.contract_mode === 'concierge') && (
                      <Link
                        to="/app/contracts"
                        className="text-sm font-medium text-foreground hover:underline"
                        onClick={handleClose}
                      >
                        Voir les fichiers et l’analyse
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {canViewAmounts && isGuestBooking(reservation) && reservation.payment_status !== 'not_applicable' && (
                <ReservationPaymentPanel
                  reservation={reservation}
                  dateFormat={dateFormat}
                  onReservationChange={onUpdated}
                />
              )}

              {isGuestBooking(reservation) && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Réserve séjour
                  </p>
                  {stayReserve ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {canViewAmounts
                              ? `${formatReserveAmount(stayReserve.current_balance, stayReserve.currency)} disponibles`
                              : 'Solde masqué'}
                          </p>
                          <Badge variant="muted">{stayReserveStatusLabels[stayReserve.status]}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {canViewAmounts
                            ? (
                              <>
                                Versé {formatReserveAmount(stayReserve.initial_amount, stayReserve.currency)}
                                {' · '}
                                Dépensé {formatReserveAmount(stayReserve.spent_amount, stayReserve.currency)}
                              </>
                            )
                            : 'Détails financiers masqués'}
                        </p>
                      </div>
                      <Link
                        to={`/app/stay-reserves?reserve=${stayReserve.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                        onClick={handleClose}
                      >
                        Gérer la réserve
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pas encore activée par le voyageur.
                      {portalToken && (
                        <>
                          {' '}
                          <a
                            href={`/guest/stay/${portalToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:underline"
                          >
                            Ouvrir le portail client
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}

              {isGuestBooking(reservation) && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Facturation complémentaire
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Pré-remplir une facture avec les services conciergerie et boutique du séjour.
                    </p>
                    <Link
                      to={`/app/invoices/generate?reservation=${reservation.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                      onClick={handleClose}
                    >
                      <FileText className="h-4 w-4" />
                      Générer une facture
                    </Link>
                  </div>
                </div>
              )}

              {isGuestBooking(reservation) && portalToken && (
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Portail voyageur
                  </p>
                  <a
                    href={`/guest/stay/${portalToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir le portail client (Réserve séjour)
                  </a>
                </div>
              )}

              {reservation.status !== 'cancelled'
                && !isPendingAgencyClientRequest(reservation)
                && role !== 'agency' && (
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    variant="secondary"
                    onClick={cancelReservation}
                    disabled={cancelling || saving || deciding}
                  >
                    {cancelling ? 'Annulation…' : 'Annuler la réservation'}
                  </Button>
                </div>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
