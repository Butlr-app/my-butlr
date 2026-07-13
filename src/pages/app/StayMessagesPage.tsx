import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  fetchConversationMessages,
  fetchPropertyStayConversations,
  messageContactRoleLabels,
  staffSendStayMessage,
  type StayConversationWithMeta,
  type StayMessage,
} from '@/lib/stayMessaging'

export function StayMessagesPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<StayConversationWithMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<StayMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const loadConversations = async () => {
    if (!user) return
    setLoading(true)
    const { data: properties } = await fetchOwnerProperties(user.id)
    const propertyIds = (properties ?? []).map(p => p.id)
    const { data, error: fetchError } = await fetchPropertyStayConversations(propertyIds)
    if (fetchError) setError(fetchError.message)
    const list = data ?? []
    setConversations(list)
    if (!selectedId && list.length > 0) setSelectedId(list[0].id)
    setLoading(false)
  }

  useEffect(() => {
    loadConversations()
  }, [user?.id])

  useEffect(() => {
    if (!selectedId) return
    fetchConversationMessages(selectedId).then(({ data }) => {
      setMessages((data ?? []) as StayMessage[])
    })
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!selected || !draft.trim()) return
    setBusy(true)
    setError('')
    const { data, error: sendError } = await staffSendStayMessage(selected.id, draft.trim())
    if (sendError) {
      setError(sendError.message)
    } else {
      const msg = (data as { message?: StayMessage })?.message
      if (msg) setMessages(current => [...current, msg])
      setDraft('')
      await loadConversations()
    }
    setBusy(false)
  }

  if (loading) return <LoadingState label="Chargement des messages…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages séjour</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations voyageurs — répondez depuis la plateforme pour garder l&apos;historique centralisé.
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
                <p className="font-medium">{conv.guest_name ?? conv.reservations?.guest_name ?? 'Voyageur'}</p>
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

          {selected && (
            <Card className="flex min-h-[480px] flex-col p-5">
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
                  return (
                    <div key={message.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          isStaff ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p className={`mt-1 text-[10px] ${isStaff ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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

              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Répondre au voyageur…"
                  className="min-h-[44px] flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-info/20"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button disabled={busy || !draft.trim()} onClick={handleSend} className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
