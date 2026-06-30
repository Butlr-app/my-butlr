import { useState, useMemo, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useCalendarEvents, useProperties, useReservations, type CalendarEvent } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Plus, Loader2, ChevronLeft, ChevronRight, Download, Upload, Calendar, LayoutList } from 'lucide-react'

const emptyForm = {
  title: '',
  type: 'reservation' as CalendarEvent['type'],
  property_id: '',
  start_date: '',
  end_date: '',
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Confirmed' },
  pending: { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'Pending' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Cancelled' },
  checkin_today: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Check-in Today' },
  in_progress: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'In Progress' },
  completed: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', label: 'Completed' },
}

const typeColors: Record<CalendarEvent['type'], string> = {
  reservation: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  maintenance: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cleaning: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  service: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  owner: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

type ViewMode = 'month' | 'timeline'

function getReservationDisplayColor(status: string, arrival: string): string {
  const today = new Date().toISOString().split('T')[0]
  if (status === 'cancelled') return 'bg-red-500/20 text-red-300 border-red-500/30'
  if (status === 'pending') return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  if (arrival === today && (status === 'confirmed' || status === 'in_progress')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  if (status === 'confirmed' || status === 'in_progress') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
}

export function CalendarPage() {
  const { data: events, loading, insert, update, remove } = useCalendarEvents()
  const { data: properties } = useProperties()
  const { data: reservations } = useReservations()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [dragStart, setDragStart] = useState<string | null>(null)
  const [dragEnd, setDragEnd] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert({
        ...form,
        property_id: form.property_id || null,
        end_date: form.end_date || form.start_date,
      })
      toast('Event created')
      setShowForm(false)
      setForm(emptyForm)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Event deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const handleDragEvent = useCallback(async (eventId: string, newStartDate: string, newEndDate: string) => {
    try {
      await update(eventId, { start_date: newStartDate, end_date: newEndDate })
      toast('Event moved')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }, [update, toast])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [startOffset, daysInMonth])

  const formatDate = useCallback((day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, [year, month])

  const getEventsForDay = (day: number) => {
    const dateStr = formatDate(day)
    return events.filter(e => e.start_date <= dateStr && (e.end_date ?? e.start_date) >= dateStr)
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const propertyMap = Object.fromEntries(properties.map(p => [p.id, p.name]))
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const handleDayMouseDown = (day: number) => {
    const dateStr = formatDate(day)
    setDragStart(dateStr)
    setDragEnd(dateStr)
  }

  const handleDayMouseEnter = (day: number) => {
    if (!dragStart) return
    setDragEnd(formatDate(day))
  }

  const handleDayMouseUp = () => {
    if (dragStart && dragEnd) {
      const start = dragStart < dragEnd ? dragStart : dragEnd
      const end = dragStart < dragEnd ? dragEnd : dragStart
      setForm({ ...emptyForm, start_date: start, end_date: end })
      setShowForm(true)
    }
    setDragStart(null)
    setDragEnd(null)
  }

  const isDayInDragRange = (day: number) => {
    if (!dragStart || !dragEnd) return false
    const dateStr = formatDate(day)
    const start = dragStart < dragEnd ? dragStart : dragEnd
    const end = dragStart < dragEnd ? dragEnd : dragStart
    return dateStr >= start && dateStr <= end
  }

  // iCal export
  const exportICS = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Butlr//Calendar//EN']
    for (const evt of events) {
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${evt.id}@mybutlr`)
      lines.push(`DTSTART;VALUE=DATE:${evt.start_date.replace(/-/g, '')}`)
      lines.push(`DTEND;VALUE=DATE:${(evt.end_date ?? evt.start_date).replace(/-/g, '')}`)
      lines.push(`SUMMARY:${evt.title}`)
      if (evt.notes) lines.push(`DESCRIPTION:${evt.notes.replace(/\n/g, '\\n')}`)
      lines.push('END:VEVENT')
    }
    lines.push('END:VCALENDAR')
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `butlr-calendar-${new Date().toISOString().split('T')[0]}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast('Calendar exported as .ics')
  }

  // iCal import
  const importICS = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const eventBlocks = text.split('BEGIN:VEVENT')
    let imported = 0
    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i]
      const summary = block.match(/SUMMARY:(.+)/)?.[1]?.trim()
      const dtstart = block.match(/DTSTART[^:]*:(\d{8})/)?.[1]
      const dtend = block.match(/DTEND[^:]*:(\d{8})/)?.[1]
      if (summary && dtstart) {
        const startDate = `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`
        const endDate = dtend ? `${dtend.slice(0, 4)}-${dtend.slice(4, 6)}-${dtend.slice(6, 8)}` : startDate
        try {
          await insert({ title: summary, type: 'reservation', start_date: startDate, end_date: endDate, property_id: null })
          imported++
        } catch { /* skip duplicates */ }
      }
    }
    toast(`Imported ${imported} events`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Timeline data
  const timelineDays = useMemo(() => {
    const days: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(formatDate(d))
    }
    return days
  }, [daysInMonth, formatDate])

  // Drag and drop for existing events on calendar
  const handleEventDragStart = (e: React.DragEvent, evt: CalendarEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: evt.id, start: evt.start_date, end: evt.end_date }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDayDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const targetDate = formatDate(day)
      const origStart = new Date(data.start)
      const origEnd = new Date(data.end)
      const diff = origEnd.getTime() - origStart.getTime()
      const newStart = targetDate
      const newEndDate = new Date(new Date(targetDate).getTime() + diff)
      const newEnd = newEndDate.toISOString().split('T')[0]
      handleDragEvent(data.id, newStart, newEnd)
    } catch { /* invalid data */ }
  }

  const handleDayDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-medium min-w-[160px] text-center">{monthName}</p>
          <button onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'month' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <Calendar className="w-3.5 h-3.5" /> Month
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'timeline' ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={exportICS}>
            <Download className="w-4 h-4 mr-1" /> Export .ics
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Import .ics
          </Button>
          <input ref={fileInputRef} type="file" accept=".ics" className="hidden" onChange={importICS} />
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add event
          </Button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7" onMouseUp={handleDayMouseUp}>
            {calendarDays.map((day, idx) => {
              const dayEvents = day ? getEventsForDay(day) : []
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
              const inDragRange = day ? isDayInDragRange(day) : false
              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1.5 border-b border-r border-border select-none ${
                    day ? 'hover:bg-muted/30 cursor-crosshair' : 'bg-muted/10'
                  } ${inDragRange ? 'bg-info/10' : ''}`}
                  onMouseDown={() => day && handleDayMouseDown(day)}
                  onMouseEnter={() => day && handleDayMouseEnter(day)}
                  onDrop={(e) => day && handleDayDrop(e, day)}
                  onDragOver={handleDayDragOver}
                >
                  {day && (
                    <>
                      <p className={`text-xs tabular-nums mb-1 ${isToday ? 'bg-foreground text-background w-5 h-5 rounded-full flex items-center justify-center' : 'text-muted-foreground'}`}>
                        {day}
                      </p>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(evt => (
                          <button
                            key={evt.id}
                            draggable
                            onDragStart={(e) => handleEventDragStart(e, evt)}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt) }}
                            className={`block w-full text-left text-[10px] px-1 py-0.5 rounded border truncate cursor-grab active:cursor-grabbing ${typeColors[evt.type]}`}
                            title={`${evt.title} (${propertyMap[evt.property_id ?? ''] ?? ''})`}
                          >
                            {evt.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        /* Timeline View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${Math.max(daysInMonth * 40 + 160, 800)}px` }}>
              <div className="flex border-b border-border sticky top-0 bg-card z-10">
                <div className="w-40 shrink-0 p-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-r border-border">
                  Property
                </div>
                <div className="flex-1 flex">
                  {timelineDays.map((dateStr, i) => {
                    const dayNum = i + 1
                    const isToday = dateStr === new Date().toISOString().split('T')[0]
                    return (
                      <div
                        key={dateStr}
                        className={`flex-1 min-w-[40px] p-1 text-center text-[10px] tabular-nums border-r border-border ${isToday ? 'bg-info/10 font-bold' : 'text-muted-foreground'}`}
                      >
                        {dayNum}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Reservations row */}
              <div className="flex border-b border-border">
                <div className="w-40 shrink-0 p-2 text-xs font-medium border-r border-border truncate">
                  Reservations
                </div>
                <div className="flex-1 relative" style={{ height: `${Math.max(reservations.length * 24 + 8, 32)}px` }}>
                  {reservations.map((res, rIdx) => {
                    const startIdx = timelineDays.findIndex(d => d >= res.arrival)
                    const endIdx = timelineDays.findIndex(d => d >= res.departure)
                    if (startIdx === -1) return null
                    const effectiveEnd = endIdx === -1 ? daysInMonth - 1 : endIdx
                    const left = `${(startIdx / daysInMonth) * 100}%`
                    const width = `${(Math.max(effectiveEnd - startIdx, 1) / daysInMonth) * 100}%`
                    const colorCls = getReservationDisplayColor(res.status, res.arrival)
                    return (
                      <div
                        key={res.id}
                        className={`absolute h-5 rounded text-[10px] px-1 truncate border ${colorCls}`}
                        style={{ left, width, top: `${rIdx * 24 + 4}px` }}
                        title={`${res.guest_name} (${res.status})`}
                      >
                        {res.guest_name}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Per-property rows */}
              {properties.map(prop => {
                const propEvents = events.filter(e => e.property_id === prop.id)
                return (
                  <div key={prop.id} className="flex border-b border-border">
                    <div className="w-40 shrink-0 p-2 text-xs font-medium border-r border-border truncate" title={prop.name}>
                      {prop.name}
                    </div>
                    <div className="flex-1 relative" style={{ height: `${Math.max(propEvents.length * 24 + 8, 32)}px` }}>
                      {propEvents.map((evt, eIdx) => {
                        const startIdx = timelineDays.findIndex(d => d >= evt.start_date)
                        const endIdx = timelineDays.findIndex(d => d >= evt.end_date)
                        if (startIdx === -1) return null
                        const effectiveEnd = endIdx === -1 ? daysInMonth - 1 : endIdx
                        const left = `${(startIdx / daysInMonth) * 100}%`
                        const width = `${(Math.max(effectiveEnd - startIdx, 1) / daysInMonth) * 100}%`
                        return (
                          <button
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className={`absolute h-5 rounded text-[10px] px-1 truncate border cursor-pointer ${typeColors[evt.type]}`}
                            style={{ left, width, top: `${eIdx * 24 + 4}px` }}
                            title={evt.title}
                          >
                            {evt.title}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {viewMode === 'month' ? (
          Object.entries(typeColors).map(([type, cls]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm border ${cls}`} />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          ))
        ) : (
          Object.entries(statusColors).map(([key, { bg, text, label }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
              <span className={`text-xs ${text}`}>{label}</span>
            </div>
          ))
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <p className="text-xs font-semibold tracking-tight text-muted-foreground mb-3">Upcoming Events</p>
        {events.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No events scheduled.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map(evt => (
              <Card key={evt.id} className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedEvent(evt)}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-sm ${typeColors[evt.type].split(' ')[0]}`} />
                  <div>
                    <p className="text-sm font-medium">{evt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {evt.start_date}{evt.end_date && evt.end_date !== evt.start_date ? ` → ${evt.end_date}` : ''}
                      {evt.property_id && ` · ${propertyMap[evt.property_id] ?? ''}`}
                    </p>
                  </div>
                </div>
                <Badge variant="muted">{evt.type}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Event Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Event">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Guest arrival" />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEvent['type'] }))}
              options={[
                { value: 'reservation', label: 'Reservation' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'service', label: 'Service' },
                { value: 'owner', label: 'Owner Visit' },
              ]}
            />
            <Select
              label="Property"
              value={form.property_id}
              onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
              options={[
                { value: '', label: 'No property' },
                ...properties.map(p => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event Detail Modal */}
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details">
        {selectedEvent && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Title</p>
                <p className="text-sm font-medium">{selectedEvent.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                  <Badge variant="muted">{selectedEvent.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Property</p>
                  <p className="text-sm">{propertyMap[selectedEvent.property_id ?? ''] || 'None'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start</p>
                  <p className="text-sm tabular-nums">{selectedEvent.start_date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">End</p>
                  <p className="text-sm tabular-nums">{selectedEvent.end_date || selectedEvent.start_date}</p>
                </div>
              </div>
              {selectedEvent.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="destructive" size="sm" onClick={() => { setDeleteTarget({ id: selectedEvent.id, title: selectedEvent.title }); setSelectedEvent(null) }}>
                Delete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete event"
        message={`Delete event "${deleteTarget?.title}"? This action cannot be undone.`}
      />
    </div>
  )
}
