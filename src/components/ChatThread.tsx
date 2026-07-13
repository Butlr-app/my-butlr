import { useState, useRef, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useMessages, type Service } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Send, MessageSquare, ConciergeBell } from 'lucide-react'
import { MessageBubble } from './chat/MessageBubble'
import { VoiceRecorder } from './chat/VoiceRecorder'
import { ChatImageUpload } from './chat/ChatImageUpload'
import { ServicePicker } from './chat/ServicePicker'
import { AiReplySuggestions } from './ai/AiReplySuggestions'

interface ChatThreadProps {
  reservationId: string
  userId: string | undefined
  senderName: string
  senderRole?: string
  title?: string
  subtitle?: string
  height?: string
  showServicePicker?: boolean
}

export function ChatThread({
  reservationId,
  userId,
  senderName,
  senderRole = 'house_manager',
  title = 'Messages',
  subtitle = 'Chat with your house manager',
  height = '480px',
  showServicePicker = true,
}: ChatThreadProps) {
  const { messages, loading, sendMessage, markRead } = useMessages(reservationId)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [servicePicker, setServicePicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasUnread = messages.some(m => !m.read && m.sender_id !== userId)

  useEffect(() => {
    if (hasUnread) markRead(userId)
  }, [reservationId, hasUnread, markRead, userId])

  // Find last message from guest for AI suggestions
  const lastGuestMsg = useMemo(() => {
    const guestMsgs = messages.filter(m => m.sender_id !== userId && m.message_type === 'text')
    return guestMsgs.length > 0 ? guestMsgs[guestMsgs.length - 1].content : null
  }, [messages, userId])

  const lastGuestSender = useMemo(() => {
    const guestMsgs = messages.filter(m => m.sender_id !== userId && m.message_type === 'text')
    return guestMsgs.length > 0 ? guestMsgs[guestMsgs.length - 1].sender_name : undefined
  }, [messages, userId])

  const handleSend = async () => {
    if (!msgText.trim() || !userId) return
    setSending(true)
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId,
        sender_name: senderName,
        sender_role: senderRole,
        content: msgText.trim(),
        message_type: 'text',
        attachment_url: null,
        metadata: {},
      })
      setMsgText('')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoice = async (url: string) => {
    if (!userId) return
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId,
        sender_name: senderName,
        sender_role: senderRole,
        content: '',
        message_type: 'voice',
        attachment_url: url,
        metadata: {},
      })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleImage = async (url: string) => {
    if (!userId) return
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId,
        sender_name: senderName,
        sender_role: senderRole,
        content: '',
        message_type: 'image',
        attachment_url: url,
        metadata: {},
      })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleServiceSelect = async (svc: Service) => {
    if (!userId) return
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId,
        sender_name: senderName,
        sender_role: senderRole,
        content: '',
        message_type: 'service',
        attachment_url: null,
        metadata: {
          service_id: svc.id,
          service_name: svc.name,
          description: svc.description ?? undefined,
          price: svc.starting_price,
          image_url: svc.image_url ?? undefined,
        },
      })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={height === '100%' ? undefined : { height }}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card
      className={`flex flex-col ${height === '100%' ? 'h-full min-h-0 overflow-hidden' : ''}`}
      style={height === '100%' ? undefined : { height }}
    >
      {title ? (
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-950">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* AI reply suggestions — only for managers, not guests */}
      {senderRole !== 'guest' && (
        <AiReplySuggestions
          lastGuestMessage={lastGuestMsg}
          guestName={lastGuestSender}
          onSelect={(reply) => setMsgText(reply)}
        />
      )}

      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-1 relative">
          <ChatImageUpload onUploaded={handleImage} onError={m => toast(m, 'error')} disabled={sending} />
          <VoiceRecorder onRecorded={handleVoice} onError={m => toast(m, 'error')} disabled={sending} />
          {showServicePicker && (
            <button
              type="button"
              onClick={() => setServicePicker(true)}
              disabled={sending}
              className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
              title="Share a service"
            >
              <ConciergeBell className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <input
            type="text"
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 bg-muted border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !msgText.trim() || !userId}
            className="rounded-full h-10 w-10 p-0 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <ServicePicker
        open={servicePicker}
        onClose={() => setServicePicker(false)}
        onSelect={handleServiceSelect}
      />
    </Card>
  )
}
