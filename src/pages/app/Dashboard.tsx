import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useDashboardKPIs, useReservations, useTasks, usePayments, useProperties, usePartners, useServices, useServiceRequests } from '@/lib/useSupabase'
import { ArrowRight, Loader2, Euro, Percent, Building2, CalendarCheck, ClipboardList, Plane, LogOut, ConciergeBell, CheckCircle2, CalendarClock, Star, Sparkles, CreditCard, Handshake, Inbox, Briefcase, ShoppingBag, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '@/lib/roleContext'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useTranslation } from '@/i18n/LanguageContext'
import { useState, useEffect } from 'react'
import { BarChart, LineChart } from '@/components/charts/Charts'
import { useAuth } from '@/lib/authContext'
import { AiInsightsWidget } from '@/components/ai/AiInsightsWidget'

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
        <MetricCard label={t('dashboard.totalRevenue')} value={totalRevenue} prefix="€" icon={Euro} tone="success" />
        <MetricCard label={t('dashboard.occupancyRate')} value={`${kpis.occupancyRate}%`} icon={Percent} tone="primary" />
        <MetricCard label={t('dashboard.totalProperties')} value={properties.length} icon={Building2} tone="info" />
        <MetricCard label={t('dashboard.activeReservations')} value={activeReservations} icon={CalendarCheck} tone="warning" />
      </div>
      <Card className="p-5">
        <BarChart data={monthlyData} label={t('dashboard.monthlyRevenue')} />
      </Card>
    </>
  )
}

function HouseManagerDashboard() {
  const { t } = useTranslation()
  const { filterTasks, filterReservations, filterProperties, filterPayments, filterPartners } = useRoleFilter()
  const { data: rawTasks } = useTasks()
  const { data: rawReservations } = useReservations()
  const { data: rawProperties } = useProperties()
  const { data: rawPayments } = usePayments()
  const { data: rawPartners } = usePartners()

  const tasks = filterTasks(rawTasks)
  const reservations = filterReservations(rawReservations)
  const properties = filterProperties(rawProperties)
  const payments = filterPayments(rawPayments)
  const partners = filterPartners(rawPartners)

  const today = new Date().toISOString().split('T')[0]
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length
  const arrivalsToday = reservations.filter(r => r.arrival === today && (r.status === 'confirmed' || r.status === 'pending')).length
  const departuresToday = reservations.filter(r => r.departure === today && (r.status === 'confirmed' || r.status === 'in_progress')).length
  const pendingPayments = payments.filter(p => p.status === 'pending').length
  const activePartners = partners.filter(p => p.status === 'active').length

  const weekData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
    const dayTasks = tasks.filter(t => {
      const created = new Date(t.created_at).getDay()
      return created === (i + 1) % 7
    }).length
    return { label: d, value: dayTasks }
  })

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label={t('dashboard.tasksInProgress')} value={tasksInProgress} icon={ClipboardList} tone="primary" />
        <MetricCard label={t('dashboard.arrivalsToday')} value={arrivalsToday} icon={Plane} tone="success" />
        <MetricCard label={t('dashboard.departuresToday')} value={departuresToday} icon={LogOut} tone="warning" />
        <MetricCard label={t('dashboard.managedProperties')} value={properties.length} icon={Building2} tone="info" />
        <MetricCard label={t('dashboard.pendingPayments')} value={pendingPayments} icon={CreditCard} tone="warning" />
        <MetricCard label={t('dashboard.activePartners')} value={activePartners} icon={Handshake} tone="success" />
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
  const { data: payments } = usePayments()
  const { data: partners } = usePartners()
  const { data: services } = useServices()

  const today = new Date().toISOString().split('T')[0]
  const pendingRequests = tasks.filter(t => t.status === 'todo').length
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const completedThisWeek = tasks.filter(t => t.status === 'done' && new Date(t.updated_at) >= weekStart).length
  const upcomingArrivals = reservations.filter(r => r.arrival > today && (r.status === 'confirmed' || r.status === 'pending')).length
  const activePartners = partners.filter(p => p.status === 'active').length
  const availableServices = services.filter(s => s.available).length
  const pendingPayments = payments.filter(p => p.status === 'pending').length

  const statusData = [
    { label: 'Todo', value: tasks.filter(t => t.status === 'todo').length },
    { label: 'WIP', value: tasks.filter(t => t.status === 'in_progress').length },
    { label: 'Wait', value: tasks.filter(t => t.status === 'waiting').length },
    { label: 'Done', value: tasks.filter(t => t.status === 'done').length },
  ]

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label={t('dashboard.pendingRequests')} value={pendingRequests} icon={ConciergeBell} tone="warning" />
        <MetricCard label={t('dashboard.completedThisWeek')} value={completedThisWeek} icon={CheckCircle2} tone="success" />
        <MetricCard label={t('dashboard.upcomingArrivals')} value={upcomingArrivals} icon={CalendarClock} tone="primary" />
        <MetricCard label={t('dashboard.activePartners')} value={activePartners} icon={Handshake} tone="info" />
        <MetricCard label={t('dashboard.availableServices')} value={availableServices} icon={Inbox} tone="success" />
        <MetricCard label={t('dashboard.pendingPayments')} value={pendingPayments} icon={CreditCard} tone="warning" />
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
        <MetricCard label={t('dashboard.monthlyCommissions')} value={monthCommissions} prefix="€" icon={Euro} tone="success" />
        <MetricCard label={t('dashboard.servicesProvided')} value={totalServices} icon={ConciergeBell} tone="primary" />
        <MetricCard label={t('dashboard.averageRating')} value={avgRating} icon={Star} tone="warning" />
      </div>
      <Card className="p-5">
        <LineChart data={commData} label={t('dashboard.monthlyCommissions')} />
      </Card>
    </>
  )
}

