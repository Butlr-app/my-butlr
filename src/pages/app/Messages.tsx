import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ChatThread } from '@/components/ChatThread'
import { useConversations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { useRole } from '@/lib/roleContext'
import { MessageSquare, Loader2, Image, Mic, ConciergeBell } from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'

const roleColors: Record<string, string> = {
  owner: 'bg-amber-500',
  house_manager: 'bg-blue-500',
  concierge: 'bg-emerald-500',
  agency: 'bg-purple-500',
  guest: 'bg-gray-400',
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function LastMessagePreview({ text }: { text: string }) {
  if (text.startsWith('[voice]')) {
    return (
      <span className="flex items-center gap-1">
        <Mic className="w-3 h-3" /> Voice message
      </span>
    )
  }
  if (text.startsWith('[image]')) {
    return (
      <span className="flex items-center gap-1">
        <Image className="w-3 h-3" /> Photo
      </span>
    )
  }
  if (text.startsWith('[service]')) {
    return (
      <span className="flex items-center gap-1">
        <ConciergeBell className="w-3 h-3" /> Service shared
      </span>
    )
  }
  return <>{text}</>
}

export function Messages() {
  const { user } = useAuth()
  const { role } = useRole()
  const { t } = useTranslation()
  const { conversations, loading } = useConversations(user?.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].reservation_id)
    }
  }, [conversations, selectedId])

  const senderName = t(`roles.${role}`)
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
          <Card className="md:col-span-1 overflow-hidden flex flex-col" style={{ height: '540px' }}>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map(conv => {
                const initials = getInitials(conv.guest_name)
                const isActive = selectedId === conv.reservation_id
                return (
                  <button
                    key={conv.reservation_id}
                    onClick={() => setSelectedId(conv.reservation_id)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors flex gap-3 ${
                      isActive ? 'bg-muted/60' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full ${roleColors['guest']} flex items-center justify-center shrink-0`}>
                      <span className="text-xs font-bold text-white">{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.guest_name}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-400 text-white font-medium shrink-0">
                            Guest
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(conv.last_at)}</span>
                      </div>
                      {conv.property_name && (
                        <p className="text-[11px] text-muted-foreground truncate">{conv.property_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <LastMessagePreview text={conv.last_message} />
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge variant="destructive" className="shrink-0 self-center">{conv.unread}</Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          <div className="md:col-span-2">
            {selected ? (
              <ChatThread
                key={selected.reservation_id}
                reservationId={selected.reservation_id}
                userId={user?.id}
                senderName={senderName}
                senderRole={role}
                title={selected.guest_name}
                subtitle={selected.property_name ?? 'Conversation'}
                height="540px"
              />
            ) : (
              <Card className="flex items-center justify-center" style={{ height: '540px' }}>
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
