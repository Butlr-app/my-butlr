import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { usePermissions } from '@/lib/permissionsContext'
import { capabilityForPath } from '@/lib/permissions'
import { useRoleFilter } from '@/lib/useRoleFilter'
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  CalendarRange,
  ConciergeBell,
  ClipboardList,
  Handshake,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  Wallet,
  ShoppingBag,
  MessageSquare,
  Smartphone,
  Wrench,
  X,
  Inbox,
  CalendarCheck2,
  Users,
  Clock,
  AlertTriangle,
  Package,
  Banknote,
  PiggyBank,
  Award,
  FolderOpen,
  History,
  CalendarClock,
  BookOpen,
  ClipboardCheck,
  Briefcase,
  BookUser,
  Bell,
  FilePlus,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
  /** Visibility key from useRoleFilter().isVisible, for items without a capabilityForPath mapping. */
  page?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/app', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
    ],
  },
  {
    title: 'Exploitation',
    items: [
      { to: '/app/properties', icon: Building2, label: 'Propriétés' },
      { to: '/app/reservations', icon: CalendarDays, label: 'Réservations' },
      { to: '/app/calendar', icon: CalendarRange, label: 'Calendrier' },
      { to: '/app/client-requests', icon: CalendarDays, label: 'Demandes clients' },
      { to: '/app/tasks', icon: ClipboardList, label: 'Tâches' },
      { to: '/app/day-sheet', icon: CalendarCheck2, label: 'Feuille de route', page: 'day-sheet' },
      { to: '/app/team-planning', icon: Users, label: 'Planning équipe', page: 'team-planning' },
      { to: '/app/time-clock', icon: Clock, label: 'Pointage', page: 'time-clock' },
      { to: '/app/operations', icon: Wrench, label: 'Entretien & travaux' },
      { to: '/app/incidents', icon: AlertTriangle, label: 'Incidents', page: 'incidents' },
      { to: '/app/work-orders', icon: Wrench, label: 'Ordres de travail', page: 'work-orders' },
      { to: '/app/maintenance', icon: CalendarClock, label: 'Maintenance', page: 'maintenance' },
      { to: '/app/inventory', icon: Package, label: 'Inventaire', page: 'inventory' },
      { to: '/app/inspections', icon: ClipboardCheck, label: 'Inspections', page: 'inspections' },
    ],
  },
  {
    title: 'Expérience voyageur',
    items: [
      { to: '/app/guest-portal', icon: Smartphone, label: 'Portail voyageur' },
      { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
      { to: '/app/stay-reserves', icon: Wallet, label: 'Réserve séjour' },
      { to: '/app/services', icon: ConciergeBell, label: 'Services conciergerie' },
      { to: '/app/service-requests', icon: Inbox, label: 'Demandes de service', page: 'service-requests' },
      { to: '/app/boutique', icon: ShoppingBag, label: 'Boutique produits' },
      { to: '/app/guides', icon: BookOpen, label: 'Guides', page: 'guides' },
    ],
  },
  {
    title: 'Finance & documents',
    items: [
      { to: '/app/payments', icon: CreditCard, label: 'Paiements' },
      { to: '/app/apa', icon: Wallet, label: 'APA', page: 'apa' },
      { to: '/app/contracts', icon: FileText, label: 'Contrats' },
      { to: '/app/invoices', icon: Receipt, label: 'Factures', page: 'invoices' },
      { to: '/app/invoices/generate', icon: FilePlus, label: 'Créer une facture', page: 'invoices' },
      { to: '/app/expenses', icon: Banknote, label: 'Dépenses', page: 'expenses' },
      { to: '/app/budgets', icon: PiggyBank, label: 'Budgets', page: 'budgets' },
      { to: '/app/documents', icon: FolderOpen, label: 'Documents', page: 'documents' },
      { to: '/app/reports', icon: BarChart3, label: 'Rapports' },
    ],
  },
  {
    title: 'Réseau',
    items: [
      { to: '/app/partners', icon: Handshake, label: 'Prestataires de services' },
      { to: '/app/service-providers', icon: BookUser, label: 'Carnet prestataires', page: 'service-providers' },
      { to: '/app/provider-ratings', icon: Award, label: 'Évaluations', page: 'provider-ratings' },
      { to: '/app/concierge-portal', icon: Briefcase, label: 'Portail conciergerie', page: 'concierge-portal' },
    ],
  },
  {
    title: '',
    items: [
      { to: '/app/activity', icon: History, label: 'Activité', page: 'activity' },
      { to: '/app/notifications', icon: Bell, label: 'Notifications', page: 'notifications' },
      { to: '/app/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { can } = usePermissions()
  const { isVisible } = useRoleFilter()

  const visibleSections = useMemo(() => (
    navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (item.page) return isVisible(item.page)
          const capability = capabilityForPath(item.to)
          return !capability || can(capability)
        }),
      }))
      .filter(section => section.items.length > 0)
  ), [can, isVisible])

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/32 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
          'md:z-40 md:translate-x-0',
          collapsed ? 'md:w-16' : 'md:w-60',
          'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className={cn('text-base font-bold tracking-tight', collapsed && 'md:hidden')}>butlr</span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'hidden rounded p-1.5 transition-colors hover:bg-muted md:inline-flex',
              collapsed ? 'mx-auto' : 'ml-auto',
            )}
            aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded p-1.5 transition-colors hover:bg-muted md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {visibleSections.map((section, sectionIndex) => (
            <div
              key={section.title || `section-${sectionIndex}`}
              className={cn(sectionIndex > 0 && 'mt-3 pt-3 border-t border-border/60')}
            >
              {section.title && (
                <p className={cn(
                  'mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground',
                  collapsed && 'md:hidden',
                )}>
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                        isActive
                          ? 'bg-muted font-medium before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className={cn('truncate', collapsed && 'md:hidden')}>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
