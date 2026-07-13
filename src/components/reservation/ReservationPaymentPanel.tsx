import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatDateForDisplay, todayISO } from '@/lib/dateFormat'
import {
  addReservationPayment,
  computePaidTotal,
  computeRemainingAmount,
  fetchReservationPayments,
  markReservationFullyPaid,
  paymentStatusLabel,
  paymentTypeLabel,
  type ReservationPayment,
  type ReservationPaymentKind,
} from '@/lib/reservationPayments'
import type { Reservation } from '@/lib/types'

interface ReservationPaymentPanelProps {
  reservation: Reservation
  dateFormat?: string | null
  onReservationChange: (reservation: Reservation) => void
}

export function ReservationPaymentPanel({
  reservation,
  dateFormat,
  onReservationChange,
}: ReservationPaymentPanelProps) {
  const [payments, setPayments] = useState<ReservationPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [kind, setKind] = useState<ReservationPaymentKind>('deposit')
  const [notes, setNotes] = useState('')
  const [fullPaymentDate, setFullPaymentDate] = useState(todayISO())

  const totalAmount = Number(reservation.total_amount)
  const paidTotal = computePaidTotal(payments)
  const remaining = computeRemainingAmount(paidTotal, totalAmount)
  const isFullyPaid = reservation.payment_status === 'paid' || remaining <= 0

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    fetchReservationPayments(reservation.id).then(({ data, error: fetchError }) => {
      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
        setPayments([])
      } else {
        setPayments((data ?? []) as ReservationPayment[])
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [reservation.id])

  const refreshFromResult = (nextReservation: Reservation, nextPayments: ReservationPayment[]) => {
    setPayments(nextPayments)
    onReservationChange(nextReservation)
  }

  const handleAddPayment = async () => {
    setSaving(true)
    setError('')
    try {
      const parsedAmount = Number(amount.replace(',', '.'))
      if (parsedAmount > remaining) {
        throw new Error(`Le montant dépasse le reste à payer (${remaining.toLocaleString('fr-FR')} €).`)
      }
      const result = await addReservationPayment({
        reservation,
        amount: parsedAmount,
        date: paymentDate,
        kind,
        notes,
      })
      refreshFromResult(result.reservation, result.payments)
      setAmount('')
      setNotes('')
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Impossible d’enregistrer le paiement.')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkFullyPaid = async () => {
    setSaving(true)
    setError('')
    try {
      const result = await markReservationFullyPaid(reservation, fullPaymentDate)
      refreshFromResult(result.reservation, result.payments)
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Impossible de marquer le paiement comme complet.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Paiement</p>
        <Badge variant={
          reservation.payment_status === 'paid'
            ? 'success'
            : reservation.payment_status === 'partial'
              ? 'warning'
              : 'muted'
        }>
          {paymentStatusLabel(reservation.payment_status)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-md border border-border bg-muted/20 p-3">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-medium">{totalAmount.toLocaleString('fr-FR')} €</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reçu</p>
          <p className="text-sm font-medium text-success">{paidTotal.toLocaleString('fr-FR')} €</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reste</p>
          <p className="text-sm font-medium">{remaining.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement des paiements…</p>
      ) : payments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Historique</p>
          <div className="space-y-2">
            {payments.map(payment => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{paymentTypeLabel(payment.type)}</p>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground">{payment.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">{Number(payment.amount).toLocaleString('fr-FR')} €</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.date ? formatDateForDisplay(payment.date, dateFormat) : '—'}
                    {' · '}
                    {payment.status === 'paid' ? 'Payé' : payment.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isFullyPaid && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-sm font-medium">Enregistrer un paiement</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Montant (€)"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder={remaining > 0 ? remaining.toLocaleString('fr-FR') : '0'}
            />
            <DateInput
              label="Date du paiement"
              value={paymentDate}
              onChange={setPaymentDate}
            />
            <Select
              label="Type"
              value={kind}
              onChange={event => setKind(event.target.value as ReservationPaymentKind)}
              options={[
                { value: 'deposit', label: 'Acompte' },
                { value: 'installment', label: 'Versement partiel' },
                { value: 'balance', label: 'Solde' },
              ]}
            />
            <Input
              label="Note (optionnel)"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Virement, chèque, espèces…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleAddPayment}
              disabled={saving || !amount.trim()}
            >
              {saving ? 'Enregistrement…' : 'Ajouter le paiement'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkFullyPaid}
              disabled={saving}
            >
              Marquer comme intégralement payé
            </Button>
          </div>
          <DateInput
            label="Date du solde final"
            value={fullPaymentDate}
            onChange={setFullPaymentDate}
          />
        </div>
      )}

      {isFullyPaid && (
        <p className="text-sm text-muted-foreground">
          Cette réservation est entièrement réglée.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
