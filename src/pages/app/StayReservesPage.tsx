import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  FileText,
  Plus,
  Receipt,
  Settings2,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { usePermissions } from '@/lib/permissionsContext'
import {
  closeStayReserve,
  completeStayServiceRequest,
  computeRevenueSplit,
  countPendingGuestApprovals,
  countPendingGuestApprovalsForReserves,
  countPendingOwnerActions,
  fetchOwnerStayReserves,
  fetchPendingReserveTopUps,
  fetchReserveTransactions,
  fetchStayServiceRequests,
  formatReserveAmount,
  formatStayServiceRequestDetails,
  formatTransactionLabel,
  isReserveTransactionCredit,
  markStayServiceInProgress,
  quoteStayServiceRequest,
  staffConfirmReserveTopUp,
  staffRejectReserveTopUp,
  stayApprovalModeLabels,
  stayReserveStatusLabels,
  stayServiceStatusLabels,
  topUpStayReserve,
  updateStayReserveSettings,
  type ReserveTransaction,
  type StayApprovalMode,
  type StayReserve,
  type StayServiceRequest,
} from '@/lib/stayReserve'

type PendingTopUpRow = ReserveTransaction & {
  stay_reserves?: {
    id: string
    reservation_id: string
    property_id: string
    currency: string
    reservations?: {
      guest_name: string
      properties?: { name: string } | null
    } | null
  } | null
}

interface ReserveWithMeta extends StayReserve {
  reservations?: {
    guest_name: string
    arrival: string
    departure: string
    properties?: { name: string } | null
  } | null
}

type ReserveFilter = 'all' | 'active' | 'action' | 'closed'
type DetailTab = 'overview' | 'requests' | 'movements' | 'settings'

const closedStatuses = new Set(['closed', 'refunded', 'cancelled'])

function requestBadgeVariant(status: StayServiceRequest['status']) {
  if (status === 'waiting_client_approval') return 'warning' as const
  if (status === 'completed') return 'success' as const
  if (status === 'cancelled' || status === 'disputed') return 'destructive' as const
  if (['approved', 'in_progress', 'assigned_to_provider'].includes(status)) return 'info' as const
  return 'muted' as const
}

function reserveUsagePercent(reserve: StayReserve): number {
  const total = Number(reserve.initial_amount) || 1
  const used = Number(reserve.spent_amount) + Number(reserve.pending_amount)
  return Math.min(100, Math.round((used / total) * 100))
}

