import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImagePlus, Phone, Send } from 'lucide-react'
import { MobileHeader, MobileScreen } from '@/components/guest/guestMobileUi'
import { StayMessageContent } from '@/components/messaging/StayMessageContent'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { appendSpeechTranscript } from '@/lib/speechDraft'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import { GUEST_SPEECH_LANGUAGES, resolveGuestSpeechLanguage, tGuest } from '@/lib/guestLanguage'
import {
  messageContactHeading,
  messageContactSubtitle,
  type MessageContactRole,
  type StayMessage,
  type StayMessageInput,
  type StayMessagingPayload,
} from '@/lib/stayMessaging'
import { guestUploadStayMessageImage } from '@/lib/uploadStayMessageImage'
import { formatDateForDisplay } from '@/lib/dateFormat'

interface GuestMessagesPanelProps {
  messaging: StayMessagingPayload
  loading?: boolean
  readOnly?: boolean
  dateFormat?: string | null
  guestToken?: string
  guestLanguage?: string | null
  onBack?: () => void
  onSend?: (input: StayMessageInput) => Promise<void>
  onOpenProduct?: (catalogItemId: string) => void
  onOpenService?: (propertyServiceId: string) => void
}

function initials(name?: string | null, role?: MessageContactRole): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  }
  return role === 'concierge' ? 'C' : 'HM'
}

