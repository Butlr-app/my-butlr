import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ChatThread } from '@/components/ChatThread'
import { useConversations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { useRole } from '@/lib/roleContext'
import { MessageSquare, Loader2 } from 'lucide-react'

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  house_manager: 'House Manager',
  concierge: 'Concierge',
  agency: 'Agency',
}

export function Messages() {
  const { user } = useAuth()
  const { role } = useRole()
  const { conversations, loading } = useConversations(user?.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].reservation_id)
    }
  }, [conversations, selectedId])

  const senderName = roleLabels[role] ?? 'House Manager'
  const selected = conversations.find(c => c.reservation_id === selectedId)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Messages
        </h2>
        <p className="text-sm text-muted-foreground">Real-time chat with your guests</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No conversations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Messages from guests will appear here in real time.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1 overflow-hidden flex flex-col" style={{ height: '480px' }}>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map(conv => (
                <button
                  key={conv.reservation_id}
                  onClick={() => setSelectedId(conv.reservation_id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors flex gap-3 ${
                    selectedId === conv.reservation_id ? 'bg-muted/60' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{conv.guest_name}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.last_at)}</span>
                    </div>
                    {conv.property_name && (
                      <p className="text-[11px] text-muted-foreground truncate">{conv.property_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                  </div>
                  {conv.unread > 0 && (
                    <Badge variant="destructive" className="shrink-0 self-center">{conv.unread}</Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <div className="md:col-span-2">
            {selected ? (
              <ChatThread
                key={selected.reservation_id}
                reservationId={selected.reservation_id}
                userId={user?.id}
                senderName={senderName}
                title={selected.guest_name}
                subtitle={selected.property_name ?? 'Conversation'}
              />
            ) : (
              <Card className="flex items-center justify-center" style={{ height: '480px' }}>
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
