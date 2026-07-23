import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { AgencyClientRequestModal } from '@/components/reservation/AgencyClientRequestModal'
import { useAuth } from '@/lib/authContext'
import { fetchMyClientRequests, fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  reservationStatusLabels,
  type ReservationStatus,
} from '@/lib/reservationWorkflow'
import type { Property, Reservation } from '@/lib/types'

function statusBadgeVariant(status: string): 'success' | 'warning' | 'muted' | 'info' {
  if (status === 'confirmed' || status === 'in_progress') return 'success'
  if (status === 'completed') return 'muted'
  if (status === 'cancelled') return 'warning'
  return 'info'
}

export function ClientRequestsPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<Reservation[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    Promise.all([
      fetchMyClientRequests(user.id),
      fetchOwnerProperties(user.id),
    ]).then(([requestResult, propertyResult]) => {
      setRequests((requestResult.data as Reservation[]) ?? [])
      setProperties((propertyResult.data as Property[]) ?? [])
      setError(requestResult.error?.message ?? propertyResult.error?.message ?? '')
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  const activeProperties = properties.filter(property => property.status === 'active')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Agence immobilière
          </p>
          <h1 className="mt-1 text-xl font-semibold">Demandes clients</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Proposez des dates pour vos clients. Le propriétaire valide ou refuse chaque demande.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          disabled={activeProperties.length === 0}
        >
          Nouvelle demande
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {activeProperties.length === 0 ? (
        <EmptyState
          title="Aucune propriété accessible"
          description="Demandez au propriétaire de vous inviter sur une villa (rôle Agence immobilière) pour voir le calendrier et envoyer des demandes."
        />
      ) : requests.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          description="Créez une demande depuis cette page ou depuis le calendrier."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-3 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Propriété
                  </th>
                  <th className="px-4 py-3 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Arrivée
                  </th>
                  <th className="px-4 py-3 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Départ
                  </th>
                  <th className="px-4 py-3 text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id} className="h-14 border-b border-border last:border-0">
                    <td className="px-4 text-sm font-medium">{request.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">
                      {request.properties?.name ?? '—'}
                    </td>
                    <td className="px-4 font-mono text-sm">
                      {formatDateForDisplay(request.arrival, profile?.date_format)}
                    </td>
                    <td className="px-4 font-mono text-sm">
                      {formatDateForDisplay(request.departure, profile?.date_format)}
                    </td>
                    <td className="px-4">
                      <Badge variant={statusBadgeVariant(request.status)}>
                        {reservationStatusLabels[request.status as ReservationStatus] ?? request.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AgencyClientRequestModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        properties={activeProperties}
        onCreated={reservation => {
          setRequests(current => [reservation, ...current])
        }}
      />
    </div>
  )
}
