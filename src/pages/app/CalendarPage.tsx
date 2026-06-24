import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useCalendarEvents, useProperties, type CalendarEvent } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const emptyForm = {
  title: '',
  type: 'reservation' as CalendarEvent['type'],
  property_id: '',
  start_date: '',
  end_date: '',
}

const typeColors: Record<CalendarEvent['type'], string> = {
  reservation: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  maintenance: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  cleaning: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  service: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  owner: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

export function CalendarPage() {
  const { data: events, loading, insert, remove } = useCalendarEvents()
  const { data: properties } = useProperties()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

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

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.start_date <= dateStr && (e.end_date ?? e.start_date) >= dateStr)
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const propertyMap = Object.fromEntries(properties.map(p => [p.id, p.name]))
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

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
          <button onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-medium min-w-[160px] text-center">{monthName}</p>
          <button onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add event
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayEvents = day ? getEventsForDay(day) : []
            const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1.5 border-b border-r border-border ${
                  day ? 'hover:bg-muted/30' : 'bg-muted/10'
                }`}
              >
                {day && (
                  <>
                    <p className={`text-xs font-mono mb-1 ${isToday ? 'bg-foreground text-background w-5 h-5 rounded-full flex items-center justify-center' : 'text-muted-foreground'}`}>
                      {day}
                    </p>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(evt => (
                        <button
                          key={evt.id}
                          onClick={() => setDeleteTarget({ id: evt.id, title: evt.title })}
                          className={`block w-full text-left text-[10px] px-1 py-0.5 rounded border truncate ${typeColors[evt.type]}`}
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

      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(typeColors).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm border ${cls}`} />
            <span className="text-xs text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-3">Upcoming Events</p>
        {events.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No events scheduled.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map(evt => (
              <Card key={evt.id} className="p-3 flex items-center justify-between">
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
