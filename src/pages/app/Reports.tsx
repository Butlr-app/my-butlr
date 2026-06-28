import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { BarChart, LineChart, DonutChart } from '@/components/charts/Charts'
import { usePayments, useReservations, useProperties, usePartners } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { exportReportPdf, generateCsv, downloadCsv } from '@/lib/importExport'
import { Loader2, FileDown, Sheet } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const RES_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const

export function Reports() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: payments, loading: lPay } = usePayments()
  const { data: reservations, loading: lRes } = useReservations()
  const { data: properties, loading: lProp } = useProperties()
  const { data: partners, loading: lPart } = usePartners()
  const loading = lPay || lRes || lProp || lPart

  const years = useMemo(() => {
    const set = new Set<number>()
    payments.forEach(p => { if (p.date) set.add(new Date(p.date).getFullYear()) })
    reservations.forEach(r => { if (r.arrival) set.add(new Date(r.arrival).getFullYear()) })
    set.add(new Date().getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [payments, reservations])

  const [year, setYear] = useState(() => String(new Date().getFullYear()))

  const stats = useMemo(() => {
    const y = Number(year)
    const yearPayments = payments.filter(p => p.date && new Date(p.date).getFullYear() === y)
    const yearReservations = reservations.filter(r => r.arrival && new Date(r.arrival).getFullYear() === y)

    const paidPayments = yearPayments.filter(p => p.status === 'paid')
    const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount), 0)
    const serviceRevenue = paidPayments.filter(p => p.type === 'service').reduce((s, p) => s + Number(p.amount), 0)

    const today = new Date().toISOString().split('T')[0]
    const totalProps = properties.length

    const valuedRes = yearReservations.filter(r => r.status !== 'cancelled')
    const avgSpend = valuedRes.length > 0
      ? Math.round(valuedRes.reduce((s, r) => s + Number(r.total_amount), 0) / valuedRes.length)
      : 0

    // Monthly revenue
    const monthlyRevenue = MONTHS.map((m, idx) => ({
      label: m,
      value: paidPayments
        .filter(p => new Date(p.date).getMonth() === idx)
        .reduce((s, p) => s + Number(p.amount), 0),
    }))

    // Monthly occupancy: % of days in month covered by an active reservation, averaged across properties
    const occupancyTrend = MONTHS.map((m, idx) => {
      const daysInMonth = new Date(y, idx + 1, 0).getDate()
      const denom = totalProps * daysInMonth
      if (denom === 0) return { label: m, value: 0 }
      let occupiedDays = 0
      reservations.forEach(r => {
        if (r.status === 'cancelled' || !r.property_id) return
        const a = new Date(r.arrival)
        const d = new Date(r.departure)
        for (let day = 1; day <= daysInMonth; day++) {
          const cur = new Date(y, idx, day)
          if (cur >= a && cur < d) occupiedDays++
        }
      })
      return { label: m, value: Math.round((occupiedDays / denom) * 100) }
    })

    // Headline occupancy: point-in-time (properties occupied today / total),
    // matching the Overview KPI and the per-property cards below.
    const occupiedProps = new Set(
      reservations
        .filter(r => r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress'))
        .map(r => r.property_id)
        .filter(Boolean)
    ).size
    const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0

    // Reservations by status
    const byStatus = RES_STATUSES.map(s => ({
      key: s,
      label: t(`reports.status${s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}`),
      value: yearReservations.filter(r => r.status === s).length,
    })).filter(s => s.value > 0)

    // Service revenue breakdown
    const svcRevenue: Record<string, number> = {}
    paidPayments.filter(p => p.type === 'service').forEach(p => {
      const label = p.property_name || 'Other'
      svcRevenue[label] = (svcRevenue[label] || 0) + Number(p.amount)
    })
    const totalSvcRev = Object.values(svcRevenue).reduce((s, v) => s + v, 0) || 1
    const svcBreakdown = Object.entries(svcRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, revenue]) => ({ service, revenue, pct: Math.round((revenue / totalSvcRev) * 100) }))

    // Property performance
    const propPerf = properties.map(prop => {
      const propRes = yearReservations.filter(r => r.property_id === prop.id)
      const revenue = propRes.reduce((s, r) => s + Number(r.total_amount), 0)
      const occupied = propRes.filter(r =>
        r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
      ).length
      return { property: prop.name, revenue, occupancy: occupied > 0 ? 100 : 0 }
    }).sort((a, b) => b.revenue - a.revenue)

    // Partner commissions
    const partnerStats = partners.map(p => ({
      partner: p.name,
      commission: Math.round(Number(p.commission) * p.bookings_count * 10),
      bookings: p.bookings_count,
    })).sort((a, b) => b.commission - a.commission).slice(0, 5)

    return {
      totalRevenue, serviceRevenue, occupancyRate, avgSpend,
      monthlyRevenue, occupancyTrend, byStatus, svcBreakdown, propPerf, partnerStats,
      totalReservations: yearReservations.length, totalPayments: yearPayments.length,
    }
  }, [year, payments, reservations, properties, partners, t])

  const handleExportPdf = async () => {
    try {
      await exportReportPdf(
        `${t('reports.title')} ${year}`,
        [
          {
            heading: t('reports.revenueSummary'),
            content: [
              `${t('reports.totalRevenue')}: €${stats.totalRevenue.toLocaleString()}`,
              `${t('reports.bookingRevenue')}: €${(stats.totalRevenue - stats.serviceRevenue).toLocaleString()}`,
              `${t('reports.serviceRevenue')}: €${stats.serviceRevenue.toLocaleString()}`,
              `${t('reports.occupancy')}: ${stats.occupancyRate}%`,
              `${t('reports.avgGuestSpend')}: €${stats.avgSpend.toLocaleString()}`,
              `${t('reports.totalReservations')}: ${stats.totalReservations}`,
            ].join('\n'),
          },
          {
            heading: t('reports.monthlyRevenue'),
            content: stats.monthlyRevenue.map(m => `${m.label}: €${m.value.toLocaleString()}`).join('\n'),
          },
          {
            heading: t('reports.propertyPerformance'),
            content: stats.propPerf.map(p => `${p.property}: €${p.revenue.toLocaleString()}`).join('\n') || '-',
          },
          {
            heading: t('reports.partnerCommissions'),
            content: stats.partnerStats.map(p => `${p.partner}: €${p.commission} (${p.bookings} bookings)`).join('\n') || '-',
          },
        ],
        { date: new Date().toLocaleDateString() }
      )
      toast(t('reports.exported'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleExportCsv = () => {
    const rows = stats.monthlyRevenue.map((m, i) => ({
      month: m.label,
      revenue: m.value,
      occupancy: `${stats.occupancyTrend[i].value}%`,
    }))
    const csv = generateCsv(rows, [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Revenue (EUR)' },
      { key: 'occupancy', label: 'Occupancy' },
    ])
    downloadCsv(csv, `report-${year}.csv`)
    toast(t('reports.exported'))
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
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">{t('reports.title')}</p>
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
        <MetricCard label={t('reports.totalRevenue')} value={stats.totalRevenue} prefix="€" />
        <MetricCard label={t('reports.serviceRevenue')} value={stats.serviceRevenue} prefix="€" />
        <MetricCard label={t('reports.occupancy')} value={`${stats.occupancyRate}%`} />
        <MetricCard label={t('reports.avgGuestSpend')} value={stats.avgSpend} prefix="€" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <BarChart data={stats.monthlyRevenue} label={t('reports.monthlyRevenue')} />
        </Card>

        <Card className="p-5">
          <LineChart data={stats.occupancyTrend} label={t('reports.occupancyTrend')} />
        </Card>

        <Card className="p-5">
          {stats.byStatus.length === 0 ? (
            <>
              <h3 className="text-sm font-semibold mb-4">{t('reports.reservationsByStatus')}</h3>
              <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
            </>
          ) : (
            <DonutChart
              data={stats.byStatus.map(s => ({ label: s.label, value: s.value }))}
              label={t('reports.reservationsByStatus')}
              centerValue={String(stats.totalReservations)}
              centerLabel={t('reports.totalReservations')}
            />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">{t('reports.revenueSummary')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <p className="text-sm">{t('reports.bookingRevenue')}</p>
              <p className="text-sm font-mono font-medium">€{(stats.totalRevenue - stats.serviceRevenue).toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <p className="text-sm">{t('reports.serviceRevenue')}</p>
              <p className="text-sm font-mono font-medium">€{stats.serviceRevenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <p className="text-sm">{t('reports.totalPayments')}</p>
              <p className="text-sm font-mono font-medium">{stats.totalPayments}</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm font-semibold">{t('reports.totalRevenue')}</p>
              <p className="text-sm font-mono font-semibold">€{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">{t('reports.serviceBreakdown')}</h3>
          {stats.svcBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="space-y-3">
              {stats.svcBreakdown.map(item => (
                <div key={item.service} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{item.service}</p>
                    <p className="text-sm font-mono">€{item.revenue.toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">{t('reports.propertyPerformance')}</h3>
          <div className="space-y-4">
            {stats.propPerf.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
            ) : (
              stats.propPerf.map(item => (
                <div key={item.property} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.property}</p>
                    <p className="text-xs text-muted-foreground">{item.occupancy}% {t('reports.occupancy').toLowerCase()}</p>
                  </div>
                  <p className="text-sm font-mono font-medium">€{item.revenue.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">{t('reports.partnerCommissions')}</h3>
          <div className="space-y-4">
            {stats.partnerStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
            ) : (
              stats.partnerStats.map(item => (
                <div key={item.partner} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.partner}</p>
                    <p className="text-xs text-muted-foreground">{item.bookings} bookings</p>
                  </div>
                  <p className="text-sm font-mono font-medium">€{item.commission}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
