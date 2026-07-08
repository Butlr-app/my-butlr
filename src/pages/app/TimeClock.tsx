import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useTimeEntries, useShifts, useProperties, useTeamMembers, type TimeEntry } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react'

function weekStart(d = new Date()): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`
}

export function TimeClock() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawEntries, loading, insert, update } = useTimeEntries()
  const { data: shifts } = useShifts()
  const { data: rawProperties } = useProperties()
  const { members } = useTeamMembers()
  const { filterProperties, filterTimeEntries } = useRoleFilter()

  const isManager = actualRole === 'owner' || actualRole === 'agency'
  const [propertyId, setPropertyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  const properties = filterProperties(rawProperties)
  const entries = filterTimeEntries(rawEntries)
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'

  useEffect(() => {
    if (!propertyId && properties[0]) setPropertyId(properties[0].id)
  }, [properties, propertyId])

  // tick every 30s to refresh the running timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const myOpen = useMemo(
    () => rawEntries.find(e => e.user_id === user?.id && !e.clock_out),
    [rawEntries, user?.id],
  )

  const ws = weekStart().getTime()
  const weekEntries = entries
    .filter(e => new Date(e.clock_in).getTime() >= ws)
    .sort((a, b) => b.clock_in.localeCompare(a.clock_in))

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'
  const memberName = (id: string) => {
    const m = members.find(x => x.id === id)
    return m?.full_name || m?.email || '—'
  }
  const entryMs = (e: TimeEntry) =>
    (e.clock_out ? new Date(e.clock_out).getTime() : now) - new Date(e.clock_in).getTime()

  const totalsByMember = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of weekEntries) map[e.user_id] = (map[e.user_id] ?? 0) + entryMs(e)
    return map
  }, [weekEntries, now])

  const clockIn = async () => {
    if (!propertyId) return
    setBusy(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const shift = shifts.find(s => s.user_id === user?.id && s.property_id === propertyId && s.shift_date === today)
      await insert({ property_id: propertyId, user_id: user?.id ?? '', shift_id: shift?.id ?? null })
      toast(t('timeclock.clockedIn'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setBusy(false)
  }

  const clockOut = async () => {
    if (!myOpen) return
    setBusy(true)
    try {
      await update(myOpen.id, { clock_out: new Date().toISOString() })
      toast(t('timeclock.clockedOut'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setBusy(false)
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="space-y-6" data-testid="time-clock">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('timeclock.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('timeclock.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <Card className="p-5">
        {myOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">{t('timeclock.onTheClock')}</Badge>
                <span className="text-sm text-muted-foreground">{propertyName(myOpen.property_id)}</span>
              </div>
              <p className="text-2xl font-bold mt-2 tabular-nums">{fmtDuration(entryMs(myOpen))}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('timeclock.since')} {fmtTime(myOpen.clock_in)}
                {myOpen.shift_id && <> · {t('timeclock.linkedShift')}</>}
              </p>
            </div>
            <Button variant="destructive" onClick={clockOut} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <LogOut className="w-4 h-4 mr-1.5" />}
              {t('timeclock.clockOut')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1 min-w-52">
              <Select
                label={t('timeclock.villa')}
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                options={properties.map(p => ({ value: p.id, label: p.name }))}
              />
            </div>
            <Button onClick={clockIn} disabled={busy || !propertyId}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <LogIn className="w-4 h-4 mr-1.5" />}
              {t('timeclock.clockIn')}
            </Button>
          </div>
        )}
      </Card>

      {isManager && Object.keys(totalsByMember).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">{t('timeclock.weekTimesheet')}</h3>
          <div className="grid gap-2">
            {Object.entries(totalsByMember)
              .sort((a, b) => b[1] - a[1])
              .map(([uid, ms]) => (
                <Card key={uid} className="p-3 flex items-center justify-between">
                  <span className="text-sm">{memberName(uid)}</span>
                  <span className="text-sm font-semibold tabular-nums">{fmtDuration(ms)}</span>
                </Card>
              ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">{t('timeclock.thisWeek')}</h3>
        {weekEntries.length === 0 && !loading && (
          <Card className="p-8 text-center text-sm text-muted-foreground">{t('timeclock.empty')}</Card>
        )}
        <div className="grid gap-2">
          {weekEntries.map(e => (
            <Card key={e.id} className="p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {isManager && <>{memberName(e.user_id)} · </>}{propertyName(e.property_id)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDay(e.clock_in)} · {fmtTime(e.clock_in)} – {e.clock_out ? fmtTime(e.clock_out) : t('timeclock.ongoing')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!e.clock_out && <Badge variant="success">{t('timeclock.active')}</Badge>}
                  <span className="text-sm font-semibold tabular-nums">{fmtDuration(entryMs(e))}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
