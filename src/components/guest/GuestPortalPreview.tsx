import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ClipboardList,
  ConciergeBell,
  Home,
  KeyRound,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { formatStayRange } from '@/lib/dateFormat'
import type { GuestGuide, GuestPortalSettings } from '@/lib/guestPortal'
import { guestPortalTheme } from '@/components/guest/guestPortalStyles'
import { hasRichContent } from '@/lib/guideContent'
import type { PropertyServiceItem } from '@/lib/propertyServices'
import { StayReserveGuestPanel } from '@/components/guest/StayReserveGuestPanel'
import { BoutiqueGuestPanel } from '@/components/guest/BoutiqueGuestPanel'
import { ConciergeGuestPanel } from '@/components/guest/ConciergeGuestPanel'
import { GuestHomePanel } from '@/components/guest/GuestHomePanel'
import { GuestRequestsPanel } from '@/components/guest/GuestRequestsPanel'
import { GuestVillaPanel, type VillaSection } from '@/components/guest/GuestVillaPanel'
import { GuestMessagesPanel } from '@/components/guest/GuestMessagesPanel'
import { useGuestStayReserve } from '@/lib/useGuestStayReserve'
import { fetchPropertyBoutiqueCatalog, filterBoutiqueCatalogEntries, filterBoutiqueCategories } from '@/lib/boutique'
import type {
  BoutiqueCartLine,
  BoutiqueCatalogEntry,
  CatalogCategory,
  StoreOrder,
  StoreOrderItem,
} from '@/lib/boutique'
import type {
  ReserveTransaction,
  StayReserve,
  StayServiceRequest,
  StayServiceRequestDraft,
} from '@/lib/stayReserve'
import {
  messageContactHeading,
  type StayMessagingPayload,
} from '@/lib/stayMessaging'

type GuestTab = 'home' | 'concierge' | 'boutique' | 'requests' | 'villa' | 'reserve' | 'messages'

interface GuestPortalReservationContext {
  reservationId: string
  propertyId: string
  arrival: string
  departure: string
  maxGuests?: number
  propertyType?: string
  interactive?: boolean
  dateFormat?: string | null
}

interface GuestPortalPreviewProps {
  propertyName: string
  propertyImageUrl?: string | null
  settings: GuestPortalSettings
  guides: GuestGuide[]
  includeDraftGuides?: boolean
  guestName?: string
  propertyServices?: PropertyServiceItem[]
  reservationContext?: GuestPortalReservationContext
  stayReserveOverride?: {
    reserve: StayReserve | null
    requests: StayServiceRequest[]
    transactions: ReserveTransaction[]
    recommendedAmount: number
    loading?: boolean
    createReserve?: (amount: number) => Promise<void>
    topUp?: (amount: number) => Promise<void>
    createRequest?: (input: {
      category: string
      title: string
      description: string
      requestedDate?: string
      estimatedAmount?: number
      propertyServiceId?: string
      providerName?: string
    }) => Promise<void>
    approveRequest?: (requestId: string) => Promise<void>
  }
  boutiqueOverride?: {
    categories: CatalogCategory[]
    catalog: BoutiqueCatalogEntry[]
    orders: StoreOrder[]
    orderItems: StoreOrderItem[]
    loading?: boolean
    checkout?: (lines: BoutiqueCartLine[], paymentMethod: 'stay_reserve' | 'card', notes?: string) => Promise<void>
    approveQuote?: (orderItemId: string) => Promise<void>
    onTopUpReserve?: () => void
  }
  messagingOverride?: {
    messaging: StayMessagingPayload
    loading?: boolean
    onSend?: (body: string) => Promise<void>
    onMarkRead?: () => void
  }
  /** Clé localStorage pour persister le panier boutique (token voyageur ou property_id preview) */
  cartStorageKey?: string
}

function previewMessaging(settings: GuestPortalSettings): StayMessagingPayload {
  if (settings.show_messaging === false) {
    return { enabled: false, conversation: null, contact: null, messages: [], unreadCount: 0 }
  }
  const role = settings.message_contact_role ?? 'house_manager'
  return {
    enabled: true,
    conversation: null,
    contact: { role, full_name: null, email: null, phone: null, avatar_url: null },
    messages: [],
    unreadCount: 0,
  }
}

