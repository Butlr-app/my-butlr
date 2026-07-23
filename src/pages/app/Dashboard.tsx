import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { usePermissions } from '@/lib/permissionsContext'
import { formatMaskedAmount } from '@/lib/permissions'
import {
  fetchOwnerReservations,
  fetchOwnerPayments,
  fetchOwnerProperties,
  todayISO,
} from '@/lib/data'
import { fetchOwnerTasks } from '@/lib/tasks'
import type { Reservation, Task, Payment } from '@/lib/types'
import {
  isCommercialReservation,
  isPendingAgencyClientRequest,
  reservationStatusLabels,
} from '@/lib/reservationWorkflow'
import { useReservationDetail } from '@/lib/reservationDetailContext'

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: reservationStatusLabels.pending,
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const TASK_PRIORITY_LABELS: Record<string, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Payé',
  pending: 'En attente',
}

export function Dashboard() {
  const { role } = useRole()
  const { user } = useAuth()
  const { can } = usePermissions()
  const canViewAmounts = can('reservation_amounts')
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [propertyCount, setPropertyCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function load() {
      const [resResult, taskResult, payResult, propResult] = await Promise.all([
        fetchOwnerReservations(userId),
        fetchOwnerTasks(userId),
        fetchOwnerPayments(userId),
        fetchOwnerProperties(userId),
      ])

      setReservations((resResult.data as Reservation[]) ?? [])
      setTasks((taskResult.data as Task[]) ?? [])
      setPayments((payResult.data as Payment[]) ?? [])
      setPropertyCount((propResult.data ?? []).length)
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return <LoadingState />

  const today = todayISO()
  const commercialReservations = reservations.filter(isCommercialReservation)
  const pendingAgencyRequests = reservations.filter(isPendingAgencyClientRequest)
  const activeStays = commercialReservations.filter(r => r.status === 'in_progress').length
  const upcomingArrivals = commercialReservations.filter(
    r => r.arrival >= today && r.status === 'confirmed',
  ).length
  const pendingTasks = tasks.filter(t => t.status === 'todo').length
  const serviceRevenue = payments
    .filter(p => p.status === 'paid' && p.type === 'service')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const handleReservationUpdated = (updated: Reservation) => {
    setReservations(current => current.map(r => (r.id === updated.id ? updated : r)))
  }

  const roleLabels: Record<string, string> = {
    owner: 'Tableau de bord propriétaire',
    house_manager: 'Tableau de bord house manager',
    concierge: 'Tableau de bord conciergerie',
    agency: 'Tableau de bord agence immobilière',
    partner: 'Tableau de bord prestataire',
    guest: 'Tableau de bord voyageur',
  }

  if (propertyCount === 0) {
    return (
      <div className="space-y-6">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {roleLabels[role]}
        </span>
        <EmptyState
          title="Bienvenue sur butlr"
          description="Votre tableau de bord se remplira dès que vous aurez ajouté des propriétés et des réservations."
          action={
            <Link to="/app/properties">
              <span className="text-sm text-foreground hover:underline">Aller aux propriétés</span>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {roleLabels[role]}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Séjours en cours" value={activeStays} />
        <MetricCard label="Arrivées à venir" value={upcomingArrivals} />
        <MetricCard label="Demandes agence" value={pendingAgencyRequests.length} />
        <MetricCard label="Propriétés" value={propertyCount} />
        <MetricCard
          label="Revenu conciergerie"
          value={canViewAmounts ? serviceRevenue : '•••'}
          prefix={canViewAmounts ? '€' : undefined}
        />
        <MetricCard label="Tâches en attente" value={pendingTasks} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {(role === 'owner' || pendingAgencyRequests.length > 0) && (
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Demandes agence à valider</h3>
              <Link to="/app/reservations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {pendingAgencyRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune demande en attente</p>
            ) : (
              <div className="space-y-3">
                {pendingAgencyRequests.slice(0, 5).map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openReservation(r, { onUpdated: handleReservationUpdated })}
                    className="flex w-full cursor-pointer items-center justify-between border-b border-border py-2 text-left last:border-0 hover:bg-muted/30"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.properties?.name} · {r.arrival} → {r.departure}
                      </p>
                    </div>
                    <Badge variant="warning">À valider</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Arrivées à venir</h3>
            <Link to="/app/reservations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingArrivals === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune arrivée à venir</p>
          ) : (
            <div className="space-y-3">
              {commercialReservations.filter(r => r.arrival >= today).slice(0, 3).map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openReservation(r, { onUpdated: handleReservationUpdated })}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-border py-2 text-left last:border-0 hover:bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.properties?.name}</p>
                  </div>
                  <Badge variant="success">{RESERVATION_STATUS_LABELS[r.status] ?? r.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Tâches en attente</h3>
            <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingTasks === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tâche en attente</p>
          ) : (
            <div className="space-y-3">
              {tasks.filter(t => t.status === 'todo').slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.properties?.name}</p>
                  </div>
                  <Badge variant={t.priority === 'high' ? 'destructive' : 'muted'}>
                    {TASK_PRIORITY_LABELS[t.priority] ?? t.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Paiements récents</h3>
            <Link to="/app/payments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement pour l'instant</p>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{p.property_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">
                      {formatMaskedAmount(p.amount, canViewAmounts)}
                    </p>
                    <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="mt-1">
                      {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
