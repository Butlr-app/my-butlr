import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  KeyRound,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Wifi,
  Wallet,
} from 'lucide-react'
import { MobileScreen } from '@/components/guest/guestMobileUi'
import { formatReserveAmount, type StayReserve } from '@/lib/stayReserve'
import type { GuestPortalSettings } from '@/lib/guestPortal'
import { buildStayPhaseContext, type StayPhaseContext } from '@/lib/guestStayPhase'
import { tGuest } from '@/lib/guestLanguage'
import { formatDateForDisplay } from '@/lib/dateFormat'
import type { RecommendedProperty } from '@/lib/postStayMarketplace'

interface GuestHomePanelProps {
  guestName: string
  propertyName?: string
  guestLanguage?: string | null
  settings: GuestPortalSettings
  reserve: StayReserve | null
  recommendedAmount: number
  pendingCount: number
  showBoutique: boolean
  showConcierge?: boolean
  showVilla: boolean
  showMessaging?: boolean
  messageContactLabel?: string
  messageContactName?: string | null
  messageContactAvatar?: string | null
  messageUnread?: number
  arrival?: string
  departure?: string
  dateFormat?: string | null
  recommendedProperties?: RecommendedProperty[]
  stayEnded?: boolean
  onOpenBoutique: () => void
  onOpenConcierge?: () => void
  onOpenMessages?: () => void
  onOpenRequests: () => void
  onOpenVilla: () => void
  onOpenReserve: () => void
  onOpenHelp: () => void
  onOpenWifi?: () => void
  onOpenAccess?: () => void
}

