import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useMessages } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Send, MessageSquare } from 'lucide-react'

interface ChatThreadProps {
  reservationId: string
  userId: string | undefined
  senderName: string
  title?: string
  subtitle?: string
  height?: string
}

export function ChatThread({
  reservationId,
  userId,
  senderName,
  title = 'Messages',
  subtitle = 'Chat with your house manager',
  height = '480px',
}: ChatThreadProps) {
  const { messages, loading, sendMessage, markRead } = useMessages(reservationId)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
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
        content: msgText.trim(),
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
        {messages.map(msg => {
          const isMe = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                isMe ? 'bg-foreground text-background' : 'bg-muted'
              }`}>
                {!isMe && <p className="text-[10px] font-medium mb-0.5">{msg.sender_name}</p>}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-background/60' : 'text-muted-foreground'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          type="text"
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 h-9 px-3 bg-muted border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !msgText.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </Card>
  )
}
