import { useEffect, useState } from 'react'
import { Check, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  closeStayReserve,
  completeStayServiceRequest,
  fetchOwnerStayReserves,
  fetchStayServiceRequests,
  formatReserveAmount,
  quoteStayServiceRequest,
  stayReserveStatusLabels,
  stayServiceStatusLabels,
  type StayReserve,
  type StayServiceRequest,
} from '@/lib/stayReserve'

interface ReserveWithMeta extends StayReserve {
  reservations?: {
    guest_name: string
    arrival: string
    departure: string
    properties?: { name: string } | null
  } | null
}

export function StayReservesPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reserves, setReserves] = useState<ReserveWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [requests, setRequests] = useState<StayServiceRequest[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [quoteForm, setQuoteForm] = useState<{ requestId: string; amount: string; provider: string } | null>(null)

  const selected = reserves.find(r => r.id === selectedId) ?? null

  const loadReserves = async () => {
    if (!user) return
    setLoading(true)
    const { data: properties } = await fetchOwnerProperties(user.id)
    const propertyIds = (properties ?? []).map(p => p.id)
    const { data, error: fetchError } = await fetchOwnerStayReserves(propertyIds)
    if (fetchError) setError(fetchError.message)
    const list = (data ?? []) as ReserveWithMeta[]
    setReserves(list)
    if (!selectedId && list.length > 0) setSelectedId(list[0].id)
    setLoading(false)
  }

  const loadRequests = async (reserveId: string) => {
    const { data } = await fetchStayServiceRequests(reserveId)
    setRequests((data ?? []) as StayServiceRequest[])
  }

  useEffect(() => {
    loadReserves()
  }, [user?.id])

  useEffect(() => {
    if (selectedId) loadRequests(selectedId)
  }, [selectedId])

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
      await loadRequests(selected.id)
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
      await loadRequests(selected.id)
      await loadReserves()
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Réserve séjour</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez les enveloppes dédiées, les demandes de services et les dépenses par séjour.
        </p>
      </div>

      {reserves.length === 0 ? (
        <EmptyState
          title="Aucune Réserve séjour"
          description="Les réserves apparaissent lorsqu’un voyageur active son enveloppe dédiée pour un séjour."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {reserves.map(reserve => (
              <button
                key={reserve.id}
                type="button"
                onClick={() => setSelectedId(reserve.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedId === reserve.id ? 'border-foreground bg-muted/50' : 'border-border hover:bg-muted/30'
                }`}
              >
                <p className="font-medium">{reserve.reservations?.guest_name ?? 'Voyageur'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {reserve.reservations?.properties?.name}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {formatReserveAmount(reserve.current_balance, reserve.currency)}
                  </span>
                  <Badge variant="muted">{stayReserveStatusLabels[reserve.status]}</Badge>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Solde disponible</p>
                    <p className="mt-1 text-3xl font-semibold">
                      {formatReserveAmount(selected.current_balance, selected.currency)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selected.reservations?.guest_name} ·{' '}
                      {formatDateForDisplay(selected.reservations?.arrival ?? '', profile?.date_format)} →{' '}
                      {formatDateForDisplay(selected.reservations?.departure ?? '', profile?.date_format)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground">Versé</p>
                      <p className="font-medium">{formatReserveAmount(selected.initial_amount, selected.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dépensé</p>
                      <p className="font-medium">{formatReserveAmount(selected.spent_amount, selected.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">En attente</p>
                      <p className="font-medium">{formatReserveAmount(selected.pending_amount, selected.currency)}</p>
                    </div>
                  </div>
                </div>
                {selected.status !== 'closed' && selected.status !== 'refunded' && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="secondary" size="sm" onClick={handleCloseReserve} disabled={busy}>
                      <FileText className="mr-1.5 h-4 w-4" />
                      Clôturer & rembourser
                    </Button>
                  </div>
                )}
              </Card>

              <div>
                <p className="mb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Demandes de services
                </p>
                <div className="space-y-2">
                  {requests.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune demande pour ce séjour.</p>
                  )}
                  {requests.map(request => (
                    <Card key={request.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {stayServiceStatusLabels[request.status]}
                            {request.provider_name && ` · ${request.provider_name}`}
                          </p>
                        </div>
                        {(request.final_amount ?? request.estimated_amount) != null && (
                          <p className="font-semibold">
                            {formatReserveAmount(Number(request.final_amount ?? request.estimated_amount), selected.currency)}
                          </p>
                        )}
                      </div>

                      {['submitted', 'reviewing', 'quoted'].includes(request.status) && (
                        quoteForm?.requestId === request.id ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <Input
                              label="Montant (€)"
                              type="number"
                              value={quoteForm.amount}
                              onChange={e => setQuoteForm(f => f ? { ...f, amount: e.target.value } : f)}
                            />
                            <Input
                              label="Prestataire"
                              value={quoteForm.provider}
                              onChange={e => setQuoteForm(f => f ? { ...f, provider: e.target.value } : f)}
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
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => handleComplete(request)}
                          disabled={busy}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Confirmer service terminé
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
