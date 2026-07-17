import {
  ChevronRight,
  ClipboardList,
  ConciergeBell,
  ShieldAlert,
  ShoppingBag,
  UserRound,
  Wallet,
} from 'lucide-react'
import { MobileHeader, MobileScreen } from '@/components/guest/guestMobileUi'
import { formatReserveAmount, type StayReserve } from '@/lib/stayReserve'
import { formatStayRange } from '@/lib/dateFormat'

interface GuestProfilePanelProps {
  guestName: string
  propertyName: string
  arrival?: string
  departure?: string
  dateFormat?: string | null
  reserve: StayReserve | null
  pendingCount: number
  showBoutique: boolean
  stayEnded?: boolean
  onOpenRequests: () => void
  onOpenReserve: () => void
  onOpenBoutique: () => void
  onOpenConcierge: () => void
  onOpenHelp: () => void
}

export function GuestProfilePanel({
  guestName,
  propertyName,
  arrival,
  departure,
  dateFormat,
  reserve,
  pendingCount,
  showBoutique,
  stayEnded = false,
  onOpenRequests,
  onOpenReserve,
  onOpenBoutique,
  onOpenConcierge,
  onOpenHelp,
}: GuestProfilePanelProps) {
  const initials = guestName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()

  const items = [
    {
      id: 'requests',
      icon: ClipboardList,
      label: stayEnded ? 'Historique du séjour' : 'Mes demandes',
      detail: stayEnded
        ? 'Demandes et commandes passées'
        : pendingCount > 0
          ? `${pendingCount} élément${pendingCount > 1 ? 's' : ''} à valider`
          : 'Suivi et historique',
      action: onOpenRequests,
    },
    {
      id: 'reserve',
      icon: Wallet,
      label: stayEnded ? 'Historique de la réserve' : 'Réserve séjour',
      detail: reserve
        ? formatReserveAmount(reserve.current_balance, reserve.currency)
        : stayEnded ? 'Aucune réserve utilisée' : 'Activer ma réserve',
      action: onOpenReserve,
    },
    ...(!stayEnded && showBoutique ? [{
      id: 'boutique',
      icon: ShoppingBag,
      label: 'Boutique',
      detail: 'Commandes livrées à la villa',
      action: onOpenBoutique,
    }] : []),
    ...(!stayEnded ? [{
      id: 'concierge',
      icon: ConciergeBell,
      label: 'Conciergerie',
      detail: 'Demande personnalisée',
      action: onOpenConcierge,
    }] : []),
    {
      id: 'help',
      icon: ShieldAlert,
      label: stayEnded ? 'Informations du séjour' : 'Aide & urgence',
      detail: stayEnded ? 'Retrouver les informations de la villa' : 'Contacts utiles disponibles 24/7',
      action: onOpenHelp,
    },
  ]

  return (
    <MobileScreen>
      <MobileHeader title="Profil" />

      <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[#071A2F] p-4 text-white">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 font-['Cormorant_Garamond',Georgia,serif] text-xl font-semibold text-[#D2B27C]">
          {initials || <UserRound className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{guestName}</p>
          <p className="mt-0.5 truncate text-[12px] text-white/60">{propertyName}</p>
          {arrival && departure && (
            <p className="mt-1 text-[11px] text-[#D2B27C]">
              {formatStayRange(arrival, departure, dateFormat)}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E4DDD3] bg-white">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`flex min-h-[64px] w-full items-center gap-3 px-4 text-left active:bg-[#F9F6F1] ${
                index < items.length - 1 ? 'border-b border-[#E9E2D9]' : ''
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 text-[#A8844F]" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#071A2F]">{item.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-[#7B746C]">{item.detail}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#A89E91]" />
            </button>
          )
        })}
      </div>
    </MobileScreen>
  )
}
