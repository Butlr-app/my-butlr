import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  completeStoreOrder,
  fetchStoreOrderItems,
  fetchStoreOrders,
  quoteStoreOrderItem,
  storeOrderStatusLabels,
  type StoreOrder,
  type StoreOrderItem,
} from '@/lib/boutique'
import { formatReserveAmount } from '@/lib/stayReserve'

interface StoreOrderWithMeta extends StoreOrder {
  reservations?: {
    guest_name: string
    properties?: { name: string } | null
  } | null
}

export function BoutiqueOrdersPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<StoreOrderWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [items, setItems] = useState<StoreOrderItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [quoteForm, setQuoteForm] = useState<{ itemId: string; amount: string } | null>(null)

  const selected = orders.find(o => o.id === selectedId) ?? null

  const loadOrders = async () => {
    if (!user) return
    setLoading(true)
    const { data: properties } = await fetchOwnerProperties(user.id)
    const propertyIds = (properties ?? []).map(p => p.id)
    const { data, error: fetchError } = await fetchStoreOrders(propertyIds)
    if (fetchError) setError(fetchError.message)
    const list = (data ?? []) as StoreOrderWithMeta[]
    setOrders(list)
    if (!selectedId && list.length > 0) setSelectedId(list[0].id)
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [user?.id])

  useEffect(() => {
    if (!selectedId) return
    fetchStoreOrderItems(selectedId).then(({ data }) => {
      setItems((data ?? []) as StoreOrderItem[])
    })
  }, [selectedId])

  const handleQuote = async () => {
    if (!quoteForm) return
    setBusy(true)
    setError('')
    const { error: quoteError } = await quoteStoreOrderItem(quoteForm.itemId, Number(quoteForm.amount))
    if (quoteError) setError(quoteError.message)
    else {
      setQuoteForm(null)
      if (selectedId) {
        const { data } = await fetchStoreOrderItems(selectedId)
        setItems((data ?? []) as StoreOrderItem[])
      }
      await loadOrders()
    }
    setBusy(false)
  }

  const handleComplete = async () => {
    if (!selected) return
    setBusy(true)
    const { error: completeError } = await completeStoreOrder(selected.id)
    if (completeError) setError(completeError.message)
    else await loadOrders()
    setBusy(false)
  }

  if (loading) return <LoadingState label="Chargement des commandes Boutique…" />

  return (
    <div className="space-y-6">
      {orders.length === 0 ? (
        <EmptyState
          title="Aucune commande Boutique"
          description="Les commandes apparaissent lorsqu’un voyageur passe commande depuis son portail."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {orders.map(order => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedId(order.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedId === order.id ? 'border-foreground bg-muted/50' : 'border-border hover:bg-muted/30'
                }`}
              >
                <p className="font-medium">{order.reservations?.guest_name ?? 'Voyageur'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {order.reservations?.properties?.name}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {order.total_amount > 0 ? formatReserveAmount(order.total_amount, order.currency) : 'Sur devis'}
                  </span>
                  <Badge variant="muted">{storeOrderStatusLabels[order.status]}</Badge>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Commande</p>
                    <p className="mt-1 text-lg font-semibold">
                      {selected.reservations?.guest_name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateForDisplay(selected.created_at.slice(0, 10), profile?.date_format)}
                      {' · '}
                      {storeOrderStatusLabels[selected.status]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">Total</p>
                    <p className="text-2xl font-semibold">
                      {formatReserveAmount(selected.total_amount, selected.currency)}
                    </p>
                  </div>
                </div>
                {selected.status !== 'completed' && selected.status !== 'cancelled' && (
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" onClick={handleComplete} disabled={busy}>
                      <Check className="mr-1.5 h-4 w-4" />
                      Marquer terminée
                    </Button>
                  </div>
                )}
              </Card>

              <div className="space-y-2">
                {items.map(item => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.title_snapshot}</p>
                        <p className="text-xs text-muted-foreground">
                          ×{item.quantity} · {item.status}
                        </p>
                      </div>
                      {(item.total_price ?? item.quoted_amount) != null && (
                        <p className="font-semibold">
                          {formatReserveAmount(Number(item.total_price ?? item.quoted_amount), selected.currency)}
                        </p>
                      )}
                    </div>
                    {item.status === 'pending_quote' && (
                      quoteForm?.itemId === item.id ? (
                        <div className="mt-3 flex gap-2">
                          <Input
                            label="Montant devis (€)"
                            type="number"
                            value={quoteForm.amount}
                            onChange={e => setQuoteForm(f => f ? { ...f, amount: e.target.value } : f)}
                          />
                          <div className="flex items-end gap-2">
                            <Button size="sm" onClick={handleQuote} disabled={busy}>Envoyer</Button>
                            <Button size="sm" variant="secondary" onClick={() => setQuoteForm(null)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3"
                          onClick={() => setQuoteForm({ itemId: item.id, amount: '' })}
                        >
                          Préparer un devis
                        </Button>
                      )
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
