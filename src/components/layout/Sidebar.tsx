import { cn } from '@/lib/utils'
import { NavLink, useNavigate } from 'react-router-dom'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole, type Role } from '@/lib/roleContext'
import { useSearch } from '@/lib/searchContext'
import { useAuth } from '@/lib/authContext'
import {
  LayoutDashboard, Building2, CalendarDays, Users, ConciergeBell, ClipboardList,
  Calendar, CalendarCheck2, AlertTriangle, Handshake, CreditCard, FileText, BarChart3, Settings, PanelLeftClose, PanelLeft, X,
  FilePlus, Receipt, Bell, MessageSquare, Inbox, Wallet, Search, BookOpen, BookUser, ClipboardCheck, Briefcase, Wrench, Package, Banknote, Smartphone
} from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'

const ROLE_VALUES: Role[] = ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest']


const navItems = [
  { to: '/app', icon: LayoutDashboard, labelKey: 'nav.overview', page: 'dashboard', end: true },
  { to: '/app/properties', icon: Building2, labelKey: 'nav.properties', page: 'properties' },
  { to: '/app/reservations', icon: CalendarDays, labelKey: 'nav.reservations', page: 'reservations' },
  { to: '/app/guest-portal', icon: Users, labelKey: 'nav.guestPortal', page: 'guest-portal' },
  { to: '/app/messages', icon: MessageSquare, labelKey: 'nav.messages', page: 'messages' },
  { to: '/app/services', icon: ConciergeBell, labelKey: 'nav.services', page: 'services' },
  { to: '/app/service-requests', icon: Inbox, labelKey: 'nav.serviceRequests', page: 'service-requests' },
  { to: '/app/tasks', icon: ClipboardList, labelKey: 'nav.tasks', page: 'tasks' },
  { to: '/app/day-sheet', icon: CalendarCheck2, labelKey: 'nav.daySheet', page: 'day-sheet' },
  { to: '/app/incidents', icon: AlertTriangle, labelKey: 'nav.incidents', page: 'incidents' },
  { to: '/app/work-orders', icon: Wrench, labelKey: 'nav.workOrders', page: 'work-orders' },
  { to: '/app/inventory', icon: Package, labelKey: 'nav.inventory', page: 'inventory' },
  { to: '/app/expenses', icon: Banknote, labelKey: 'nav.expenses', page: 'expenses' },
  { to: '/app/calendar', icon: Calendar, labelKey: 'nav.calendar', page: 'calendar' },
  { to: '/app/partners', icon: Handshake, labelKey: 'nav.partners', page: 'partners' },
  { to: '/app/service-providers', icon: BookUser, labelKey: 'nav.serviceProviders', page: 'service-providers' },
  { to: '/app/concierge-portal', icon: Briefcase, labelKey: 'nav.conciergePortal', page: 'concierge-portal' },
  { to: '/app/payments', icon: CreditCard, labelKey: 'nav.payments', page: 'payments' },
  { to: '/app/apa', icon: Wallet, labelKey: 'nav.apa', page: 'apa' },
  { to: '/app/contracts', icon: FileText, labelKey: 'nav.contracts', page: 'contracts' },
  { to: '/app/contracts/generate', icon: FilePlus, labelKey: 'nav.contractGen', page: 'contracts' },
  { to: '/app/invoices', icon: Receipt, labelKey: 'nav.invoices', page: 'invoices' },
  { to: '/app/invoices/generate', icon: FilePlus, labelKey: 'nav.invoiceGen', page: 'invoices' },
  { to: '/app/notifications', icon: Bell, labelKey: 'nav.notifications', page: 'notifications' },
  { to: '/app/guides', icon: BookOpen, labelKey: 'nav.guides', page: 'guides' },
  { to: '/app/inspections', icon: ClipboardCheck, labelKey: 'nav.inspections', page: 'inspections' },
  { to: '/app/reports', icon: BarChart3, labelKey: 'nav.reports', page: 'reports' },
  { to: '/app/settings', icon: Settings, labelKey: 'nav.settings', page: 'settings' },
]

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { isVisible } = useRoleFilter()
  const { t } = useTranslation()
  const { role, setRole, canPreviewRoles } = useRole()
  const { query, setQuery } = useSearch()
  const navigate = useNavigate()
  const { user } = useAuth()

  const visibleItems = navItems.filter(item => isVisible(item.page))
  const showMobileApp = role === 'house_manager' || role === 'concierge'
  const email = user?.email ?? 'user@mybutlr.com'
  const displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const initial = displayName.charAt(0).toUpperCase()

  const submitSearch = () => {
    if (query.trim()) {
      navigate(`/app/search?q=${encodeURIComponent(query)}`)
      setMobileOpen(false)
    }
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-screen bg-navy-900 text-white flex flex-col transition-all duration-200 z-50',
        collapsed ? 'w-16' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="h-20 flex items-center px-5 shrink-0">
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-luxury text-2xl font-semibold tracking-tight leading-none">
                butlr<span className="text-primary">.</span>
              </span>
              <span className="text-[11px] text-primary/90 font-medium mt-1">My Butler</span>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn('p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden lg:block', collapsed ? 'mx-auto' : 'ml-auto')}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition-colors',
                isActive
                  ? 'bg-primary text-white font-semibold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.7)]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </NavLink>
          ))}
          {showMobileApp && (
            <NavLink
              to="/hm"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition-colors',
                'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Smartphone className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{t('nav.mobileApp')}</span>}
            </NavLink>
          )}
        </nav>

        <div className="lg:hidden border-t border-white/10 p-3 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('nav.search')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitSearch() }}
              className="h-9 w-full pl-9 pr-3 bg-muted border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {canPreviewRoles && (
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="h-9 w-full px-2 bg-muted border-0 rounded-md text-xs font-medium uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {ROLE_VALUES.map(r => (
                <option key={r} value={r}>{t(`roles.${r}`)}</option>
              ))}
            </select>
          )}
        </div>

        <div className="p-3 shrink-0 border-t border-white/10">
          <div className={cn('flex items-center gap-3 rounded-xl p-2', !collapsed && 'hover:bg-white/5')}>
            <span className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
              {initial}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-white/50 truncate">{t(`roles.${role}`)}</p>
              </div>
            )}
          </div>
        </div>

      </aside>
    </>
  )
}
