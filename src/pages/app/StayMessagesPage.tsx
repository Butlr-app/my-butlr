import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { StaffMessageComposer } from '@/components/messaging/StaffMessageComposer'
import { StayMessageContent } from '@/components/messaging/StayMessageContent'
import { useAuth } from '@/lib/authContext'
import { fetchPropertyBoutiqueCatalog, filterBoutiqueCatalogEntries, type BoutiqueCatalogEntry } from '@/lib/boutique'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { fetchEnabledPropertyServices, type PropertyServiceItem } from '@/lib/propertyServices'
import {
  fetchConversationMessages,
  fetchPropertyStayConversations,
  messageContactRoleLabels,
  staffMarkStayMessagesRead,
  staffSendStayMessage,
  stayMessageRpcError,
  type StayConversationWithMeta,
  type StayMessage,
  type StayMessageInput,
} from '@/lib/stayMessaging'

export function StayMessagesPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<StayConversationWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<StayMessage[]>([])
  const [products, setProducts] = useState<BoutiqueCatalogEntry[]>([])
  const [services, setServices] = useState<PropertyServiceItem[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const propertyIdsRef = useRef<string[] | null>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const loadConversations = useCallback(async (showLoading = false) => {
    if (!user) return
    if (showLoading) setLoading(true)
    try {
      let propertyIds = propertyIdsRef.current
      if (!propertyIds) {
        const { data: properties, error: propertiesError } = await fetchOwnerProperties(user.id)
        if (propertiesError) {
          setError(propertiesError.message)
          return
        }
        propertyIds = (properties ?? []).map(p => p.id)
        propertyIdsRef.current = propertyIds
      }
      const { data, error: fetchError } = await fetchPropertyStayConversations(propertyIds)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      const list = data ?? []
      setConversations(list)
      setSelectedId(current => current ?? list[0]?.id ?? null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    propertyIdsRef.current = null
    void loadConversations(true)
    const interval = window.setInterval(() => void loadConversations(), 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadConversations()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadConversations, user])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    const loadMessages = () => {
      fetchConversationMessages(selectedId).then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          setError(fetchError.message)
          return
        }
        setMessages(data ?? [])
        void staffMarkStayMessagesRead(selectedId)
        setConversations(current =>
          current.map(conversation =>
            conversation.id === selectedId
              ? { ...conversation, unread_staff_count: 0 }
              : conversation,
          ),
        )
      })
    }
    loadMessages()

    const interval = window.setInterval(loadMessages, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadMessages()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selectedId])

  useEffect(() => {
    if (!selected?.property_id) {
      setProducts([])
      setServices([])
      return
    }
    Promise.all([
      fetchPropertyBoutiqueCatalog(selected.property_id),
      fetchEnabledPropertyServices(selected.property_id),
    ]).then(([boutiqueResult, servicesResult]) => {
      setProducts(filterBoutiqueCatalogEntries(boutiqueResult.data.items))
      setServices(servicesResult.data ?? [])
    })
  }, [selected?.property_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async (input: StayMessageInput): Promise<boolean> => {
    if (!selected) return false
    setBusy(true)
    setError('')
    try {
      const { data, error: sendError } = await staffSendStayMessage(selected.id, input)
      if (sendError) {
        setError(sendError.message)
        return false
      }
      const rpcError = stayMessageRpcError(data)
      if (rpcError) {
        setError(rpcError)
        return false
      }
      const { data: refreshed, error: refreshError } = await fetchConversationMessages(selected.id)
      if (refreshError) {
        setError(refreshError.message)
        return false
      }
      setMessages(refreshed ?? [])
      setDraft('')
      await loadConversations()
      return true
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Chargement des messages…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages séjour</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proposez des produits, activités ou photos directement dans la conversation.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="Aucune conversation"
          description="Les voyageurs pourront vous écrire depuis leur portail séjour lorsque la messagerie est activée."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {conversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedId(conv.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedId === conv.id ? 'border-foreground bg-muted/50' : 'border-border hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{conv.guest_name ?? conv.reservations?.guest_name ?? 'Voyageur'}</p>
                  {Boolean(conv.unread_staff_count) && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {conv.unread_staff_count}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {conv.reservations?.properties?.name}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge variant="muted">{messageContactRoleLabels[conv.recipient_role]}</Badge>
                  {conv.last_message_at && (
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateForDisplay(conv.last_message_at.slice(0, 10), profile?.date_format)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {selected && user && (
            <Card className="flex min-h-[520px] flex-col p-5">
              <div className="mb-4 border-b border-border pb-4">
                <p className="font-semibold">
                  {selected.guest_name ?? selected.reservations?.guest_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selected.reservations?.properties?.name}
                  {' · '}
                  {messageContactRoleLabels[selected.recipient_role]}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {messages.map(message => {
                  const isStaff = message.sender_type === 'staff'
                  const isRich = message.message_type !== 'text'
                  return (
                    <div key={message.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={
                          isRich
                            ? 'max-w-[85%] text-sm'
                            : `max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                              isStaff ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`
                        }
                      >
                        <StayMessageContent message={message} variant="staff" />
                        <p
                          className={`mt-1 text-[10px] ${
                            isRich
                              ? 'text-muted-foreground'
                              : isStaff
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {formatDateForDisplay(message.created_at.slice(0, 10), profile?.date_format)}
                          {' · '}
                          {message.created_at.slice(11, 16)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <StaffMessageComposer
                userId={user.id}
                draft={draft}
                onDraftChange={setDraft}
                busy={busy}
                products={products}
                services={services}
                onSend={handleSend}
              />
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