function dayLabel(iso: string, dateFormat?: string | null, guestLanguage?: string | null): string {
  const date = iso.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (date === today) return tGuest('messages.today', guestLanguage)
  if (date === yesterday) return tGuest('messages.yesterday', guestLanguage)
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
  guestLanguage,
  onOpenProduct,
  onOpenService,
}: {
  messages: StayMessage[]
  contactName?: string | null
  contactRole: MessageContactRole
  contactImage?: string | null
  dateFormat?: string | null
  guestLanguage?: string | null
  onOpenProduct?: (catalogItemId: string) => void
  onOpenService?: (propertyServiceId: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <span className="rounded-full bg-[#F2F2F7] px-3 py-1 text-[11px] font-medium text-[#8E8E93]">
          {dayLabel(messages[0].created_at, dateFormat, guestLanguage)}
        </span>
      </div>
      {messages.map((message, index) => {
        const isGuest = message.sender_type === 'guest'
        const prev = messages[index - 1]
        const sameSenderAsPrev = prev && prev.sender_type === message.sender_type
        const showAvatar = !isGuest && !sameSenderAsPrev
        const isRich = message.message_type !== 'text'
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
              className={`max-w-[85%] text-[15px] leading-relaxed ${
                isRich
                  ? ''
                  : isGuest
                    ? 'rounded-[18px] rounded-br-md bg-[#071A2F] px-4 py-2.5 text-white'
                    : 'rounded-[18px] rounded-bl-md border border-[#E5DDD2] bg-white px-4 py-2.5 text-[#071A2F]'
              }`}
            >
              <StayMessageContent
                message={message}
                variant="guest"
                onOpenProduct={onOpenProduct}
                onOpenService={onOpenService}
              />
              <p className={`mt-1 text-[10px] ${isGuest && !isRich ? 'text-white/50' : 'text-[#A8A8AE]'}`}>
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
  guestToken,
  guestLanguage,
  onBack,
  onSend,
  onOpenProduct,
  onOpenService,
}: GuestMessagesPanelProps) {
  const [draft, setDraft] = useState('')
  const [speechInterim, setSpeechInterim] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [speechLang, setSpeechLang] = useState(() => resolveGuestSpeechLanguage(guestLanguage))
  const t = (key: Parameters<typeof tGuest>[0]) => tGuest(key, guestLanguage)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSpeechLang(resolveGuestSpeechLanguage(guestLanguage))
  }, [guestLanguage])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messaging.messages.length, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft, speechInterim])

  if (loading) {
    return (
      <MobileScreen className="flex min-h-[420px] items-center justify-center">
        <p className={guestMobile.subtitle}>{t('messages.loading')}</p>
      </MobileScreen>
    )
  }

  if (!messaging.enabled) {
    return (
      <MobileScreen className="flex min-h-[420px] items-center justify-center px-6 text-center">
        <p className={guestMobile.body}>{t('messages.disabled')}</p>
      </MobileScreen>
    )
  }

  const contact = messaging.contact
  const role = contact?.role ?? messaging.conversation?.recipient_role ?? 'house_manager'
  const heading = messageContactHeading(role, contact?.full_name)
  const subtitle = messageContactSubtitle(role)
  const groups = groupByDay(messaging.messages)
  const composedDraft = speechInterim ? appendSpeechTranscript(draft, speechInterim) : draft

  const sendInput = async (input: StayMessageInput) => {
    if (!onSend) return
    setBusy(true)
    setError('')
    setSpeechInterim('')
    try {
      await onSend(input)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setBusy(false)
    }
  }

  const sendText = async () => {
    const trimmed = composedDraft.trim()
    if (!trimmed) return
    await sendInput({ body: trimmed, messageType: 'text' })
  }

  const handlePhotoPick = async (file: File | undefined) => {
    if (!file || !guestToken) return
    setUploadError('')
    setBusy(true)
    const { url, storagePath, error: uploadErr } = await guestUploadStayMessageImage(guestToken, file)
    if (uploadErr || !storagePath) {
      setUploadError(uploadErr?.message ?? 'Envoi de la photo impossible.')
      setBusy(false)
      return
    }
    await sendInput({
      body: composedDraft.trim() || undefined,
      messageType: 'image',
      payload: { storage_path: storagePath, ...(url ? { image_url: url } : {}) },
    })
    setBusy(false)
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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEE7DB] text-[#A8844F]"
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
          <p className="truncate text-[17px] font-semibold text-[#071A2F]">{heading}</p>
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
            <p className="text-[16px] font-semibold text-[#1A1614]">{t('messages.startConversation')}</p>
            <p className={`mt-2 max-w-[260px] ${guestMobile.subtitle}`}>
              {role === 'house_manager' ? t('messages.houseManagerReply') : t('messages.conciergeReply')}
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
              guestLanguage={guestLanguage}
              onOpenProduct={onOpenProduct}
              onOpenService={onOpenService}
            />
          ))
        )}
      </div>

      {!readOnly && onSend && (
        <div className="sticky bottom-0 -mx-4 border-t border-[#DED7CD] bg-[#F6F1E9]/95 px-4 pb-3 pt-3 backdrop-blur-xl">
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className={`${guestMobile.subtitle} text-[12px]`} htmlFor="guest-speech-lang">
              {t('messages.dictationLanguage')}
            </label>
            <select
              id="guest-speech-lang"
              value={speechLang}
              onChange={e => setSpeechLang(e.target.value)}
              className="rounded-full border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-1 text-[12px] text-[#5C534C]"
            >
              {GUEST_SPEECH_LANGUAGES.map(option => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            {guestToken && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5EDE3] text-[#9A7B4F] transition active:scale-95 disabled:opacity-40"
                  aria-label="Envoyer une photo"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    void handlePhotoPick(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </>
            )}
            <VoiceInputButton
              disabled={busy}
              lang={speechLang}
              ariaLabel="Dicter un message"
              className="bg-[#F5EDE3] text-[#9A7B4F] hover:bg-[#EDE4D6]"
              onInterim={transcript => setSpeechInterim(transcript)}
              onFinal={transcript => {
                setSpeechInterim('')
                setVoiceError('')
                setDraft(current => appendSpeechTranscript(current, transcript))
              }}
              onError={message => setVoiceError(message)}
            />
            <textarea
              ref={textareaRef}
              rows={1}
              value={composedDraft}
              onChange={e => {
                setSpeechInterim('')
                setVoiceError('')
                setDraft(e.target.value)
              }}
              placeholder={t('messages.placeholder')}
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-3xl border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3 text-[15px] outline-none placeholder:text-[#C7C7CC] focus:border-[#C9AD7F]"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendText()
                }
              }}
            />
            <button
              type="button"
              disabled={busy || !composedDraft.trim()}
              onClick={() => void sendText()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C9AD7F] text-[#1A1614] transition active:scale-95 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          {(error || voiceError || uploadError) && (
            <p className="mt-2 text-sm text-red-600">{error || voiceError || uploadError}</p>
          )}
        </div>
      )}

      {readOnly && (
        <div className="sticky bottom-0 -mx-4 border-t border-[#E5E5EA] bg-white px-4 pb-3 pt-3">
          <p className={`text-center text-[13px] ${guestMobile.subtitle}`}>
            {t('messages.previewNotice')}
          </p>
        </div>
      )}
    </MobileScreen>
  )
}
