import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useNotifications, type Notification } from '@/lib/useSupabase'
import { Loader2, CheckCheck, Bell } from 'lucide-react'

const typeIcons: Record<Notification['type'], string> = {
  reservation: 'R',
  task: 'T',
  payment: 'P',
  system: 'S',
  service_request: 'SR',
  incident: 'I',
  work_order: 'W',
}

const typeColors: Record<Notification['type'], string> = {
  reservation: 'bg-info/10 text-info',
  task: 'bg-warning/10 text-warning',
  payment: 'bg-success/10 text-success',
  system: 'bg-muted text-muted-foreground',
  service_request: 'bg-info/10 text-info',
  incident: 'bg-destructive/10 text-destructive',
  work_order: 'bg-info/10 text-info',
}

const typeBadgeVariant: Record<Notification['type'], 'info' | 'warning' | 'success' | 'muted'> = {
  reservation: 'info',
  task: 'warning',
  payment: 'success',
  system: 'muted',
  service_request: 'info',
  incident: 'warning',
  work_order: 'info',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function NotificationsPage() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold tracking-tight text-muted-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Badge variant="info">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Notifications will appear here when events happen.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card
              key={n.id}
              className={`p-4 flex gap-4 items-start transition-colors cursor-pointer hover:bg-muted/30 ${!n.read ? 'border-info/30 bg-muted/20' : ''}`}
              onClick={() => { if (!n.read) markAsRead(n.id) }}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${typeColors[n.type]}`}>
                {typeIcons[n.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={typeBadgeVariant[n.type]}>{n.type.replace('_', ' ')}</Badge>
                    {!n.read && <span className="w-2 h-2 bg-info rounded-full" />}
                  </div>
                </div>
                {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
