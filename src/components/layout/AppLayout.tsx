import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { SaasAssistantChat } from '@/components/assistant/SaasAssistantChat'
import { AiAssistantPanel } from '@/components/ai/AiAssistantPanel'
import { ReservationDetailProvider } from '@/lib/reservationDetailContext'
import { CapabilityRoute } from '@/components/CapabilityRoute'

const pageTitles: Record<string, string> = {
  '/app': 'Tableau de bord',
  '/app/properties': 'Propriétés',
  '/app/reservations': 'Réservations',
  '/app/calendar': 'Calendrier',
  '/app/client-requests': 'Demandes clients',
  '/app/tasks': 'Tâches',
  '/app/operations': 'Entretien & travaux',
  '/app/day-sheet': 'Feuille de route',
  '/app/team-planning': 'Planning équipe',
  '/app/time-clock': 'Pointage',
  '/app/incidents': 'Incidents',
  '/app/work-orders': 'Ordres de travail',
  '/app/maintenance': 'Maintenance',
  '/app/inventory': 'Inventaire',
  '/app/expenses': 'Dépenses',
  '/app/budgets': 'Budgets',
  '/app/guest-portal': 'Portail voyageur',
  '/app/messages': 'Messages séjour',
  '/app/stay-reserves': 'Réserve séjour',
  '/app/services': 'Conciergerie',
  '/app/service-requests': 'Demandes de service',
  '/app/boutique': 'Boutique',
  '/app/guides': 'Guides',
  '/app/payments': 'Paiements',
  '/app/apa': 'APA',
  '/app/contracts': 'Contrats',
  '/app/contracts/templates': 'Modèles de contrats',
  '/app/invoices': 'Factures',
  '/app/documents': 'Documents',
  '/app/reports': 'Rapports',
  '/app/partners': 'Prestataires de services',
  '/app/service-providers': 'Prestataires',
  '/app/provider-ratings': 'Évaluations prestataires',
  '/app/concierge-portal': 'Portail conciergerie',
  '/app/inspections': 'Inspections',
  '/app/activity': 'Activité',
  '/app/notifications': 'Notifications',
  '/app/settings': 'Paramètres',
  '/app/search': 'Recherche',
}

export function AppLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'My Butlr'
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <ReservationDetailProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className={cn('transition-all duration-200', collapsed ? 'md:ml-16' : 'md:ml-60')}>
          <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
          <main className="p-4 sm:p-6 pb-24 md:pb-6">
            <CapabilityRoute>
              <Outlet />
            </CapabilityRoute>
          </main>
        </div>
        <BottomNav onMenuClick={() => setMobileOpen(true)} />
        <SaasAssistantChat />
        <AiAssistantPanel />
      </div>
    </ReservationDetailProvider>
  )
}