function AgencyDashboard() {
  const { t } = useTranslation()
  const { data: properties } = useProperties()
  const { data: reservations } = useReservations()
  const { data: services } = useServices()
  const { requests } = useServiceRequests()
  const { user } = useAuth()

  const today = new Date().toISOString().split('T')[0]
  const activeProps = properties.filter(p => p.status === 'active')

  const propsWithAvailability = activeProps.filter(prop => {
    const propRes = reservations.filter(r =>
      r.property_id === prop.id && r.status !== 'cancelled' && r.arrival <= today && r.departure >= today,
    )
    return propRes.length === 0
  }).length

  const myRequests = requests.filter(r => r.guest_user_id === user?.id)
  const pendingInquiries = myRequests.filter(r => r.service_name.startsWith('Inquiry:') && r.status === 'pending').length
  const bookedServices = myRequests.filter(r => !r.service_name.startsWith('Inquiry:')).length
  const availableServices = services.filter(s => s.available).length

  const monthlyAvailability = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + i)
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const monthEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    const totalSlots = activeProps.length * daysInMonth
    let occupiedSlots = 0
    for (const prop of activeProps) {
      const propRes = reservations.filter(r =>
        r.property_id === prop.id && r.status !== 'cancelled' && r.arrival <= monthEnd && r.departure >= monthStart,
      )
      const occupiedDays = new Set<string>()
      for (const r of propRes) {
        const start = r.arrival < monthStart ? new Date(monthStart) : new Date(r.arrival)
        const end = r.departure > monthEnd ? new Date(monthEnd) : new Date(r.departure)
        for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
          occupiedDays.add(cur.toISOString().split('T')[0])
        }
      }
      occupiedSlots += occupiedDays.size
    }
    const availRate = totalSlots > 0 ? Math.round(((totalSlots - occupiedSlots) / totalSlots) * 100) : 100
    return { label: d.toLocaleString('default', { month: 'short' }), value: availRate }
  })

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t('conciergePortal.propertiesAvailable')} value={`${propsWithAvailability}/${activeProps.length}`} icon={Building2} tone="success" />
        <MetricCard label={t('conciergePortal.pendingInquiries')} value={pendingInquiries} icon={HelpCircle} tone="warning" />
        <MetricCard label={t('conciergePortal.bookedServices')} value={bookedServices} icon={ShoppingBag} tone="primary" />
        <MetricCard label={t('dashboard.availableServices')} value={availableServices} icon={ConciergeBell} tone="info" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{t('conciergePortal.availability')}</h3>
          <Link to="/app/concierge-portal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <BarChart data={monthlyAvailability} label={t('conciergePortal.availability') + ' (%)'} />
      </Card>

      <Link
        to="/app/concierge-portal"
        className="block rounded-xl border border-primary/20 bg-primary/5 p-5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 text-primary">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t('nav.conciergePortal')}</p>
            <p className="text-xs text-muted-foreground">{t('conciergePortal.subtitle')}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      </Link>
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
        <MetricCard label={t('dashboard.currentReservation')} value={currentRes ? '1' : '0'} icon={CalendarCheck} tone="primary" />
        <MetricCard label={t('dashboard.availableServices')} value={availableServices} icon={ConciergeBell} tone="info" />
        <MetricCard label={t('dashboard.propertyInfo')} value={currentRes?.property?.name ?? '—'} icon={Building2} tone="success" />
      </div>
      {currentRes && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{t('dashboard.currentReservation')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('reservations.arrival')}</span>
              <span className="tabular-nums">{currentRes.arrival}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('reservations.departure')}</span>
              <span className="tabular-nums">{currentRes.departure}</span>
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
  const { kpis } = useDashboardKPIs()
  const { data: rawReservations, loading: loadingRes } = useReservations()
  const { data: rawTasks, loading: loadingTasks } = useTasks()
  const { data: rawPayments, loading: loadingPay } = usePayments()
  const { data: properties } = useProperties()
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
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-soft text-primary shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t(titleKey)}</h2>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />}
      </div>

      {role === 'owner' && <OwnerDashboard />}
      {role === 'house_manager' && <HouseManagerDashboard />}
      {role === 'concierge' && <ConciergeDashboard />}
      {(role === 'agency') && <AgencyDashboard />}
      {role === 'partner' && <PartnerDashboard />}
      {role === 'guest' && <GuestDashboard />}

      {/* AI Insights — visible for management roles */}
      {role !== 'guest' && role !== 'partner' && (
        <AiInsightsWidget
          occupancyRate={kpis.occupancyRate}
          revenue={payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)}
          previousRevenue={payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) * 0.88 /* mock placeholder until historical data available */}
          upcomingArrivals={reservations.filter(r => {
            const arrival = new Date(r.arrival)
            const now = new Date()
            const weekLater = new Date(now.getTime() + 7 * 86400000)
            return arrival >= now && arrival <= weekLater && r.status !== 'cancelled'
          }).length}
          pendingTasks={tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length}
          propertiesCount={properties.length}
        />
      )}

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
                    <p className="text-sm tabular-nums font-medium">{'\u20AC'}{Number(p.amount).toLocaleString()}</p>
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
                <span className="text-sm tabular-nums font-medium">{reservations.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('dashboard.tasksDone')}</span>
                <span className="text-sm tabular-nums font-medium">{tasks.filter(t => t.status === 'done').length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('dashboard.paidPayments')}</span>
                <span className="text-sm tabular-nums font-medium">{payments.filter(p => p.status === 'paid').length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{t('dashboard.totalRevenue')}</span>
                <span className="text-sm tabular-nums font-medium">{'\u20AC'}{payments.reduce((s, p) => p.status === 'paid' ? s + Number(p.amount) : s, 0).toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
