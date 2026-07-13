import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { ReservationCreateModal } from '@/components/reservation/ReservationCreateModal'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties, fetchOwnerReservations } from '@/lib/data'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { formatDateForDisplay } from '@/lib/dateFormat'
import type { Property, Reservation } from '@/lib/types'

const contractModeLabels: Record<string, string> = {
  to_prepare: 'À préparer',
  already_done: 'Déjà fait',
  concierge: 'Conciergerie',
  none: 'Sans contrat',
}

export function Reservations() {
  const { user, profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    Promise.all([
      fetchOwnerReservations(user.id),
      fetchOwnerProperties(user.id),
    ]).then(([reservationResult, propertyResult]) => {
      setReservations((reservationResult.data as Reservation[]) ?? [])
      setProperties((propertyResult.data as Property[]) ?? [])
      setError(reservationResult.error?.message ?? propertyResult.error?.message ?? '')
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  const activeProperties = properties.filter(property => property.status === 'active')

  const handleReservationUpdated = (updated: Reservation) => {
    setReservations(current => current.map(reservation =>
      reservation.id === updated.id ? { ...reservation, ...updated } : reservation
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Réservations</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} disabled={activeProperties.length === 0}>
          Nouvelle réservation
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {reservations.length === 0 ? (
        <EmptyState
          title="No reservations yet"
          description="Create your first reservation to start managing guest stays."
          action={activeProperties.length > 0 ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Créer une réservation
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ajoutez d’abord une propriété.
            </p>
          )}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Séjour / blocage</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Arrival</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Departure</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guests</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Contract</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors h-14"
                    onClick={() => openReservation(r, { onUpdated: handleReservationUpdated })}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        openReservation(r, { onUpdated: handleReservationUpdated })
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="px-4 text-sm font-medium">{r.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">{r.properties?.name}</td>
                    <td className="px-4 text-sm font-mono">
                      {formatDateForDisplay(r.arrival, profile?.date_format)}
                    </td>
                    <td className="px-4 text-sm font-mono">
                      {formatDateForDisplay(r.departure, profile?.date_format)}
                    </td>
                    <td className="px-4 text-sm font-mono text-right">{r.guests_count}</td>
                    <td className="px-4">
                      <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status}</Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={r.payment_status === 'paid' ? 'success' : r.payment_status === 'partial' ? 'warning' : 'muted'}>
                        {r.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={r.contract_mode === 'already_done' ? 'success' : r.contract_mode === 'concierge' ? 'info' : 'muted'}>
                        {contractModeLabels[r.contract_mode] ?? r.contract_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ReservationCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        properties={activeProperties}
        onCreated={reservation => {
          setReservations(current => [...current, reservation].sort((a, b) => a.arrival.localeCompare(b.arrival)))
        }}
      />
    </div>
  )
}
