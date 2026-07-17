import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/EmptyState'
import type { PartnerRecord } from '@/lib/partners'
import {
  deleteCalendarDay,
  fetchMyCalendarDays,
  fetchMyPartnerProfile,
  partnerCalendarStatusLabels,
  upsertCalendarDay,
  type PartnerCalendarDay,
  type PartnerCalendarStatus,
} from '@/lib/partnerPortal'

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 0))
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    daysInMonth: end.getUTCDate(),
    startWeekday: (start.getUTCDay() + 6) % 7, // Monday-first
  }
}

function statusClass(status?: PartnerCalendarStatus) {
  if (status === 'available') return 'bg-success/15 border-success/40'
  if (status === 'busy') return 'bg-warning/15 border-warning/40'
  if (status === 'blocked') return 'bg-destructive/10 border-destructive/30'
  return 'bg-card border-border hover:bg-muted/40'
}

export function PartnerPlanningPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyDay, setBusyDay] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<PartnerCalendarStatus>('blocked')
  const [days, setDays] = useState<PartnerCalendarDay[]>([])

  const bounds = useMemo(() => monthBounds(year, month), [year, month])
  const byDay = useMemo(() => {
    const map = new Map<string, PartnerCalendarDay>()
    days.forEach(day => map.set(day.day, day))
    return map
  }, [days])

  const load = async (pid: string, y: number, m: number) => {
    setLoading(true)
    setError('')
    const { from, to } = monthBounds(y, m)
    const { data, error: loadError } = await fetchMyCalendarDays(pid, from, to)
    if (loadError) setError(loadError.message)
    setDays((data ?? []) as PartnerCalendarDay[])
    setLoading(false)
  }

  useEffect(() => {
    fetchMyPartnerProfile().then(({ data, error: profileError }) => {
      if (profileError || !data) {
        setError(profileError?.message ?? 'Fiche introuvable.')
        setLoading(false)
        return
      }
      setPartnerId((data as PartnerRecord).id)
    })
  }, [])

  useEffect(() => {
    if (!partnerId) return
    void load(partnerId, year, month)
  }, [partnerId, year, month])

  const shiftMonth = (delta: number) => {
    const date = new Date(year, month + delta, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth())
  }

  const toggleDay = async (dayNumber: number) => {
    if (!partnerId) return
    const day = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
    setBusyDay(day)
    setError('')
    const existing = byDay.get(day)
    if (existing && existing.status === selectedStatus) {
      const { error: deleteError } = await deleteCalendarDay(partnerId, day)
      if (deleteError) setError(deleteError.message)
      else setDays(current => current.filter(item => item.day !== day))
    } else {
      const { data, error: upsertError } = await upsertCalendarDay({
        partnerId,
        day,
        status: selectedStatus,
      })
      if (upsertError) setError(upsertError.message)
      else if (data) {
        setDays(current => {
          const without = current.filter(item => item.day !== day)
          return [...without, data as PartnerCalendarDay]
        })
      }
    }
    setBusyDay(null)
  }

  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Planning</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indiquez vos jours disponibles, occupés ou indisponibles.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => shiftMonth(-1)}>←</Button>
            <p className="min-w-[160px] text-center text-sm font-semibold capitalize">{monthLabel}</p>
            <Button size="sm" variant="secondary" onClick={() => shiftMonth(1)}>→</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(partnerCalendarStatusLabels) as PartnerCalendarStatus[]).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  selectedStatus === status
                    ? 'border-foreground/20 bg-foreground text-background'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                {partnerCalendarStatusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="py-10"><LoadingState label="Chargement du calendrier…" /></div>
        ) : (
          <div className="mt-4 grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(label => (
              <p key={label} className="text-center text-[11px] font-medium text-muted-foreground">
                {label}
              </p>
            ))}
            {Array.from({ length: bounds.startWeekday }).map((_, index) => (
              <div key={`pad-${index}`} />
            ))}
            {Array.from({ length: bounds.daysInMonth }).map((_, index) => {
              const dayNumber = index + 1
              const day = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
              const entry = byDay.get(day)
              return (
                <button
                  key={day}
                  type="button"
                  disabled={busyDay === day}
                  onClick={() => void toggleDay(dayNumber)}
                  className={`aspect-square rounded-md border p-1 text-left text-xs transition-colors ${statusClass(entry?.status)}`}
                  title={entry ? partnerCalendarStatusLabels[entry.status] : 'Non renseigné'}
                >
                  <span className="font-medium">{dayNumber}</span>
                </button>
              )
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Cliquez un jour pour appliquer « {partnerCalendarStatusLabels[selectedStatus]} ».
          Un second clic sur le même statut l’efface.
        </p>
      </Card>
    </div>
  )
}
