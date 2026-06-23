import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { calendarEvents } from '@/data/mockData'

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function generateCalendarDays() {
  const days = []
  for (let i = 1; i <= 30; i++) {
    days.push(i)
  }
  return days
}

const eventColors: Record<string, string> = {
  reservation: 'bg-foreground/10 text-foreground',
  maintenance: 'bg-warning-soft text-warning-foreground',
  cleaning: 'bg-info-soft text-info',
  service: 'bg-success-soft text-success',
  owner: 'bg-muted text-muted-foreground',
}

export function CalendarPage() {
  const days = generateCalendarDays()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">June 2026</p>
        <div className="flex items-center gap-2">
          <Badge variant="default">Reservations</Badge>
          <Badge variant="warning">Maintenance</Badge>
          <Badge variant="info">Cleaning</Badge>
          <Badge variant="success">Services</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {daysOfWeek.map(day => (
            <div key={day} className="px-2 py-3 text-center text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground border-r border-border last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {/* Offset for month start (June 2026 starts on Monday) */}
          {days.map(day => {
            const dateStr = `2026-06-${day.toString().padStart(2, '0')}`
            const dayEvents = calendarEvents.filter(e => e.start <= dateStr && e.end >= dateStr)
            return (
              <div key={day} className="border-r border-b border-border last:border-r-0 min-h-[80px] p-1.5">
                <p className="text-xs font-mono text-muted-foreground mb-1">{day}</p>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map(event => (
                    <div key={event.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${eventColors[event.type] || ''}`}>
                      {event.title.split(' - ')[0]}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Event list */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Upcoming Events</h3>
        <div className="space-y-3">
          {calendarEvents.map(event => (
            <div key={event.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  event.type === 'reservation' ? 'bg-foreground' :
                  event.type === 'maintenance' ? 'bg-warning' :
                  event.type === 'cleaning' ? 'bg-info' : 'bg-success'
                }`} />
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{event.start}{event.end !== event.start ? ` → ${event.end}` : ''}</p>
                </div>
              </div>
              <Badge variant={
                event.type === 'reservation' ? 'default' :
                event.type === 'maintenance' ? 'warning' :
                event.type === 'cleaning' ? 'info' : 'success'
              }>
                {event.type}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
