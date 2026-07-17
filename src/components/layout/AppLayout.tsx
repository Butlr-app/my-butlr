import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SaasAssistantChat } from '@/components/assistant/SaasAssistantChat'
import { ReservationDetailProvider } from '@/lib/reservationDetailContext'
import { CapabilityRoute } from '@/components/CapabilityRoute'

const pageTitles: Record<string, string> = {
  '/app': 'Tableau de bord',
  '/app/properties': 'Propriétés',
  '/app/reservations': 'Réservations',
  '/app/calendar': 'Calendrier',
  '/app/tasks': 'Tâches',
  '/app/operations': 'Entretien & travaux',
  '/app/guest-portal': 'Portail voyageur',
  '/app/messages': 'Messages séjour',
  '/app/stay-reserves': 'Réserve séjour',
  '/app/services': 'Conciergerie',
  '/app/boutique': 'Boutique',
  '/app/payments': 'Paiements',
  '/app/contracts': 'Contrats',
  '/app/contracts/templates': 'Modèles de contrats',
  '/app/reports': 'Rapports',
  '/app/partners': 'Prestataires de services',
  '/app/settings': 'Paramètres',
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
          onToggleCollapsed={() => setCollapsed(c => !c)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className={cn('transition-all duration-200', collapsed ? 'md:ml-16' : 'md:ml-60')}>
          <Topbar title={title} onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="p-4 md:p-6">
            <CapabilityRoute>
              <Outlet />
            </CapabilityRoute>
          </main>
        </div>
        <SaasAssistantChat />
      </div>
    </ReservationDetailProvider>
  )
}
