import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SaasAssistantChat } from '@/components/assistant/SaasAssistantChat'
import { ReservationDetailProvider } from '@/lib/reservationDetailContext'

const pageTitles: Record<string, string> = {
  '/app': 'Tableau de bord',
  '/app/properties': 'Propriétés',
  '/app/reservations': 'Réservations',
  '/app/calendar': 'Calendrier',
  '/app/tasks': 'Tâches',
  '/app/guest-portal': 'Portail voyageur',
  '/app/messages': 'Messages séjour',
  '/app/stay-reserves': 'Réserve séjour',
  '/app/services': 'Conciergerie',
  '/app/boutique': 'Boutique',
  '/app/payments': 'Paiements',
  '/app/contracts': 'Contrats',
  '/app/contracts/templates': 'Modèles de contrats',
  '/app/reports': 'Rapports',
  '/app/partners': 'Partenaires',
  '/app/settings': 'Paramètres',
}

export function AppLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'My Butlr'

  return (
    <ReservationDetailProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="ml-60">
          <Topbar title={title} />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
        <SaasAssistantChat />
      </div>
    </ReservationDetailProvider>
  )
}
