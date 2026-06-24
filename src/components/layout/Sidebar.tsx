import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, CalendarDays, Users, ConciergeBell, ClipboardList,
  Calendar, Handshake, CreditCard, FileText, BarChart3, Settings, PanelLeftClose, PanelLeft,
  FilePlus, Receipt
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/app/properties', icon: Building2, label: 'Properties' },
  { to: '/app/reservations', icon: CalendarDays, label: 'Reservations' },
  { to: '/app/guest-portal', icon: Users, label: 'Guest Portal' },
  { to: '/app/services', icon: ConciergeBell, label: 'Services' },
  { to: '/app/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/app/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/app/partners', icon: Handshake, label: 'Partners' },
  { to: '/app/payments', icon: CreditCard, label: 'Payments' },
  { to: '/app/contracts', icon: FileText, label: 'Contracts' },
  { to: '/app/contracts/generate', icon: FilePlus, label: 'Generate Contract' },
  { to: '/app/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/app/reports', icon: BarChart3, label: 'Reports' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-200 z-40',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className="h-14 flex items-center px-4 border-b border-border">
        {!collapsed && (
          <span className="text-base font-bold tracking-tight">butlr</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('p-1.5 rounded hover:bg-muted transition-colors', collapsed ? 'mx-auto' : 'ml-auto')}
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
            className={({ isActive }) => cn(
              'flex items-center gap-3 h-10 px-3 rounded-md text-sm transition-colors relative',
              isActive
                ? 'bg-muted font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-foreground before:rounded-r'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
