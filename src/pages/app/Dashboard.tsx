import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useDashboardKPIs, useReservations, useTasks, usePayments, useProperties, usePartners, useServices } from '@/lib/useSupabase'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '@/lib/roleContext'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useTranslation } from '@/i18n/LanguageContext'
import { useState, useEffect } from 'react'

function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barWidth = Math.max(20, Math.floor(280 / Math.max(data.length, 1)) - 8)

  return (
    <div className="w-full">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-3">{label}</p>
      <svg viewBox={`0 0 ${Math.max(data.length * (barWidth + 8), 100)} 160`} className="w-full h-40" preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * 120
          const x = i * (barWidth + 8) + 4
          const y = 130 - barHeight
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="currentColor"
                className="text-foreground/70"
                rx={3}
              >
                <animate attributeName="height" from="0" to={barHeight} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from="130" to={y} dur="0.6s" fill="freeze" />
              </rect>
              <text x={x + barWidth / 2} y={148} textAnchor="middle" className="fill-muted-foreground" fontSize="8" fontFamily="monospace">
                {d.label}
              </text>
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-foreground" fontSize="8" fontFamily="monospace">
                {d.value > 0 ? (d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value) : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function LineChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const width = 300
  const height = 120
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding + chartHeight - (d.value / maxVal) * chartHeight,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`

  return (
    <div className="w-full">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-3">{label}</p>
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-36" preserveAspectRatio="xMidYMid meet">
        <path d={areaD} fill="currentColor" className="text-foreground/10" />
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/70" />
        {points.map((p, i) => (
          <circle key={data[i].label} cx={p.x} cy={p.y} r="3" fill="currentColor" className="text-foreground" />
        ))}
        {data.map((d, i) => (
          <text key={d.label} x={points[i].x} y={height + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="8" fontFamily="monospace">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

function OwnerDashboard() {
  const { t } = useTranslation()
  const { kpis } = useDashboardKPIs()
  const { data: payments } = usePayments()
  const { data: properties } = useProperties()
  const { data: reservations } = useReservations()

  const activeReservations = reservations.filter(r => r.status === 'confirmed' || r.status === 'in_progress').length
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()
  const monthlyData = months.slice(0, currentMonth + 1).map(month => {
    const monthIdx = months.indexOf(month)
    const rev = payments
      .filter(p => p.status === 'paid' && new Date(p.date).getMonth() === monthIdx)
      .reduce((s, p) => s + Number(p.amount), 0)
    return { label: month, value: rev }
  })

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t('dashboard.totalRevenue')} value={totalRevenue} prefix="€" />
        <MetricCard label={t('dashboard.occupancyRate')} value={`${kpis.occupancyRate}%`} />
        <MetricCard label={t('dashboard.totalProperties')} value={properties.length} />
        <MetricCard label={t('dashboard.activeReservations')} value={activeReservations} />
      </div>
      <Card className="p-5">
        <BarChart data={monthlyData} label={t('dashboard.monthlyRevenue')} />
      </Card>
    </>
  )
}

function HouseManagerDashboard() {
  const { t } = useTranslation()
  const { data: tasks } = useTasks()
  const { data: reservations } = useReservations()
  const { data: properties } = useProperties()

  const today = new Date().toISOString().split('T')[0]
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length
  const arrivalsToday = reservations.filter(r => r.arrival === today && (r.status === 'confirmed' || r.status === 'pending')).length
  const departuresToday = reservations.filter(r => r.departure === today && (r.status === 'confirmed' || r.status === 'in_progress')).length

  const weekData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
    const dayTasks = tasks.filter(t => {
      const created = new Date(t.created_at).getDay()
      return created === (i + 1) % 7
    }).length
    return { label: d, value: dayTasks }
  })

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t('dashboard.tasksInProgress')} value={tasksInProgress} />
        <MetricCard label={t('dashboard.arrivalsToday')} value={arrivalsToday} />
        <MetricCard label={t('dashboard.departuresToday')} value={departuresToday} />
        <MetricCard label={t('dashboard.managedProperties')} value={properties.length} />
      </div>
      <Card className="p-5">
        <BarChart data={weekData} label={t('dashboard.tasksInProgress')} />
      </Card>
    </>
  )
}

function ConciergeDashboard() {
  const { t } = useTranslation()
  const { data: tasks } = useTasks()
  const { data: reservations } = useReservations()

  const today = new Date().toISOString().split('T')[0]
  const pendingRequests = tasks.filter(t => t.status === 'todo').length
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const completedThisWeek = tasks.filter(t => t.status === 'done' && new Date(t.updated_at) >= weekStart).length
  const upcomingArrivals = reservations.filter(r => r.arrival > today && (r.status === 'confirmed' || r.status === 'pending')).length

  const statusData = [
    { label: 'Todo', value: tasks.filter(t => t.status === 'todo').length },
    { label: 'WIP', value: tasks.filter(t => t.status === 'in_progress').length },
    { label: 'Wait', value: tasks.filter(t => t.status === 'waiting').length },
    { label: 'Done', value: tasks.filter(t => t.status === 'done').length },
  ]

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label={t('dashboard.pendingRequests')} value={pendingRequests} />
        <MetricCard label={t('dashboard.completedThisWeek')} value={completedThisWeek} />
        <MetricCard label={t('dashboard.upcomingArrivals')} value={upcomingArrivals} />
      </div>
      <Card className="p-5">
        <BarChart data={statusData} label={t('dashboard.openTasks')} />
      </Card>
    </>
  )
}

function PartnerDashboard() {
  const { t } = useTranslation()
  const { data: partners } = usePartners()
  const { data: services } = useServices()
  const { data: payments } = usePayments()

  const monthCommissions = payments
    .filter(p => p.type === 'commission' && p.status === 'paid' && new Date(p.date).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + Number(p.amount), 0)
  const totalServices = services.filter(s => s.available).length
  const avgRating = partners.length > 0 ? (partners.reduce((s, p) => s + p.rating, 0) / partners.length).toFixed(1) : '0'

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const commData = months.map(month => {
    const monthIdx = months.indexOf(month)
    const rev = payments
      .filter(p => p.type === 'commission' && p.status === 'paid' && new Date(p.date).getMonth() === monthIdx)
      .reduce((s, p) => s + Number(p.amount), 0)
    return { label: month, value: rev }
  })

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label={t('dashboard.monthlyCommissions')} value={monthCommissions} prefix="€" />
        <MetricCard label={t('dashboard.servicesProvided')} value={totalServices} />
        <MetricCard label={t('dashboard.averageRating')} value={avgRating} />
      </div>
      <Card className="p-5">
        <LineChart data={commData} label={t('dashboard.monthlyCommissions')} />
      </Card>
    </>
  )
}

function GuestDashboard() {
  const { t } = useTranslation()
  const { data: reservations } = useReservations()
  const { data: services } = useServices()

  const today = new Date().toISOString().split('T')[0]
  const currentRes = reservations.find(r =>
    r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
  )
  const availableServices = services.filter(s => s.available).length

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label={t('dashboard.currentReservation')} value={currentRes ? '1' : '0'} />
        <MetricCard label={t('dashboard.availableServices')} value={availableServices} />
        <MetricCard label={t('dashboard.propertyInfo')} value={currentRes?.property?.name ?? '—'} />
      </div>
      {currentRes && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{t('dashboard.currentReservation')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('reservations.arrival')}</span>
              <span className="font-mono">{currentRes.arrival}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('reservations.departure')}</span>
              <span className="font-mono">{currentRes.departure}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('common.status')}</span>
              <Badge variant="success">{currentRes.status}</Badge>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}

export function Dashboard() {
  const { role } = useRole()
  const { t } = useTranslation()
  const { filterReservations, filterTasks, filterPayments } = useRoleFilter()
  const { data: rawReservations, loading: loadingRes } = useReservations()
  const { data: rawTasks, loading: loadingTasks } = useTasks()
  const { data: rawPayments, loading: loadingPay } = usePayments()
  const [animateIn, setAnimateIn] = useState(false)

  const reservations = filterReservations(rawReservations)
  const tasks = filterTasks(rawTasks)
  const payments = filterPayments(rawPayments)

  const loading = loadingRes || loadingTasks || loadingPay

  useEffect(() => {
    setAnimateIn(false)
    const timer = setTimeout(() => setAnimateIn(true), 50)
    return () => clearTimeout(timer)
  }, [role])

  const titleKey = `dashboard.${role === 'house_manager' ? 'houseManagerTitle' : role === 'owner' ? 'ownerTitle' : role === 'concierge' ? 'conciergeTitle' : role === 'agency' ? 'agencyTitle' : role === 'partner' ? 'partnerTitle' : 'guestTitle'}`

  return (
    <div className={`space-y-6 transition-all duration-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {t(titleKey)}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      {role === 'owner' && <OwnerDashboard />}
      {role === 'house_manager' && <HouseManagerDashboard />}
      {role === 'concierge' && <ConciergeDashboard />}
      {(role === 'agency') && <OwnerDashboard />}
      {role === 'partner' && <PartnerDashboard />}
      {role === 'guest' && <GuestDashboard />}

      {/* Common sections for non-guest roles */}
      {role !== 'guest' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{t('dashboard.recentReservations')}</h3>
              <Link to="/app/reservations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {reservations.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.property?.name ?? '—'}</p>
                  </div>
                  <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
              {reservations.length === 0 && !loadingRes && (
                <p className="text-xs text-muted-foreground py-4 text-center">{t('common.noData')}</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{t('dashboard.openTasks')}</h3>
              <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.status.replace('_', ' ')}</p>
                  </div>
                  <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'warning' : 'muted'}>
                    {t.priority}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && !loadingTasks && (
                <p className="text-xs text-muted-foreground py-4 text-center">{t('common.noData')}</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{t('dashboard.recentPayments')}</h3>
              <Link to="/app/payments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {payments.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{p.property_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">{'\u20AC'}{Number(p.amount).toLocaleString()}</p>
                    <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="mt-1">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {payments.length === 0 && !loadingPay && (
                <p className="text-xs text-muted-foreground py-4 text-center">{t('common.noData')}</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{t('dashboard.quickStats')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('dashboard.totalReservations')}</span>
                <span className="text-sm font-mono font-medium">{reservations.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('dashboard.tasksDone')}</span>
                <span className="text-sm font-mono font-medium">{tasks.filter(t => t.status === 'done').length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('dashboard.paidPayments')}</span>
                <span className="text-sm font-mono font-medium">{payments.filter(p => p.status === 'paid').length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('dashboard.totalRevenue')}</span>
                <span className="text-sm font-mono font-medium">{'\u20AC'}{payments.reduce((s, p) => p.status === 'paid' ? s + Number(p.amount) : s, 0).toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
