import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { BarChart, LineChart } from '@/components/charts/Charts'
import { useTasks, useIncidents, useWorkOrders, useExpenses, useProperties } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { exportReportPdf, generateCsv, downloadCsv } from '@/lib/importExport'
import { Loader2, FileDown, Sheet, ClipboardCheck, Timer, Wrench, AlertTriangle } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDuration(hours: number | null, t: (key: string) => string): string {
  if (hours == null) return '—'
  if (hours < 1) return `<1${t('reportsOps.hourShort')}`
  if (hours < 48) return `${Math.round(hours)}${t('reportsOps.hourShort')}`
  return `${(hours / 24).toFixed(1)}${t('reportsOps.dayShort')}`
}

export function ReportsOperations() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: rawTasks, loading: lTask } = useTasks()
  const { data: rawIncidents, loading: lInc } = useIncidents()
  const { data: rawWorkOrders, loading: lWo } = useWorkOrders()
  const { data: rawExpenses, loading: lExp } = useExpenses()
  const { data: rawProperties, loading: lProp } = useProperties()
  const { filterTasks, filterIncidents, filterWorkOrders, filterExpenses, filterProperties } = useRoleFilter()
  const loading = lTask || lInc || lWo || lExp || lProp

  const tasks = filterTasks(rawTasks)
  const incidents = filterIncidents(rawIncidents)
  const workOrders = filterWorkOrders(rawWorkOrders)
  const expenses = filterExpenses(rawExpenses)
  const properties = filterProperties(rawProperties)

  const years = useMemo(() => {
    const set = new Set<number>()
    tasks.forEach(x => set.add(new Date(x.created_at).getFullYear()))
    incidents.forEach(x => set.add(new Date(x.created_at).getFullYear()))
    workOrders.forEach(x => set.add(new Date(x.created_at).getFullYear()))
    expenses.forEach(x => { if (x.expense_date) set.add(new Date(x.expense_date).getFullYear()) })
    set.add(new Date().getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [tasks, incidents, workOrders, expenses])

  const [year, setYear] = useState(() => String(new Date().getFullYear()))

  const stats = useMemo(() => {
    const y = Number(year)
    const yTasks = tasks.filter(x => new Date(x.created_at).getFullYear() === y)
    const yIncidents = incidents.filter(x => new Date(x.created_at).getFullYear() === y)
    const yWorkOrders = workOrders.filter(x => new Date(x.created_at).getFullYear() === y)
    const yExpenses = expenses.filter(x => x.expense_date && new Date(x.expense_date).getFullYear() === y)

    const doneTasks = yTasks.filter(x => x.status === 'done')
    const completionRate = yTasks.length > 0 ? Math.round((doneTasks.length / yTasks.length) * 100) : 0

    const dueDone = doneTasks.filter(x => x.due_date)
    const onTimeDone = dueDone.filter(x => x.updated_at.slice(0, 10) <= x.due_date!.slice(0, 10))
    const onTimeRate = dueDone.length > 0 ? Math.round((onTimeDone.length / dueDone.length) * 100) : null

    const resolved = yIncidents.filter(x => x.resolved_at)
    const avgResolutionHours = resolved.length > 0
      ? resolved.reduce((s, x) => s + (new Date(x.resolved_at!).getTime() - new Date(x.created_at).getTime()), 0) / resolved.length / 3600000
      : null
    const openIncidents = yIncidents.filter(x => x.status === 'open' || x.status === 'in_progress').length

    const woCost = (list: typeof yWorkOrders) =>
      list.filter(x => x.status !== 'cancelled').reduce((s, x) => s + Number(x.final_cost ?? x.quote_amount ?? 0), 0)
    const expCost = (list: typeof yExpenses) =>
      list.filter(x => x.status === 'approved' && (x.category === 'maintenance' || x.category === 'cleaning' || x.category === 'supplies'))
        .reduce((s, x) => s + Number(x.amount), 0)
    const maintenanceCost = woCost(yWorkOrders) + expCost(yExpenses)

    const incidentsByMonth = MONTHS.map((m, idx) => ({
      label: m,
      value: yIncidents.filter(x => new Date(x.created_at).getMonth() === idx).length,
    }))

    const completionByMonth = MONTHS.map((m, idx) => {
      const monthTasks = yTasks.filter(x => new Date(x.created_at).getMonth() === idx)
      return {
        label: m,
        value: monthTasks.length > 0 ? Math.round((monthTasks.filter(x => x.status === 'done').length / monthTasks.length) * 100) : 0,
      }
    })

    const perVilla = properties.map(prop => {
      const pTasks = yTasks.filter(x => x.property_id === prop.id)
      const pDone = pTasks.filter(x => x.status === 'done')
      const pIncidents = yIncidents.filter(x => x.property_id === prop.id)
      const pResolved = pIncidents.filter(x => x.resolved_at)
      const pAvgRes = pResolved.length > 0
        ? pResolved.reduce((s, x) => s + (new Date(x.resolved_at!).getTime() - new Date(x.created_at).getTime()), 0) / pResolved.length / 3600000
        : null
      const cost = woCost(yWorkOrders.filter(x => x.property_id === prop.id)) + expCost(yExpenses.filter(x => x.property_id === prop.id))
      return {
        property: prop.name,
        tasksDone: pDone.length,
        tasksTotal: pTasks.length,
        completion: pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : null,
        incidents: pIncidents.length,
        avgResolutionHours: pAvgRes,
        maintenanceCost: cost,
      }
    }).filter(v => v.tasksTotal > 0 || v.incidents > 0 || v.maintenanceCost > 0)
      .sort((a, b) => b.maintenanceCost - a.maintenanceCost)

    return {
      completionRate, tasksDone: doneTasks.length, tasksTotal: yTasks.length,
      onTimeRate, avgResolutionHours, openIncidents, totalIncidents: yIncidents.length,
      maintenanceCost, incidentsByMonth, completionByMonth, perVilla,
    }
  }, [year, tasks, incidents, workOrders, expenses, properties])

  const handleExportCsv = () => {
    const rows = stats.perVilla.map(v => ({
      property: v.property,
      tasks: `${v.tasksDone}/${v.tasksTotal}`,
      completion: v.completion != null ? `${v.completion}%` : '-',
      incidents: v.incidents,
      avg_resolution: formatDuration(v.avgResolutionHours, t),
      maintenance_cost: v.maintenanceCost,
    }))
    const csv = generateCsv(rows, [
      { key: 'property', label: t('reportsOps.villa') },
      { key: 'tasks', label: t('reportsOps.tasksDone') },
      { key: 'completion', label: t('reportsOps.completionRate') },
      { key: 'incidents', label: t('reportsOps.incidents') },
      { key: 'avg_resolution', label: t('reportsOps.avgResolution') },
      { key: 'maintenance_cost', label: `${t('reportsOps.maintenanceCost')} (EUR)` },
    ])
    downloadCsv(csv, `operations-report-${year}.csv`)
    toast(t('reports.exported'))
  }

  const handleExportPdf = async () => {
    try {
      await exportReportPdf(
        `${t('reportsOps.title')} ${year}`,
        [
          {
            heading: t('reportsOps.summary'),
            content: [
              `${t('reportsOps.completionRate')}: ${stats.completionRate}% (${stats.tasksDone}/${stats.tasksTotal})`,
              `${t('reportsOps.onTimeRate')}: ${stats.onTimeRate != null ? `${stats.onTimeRate}%` : '—'}`,
              `${t('reportsOps.avgResolution')}: ${formatDuration(stats.avgResolutionHours, t)}`,
              `${t('reportsOps.openIncidents')}: ${stats.openIncidents} / ${stats.totalIncidents}`,
              `${t('reportsOps.maintenanceCost')}: €${stats.maintenanceCost.toLocaleString()}`,
            ].join('\n'),
          },
          {
            heading: t('reportsOps.perVilla'),
            content: stats.perVilla.map(v =>
              `${v.property}: ${t('reportsOps.tasksDone')} ${v.tasksDone}/${v.tasksTotal}` +
              ` · ${t('reportsOps.incidents')} ${v.incidents} (${formatDuration(v.avgResolutionHours, t)})` +
              ` · ${t('reportsOps.maintenanceCost')} €${v.maintenanceCost.toLocaleString()}`
            ).join('\n') || '-',
          },
          {
            heading: t('reportsOps.incidentsByMonth'),
            content: stats.incidentsByMonth.map(m => `${m.label}: ${m.value}`).join('\n'),
          },
        ],
        { date: new Date().toLocaleDateString() }
      )
      toast(t('reports.exported'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('reportsOps.subtitle')}</p>
        <div className="flex items-center gap-2">
          <Select
            value={year}
            onChange={e => setYear(e.target.value)}
            options={years.map(y => ({ value: String(y), label: String(y) }))}
            className="w-28"
          />
          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            <Sheet className="w-3.5 h-3.5 mr-1.5" />
            {t('reports.exportCsv')}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportPdf}>
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            {t('reports.exportPdf')}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t('reportsOps.completionRate')} value={`${stats.completionRate}%`} icon={ClipboardCheck} tone="success" />
        <MetricCard label={t('reportsOps.avgResolution')} value={formatDuration(stats.avgResolutionHours, t)} icon={Timer} tone="info" />
        <MetricCard label={t('reportsOps.maintenanceCost')} value={stats.maintenanceCost} prefix="€" icon={Wrench} tone="warning" />
        <MetricCard label={t('reportsOps.openIncidents')} value={stats.openIncidents} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <BarChart data={stats.incidentsByMonth} label={t('reportsOps.incidentsByMonth')} />
        </Card>

        <Card className="p-5">
          <LineChart data={stats.completionByMonth} label={t('reportsOps.completionByMonth')} />
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{t('reportsOps.perVilla')}</h3>
          {stats.onTimeRate != null && (
            <p className="text-xs text-muted-foreground">{t('reportsOps.onTimeRate')}: <span className="font-medium text-foreground">{stats.onTimeRate}%</span></p>
          )}
        </div>
        {stats.perVilla.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t('reportsOps.villa')}</th>
                  <th className="py-2 pr-4 font-medium">{t('reportsOps.tasksDone')}</th>
                  <th className="py-2 pr-4 font-medium">{t('reportsOps.completionRate')}</th>
                  <th className="py-2 pr-4 font-medium">{t('reportsOps.incidents')}</th>
                  <th className="py-2 pr-4 font-medium">{t('reportsOps.avgResolution')}</th>
                  <th className="py-2 font-medium text-right">{t('reportsOps.maintenanceCost')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.perVilla.map(v => (
                  <tr key={v.property} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{v.property}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{v.tasksDone}/{v.tasksTotal}</td>
                    <td className="py-2.5 pr-4">
                      {v.completion == null ? '—' : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${v.completion}%` }} />
                          </div>
                          <span className="tabular-nums text-xs">{v.completion}%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{v.incidents}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{formatDuration(v.avgResolutionHours, t)}</td>
                    <td className="py-2.5 tabular-nums text-right font-medium">€{v.maintenanceCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
