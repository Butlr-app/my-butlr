import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bot, ChevronRight, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import {
  SAAS_ASSISTANT_STARTERS,
  sendSaasAssistantMessage,
  type SaasAssistantAction,
  type SaasAssistantMessage,
} from '@/lib/saasAssistant'

const STORAGE_KEY = 'butlr-saas-assistant-open'

function newMessage(
  role: SaasAssistantMessage['role'],
  content: string,
  extra?: Pick<SaasAssistantMessage, 'actions' | 'quickReplies' | 'liveData'>,
): SaasAssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...extra,
  }
}

function ActionButtons({
  actions,
  onNavigate,
}: {
  actions: SaasAssistantAction[]
  onNavigate: (path: string) => void
}) {
  if (actions.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {actions.map(action => (
        <button
          key={`${action.path}-${action.label}`}
          type="button"
          onClick={() => onNavigate(action.path)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          {action.label}
          <ChevronRight className="h-3 w-3" />
        </button>
      ))}
    </div>
  )
}

export function SaasAssistantChat() {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1')
  const [messages, setMessages] = useState<SaasAssistantMessage[]>([
    newMessage(
      'assistant',
      `Bonjour${profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''} ! Je suis l’assistant My Butlr. Je peux vous guider dans l’application, répondre à vos questions et lire vos données live (réservations, messages, devis…).`,
      {
        quickReplies: [...SAAS_ASSISTANT_STARTERS],
      },
    ),
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  }, [open])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, busy])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    setError('')
    setBusy(true)
    setDraft('')

    const userMsg = newMessage('user', trimmed)
    const history = [...messages, userMsg]
    setMessages(history)

    try {
      const response = await sendSaasAssistantMessage(
        history.map(m => ({ role: m.role, content: m.content })),
        {
          currentPath: location.pathname,
          userName: profile?.full_name,
          userRole: profile?.role,
        },
      )

      setMessages(prev => [
        ...prev,
        newMessage('assistant', response.reply, {
          actions: response.actions,
          quickReplies: response.quickReplies,
          liveData: Boolean(response.snapshot),
        }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.')
      setMessages(prev => prev.slice(0, -1))
      setDraft(trimmed)
    } finally {
      setBusy(false)
    }
  }, [busy, location.pathname, messages, profile?.full_name, profile?.role])

  const handleNavigate = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  if (!profile) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-[0_8px_32px_rgba(0,0,0,0.24)] transition hover:scale-105 active:scale-95"
          aria-label="Ouvrir l’assistant My Butlr"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(640px,calc(100vh-3rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <header className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Assistant My Butlr</p>
              <p className="truncate text-xs text-muted-foreground">
                Guide, navigation & données live
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Fermer l’assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map(message => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-foreground text-background rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {!isUser && message.liveData && (
                      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                        Données live
                      </p>
                    )}
                    {!isUser && message.actions && (
                      <ActionButtons actions={message.actions} onNavigate={handleNavigate} />
                    )}
                    {!isUser && message.quickReplies && message.quickReplies.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {message.quickReplies.map(reply => (
                          <button
                            key={reply}
                            type="button"
                            disabled={busy}
                            onClick={() => send(reply)}
                            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  Réflexion…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card p-3">
            {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Posez une question sur My Butlr…"
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-info focus:ring-1 focus:ring-info/20"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
              />
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => send(draft)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition disabled:opacity-40"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
