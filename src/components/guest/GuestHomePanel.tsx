import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  ConciergeBell,
  KeyRound,
  MessageSquare,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { MenuCardRow, MobileScreen, ReserveBalanceBar } from '@/components/guest/guestMobileUi'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import { formatReserveAmount, type StayReserve } from '@/lib/stayReserve'
import type { GuestPortalSettings } from '@/lib/guestPortal'
import { formatStayRange } from '@/lib/dateFormat'
import { buildStayPhaseContext, type StayPhaseContext } from '@/lib/guestStayPhase'

interface GuestHomePanelProps {
  guestName: string
  settings: GuestPortalSettings
  reserve: StayReserve | null
  recommendedAmount: number
  pendingCount: number
  showBoutique: boolean
  showConcierge?: boolean
  showVilla: boolean
  showMessaging?: boolean
  messageContactLabel?: string
  messageUnread?: number
  arrival?: string
  departure?: string
  dateFormat?: string | null
  onOpenBoutique: () => void
  onOpenConcierge?: () => void
  onOpenMessages?: () => void
  onOpenRequests: () => void
  onOpenVilla: () => void
  onOpenReserve: () => void
  onOpenHelp: () => void
}

export function GuestHomePanel({
  guestName,
  settings,
  reserve,
  recommendedAmount,
  pendingCount,
  showBoutique,
  showConcierge = true,
  showVilla,
  showMessaging = true,
  messageContactLabel,
  messageUnread = 0,
  arrival,
  departure,
  dateFormat,
  onOpenBoutique,
  onOpenConcierge,
  onOpenMessages,
  onOpenRequests,
  onOpenVilla,
  onOpenReserve,
  onOpenHelp,
}: GuestHomePanelProps) {
  const firstName = guestName.split(' ')[0]

  const phaseContext: StayPhaseContext | null =
    arrival && departure
      ? buildStayPhaseContext(arrival, departure, {
        showConcierge,
        showVilla,
        pendingCount,
      })
      : null

  const handlePrimaryAction = () => {
    if (!phaseContext?.primaryAction) return
    switch (phaseContext.primaryAction.target) {
      case 'villa':
        onOpenVilla()
        break
      case 'concierge':
        onOpenConcierge?.()
        break
      case 'requests':
        onOpenRequests()
        break
      case 'reserve':
        onOpenReserve()
        break
      case 'messages':
        onOpenMessages?.()
        break
    }
  }

  return (
    <MobileScreen>
      <div className="mb-5">
        <p className={`text-[13px] font-medium uppercase tracking-wider text-[#9A7B4F]`}>
          Bienvenue
        </p>
        <h2 className={guestMobile.title}>
          {settings.welcome_title?.trim() || 'Bonjour'}, {firstName}
        </h2>
        {arrival && departure && (
          <p className={`mt-2 flex items-center gap-1.5 ${guestMobile.subtitle}`}>
            <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {formatStayRange(arrival, departure, dateFormat)}
          </p>
        )}
        <p className={`mt-2 ${guestMobile.body}`}>
          {settings.welcome_message?.trim()
            || 'Votre équipe My Butlr coordonne chaque demande pour un séjour fluide et discret.'}
        </p>
      </div>

      {phaseContext && (
        <button
          type="button"
          onClick={phaseContext.primaryAction ? handlePrimaryAction : undefined}
          className={`mb-4 w-full rounded-2xl border px-4 py-4 text-left ${
            phaseContext.primaryAction
              ? 'border-[#E8DFD4] bg-[#FAF8F5] active:bg-[#F5EDE3]'
              : 'border-[#E5E5EA] bg-[#FAFAFA]'
          }`}
        >
          <p className="text-[15px] font-semibold text-[#1A1614]">{phaseContext.headline}</p>
          <p className={`mt-1 ${guestMobile.subtitle}`}>{phaseContext.subtitle}</p>
          {phaseContext.primaryAction && (
            <span className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-medium text-[#9A7B4F]">
              {phaseContext.primaryAction.label}
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </button>
      )}

      {reserve ? (
        <button type="button" onClick={onOpenReserve} className="mb-4 block w-full text-left">
          <ReserveBalanceBar
            label="Réserve séjour disponible"
            amount={formatReserveAmount(reserve.current_balance, reserve.currency)}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenReserve}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-[#FAFAFA] px-4 py-4 text-left active:bg-[#F2F2F7]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5EDE3]">
            <Wallet className="h-5 w-5 text-[#9A7B4F]" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">Activer la Réserve séjour</p>
            <p className={guestMobile.subtitle}>
              Recommandé {formatReserveAmount(recommendedAmount)}
            </p>
          </div>
        </button>
      )}

      {pendingCount > 0 && !phaseContext?.primaryAction && (
        <MenuCardRow
          icon={ClipboardList}
          title={`${pendingCount} demande${pendingCount > 1 ? 's' : ''} à valider`}
          subtitle="Devis en attente de votre confirmation"
          onClick={onOpenRequests}
        />
      )}

      <p className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-wider text-[#8E8E93]">
        Votre séjour
      </p>

      {showConcierge && onOpenConcierge && (
        <MenuCardRow
          icon={ConciergeBell}
          title="Conciergerie"
          subtitle="Chef, transport, bien-être et expériences sur mesure"
          onClick={onOpenConcierge}
        />
      )}

      {showBoutique && (
        <MenuCardRow
          icon={ShoppingBag}
          title="Boutique"
          subtitle="Produits et packs pour la villa"
          onClick={onOpenBoutique}
        />
      )}

      {showMessaging && onOpenMessages && (
        <MenuCardRow
          icon={MessageSquare}
          title="Messages"
          subtitle={
            messageUnread > 0
              ? `${messageUnread} message${messageUnread > 1 ? 's' : ''} non lu${messageUnread > 1 ? 's' : ''}`
              : messageContactLabel ?? 'Échangez avec votre équipe sur place'
          }
          onClick={onOpenMessages}
        />
      )}

      <MenuCardRow
        icon={ClipboardList}
        title="Suivi"
        subtitle="Commandes boutique et prestations conciergerie"
        onClick={onOpenRequests}
      />

      {showVilla && (
        <MenuCardRow
          icon={KeyRound}
          title="Villa & guides"
          subtitle="Accès, Wi-Fi, règles et informations pratiques"
          onClick={onOpenVilla}
        />
      )}

      <MenuCardRow
        icon={Wallet}
        title="Réserve séjour"
        subtitle="Solde, historique et ajout de fonds"
        onClick={onOpenReserve}
      />

      <MenuCardRow
        icon={ShieldAlert}
        title="Besoin d'aide ?"
        subtitle="Contacts utiles et urgence 24/7"
        onClick={onOpenHelp}
      />

      {settings.require_online_checkin && (
        <button
          type="button"
          disabled
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E5EA] py-3.5 text-[14px] font-medium text-[#8E8E93]"
        >
          <Sparkles className="h-4 w-4" />
          Compléter mon check-in
        </button>
      )}
    </MobileScreen>
  )
}
