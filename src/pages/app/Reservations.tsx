import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { ReservationCreateModal } from '@/components/reservation/ReservationCreateModal'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties, fetchOwnerReservations } from '@/lib/data'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  isActiveReservation,
  isArchivedReservation,
  reservationStatusLabels,
  type ReservationStatus,
} from '@/lib/reservationWorkflow'
import type { Property, Reservation } from '@/lib/types'

const contractModeLabels: Record<string, string> = {
  to_prepare: 'À préparer',
  already_done: 'Déjà fait',
  concierge: 'Conciergerie',
  none: 'Sans contrat',
}

type ReservationTab = 'active' | 'archived'

function statusBadgeVariant(status: string): 'success' | 'warning' | 'muted' | 'info' {
  if (status === 'confirmed' || status === 'in_progress') return 'success'
  if (status === 'completed') return 'muted'
  if (status === 'cancelled') return 'warning'
  return 'info'
}

function statusLabel(status: string): string {
  return reservationStatusLabels[status as ReservationStatus] ?? status
}

export function Reservations() {
  const { user, profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<ReservationTab>('active')

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

  const activeReservations = useMemo(
    () => reservations.filter(isActiveReservation),
    [reservations],
  )
  const archivedReservations = useMemo(
    () => reservations.filter(isArchivedReservation).sort((a, b) => b.departure.localeCompare(a.departure)),
    [reservations],
  )
  const visibleReservations = activeTab === 'active' ? activeReservations : archivedReservations

  if (loading) return <LoadingState />

  const activeProperties = properties.filter(property => property.status === 'active')

  const handleReservationUpdated = (updated: Reservation) => {
    setReservations(current => current.map(reservation =>
      reservation.id === updated.id ? { ...reservation, ...updated } : reservation
    ))
  }

  const renderReservationRow = (r: Reservation) => (
    <tr
      key={r.id}
      className="h-14 cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
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
      <td className="px-4 font-mono text-sm">
        {formatDateForDisplay(r.arrival, profile?.date_format)}
      </td>
      <td className="px-4 font-mono text-sm">
        {formatDateForDisplay(r.departure, profile?.date_format)}
      </td>
      <td className="px-4 text-right font-mono text-sm">{r.guests_count}</td>
      <td className="px-4">
        <Badge variant={statusBadgeVariant(r.status)}>{statusLabel(r.status)}</Badge>
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
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Réservations</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeReservations.length} actif{activeReservations.length > 1 ? 's' : ''}
            {archivedReservations.length > 0 && ` · ${archivedReservations.length} archivée${archivedReservations.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} disabled={activeProperties.length === 0}>
          Nouvelle réservation
        </Button>
      </div>

      {reservations.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'border-foreground/20 bg-foreground text-background'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            Actifs ({activeReservations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'archived'
                ? 'border-foreground/20 bg-foreground text-background'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            Archives ({archivedReservations.length})
          </button>
        </div>
      )}

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
      ) : visibleReservations.length === 0 ? (
        <EmptyState
          title={activeTab === 'archived' ? 'Aucune archive' : 'No reservations yet'}
          description={activeTab === 'archived'
            ? 'Les séjours passés seront archivés automatiquement après la date de départ.'
            : 'Create your first reservation to start managing guest stays.'}
          action={activeTab === 'active' && activeProperties.length > 0 ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Créer une réservation
            </Button>
          ) : undefined}
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
                {visibleReservations.map(renderReservationRow)}
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

