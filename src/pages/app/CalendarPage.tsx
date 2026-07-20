import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { AgencyClientRequestModal } from '@/components/reservation/AgencyClientRequestModal'
import { useAuth } from '@/lib/authContext'
import { usePermissions } from '@/lib/permissionsContext'
import { fetchOwnerCalendarEvents, fetchOwnerProperties } from '@/lib/data'
import { calendarEventCoversDate } from '@/lib/reservationWorkflow'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { formatDateForDisplay } from '@/lib/dateFormat'
import type { CalendarEvent, Property, Reservation } from '@/lib/types'

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
  const { can } = usePermissions()
  const canOpenReservations = can('reservations')
  const canRequestForClients = can('client_requests')
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [showRequest, setShowRequest] = useState(false)

  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const { year, month } = cursor
  const days = generateCalendarDays(year, month)
  const offset = getMonthStartOffset(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  const shiftMonth = (delta: number) => {
    setCursor(current => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  useEffect(() => {
    if (!user) return

    Promise.all([
      fetchOwnerCalendarEvents(user.id),
      canRequestForClients ? fetchOwnerProperties(user.id) : Promise.resolve({ data: [] }),
    ]).then(([eventsResult, propertiesResult]) => {
      setEvents((eventsResult.data as CalendarEvent[]) ?? [])
      setProperties((propertiesResult.data as Property[]) ?? [])
      setLoading(false)
    })
  }, [user, canRequestForClients])

  if (loading) return <LoadingState />

  const activeProperties = properties.filter(property => property.status === 'active')

  const handleEventClick = (event: CalendarEvent) => {
    if (!canOpenReservations || !event.reservation_id) return
    openReservation(event.reservation_id)
  }

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
            ←
          </Button>
          <p className="min-w-[10rem] text-center text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            {monthLabel}
          </p>
          <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)} aria-label="Mois suivant">
            →
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRequestForClients && (
            <Button
              size="sm"
              onClick={() => setShowRequest(true)}
              disabled={activeProperties.length === 0}
            >
              Demande client
            </Button>
          )}
          <Badge variant="default">Reservations</Badge>
          <Badge variant="warning">Maintenance</Badge>
          <Badge variant="info">Cleaning</Badge>
          <Badge variant="success">Services</Badge>
        </div>
      </div>

      {canRequestForClients && activeProperties.length === 0 && (
        <EmptyState
          title="Aucune propriété accessible"
          description="Demandez au propriétaire de vous inviter sur une villa (rôle Agence immobilière)."
        />
      )}

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
                          disabled={!canOpenReservations || !event.reservation_id}
                          className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${
                            eventColors[event.type] || ''
                          } ${canOpenReservations && event.reservation_id ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
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
            <h3 className="text-sm font-semibold mb-4">Événements à venir</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {canRequestForClients
                  ? 'Aucun événement ce mois-ci. Utilisez « Demande client » pour proposer des dates.'
                  : 'Aucun événement ce mois-ci.'}
              </p>
            ) : (
              <div className="space-y-3">
                {events.map(event => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleEventClick(event)}
                    disabled={!canOpenReservations || !event.reservation_id}
                    className={`flex w-full items-center justify-between border-b border-border py-2 text-left last:border-0 ${
                      canOpenReservations && event.reservation_id ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'
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
            )}
          </Card>
        </>

      {canRequestForClients && (
        <AgencyClientRequestModal
          open={showRequest}
          onClose={() => setShowRequest(false)}
          properties={activeProperties}
          onCreated={(_reservation: Reservation) => {
            if (!user) return
            fetchOwnerCalendarEvents(user.id).then(({ data }) => {
              setEvents((data as CalendarEvent[]) ?? [])
            })
          }}
        />
      )}
    </div>
  )
}
