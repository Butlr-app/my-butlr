import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Phone, Send } from 'lucide-react'
import { MobileHeader, MobileScreen } from '@/components/guest/guestMobileUi'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import {
  messageContactHeading,
  messageContactSubtitle,
  type MessageContactRole,
  type StayMessage,
  type StayMessagingPayload,
} from '@/lib/stayMessaging'
import { formatDateForDisplay } from '@/lib/dateFormat'

interface GuestMessagesPanelProps {
  messaging: StayMessagingPayload
  loading?: boolean
  readOnly?: boolean
  dateFormat?: string | null
  onBack?: () => void
  onSend?: (body: string) => Promise<void>
}

function initials(name?: string | null, role?: MessageContactRole): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  }
  return role === 'concierge' ? 'C' : 'HM'
}

function dayLabel(iso: string, dateFormat?: string | null): string {
  const date = iso.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (date === today) return "Aujourd'hui"
  if (date === yesterday) return 'Hier'
  return formatDateForDisplay(date, dateFormat)
}

function ContactAvatar({
  name,
  role,
  imageUrl,
  size = 'md',
}: {
  name?: string | null
  role: MessageContactRole
  imageUrl?: string | null
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-8 w-8 text-[12px]' : 'h-11 w-11 text-[15px]'
  if (imageUrl) {
    return (
      <div className={`${dim} shrink-0 overflow-hidden rounded-full`}>
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[#F5EDE3] font-semibold uppercase text-[#9A7B4F]`}
    >
      {initials(name, role)}
    </div>
  )
}

function MessageGroup({
  messages,
  contactName,
  contactRole,
  contactImage,
  dateFormat,
}: {
  messages: StayMessage[]
  contactName?: string | null
  contactRole: MessageContactRole
  contactImage?: string | null
  dateFormat?: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <span className="rounded-full bg-[#F2F2F7] px-3 py-1 text-[11px] font-medium text-[#8E8E93]">
          {dayLabel(messages[0].created_at, dateFormat)}
        </span>
      </div>
      {messages.map((message, index) => {
        const isGuest = message.sender_type === 'guest'
        const prev = messages[index - 1]
        const sameSenderAsPrev = prev && prev.sender_type === message.sender_type
        const showAvatar = !isGuest && !sameSenderAsPrev
        return (
          <div key={message.id} className={`flex items-end gap-2 ${isGuest ? 'justify-end' : 'justify-start'}`}>
            {!isGuest && (
              showAvatar ? (
                <ContactAvatar name={contactName} role={contactRole} imageUrl={contactImage} size="sm" />
              ) : (
                <span className="h-8 w-8 shrink-0" aria-hidden />
              )
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 text-[15px] leading-relaxed ${
                isGuest
                  ? 'rounded-[20px] rounded-br-md bg-[#1A1614] text-white'
                  : 'rounded-[20px] rounded-bl-md bg-[#F2F2F7] text-[#1A1614]'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
              <p className={`mt-1 text-[10px] ${isGuest ? 'text-white/50' : 'text-[#A8A8AE]'}`}>
                {message.created_at.slice(11, 16)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function groupByDay(messages: StayMessage[]): StayMessage[][] {
  const groups: StayMessage[][] = []
  let currentDay = ''
  for (const message of messages) {
    const day = message.created_at.slice(0, 10)
    if (day !== currentDay) {
      groups.push([])
      currentDay = day
    }
    groups[groups.length - 1].push(message)
  }
  return groups
}

const QUICK_REPLIES = [
  'Bonjour, une petite question…',
  'À quelle heure le check-in ?',
  'Merci beaucoup !',
]

export function GuestMessagesPanel({
  messaging,
  loading = false,
  readOnly = false,
  dateFormat,
  onBack,
  onSend,
}: GuestMessagesPanelProps) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messaging.messages.length, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  if (loading) {
    return (
      <MobileScreen className="flex min-h-[420px] items-center justify-center">
        <p className={guestMobile.subtitle}>Chargement de la messagerie…</p>
      </MobileScreen>
    )
  }

  if (!messaging.enabled) {
    return (
      <MobileScreen className="flex min-h-[420px] items-center justify-center px-6 text-center">
        <p className={guestMobile.body}>La messagerie n&apos;est pas disponible pour ce séjour.</p>
      </MobileScreen>
    )
  }

  const contact = messaging.contact
  const role = contact?.role ?? messaging.conversation?.recipient_role ?? 'house_manager'
  const heading = messageContactHeading(role, contact?.full_name)
  const subtitle = messageContactSubtitle(role)
  const groups = groupByDay(messaging.messages)

  const send = async (body: string) => {
    const trimmed = body.trim()
    if (!trimmed || !onSend) return
    setBusy(true)
    setError('')
    try {
      await onSend(trimmed)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileScreen className="flex h-full min-h-[520px] flex-col">
      <MobileHeader
        backOnly
        onBack={onBack}
        right={
          contact?.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5EDE3] text-[#9A7B4F]"
              aria-label="Appeler"
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <ContactAvatar name={contact?.full_name} role={role} imageUrl={contact?.avatar_url} />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-[#1A1614]">{heading}</p>
          <p className={`truncate ${guestMobile.subtitle}`}>{subtitle}</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        aria-live="polite"
        aria-label="Fil de messages"
        className="flex-1 space-y-6 overflow-y-auto pb-4"
      >
        {messaging.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5EDE3]">
              <Send className="h-6 w-6 text-[#9A7B4F]" />
            </div>
            <p className="text-[16px] font-semibold text-[#1A1614]">Démarrez la conversation</p>
            <p className={`mt-2 max-w-[260px] ${guestMobile.subtitle}`}>
              {role === 'house_manager'
                ? 'Votre house manager vous répond directement, 7j/7.'
                : 'Votre conciergerie vous répond directement, 7j/7.'}
            </p>
          </div>
        ) : (
          groups.map((group, i) => (
            <MessageGroup
              key={i}
              messages={group}
              contactName={contact?.full_name}
              contactRole={role}
              contactImage={contact?.avatar_url}
              dateFormat={dateFormat}
            />
          ))
        )}
      </div>

      {!readOnly && onSend && (
        <div className="sticky bottom-0 -mx-4 border-t border-[#E5E5EA] bg-white/95 px-4 pb-3 pt-3 backdrop-blur-xl">
          {messaging.messages.length === 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setDraft(reply)}
                  className="rounded-full border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-1.5 text-[13px] text-[#5C534C] active:bg-[#F2F2F7]"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Votre message…"
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-3xl border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3 text-[15px] outline-none placeholder:text-[#C7C7CC] focus:border-[#C9AD7F]"
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C9AD7F] text-[#1A1614] transition active:scale-95 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {readOnly && (
        <div className="sticky bottom-0 -mx-4 border-t border-[#E5E5EA] bg-white px-4 pb-3 pt-3">
          <p className={`text-center text-[13px] ${guestMobile.subtitle}`}>
            Aperçu — la messagerie sera active pour vos voyageurs.
          </p>
        </div>
      )}
    </MobileScreen>
  )
}
