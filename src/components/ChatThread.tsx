import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useMessages, type Service } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Send, MessageSquare, ConciergeBell } from 'lucide-react'
import { MessageBubble } from './chat/MessageBubble'
import { VoiceRecorder } from './chat/VoiceRecorder'
import { ChatImageUpload } from './chat/ChatImageUpload'
import { ServicePicker } from './chat/ServicePicker'

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

  useEffect(() => {
    markRead(userId)
  }, [reservationId, messages.length, markRead, userId])

  const handleSend = async () => {
    if (!msgText.trim()) return
    setSending(true)
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId ?? '',
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
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId ?? '',
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
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId ?? '',
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
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId ?? '',
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
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="flex flex-col" style={{ height }}>
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> {title}
        </h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-1 relative">
          <ChatImageUpload onUploaded={handleImage} disabled={sending} />
          <VoiceRecorder onRecorded={handleVoice} disabled={sending} />
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
            className="flex-1 h-9 px-3 bg-muted border-0 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !msgText.trim()}
            className="rounded-full"
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