export function GuestPortalPreview({
  propertyName,
  propertyImageUrl,
  settings,
  guides,
  includeDraftGuides = false,
  guestName = 'Voyageur',
  propertyServices = [],
  reservationContext,
  stayReserveOverride,
  boutiqueOverride,
  messagingOverride,
  cartStorageKey,
}: GuestPortalPreviewProps) {
  const [activeTab, setActiveTab] = useState<GuestTab>('home')
  const [lastTab, setLastTab] = useState<GuestTab>('home')
  const [villaSection, setVillaSection] = useState<VillaSection>('home')
  const [serviceRequestDraft, setServiceRequestDraft] = useState<StayServiceRequestDraft | null>(null)
  const [boutiqueCategories, setBoutiqueCategories] = useState<CatalogCategory[]>(boutiqueOverride?.categories ?? [])
  const [boutiqueCatalog, setBoutiqueCatalog] = useState<BoutiqueCatalogEntry[]>(boutiqueOverride?.catalog ?? [])
  const [boutiqueLoading, setBoutiqueLoading] = useState(false)

  useEffect(() => {
    if (boutiqueOverride) {
      setBoutiqueCategories(boutiqueOverride.categories)
      setBoutiqueCatalog(boutiqueOverride.catalog)
      return
    }
    const propertyId = reservationContext?.propertyId ?? settings.property_id
    if (!propertyId || settings.show_boutique === false) return
    setBoutiqueLoading(true)
    fetchPropertyBoutiqueCatalog(propertyId).then(({ data }) => {
      setBoutiqueCategories(data.categories)
      setBoutiqueCatalog(data.items)
      setBoutiqueLoading(false)
    })
  }, [boutiqueOverride, reservationContext?.propertyId, settings.property_id, settings.show_boutique])

  const stayReserveHook = useGuestStayReserve({
    reservationId: reservationContext?.reservationId,
    propertyId: reservationContext?.propertyId,
    arrival: reservationContext?.arrival,
    departure: reservationContext?.departure,
    maxGuests: reservationContext?.maxGuests,
    propertyType: reservationContext?.propertyType,
    enabled: Boolean(reservationContext?.reservationId) && !stayReserveOverride,
  })

  const stayReserve = stayReserveOverride ?? stayReserveHook
  const reserveInteractive = Boolean(
    reservationContext?.interactive && (stayReserveOverride || reservationContext),
  )

  const showBoutique = settings.show_boutique !== false
  const showConcierge = settings.show_services !== false
  const showMessaging = settings.show_messaging !== false
  const enabledServices = showConcierge ? propertyServices : []

  const boutiqueCatalogProducts = useMemo(
    () => filterBoutiqueCatalogEntries(boutiqueCatalog),
    [boutiqueCatalog],
  )
  const boutiqueCategoriesProducts = useMemo(
    () => filterBoutiqueCategories(boutiqueCategories, boutiqueCatalog),
    [boutiqueCategories, boutiqueCatalog],
  )
  const visibleGuides = guides.filter(g => includeDraftGuides || g.published)

  const showVilla = Boolean(
    settings.wifi_name
    || settings.wifi_password
    || hasRichContent(settings.check_in_instructions)
    || hasRichContent(settings.check_out_instructions)
    || hasRichContent(settings.house_rules)
    || visibleGuides.length > 0,
  )

  // Priority-ordered tabs; the bottom bar shows at most 5. Réserve and Villa
  // overflow gracefully (both reachable from the Accueil hub) so Messages stays
  // in the bar whenever messaging is enabled.
  const tabConfig: { id: GuestTab; label: string; icon: typeof Home; show: boolean }[] = [
    { id: 'home', label: 'Accueil', icon: Home, show: true },
    { id: 'concierge', label: 'Conciergerie', icon: ConciergeBell, show: showConcierge },
    { id: 'boutique', label: 'Boutique', icon: ShoppingBag, show: showBoutique },
    { id: 'requests', label: 'Suivi', icon: ClipboardList, show: true },
    { id: 'messages', label: 'Messages', icon: MessageSquare, show: showMessaging },
    { id: 'reserve', label: 'Réserve', icon: Wallet, show: true },
    { id: 'villa', label: 'Villa', icon: KeyRound, show: showVilla },
  ]
  const visibleTabs = tabConfig.filter(tab => tab.show).slice(0, 5)
  const offBarTab =
    activeTab !== 'home' && !visibleTabs.some(t => t.id === activeTab)
      ? tabConfig.find(t => t.id === activeTab)
      : null
  const OffBarIcon = offBarTab?.icon

  const messaging = messagingOverride?.messaging ?? previewMessaging(settings)
  const messageUnread = messaging.unreadCount

  const storeOrders = boutiqueOverride?.orders ?? []
  const storeOrderItems = boutiqueOverride?.orderItems ?? []

  const pendingCount = useMemo(() => {
    const quoteItems = storeOrderItems.filter(i => i.status === 'waiting_client_approval').length
    const quoteRequests = stayReserve.requests.filter(r => r.status === 'waiting_client_approval').length
    return quoteItems + quoteRequests
  }, [storeOrderItems, stayReserve.requests])

  const openTab = (tab: GuestTab, villa?: VillaSection) => {
    setVillaSection(villa ?? 'home')
    if (tab === 'messages' && activeTab !== 'messages') {
      setLastTab(activeTab)
      messagingOverride?.onMarkRead?.()
    }
    setActiveTab(tab)
  }

  const isLive = Boolean(reservationContext?.interactive)

  if (!settings.enabled) {
    return (
      <div className={`flex min-h-[640px] flex-col items-center justify-center px-8 text-center ${guestPortalTheme.shell}`}>
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${guestPortalTheme.accentSoft}`}>
          <Sparkles className={`h-6 w-6 ${guestPortalTheme.accent}`} />
        </div>
        <p className={`text-xl font-semibold ${guestPortalTheme.title}`}>
          {isLive ? 'Portail momentanément indisponible' : 'Portail désactivé'}
        </p>
        <p className={`mt-2 max-w-xs ${guestPortalTheme.body}`}>
          {isLive
            ? 'Votre espace séjour sera bientôt disponible. Contactez votre conciergerie pour toute demande.'
            : 'Activez le portail voyageur pour le rendre accessible à vos clients.'}
        </p>
      </div>
    )
  }

  return (
    <div className={`relative flex min-h-[640px] flex-col overflow-hidden bg-white text-[#1A1614]`}>
      {activeTab === 'home' && (
        <div className="relative h-52 shrink-0 overflow-hidden bg-[#1A1614]">
          {propertyImageUrl ? (
            <img src={propertyImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#2C2622] via-[#3D3530] to-[#1A1614]" />
          )}
          <div className={`absolute inset-0 ${guestPortalTheme.heroOverlay}`} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
              My Butlr
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-md">
              Séjour privé
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-5">
            <h1 className="text-[26px] font-bold leading-tight text-white">{propertyName}</h1>
            {reservationContext?.arrival && reservationContext?.departure && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-white/80">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                {formatStayRange(
                  reservationContext.arrival,
                  reservationContext.departure,
                  reservationContext.dateFormat,
                )}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-5">
        {offBarTab && OffBarIcon && (
          <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-[#E5E5EA] bg-white/95 px-4 py-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => openTab('home')}
              className="text-[13px] font-medium text-[#9A7B4F] active:opacity-70"
            >
              Accueil
            </button>
            <span className="text-[#C7C7CC]" aria-hidden>/</span>
            <div className="flex min-w-0 items-center gap-1.5">
              <OffBarIcon className="h-4 w-4 shrink-0 text-[#9A7B4F]" strokeWidth={1.75} />
              <span className="truncate text-[13px] font-semibold text-[#1A1614]">{offBarTab.label}</span>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <GuestHomePanel
            guestName={guestName}
            settings={settings}
            reserve={stayReserve.reserve}
            recommendedAmount={stayReserve.recommendedAmount}
            pendingCount={pendingCount}
            showBoutique={showBoutique}
            showConcierge={showConcierge}
            showVilla={showVilla}
            showMessaging={showMessaging}
            messageContactLabel={messageContactHeading(
              settings.message_contact_role ?? 'house_manager',
            )}
            messageUnread={messageUnread}
            arrival={reservationContext?.arrival}
            departure={reservationContext?.departure}
            dateFormat={reservationContext?.dateFormat}
            onOpenBoutique={() => openTab('boutique')}
            onOpenConcierge={() => openTab('concierge')}
            onOpenMessages={() => openTab('messages')}
            onOpenRequests={() => openTab('requests')}
            onOpenVilla={() => openTab('villa')}
            onOpenReserve={() => openTab('reserve')}
            onOpenHelp={() => openTab('villa', 'help')}
          />
        )}

        {activeTab === 'messages' && showMessaging && (
          <GuestMessagesPanel
            messaging={messaging}
            loading={messagingOverride?.loading}
            readOnly={!reserveInteractive}
            dateFormat={reservationContext?.dateFormat}
            onBack={() => openTab(lastTab)}
            onSend={reserveInteractive ? messagingOverride?.onSend : undefined}
          />
        )}

        {activeTab === 'concierge' && showConcierge && (
          <ConciergeGuestPanel
            propertyServices={enabledServices}
            reserve={stayReserve.reserve}
            serviceRequests={stayReserve.requests}
            dateFormat={reservationContext?.dateFormat}
            readOnly={!reserveInteractive}
            serviceRequestDraft={serviceRequestDraft}
            onDraftConsumed={() => setServiceRequestDraft(null)}
            onCreateRequest={reserveInteractive ? stayReserve.createRequest : undefined}
            onOpenRequests={() => openTab('requests')}
            onOpenReserve={() => openTab('reserve')}
          />
        )}

        {activeTab === 'boutique' && showBoutique && (
          <BoutiqueGuestPanel
            categories={boutiqueCategoriesProducts}
            catalog={boutiqueCatalogProducts}
            reserve={stayReserve.reserve}
            welcomeText={settings.boutique_welcome_text}
            loading={boutiqueOverride?.loading ?? boutiqueLoading}
            readOnly={!reserveInteractive}
            cartStorageKey={cartStorageKey ?? settings.property_id}
            onCheckout={reserveInteractive ? boutiqueOverride?.checkout : undefined}
            onTopUpReserve={reserveInteractive ? () => openTab('reserve') : undefined}
            onOpenRequests={() => openTab('requests')}
          />
        )}

        {activeTab === 'requests' && (
          <GuestRequestsPanel
            storeOrders={storeOrders}
            storeOrderItems={storeOrderItems}
            serviceRequests={stayReserve.requests}
            dateFormat={reservationContext?.dateFormat}
            readOnly={!reserveInteractive}
            onApproveQuote={reserveInteractive ? boutiqueOverride?.approveQuote : undefined}
            onApproveRequest={reserveInteractive ? stayReserve.approveRequest : undefined}
            contactVia={showMessaging ? 'messages' : 'help'}
            onContactService={() => (showMessaging ? openTab('messages') : openTab('villa', 'help'))}
          />
        )}

        {activeTab === 'villa' && (
          <GuestVillaPanel
            settings={settings}
            guides={visibleGuides}
            includeDraftGuides={includeDraftGuides}
            initialSection={villaSection}
            onSectionConsumed={() => setVillaSection('home')}
          />
        )}

        {activeTab === 'reserve' && (
          <StayReserveGuestPanel
            reserve={stayReserve.reserve}
            requests={stayReserve.requests}
            transactions={stayReserve.transactions}
            recommendedAmount={stayReserve.recommendedAmount}
            dateFormat={reservationContext?.dateFormat}
            loading={stayReserve.loading ?? false}
            readOnly={!reserveInteractive}
            onCreateReserve={reserveInteractive ? stayReserve.createReserve : undefined}
            onTopUp={reserveInteractive ? stayReserve.topUp : undefined}
            onCreateRequest={reserveInteractive ? stayReserve.createRequest : undefined}
            onApproveRequest={reserveInteractive ? stayReserve.approveRequest : undefined}
            onOpenRequests={() => openTab('requests')}
            onOpenConcierge={() => openTab('concierge')}
          />
        )}
      </div>

      <nav className="absolute inset-x-0 bottom-0 border-t border-[#E5E5EA] bg-white/95 px-1 pb-3 pt-2 backdrop-blur-xl">
        <div className="flex items-end justify-around">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            const badge =
              tab.id === 'requests'
                ? pendingCount
                : tab.id === 'messages'
                  ? messageUnread
                  : 0
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => openTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={tab.label}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 ${
                  active ? 'text-[#1A1614]' : 'text-[#8E8E93]'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.5} />
                <span className="truncate text-[10px] font-medium">{tab.label}</span>
                {badge > 0 && (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C9AD7F] px-1 text-[9px] font-bold text-[#1A1614]">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                {active && <span className="h-0.5 w-5 rounded-full bg-[#C9AD7F]" />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
