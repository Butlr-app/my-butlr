import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useActivityLog, useProperties, type ActivityLogEntry } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useTranslation } from '@/i18n/LanguageContext'
import {
  History, Loader2, ClipboardList, AlertTriangle, Wrench, ClipboardCheck,
  Package, Banknote, CalendarRange, Circle,
} from 'lucide-react'

const ENTITY_ICON: Record<string, typeof History> = {
  tasks: ClipboardList,
  incidents: AlertTriangle,
  work_orders: Wrench,
  inspections: ClipboardCheck,
  inventory_items: Package,
  expenses: Banknote,
  shifts: CalendarRange,
}

const ACTION_VARIANT: Record<ActivityLogEntry['action'], 'success' | 'info' | 'warning' | 'destructive'> = {
  created: 'success',
  updated: 'info',
  status_changed: 'warning',
  deleted: 'destructive',
}

const ENTITY_TYPES = ['tasks', 'incidents', 'work_orders', 'inspections', 'inventory_items', 'expenses', 'shifts']
const ACTIONS: ActivityLogEntry['action'][] = ['created', 'status_changed', 'updated', 'deleted']

export function Activity() {
  const { t, language } = useTranslation()
  const { isVisible, filterProperties } = useRoleFilter()
  const { data: rawLog, loading } = useActivityLog()
  const { data: rawProperties } = useProperties()

  const [propertyFilter, setPropertyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const properties = filterProperties(rawProperties)
  const propertyName = (id: string | null) =>
    id ? (properties.find(p => p.id === id)?.name ?? '—') : '—'

  const entries = useMemo(() =>
    rawLog
      .filter(e => !propertyFilter || e.property_id === propertyFilter)
      .filter(e => !typeFilter || e.entity_type === typeFilter)
      .filter(e => !actionFilter || e.action === actionFilter),
    [rawLog, propertyFilter, typeFilter, actionFilter])

  const groups = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>()
    for (const e of entries) {
      const day = e.created_at.slice(0, 10)
      const list = map.get(day) ?? []
      list.push(e)
      map.set(day, list)
    }
    return Array.from(map.entries())
  }, [entries])

  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'
  const dayLabel = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  const entityLabel = (type: string) => t(`activity.entities.${type}`)

  if (!isVisible('activity')) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="space-y-6" data-testid="activity">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('activity.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('activity.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('activity.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          className="w-44"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          options={[
            { value: '', label: t('activity.allTypes') },
            ...ENTITY_TYPES.map(ty => ({ value: ty, label: entityLabel(ty) })),
          ]}
        />
        <Select
          className="w-44"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          options={[
            { value: '', label: t('activity.allActions') },
            ...ACTIONS.map(a => ({ value: a, label: t(`activity.actions.${a}`) })),
          ]}
        />
      </div>

      {entries.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('activity.empty')}</Card>
      )}

      <div className="space-y-6">
        {groups.map(([day, items]) => (
          <div key={day} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{dayLabel(day)}</p>
            <div className="grid gap-2">
              {items.map(e => {
                const Icon = ENTITY_ICON[e.entity_type] ?? Circle
                return (
                  <Card key={e.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={ACTION_VARIANT[e.action]}>{t(`activity.actions.${e.action}`)}</Badge>
                          <span className="text-xs text-muted-foreground">{entityLabel(e.entity_type)}</span>
                          <span className="text-sm font-semibold truncate">{e.entity_title || '—'}</span>
                          {e.action === 'status_changed' && e.new_status && (
                            <Badge variant="muted">→ {e.new_status}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {e.actor_name || t('activity.system')} · {propertyName(e.property_id)} · {timeLabel(e.created_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