export function StayReservesPage() {
  const { user, profile } = useAuth()
  const { can } = usePermissions()
  const canViewAmounts = can('reservation_amounts')
  const money = (amount: number | null | undefined, currency?: string) => (
    canViewAmounts ? formatReserveAmount(amount, currency) : '•••'
  )
  const [searchParams] = useSearchParams()
  const reserveFromUrl = searchParams.get('reserve')

  const [loading, setLoading] = useState(true)
  const [reserves, setReserves] = useState<ReserveWithMeta[]>([])
  const [filter, setFilter] = useState<ReserveFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(reserveFromUrl)
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [requests, setRequests] = useState<StayServiceRequest[]>([])
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [quoteForm, setQuoteForm] = useState<{ requestId: string; amount: string; provider: string } | null>(null)
  const [pendingGuestCount, setPendingGuestCount] = useState(0)
  const [pendingTopUps, setPendingTopUps] = useState<PendingTopUpRow[]>([])
  const [topUpAmount, setTopUpAmount] = useState('')
  const [settingsForm, setSettingsForm] = useState({
    approvalMode: 'auto_under_limit' as StayApprovalMode,
    autoApprovalLimit: '300',
  })

  const selected = reserves.find(reserve => reserve.id === selectedId) ?? null

  const loadReserves = async () => {
    if (!user) return
    setLoading(true)
    const { data: properties } = await fetchOwnerProperties(user.id)
    const propertyIds = (properties ?? []).map(property => property.id)
    const [{ data, error: fetchError }, pendingResult] = await Promise.all([
      fetchOwnerStayReserves(propertyIds),
      fetchPendingReserveTopUps(propertyIds),
    ])
    if (fetchError) setError(fetchError.message)
    const list = (data ?? []) as ReserveWithMeta[]
    setReserves(list)
    setPendingTopUps((pendingResult.data ?? []) as PendingTopUpRow[])
    const { count } = await countPendingGuestApprovalsForReserves(list.map(item => item.id))
    setPendingGuestCount(count)
    if (list.length > 0 && (!selectedId || !list.some(item => item.id === selectedId))) {
      setSelectedId(reserveFromUrl && list.some(item => item.id === reserveFromUrl)
        ? reserveFromUrl
        : list[0].id)
    }
    setLoading(false)
  }

  const handleConfirmTopUp = async (transactionId: string) => {
    setBusy(true)
    setError('')
    const { error: confirmError } = await staffConfirmReserveTopUp(transactionId)
    if (confirmError) setError(confirmError.message)
    await loadReserves()
    if (selectedId) await loadReserveDetails(selectedId)
    setBusy(false)
  }

  const handleRejectTopUp = async (transactionId: string) => {
    setBusy(true)
    setError('')
    const { error: rejectError } = await staffRejectReserveTopUp(transactionId)
    if (rejectError) setError(rejectError.message)
    await loadReserves()
    if (selectedId) await loadReserveDetails(selectedId)
    setBusy(false)
  }

  const loadReserveDetails = async (reserveId: string) => {
    const [requestsResult, transactionsResult] = await Promise.all([
      fetchStayServiceRequests(reserveId),
      fetchReserveTransactions(reserveId),
    ])
    setRequests((requestsResult.data ?? []) as StayServiceRequest[])
    setTransactions((transactionsResult.data ?? []) as ReserveTransaction[])
  }

  useEffect(() => {
    loadReserves()
  }, [user?.id])

  useEffect(() => {
    if (selectedId) loadReserveDetails(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!selected) return
    setSettingsForm({
      approvalMode: selected.approval_mode,
      autoApprovalLimit: String(selected.auto_approval_limit ?? 300),
    })
  }, [selected?.id, selected?.approval_mode, selected?.auto_approval_limit])

  const filteredReserves = useMemo(() => {
    if (filter === 'all') return reserves
    if (filter === 'closed') {
      return reserves.filter(reserve => closedStatuses.has(reserve.status))
    }
    if (filter === 'active') {
      return reserves.filter(reserve => !closedStatuses.has(reserve.status))
    }
    if (filter === 'action') {
      return reserves.filter(reserve =>
        !closedStatuses.has(reserve.status)
        && ['low_balance', 'exhausted', 'pending_payment', 'partially_used'].includes(reserve.status),
      )
    }
    return reserves
  }, [filter, reserves])

  const stats = useMemo(() => ({
    active: reserves.filter(reserve => !closedStatuses.has(reserve.status)).length,
    balance: reserves.reduce((sum, reserve) => sum + Number(reserve.current_balance), 0),
    pendingGuest: reserves.length,
    actionNeeded: countPendingOwnerActions(requests),
  }), [reserves, requests])

  const handleQuote = async () => {
    if (!quoteForm || !selected) return
    setBusy(true)
    setError('')
    const { error: quoteError } = await quoteStayServiceRequest(
      quoteForm.requestId,
      Number(quoteForm.amount),
      quoteForm.provider,
    )
    if (quoteError) setError(quoteError.message)
    else {
      setQuoteForm(null)
      await loadReserveDetails(selected.id)
    }
    setBusy(false)
  }

  const handleComplete = async (request: StayServiceRequest) => {
    if (!selected) return
    setBusy(true)
    setError('')
    const { error: completeError } = await completeStayServiceRequest(request, selected)
    if (completeError) setError(completeError.message)
    else {
      await loadReserveDetails(selected.id)
      await loadReserves()
    }
    setBusy(false)
  }

  const handleMarkInProgress = async (requestId: string) => {
    if (!selected) return
    setBusy(true)
    setError('')
    const { error: progressError } = await markStayServiceInProgress(requestId)
    if (progressError) setError(progressError.message)
    else await loadReserveDetails(selected.id)
    setBusy(false)
  }

  const handleTopUp = async () => {
    if (!selected || !topUpAmount) return
    setBusy(true)
    setError('')
    const { error: topUpError } = await topUpStayReserve(
      selected.id,
      Number(topUpAmount),
      'Versement manuel propriétaire',
    )
    if (topUpError) setError(topUpError.message)
    else {
      setTopUpAmount('')
      await loadReserveDetails(selected.id)
      await loadReserves()
    }
    setBusy(false)
  }

  const handleSaveSettings = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    const { data, error: settingsError } = await updateStayReserveSettings(selected.id, {
      approvalMode: settingsForm.approvalMode,
      autoApprovalLimit: Number(settingsForm.autoApprovalLimit),
    })
    if (settingsError) setError(settingsError.message)
    else if (data) {
      setReserves(current => current.map(item => item.id === selected.id ? { ...item, ...(data as StayReserve) } : item))
    }
    setBusy(false)
  }

  const handleCloseReserve = async () => {
    if (!selected || !window.confirm('Clôturer la Réserve séjour et rembourser le solde restant ?')) return
    setBusy(true)
    const { error: closeError } = await closeStayReserve(selected.id, true)
    if (closeError) setError(closeError.message)
    else await loadReserves()
    setBusy(false)
  }

  if (loading) return <LoadingState label="Chargement des réserves séjour…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Expérience voyageur
          </p>
          <h1 className="mt-1 text-lg font-semibold">Réserve séjour</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Enveloppe prépayée par séjour — conciergerie et boutique débitent le même solde. Suivez les devis,
            mouvements et commissions plateforme.
          </p>
        </div>
      </div>

      {reserves.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Réserves actives</p>
            <p className="mt-1 text-2xl font-semibold">{stats.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Solde total disponible</p>
            <p className="mt-1 text-2xl font-semibold">{money(stats.balance)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Devis en attente client</p>
            <p className="mt-1 text-2xl font-semibold">{pendingGuestCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Crédits à valider</p>
            <p className="mt-1 text-2xl font-semibold">{pendingTopUps.length}</p>
          </Card>
        </div>
      )}

      {pendingTopUps.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Crédits à valider</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Les voyageurs ont demandé un crédit. Validez pour créditer le solde, ou refusez la demande.
          </p>
          <div className="space-y-2">
            {pendingTopUps.map(tx => {
              const guestName = tx.stay_reserves?.reservations?.guest_name ?? 'Voyageur'
              const propertyName = tx.stay_reserves?.reservations?.properties?.name ?? 'Propriété'
              return (
                <div
                  key={tx.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{guestName} · {propertyName}</p>
                    <p className="text-xs text-muted-foreground">{formatTransactionLabel(tx)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">
                      {money(tx.amount, tx.currency)}
                    </p>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => handleConfirmTopUp(tx.id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => handleRejectTopUp(tx.id)}
                    >
                      Refuser
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {reserves.length === 0 ? (
        <EmptyState
          title="Aucune Réserve séjour"
          description="Les enveloppes apparaissent lorsqu’un voyageur active sa Réserve séjour depuis le portail client."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'Toutes'],
                ['active', 'Actives'],
                ['action', 'À surveiller'],
                ['closed', 'Clôturées'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    filter === id
                      ? 'border-foreground/20 bg-foreground text-background'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredReserves.map(reserve => (
                <button
                  key={reserve.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(reserve.id)
                    setDetailTab('overview')
                  }}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedId === reserve.id ? 'border-foreground bg-muted/50' : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{reserve.reservations?.guest_name ?? 'Voyageur'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {reserve.reservations?.properties?.name}
                      </p>
                    </div>
                    <Badge variant={closedStatuses.has(reserve.status) ? 'muted' : 'info'}>
                      {stayReserveStatusLabels[reserve.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {money(reserve.current_balance, reserve.currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reserveUsagePercent(reserve)} % utilisé
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-info transition-all"
                      style={{ width: `${reserveUsagePercent(reserve)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Solde disponible
                      </p>
                    </div>
                    <p className="mt-1 text-3xl font-semibold">
                      {money(selected.current_balance, selected.currency)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selected.reservations?.guest_name} · {selected.reservations?.properties?.name} ·{' '}
                      {formatDateForDisplay(selected.reservations?.arrival ?? '', profile?.date_format)} →{' '}
                      {formatDateForDisplay(selected.reservations?.departure ?? '', profile?.date_format)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/app/invoices/generate?reservation=${selected.reservation_id}`}>
                      <Button variant="secondary" size="sm">
                        <Receipt className="mr-1.5 h-4 w-4" />
                        Facturer le séjour
                      </Button>
                    </Link>
                    {!closedStatuses.has(selected.status) && (
                      <Button variant="secondary" size="sm" onClick={handleCloseReserve} disabled={busy}>
                        <FileText className="mr-1.5 h-4 w-4" />
                        Clôturer & rembourser
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground">Versé</p>
                    <p className="mt-1 font-medium">{money(selected.initial_amount, selected.currency)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground">Dépensé</p>
                    <p className="mt-1 font-medium">{money(selected.spent_amount, selected.currency)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground">En attente</p>
                    <p className="mt-1 font-medium">{money(selected.pending_amount, selected.currency)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground">Validation</p>
                    <p className="mt-1 font-medium">{stayApprovalModeLabels[selected.approval_mode]}</p>
                  </div>
                </div>
              </Card>

              <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                {([
                  ['overview', 'Vue d’ensemble'],
                  ['requests', `Demandes (${requests.length})`],
                  ['movements', `Mouvements (${transactions.length})`],
                  ['settings', 'Paramètres'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDetailTab(id)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      detailTab === id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {detailTab === 'overview' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <p className="mb-3 text-sm font-semibold">Prochaines actions</p>
                    {countPendingOwnerActions(requests) === 0 && countPendingGuestApprovals(requests) === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune action en attente sur cette réserve.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {requests.filter(request => ['submitted', 'reviewing', 'quoted'].includes(request.status)).map(request => (
                          <li key={request.id} className="flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="h-4 w-4 shrink-0" />
                            Chiffrer « {request.title} »
                          </li>
                        ))}
                        {requests.filter(request => request.status === 'waiting_client_approval').map(request => (
                          <li key={request.id} className="flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="h-4 w-4 shrink-0" />
                            Devis envoyé — en attente du client ({request.title})
                          </li>
                        ))}
                        {requests.filter(request => request.status === 'approved').map(request => (
                          <li key={request.id} className="flex items-center gap-2 text-muted-foreground">
                            <Check className="h-4 w-4 shrink-0" />
                            Service validé — à confirmer une fois réalisé ({request.title})
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Card className="p-4">
                    <p className="mb-3 text-sm font-semibold">Commissions plateforme (estimation)</p>
                    <p className="text-sm text-muted-foreground">
                      Sur chaque service terminé : 75 % prestataire · 10 % villa · 15 % plateforme.
                    </p>
                    <p className="mt-3 text-2xl font-semibold">
                      {money(
                        computeRevenueSplit(Number(selected.spent_amount)).platformCommission,
                        selected.currency,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Commission cumulée sur services confirmés</p>
                  </Card>
                </div>
              )}

              {detailTab === 'requests' && (
                <div className="space-y-2">
                  {requests.length === 0 && (
                    <EmptyState
                      title="Aucune demande"
                      description="Les demandes conciergerie du voyageur apparaîtront ici."
                    />
                  )}
                  {requests.map(request => {
                    const amount = Number(request.final_amount ?? request.estimated_amount ?? 0)
                    const split = amount > 0 ? computeRevenueSplit(amount) : null

                    return (
                      <Card key={request.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant={requestBadgeVariant(request.status)}>
                                {stayServiceStatusLabels[request.status]}
                              </Badge>
                              {request.provider_name && (
                                <span className="text-xs text-muted-foreground">{request.provider_name}</span>
                              )}
                            </div>
                          </div>
                          {amount > 0 && (
                            <p className="font-semibold">
                              {money(amount, selected.currency)}
                            </p>
                          )}
                        </div>

                        {(() => {
                          const details = formatStayServiceRequestDetails(request)
                          if (!details) return null
                          return (
                            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                              {details}
                            </p>
                          )
                        })()}

                        {split && request.status === 'completed' && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Commission plateforme : {money(split.platformCommission, selected.currency)}
                          </p>
                        )}

                        {['submitted', 'reviewing', 'quoted'].includes(request.status) && (
                          !canViewAmounts ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                              Chiffrage masqué — demandez l’accès aux montants au propriétaire.
                            </p>
                          ) : quoteForm?.requestId === request.id ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <Input
                                label="Montant (€)"
                                type="number"
                                value={quoteForm.amount}
                                onChange={event => setQuoteForm(current => current ? { ...current, amount: event.target.value } : current)}
                              />
                              <Input
                                label="Prestataire"
                                value={quoteForm.provider}
                                onChange={event => setQuoteForm(current => current ? { ...current, provider: event.target.value } : current)}
                              />
                              <div className="flex items-end gap-2">
                                <Button size="sm" onClick={handleQuote} disabled={busy}>Envoyer devis</Button>
                                <Button size="sm" variant="secondary" onClick={() => setQuoteForm(null)}>Annuler</Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3"
                              onClick={() => setQuoteForm({
                                requestId: request.id,
                                amount: String(request.estimated_amount ?? ''),
                                provider: request.provider_name ?? '',
                              })}
                            >
                              Chiffrer & envoyer au client
                            </Button>
                          )
                        )}

                        {request.status === 'approved' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handleMarkInProgress(request.id)} disabled={busy}>
                              Marquer en cours
                            </Button>
                            <Button size="sm" onClick={() => handleComplete(request)} disabled={busy}>
                              <Check className="mr-1.5 h-4 w-4" />
                              Confirmer terminé
                            </Button>
                          </div>
                        )}

                        {request.status === 'in_progress' && (
                          <Button size="sm" className="mt-3" onClick={() => handleComplete(request)} disabled={busy}>
                            <Check className="mr-1.5 h-4 w-4" />
                            Confirmer terminé
                          </Button>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}

              {detailTab === 'movements' && (
                <Card className="overflow-hidden">
                  {transactions.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">Aucun mouvement enregistré.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {transactions.map(transaction => {
                        const credit = isReserveTransactionCredit(transaction.type)
                        return (
                          <div key={transaction.id} className="flex items-center gap-3 px-4 py-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${credit ? 'bg-success/10' : 'bg-muted'}`}>
                              {credit
                                ? <ArrowDownLeft className="h-4 w-4 text-success" />
                                : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{formatTransactionLabel(transaction)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateForDisplay(transaction.created_at.slice(0, 10), profile?.date_format)}
                              </p>
                            </div>
                            <p className={`font-mono text-sm font-semibold ${credit ? 'text-success' : ''}`}>
                              {credit ? '+' : '−'}
                              {money(transaction.amount, transaction.currency)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}

              {detailTab === 'settings' && (
                <Card className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Paramètres de la réserve</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Mode de validation client"
                      value={settingsForm.approvalMode}
                      onChange={event => setSettingsForm(current => ({
                        ...current,
                        approvalMode: event.target.value as StayApprovalMode,
                      }))}
                      options={Object.entries(stayApprovalModeLabels).map(([value, label]) => ({ value, label }))}
                    />
                    <Input
                      label="Plafond auto-validation (€)"
                      type="number"
                      min="0"
                      value={settingsForm.autoApprovalLimit}
                      onChange={event => setSettingsForm(current => ({
                        ...current,
                        autoApprovalLimit: event.target.value,
                      }))}
                    />
                  </div>

                  <div className="rounded-lg border border-dashed border-border p-4">
                    <p className="text-sm font-medium">Versement manuel</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enregistrez un virement ou paiement reçu hors portail (chèque, virement…).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Input
                        label="Montant (€)"
                        type="number"
                        min="0"
                        value={topUpAmount}
                        onChange={event => setTopUpAmount(event.target.value)}
                      />
                      <div className="flex items-end">
                        <Button size="sm" onClick={handleTopUp} disabled={busy || !topUpAmount}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Créditer la réserve
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSaveSettings} disabled={busy}>
                      Enregistrer les paramètres
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
