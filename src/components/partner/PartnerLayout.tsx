import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/authContext'

const navItems = [
  { to: '/partner', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/partner/missions', icon: ClipboardList, label: 'Missions' },
  { to: '/partner/planning', icon: CalendarDays, label: 'Planning' },
  { to: '/partner/payments', icon: Receipt, label: 'Paiements' },
  { to: '/partner/profile', icon: UserRound, label: 'Ma fiche' },
]

const titles: Record<string, string> = {
  '/partner': 'Tableau de bord',
  '/partner/onboarding': 'Bienvenue',
  '/partner/missions': 'Missions',
  '/partner/planning': 'Planning',
  '/partner/payments': 'Paiements',
  '/partner/profile': 'Ma fiche',
}

export function PartnerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = titles[location.pathname] ?? 'Espace prestataire'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/32 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-card transition-transform md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div>
            <p className="text-base font-bold tracking-tight">butlr</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Espace prestataire
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1.5 hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <p className="truncate px-2 text-xs text-muted-foreground">
            {profile?.full_name || profile?.email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="md:ml-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded p-1.5 hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
