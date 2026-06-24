import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/app': 'Overview',
  '/app/properties': 'Properties',
  '/app/reservations': 'Reservations',
  '/app/guest-portal': 'Guest Portal',
  '/app/services': 'Services',
  '/app/tasks': 'Tasks',
  '/app/calendar': 'Calendar',
  '/app/partners': 'Partners',
  '/app/payments': 'Payments',
  '/app/contracts': 'Contracts',
  '/app/reports': 'Reports',
  '/app/settings': 'Settings',
}

export function AppLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'My Butlr'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className={cn('transition-all duration-200', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