function QuickAction({
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  icon: typeof Wifi
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-[#E5DDD2] bg-white px-2 py-3 text-center transition active:scale-[0.97] active:bg-[#F9F6F1]"
    >
      <Icon className="h-5 w-5 text-[#A8844F]" strokeWidth={1.6} />
      <span className="text-[11px] font-medium leading-tight text-[#071A2F]">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A8844F] px-1 text-[9px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

function RecommendedPropertiesSection({ properties }: { properties: RecommendedProperty[] }) {
  return (
    <section>
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A8844F]">
          Sélection My Butlr
        </p>
        <h2 className="mt-1 font-['Cormorant_Garamond',Georgia,serif] text-[27px] font-semibold leading-tight text-[#071A2F]">
          Votre prochaine destination
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7B746C]">
          Des propriétés sélectionnées par My Butlr pour imaginer votre prochain séjour.
        </p>
      </div>

      {properties.length > 0 ? (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {properties.map(property => (
            <a
              key={property.id}
              href={property.booking_url}
              target="_blank"
              rel="noreferrer"
              className="w-[264px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#E5DDD2] bg-white text-left"
            >
              <div className="h-40 bg-[#DED7CD]">
                {property.image_url ? (
                  <img
                    src={property.image_url}
                    alt={property.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-[#DED7CD]" />
                )}
              </div>
              <div className="p-3.5">
                <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-[21px] font-semibold leading-tight text-[#071A2F]">
                  {property.name}
                </h3>
                {property.location && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-[#7B746C]">
                    <MapPin className="h-3 w-3 text-[#A8844F]" />
                    {property.location}
                  </p>
                )}
                <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-relaxed text-[#7B746C]">
                  {property.tagline || `${property.bedrooms} chambres · jusqu’à ${property.max_guests} voyageurs`}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#A8844F]">
                  Découvrir
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5DDD2] bg-white px-4 py-5 text-center">
          <p className="text-[13px] font-semibold text-[#071A2F]">De nouvelles adresses arrivent bientôt</p>
          <p className="mt-1 text-[11px] text-[#7B746C]">
            La sélection My Butlr est régulièrement enrichie.
          </p>
        </div>
      )}
    </section>
  )
}

export function GuestHomePanel({
  propertyName,
  guestLanguage,
  settings,
  reserve,
  recommendedAmount,
  pendingCount,
  showBoutique,
  showConcierge = true,
  showVilla,
  showMessaging = true,
  messageContactLabel,
  messageContactName,
  messageContactAvatar,
  messageUnread = 0,
  arrival,
  departure,
  dateFormat,
  recommendedProperties = [],
  stayEnded = false,
  onOpenBoutique,
  onOpenConcierge,
  onOpenMessages,
  onOpenRequests,
  onOpenVilla,
  onOpenReserve,
  onOpenHelp,
  onOpenWifi,
  onOpenAccess,
}: GuestHomePanelProps) {
  const t = (key: Parameters<typeof tGuest>[0]) => tGuest(key, guestLanguage)

  const phaseContext: StayPhaseContext | null =
    arrival && departure
      ? buildStayPhaseContext(arrival, departure, {
        showConcierge,
        showVilla,
        pendingCount: 0,
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

  const phase = phaseContext?.phase
  const sectionTitle = phase === 'before'
    ? 'Préparer votre arrivée'
    : phase === 'departure'
      ? 'Avant votre départ'
      : phase === 'after'
        ? 'Votre séjour'
        : 'Aujourd’hui'

  const quickActions: Array<{
    icon: typeof Wifi
    label: string
    action: () => void
    badge?: number
  }> = phase === 'departure'
    ? [
      { icon: KeyRound, label: 'Check-out', action: onOpenAccess ?? onOpenVilla },
      { icon: MessageSquare, label: 'Écrire', action: onOpenMessages ?? onOpenHelp },
      { icon: ClipboardList, label: 'Suivi', action: onOpenRequests, badge: pendingCount },
      { icon: Phone, label: 'Urgence', action: onOpenHelp },
    ]
    : phase === 'after'
      ? [
        { icon: ClipboardList, label: 'Historique', action: onOpenRequests, badge: pendingCount },
        { icon: Wallet, label: 'Réserve', action: onOpenReserve },
        { icon: KeyRound, label: 'Mon séjour', action: onOpenVilla },
        { icon: ShieldAlert, label: 'Aide', action: onOpenHelp },
      ]
      : phase === 'before'
        ? [
          { icon: KeyRound, label: 'Accès', action: onOpenAccess ?? onOpenVilla },
          { icon: Wifi, label: 'Wi-Fi', action: onOpenWifi ?? onOpenVilla },
          { icon: ShoppingBag, label: 'Services', action: showBoutique ? onOpenBoutique : () => onOpenConcierge?.() },
          { icon: MessageSquare, label: 'Messages', action: onOpenMessages ?? onOpenHelp, badge: messageUnread },
        ]
        : [
          { icon: Wifi, label: 'Wi-Fi', action: onOpenWifi ?? onOpenVilla },
          { icon: KeyRound, label: 'Accès', action: onOpenAccess ?? onOpenVilla },
          { icon: ShoppingBag, label: 'Commander', action: showBoutique ? onOpenBoutique : () => onOpenConcierge?.() },
          { icon: Phone, label: 'Urgence', action: onOpenHelp },
        ]

  if (stayEnded) {
    return (
      <MobileScreen>
        <div className="mb-7 mt-4 rounded-2xl bg-[#071A2F] px-5 py-6 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Sparkles className="h-5 w-5 text-[#D2B27C]" strokeWidth={1.6} />
          </span>
          <h2 className="mt-4 font-['Cormorant_Garamond',Georgia,serif] text-[27px] font-semibold leading-tight">
            Merci pour votre séjour
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/65">
            {propertyName
              ? `Nous espérons que votre séjour à ${propertyName} vous a laissé de beaux souvenirs.`
              : 'Nous espérons que votre séjour vous a laissé de beaux souvenirs.'}
          </p>
        </div>

        <RecommendedPropertiesSection properties={recommendedProperties} />

        <section className="mt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A8844F]">
            Votre dernier séjour
          </p>
          <h2 className="mt-1 font-['Cormorant_Garamond',Georgia,serif] text-[24px] font-semibold text-[#071A2F]">
            Retrouver vos informations
          </h2>

          {arrival && departure && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ['Arrivée', formatDateForDisplay(arrival, dateFormat)],
                ['Départ', formatDateForDisplay(departure, dateFormat)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#E5DDD2] bg-white px-3 py-3"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#9A9289]">
                    {label}
                  </span>
                  <span className="mt-1 block text-[13px] font-semibold text-[#071A2F]">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenRequests}
              className="flex min-h-14 items-center gap-2 rounded-xl border border-[#E5DDD2] bg-white px-3 text-left"
            >
              <ClipboardList className="h-4 w-4 text-[#A8844F]" />
              <span className="text-[12px] font-semibold text-[#071A2F]">Historique</span>
            </button>
            <button
              type="button"
              onClick={onOpenReserve}
              className="flex min-h-14 items-center gap-2 rounded-xl border border-[#E5DDD2] bg-white px-3 text-left"
            >
              <Wallet className="h-4 w-4 text-[#A8844F]" />
              <span className="text-[12px] font-semibold text-[#071A2F]">Réserve</span>
            </button>
          </div>
        </section>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      {!stayEnded && (
      <div className="mb-5 mt-3 rounded-2xl border border-[#E5DDD2] bg-white p-3.5">
        <div className="flex items-center gap-3">
          {messageContactAvatar ? (
            <img
              src={messageContactAvatar}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EEE7DB] font-semibold text-[#A8844F]">
              {(messageContactName || messageContactLabel || 'MB').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[#071A2F]">
              {messageContactName || messageContactLabel || 'Votre concierge'}
            </p>
            <p className="mt-0.5 text-[11px] text-[#7B746C]">
              {messageContactName ? messageContactLabel : 'Votre équipe sur place'}
            </p>
          </div>
          {showMessaging && onOpenMessages && (
            <button
              type="button"
              onClick={onOpenMessages}
              className="flex min-h-10 items-center gap-1.5 rounded-lg bg-[#071A2F] px-3 text-[11px] font-semibold text-white active:opacity-80"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Écrire
            </button>
          )}
        </div>
      </div>
      )}

      <div className="mb-6 grid grid-cols-4 gap-2">
        {quickActions.map(item => (
          <QuickAction
            key={item.label}
            icon={item.icon}
            label={item.label}
            onClick={item.action}
            badge={item.badge}
          />
        ))}
      </div>

      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-['Cormorant_Garamond',Georgia,serif] text-[25px] font-semibold text-[#071A2F]">
          {sectionTitle}
        </h2>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onOpenRequests}
            className="text-[11px] font-semibold text-[#A8844F]"
          >
            {pendingCount} à valider
          </button>
        )}
      </div>

      {phaseContext && (
        <button
          type="button"
          onClick={phaseContext.primaryAction ? handlePrimaryAction : undefined}
          disabled={!phaseContext.primaryAction}
          className="mb-3 flex min-h-[88px] w-full items-center gap-3 rounded-2xl border border-[#E5DDD2] bg-white p-3 text-left disabled:opacity-100"
        >
          <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-[#EEE7DB]">
            <CalendarDays className="h-5 w-5 text-[#A8844F]" strokeWidth={1.6} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-[#071A2F]">
              {phaseContext.headline}
            </span>
            <span className="mt-1 block text-[12px] leading-snug text-[#7B746C]">
              {phaseContext.subtitle}
            </span>
          </span>
          {phaseContext.primaryAction && (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#A89E91]" />
          )}
        </button>
      )}

      {arrival && departure && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            ['Arrivée', formatDateForDisplay(arrival, dateFormat)],
            ['Départ', formatDateForDisplay(departure, dateFormat)],
          ].map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={onOpenVilla}
              className="rounded-xl border border-[#E5DDD2] bg-white px-3 py-3 text-left active:bg-[#F9F6F1]"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#9A9289]">
                {label}
              </span>
              <span className="mt-1 block text-[13px] font-semibold text-[#071A2F]">{value}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenReserve}
        className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-xl bg-[#071A2F] px-4 text-left text-white active:opacity-90"
      >
        <Wallet className="h-5 w-5 text-[#C6A66D]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-white/60">
            {phase === 'after'
              ? 'Historique de votre réserve'
              : reserve
                ? t('home.reserveAvailable')
                : t('home.activateReserve')}
          </span>
          <span className="block text-[14px] font-semibold tabular-nums">
            {reserve
              ? formatReserveAmount(reserve.current_balance, reserve.currency)
              : formatReserveAmount(recommendedAmount)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/50" />
      </button>

      {settings.require_online_checkin && !stayEnded && (
        <button
          type="button"
          onClick={onOpenAccess ?? onOpenVilla}
          className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#E5DDD2] bg-white p-3 text-left"
        >
          <ShieldAlert className="h-5 w-5 text-[#A8844F]" />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-[#071A2F]">{t('home.checkinTitle')}</span>
            <span className="mt-0.5 block text-[11px] text-[#7B746C]">{t('home.checkinBody')}</span>
          </span>
        </button>
      )}
    </MobileScreen>
  )
}
