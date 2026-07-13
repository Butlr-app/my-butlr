import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerCalendarEvents } from '@/lib/data'
import { calendarEventCoversDate } from '@/lib/reservationWorkflow'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { formatDateForDisplay, localeForDateFormat } from '@/lib/dateFormat'
import type { CalendarEvent } from '@/lib/types'

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const eventColors: Record<string, string> = {
  reservation: 'bg-foreground/10 text-foreground',
  maintenance: 'bg-warning-soft text-warning-foreground',
  cleaning: 'bg-info-soft text-info',
  service: 'bg-success-soft text-success',
  owner: 'bg-muted text-muted-foreground',
  marketing: 'bg-warning-soft text-warning-foreground',
  blocked: 'bg-muted text-muted-foreground',
}

function getCurrentMonthLabel(dateFormat?: string | null) {
  return new Date().toLocaleDateString(localeForDateFormat(dateFormat), {
    month: 'long',
    year: 'numeric',
  })
}

function generateCalendarDays(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
}

function getMonthStartOffset(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function CalendarPage() {
  const { user, profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const days = generateCalendarDays(year, month)
  const offset = getMonthStartOffset(year, month)

  useEffect(() => {
    if (!user) return

    fetchOwnerCalendarEvents(user.id).then(({ data }) => {
      setEvents((data as CalendarEvent[]) ?? [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  const handleEventClick = (event: CalendarEvent) => {
    if (event.reservation_id) {
      openReservation(event.reservation_id)
    }
  }

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {getCurrentMonthLabel(profile?.date_format)}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="default">Reservations</Badge>
          <Badge variant="warning">Maintenance</Badge>
          <Badge variant="info">Cleaning</Badge>
          <Badge variant="success">Services</Badge>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No calendar events"
          description="Events from reservations and maintenance will appear on your calendar."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {daysOfWeek.map(day => (
                <div key={day} className="px-2 py-3 text-center text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground border-r border-border last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`empty-${i}`} className="border-r border-b border-border min-h-[80px] bg-muted/20" />
              ))}
              {days.map(day => {
                const current = dateStr(day)
                const dayEvents = events.filter(event => calendarEventCoversDate(event, current))
                return (
                  <div key={day} className="border-r border-b border-border last:border-r-0 min-h-[80px] p-1.5">
                    <p className="text-xs font-mono text-muted-foreground mb-1">{day}</p>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(event => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => handleEventClick(event)}
                          disabled={!event.reservation_id}
                          className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${
                            eventColors[event.type] || ''
                          } ${event.reservation_id ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {event.title}
                        </button>
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

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {events.map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleEventClick(event)}
                  disabled={!event.reservation_id}
                  className={`flex w-full items-center justify-between border-b border-border py-2 text-left last:border-0 ${
                    event.reservation_id ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'reservation' ? 'bg-foreground' :
                      event.type === 'maintenance' ? 'bg-warning' :
                      event.type === 'cleaning' ? 'bg-info' : 'bg-success'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatDateForDisplay(event.start_date, profile?.date_format)}
                        {event.end_date !== event.start_date
                          ? ` → ${formatDateForDisplay(event.end_date, profile?.date_format)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    event.type === 'reservation' ? 'default' :
                    event.type === 'maintenance' ? 'warning' :
                    event.type === 'cleaning' ? 'info' : 'success'
                  }>
                    {event.type}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
