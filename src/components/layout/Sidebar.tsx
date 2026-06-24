import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, CalendarDays, Users, ConciergeBell, ClipboardList,
  Calendar, Handshake, CreditCard, FileText, BarChart3, Settings, PanelLeftClose, PanelLeft, X,
  FilePlus, Receipt
} from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'

const navItems = [
  { to: '/app', icon: LayoutDashboard, labelKey: 'nav.overview', end: true },
  { to: '/app/properties', icon: Building2, labelKey: 'nav.properties' },
  { to: '/app/reservations', icon: CalendarDays, labelKey: 'nav.reservations' },
  { to: '/app/guest-portal', icon: Users, labelKey: 'nav.guestPortal' },
  { to: '/app/services', icon: ConciergeBell, labelKey: 'nav.services' },
  { to: '/app/tasks', icon: ClipboardList, labelKey: 'nav.tasks' },
  { to: '/app/calendar', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/app/partners', icon: Handshake, labelKey: 'nav.partners' },
  { to: '/app/payments', icon: CreditCard, labelKey: 'nav.payments' },
  { to: '/app/contracts', icon: FileText, labelKey: 'nav.contracts' },
  { to: '/app/contracts/generate', icon: FilePlus, labelKey: 'nav.contractGen' },
  { to: '/app/invoices/generate', icon: Receipt, labelKey: 'nav.invoiceGen' },
  { to: '/app/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { to: '/app/settings', icon: Settings, labelKey: 'nav.settings' },
]

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { t } = useTranslation()
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-200 z-50',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="h-14 flex items-center px-4 border-b border-border">
          {!collapsed && (
            <span className="text-base font-bold tracking-tight">butlr</span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded hover:bg-muted transition-colors lg:hidden ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn('p-1.5 rounded hover:bg-muted transition-colors hidden lg:block', collapsed ? 'mx-auto' : 'ml-auto')}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 h-10 px-3 rounded-md text-sm transition-colors relative',
                isActive
                  ? 'bg-muted font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-foreground before:rounded-r'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
