import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60">
        <Topbar title={title} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
