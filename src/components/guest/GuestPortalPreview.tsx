import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  CalendarDays,
  ClipboardList,
  ConciergeBell,
  Home,
  KeyRound,
  MessageSquare,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { formatStayRange } from '@/lib/dateFormat'
import type { GuestGuide, GuestPortalSettings } from '@/lib/guestPortal'
import { guestPortalTheme } from '@/components/guest/guestPortalStyles'
import { hasRichContent } from '@/lib/guideContent'
import { tGuest } from '@/lib/guestLanguage'
import { getStayTiming } from '@/lib/guestStayPhase'
import type { RecommendedProperty } from '@/lib/postStayMarketplace'
import {
  buildStayServiceRequestDraft,
  type PropertyServiceItem,
} from '@/lib/propertyServices'
import { StayReserveGuestPanel } from '@/components/guest/StayReserveGuestPanel'
import { BoutiqueGuestPanel } from '@/components/guest/BoutiqueGuestPanel'
import { ConciergeGuestPanel } from '@/components/guest/ConciergeGuestPanel'
import { GuestHomePanel } from '@/components/guest/GuestHomePanel'
import { GuestRequestsPanel } from '@/components/guest/GuestRequestsPanel'
import { GuestVillaPanel, type VillaSection } from '@/components/guest/GuestVillaPanel'
import { GuestMessagesPanel } from '@/components/guest/GuestMessagesPanel'
import { GuestProfilePanel } from '@/components/guest/GuestProfilePanel'
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
  type StayMessageInput,
  type StayMessagingPayload,
} from '@/lib/stayMessaging'

type GuestTab = 'home' | 'concierge' | 'boutique' | 'requests' | 'villa' | 'reserve' | 'messages' | 'profile'

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
  recommendedProperties?: RecommendedProperty[]
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
    bookDirectService?: (input: {
      propertyServiceId: string
      quantity?: number
      requestedDate?: string
      clientNotes?: string
      selectedOptions?: Record<string, string>
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
    guestToken?: string
    guestLanguage?: string | null
    onSend?: (input: StayMessageInput) => Promise<void>
    onMarkRead?: () => void
  }
  /** Langue du séjour (reservation.guest_language) pour la traduction de l'interface voyageur */
  guestLanguage?: string | null
  /** Notifie le parent du changement d'onglet actif (pour adapter la fréquence de polling) */
  onActiveTabChange?: (tab: string) => void
  /** Contraint le portail à la hauteur de l'écran pour garder la navigation visible. */
  fullViewport?: boolean
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
  recommendedProperties = [],
  propertyServices = [],
  reservationContext,
  stayReserveOverride,
  boutiqueOverride,
  messagingOverride,
  guestLanguage,
  onActiveTabChange,
  fullViewport = false,
}: GuestPortalPreviewProps) {
  const lang = guestLanguage ?? messagingOverride?.guestLanguage ?? null
  const t = (key: Parameters<typeof tGuest>[0]) => tGuest(key, lang)
  const [activeTab, setActiveTab] = useState<GuestTab>('home')
  const [lastTab, setLastTab] = useState<GuestTab>('home')
  const [villaSection, setVillaSection] = useState<VillaSection>('home')
  const [serviceRequestDraft, setServiceRequestDraft] = useState<StayServiceRequestDraft | null>(null)
  const [initialCatalogItemId, setInitialCatalogItemId] = useState<string | null>(null)
  const [boutiqueOrderFromMessage, setBoutiqueOrderFromMessage] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => () => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
  }, [])
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
  const stayTiming = reservationContext?.arrival && reservationContext?.departure
    ? getStayTiming(reservationContext.arrival, reservationContext.departure)
    : null
  const stayEnded = stayTiming?.phase === 'after'
  const reserveInteractive = Boolean(
    reservationContext?.interactive && !stayEnded && (stayReserveOverride || reservationContext),
  )

  const showBoutique = settings.show_boutique !== false && !stayEnded
  const showConcierge = settings.show_services !== false && !stayEnded
  const showMessaging = settings.show_messaging !== false && !stayEnded
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

  // During a stay the five main destinations stay stable. Once it is over,
  // transactional destinations are replaced by the read-only history.
  const tabConfig: { id: GuestTab; label: string; icon: typeof Home; show: boolean }[] = [
    { id: 'home', label: t('nav.home'), icon: Home, show: true },
    { id: 'villa', label: t('nav.stay'), icon: KeyRound, show: !stayEnded },
    {
      id: showConcierge ? 'concierge' : 'boutique',
      label: t('nav.services'),
      icon: ConciergeBell,
      show: showConcierge || showBoutique,
    },
    { id: 'messages', label: t('nav.messages'), icon: MessageSquare, show: showMessaging },
    { id: 'requests', label: 'Historique', icon: ClipboardList, show: stayEnded },
    { id: 'profile', label: t('nav.profile'), icon: UserRound, show: true },
  ]
  const visibleTabs = tabConfig.filter(tab => tab.show)
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
    if (stayEnded && (tab === 'boutique' || tab === 'concierge' || tab === 'messages')) {
      setActiveTab('home')
      return
    }
    setVillaSection(villa ?? 'home')
    if (tab === 'messages' && activeTab !== 'messages') {
      setLastTab(activeTab)
      messagingOverride?.onMarkRead?.()
    }
    setActiveTab(tab)
    onActiveTabChange?.(tab)
  }

  const isLive = Boolean(reservationContext?.interactive)
  const firstName = guestName.trim().split(/\s+/)[0] || t('home.greetingFallback')
  if (!settings.enabled) {
    return (
      <div className={`flex min-h-[640px] flex-col items-center justify-center px-8 text-center ${guestPortalTheme.shell}`}>
        <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${guestPortalTheme.accentSoft}`}>
          <Sparkles className={`h-6 w-6 ${guestPortalTheme.accent}`} />
        </div>
        <p className={`text-xl font-semibold ${guestPortalTheme.title}`}>
          {isLive ? t('portal.disabledTitleLive') : t('portal.disabledTitle')}
        </p>
        <p className={`mt-2 max-w-xs ${guestPortalTheme.body}`}>
          {isLive ? t('portal.disabledBodyLive') : t('portal.disabledBody')}
        </p>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col overflow-hidden bg-[#F6F1E9] text-[#071A2F] ${
      fullViewport ? 'h-dvh max-h-dvh' : 'min-h-[640px]'
    }`}>
      {toastMessage && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[60] flex justify-center px-6">
          <div className="pointer-events-auto rounded-full bg-[#1A1614] px-4 py-2 text-center text-xs font-medium text-white shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}
      {activeTab === 'home' && (
        <div className={`relative shrink-0 overflow-hidden bg-[#071A2F] ${
          stayEnded ? 'h-[270px]' : 'h-[330px]'
        }`}>
          {propertyImageUrl ? (
            <img src={propertyImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[#071A2F]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#071A2F]/85 via-[#071A2F]/10 to-[#071A2F]/80" />
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pb-4 pt-3 text-white"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <span className="w-11" aria-hidden />
            <p className="font-['Cormorant_Garamond',Georgia,serif] text-[19px] font-semibold tracking-[0.04em] text-[#D2B27C]">
              My Butlr
            </p>
            <button
              type="button"
              onClick={() => openTab('profile')}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/10"
              aria-label="Notifications et profil"
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-[4.75rem] pt-16">
            <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-[31px] font-semibold leading-none text-white">
              Bonjour {firstName}
            </h1>
            <p className="mt-1.5 font-['Cormorant_Garamond',Georgia,serif] text-[18px] italic text-[#E3C996]">
              {stayEnded ? 'Prêt pour une nouvelle destination ?' : propertyName}
            </p>
            {!stayEnded && reservationContext?.arrival && reservationContext?.departure && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-white/75">
                <CalendarDays className="h-3.5 w-3.5 text-[#D2B27C]" strokeWidth={1.6} />
                {formatStayRange(
                  reservationContext.arrival,
                  reservationContext.departure,
                  reservationContext.dateFormat,
                )}
                {stayTiming && <span className="text-white/35">·</span>}
                {stayTiming?.label}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'home' && (
        <div
          className="shrink-0 bg-[#071A2F] px-5 pb-3 text-center"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-[19px] font-semibold tracking-[0.04em] text-[#D2B27C]">
            My Butlr
          </p>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-4 pb-28 ${
        activeTab === 'home' ? 'pt-0' : 'pt-5'
      }`}>
        {offBarTab && OffBarIcon && (
          <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-[#DED7CD] bg-[#F6F1E9]/95 px-4 py-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => openTab('home')}
              className="text-[13px] font-semibold text-[#222222] underline underline-offset-2 active:opacity-70"
            >
              {t('nav.home')}
            </button>
            <span className="text-[#DDDDDD]" aria-hidden>/</span>
            <div className="flex min-w-0 items-center gap-1.5">
              <OffBarIcon className="h-4 w-4 shrink-0 text-[#717171]" strokeWidth={1.75} />
              <span className="truncate text-[13px] font-semibold text-[#222222]">{offBarTab.label}</span>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <GuestHomePanel
            guestName={guestName}
            propertyName={propertyName}
            guestLanguage={lang}
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
            messageContactName={messaging.contact?.full_name}
            messageContactAvatar={messaging.contact?.avatar_url}
            messageUnread={messageUnread}
            arrival={reservationContext?.arrival}
            departure={reservationContext?.departure}
            dateFormat={reservationContext?.dateFormat}
            recommendedProperties={recommendedProperties}
            stayEnded={stayEnded}
            onOpenBoutique={() => openTab('boutique')}
            onOpenConcierge={() => openTab('concierge')}
            onOpenMessages={() => openTab('messages')}
            onOpenRequests={() => openTab('requests')}
            onOpenVilla={() => openTab('villa')}
            onOpenReserve={() => openTab('reserve')}
            onOpenHelp={() => openTab('villa', 'help')}
            onOpenWifi={() => openTab('villa', 'wifi')}
            onOpenAccess={() => openTab('villa', 'arrival')}
          />
        )}

        {activeTab === 'messages' && showMessaging && (
          <GuestMessagesPanel
            messaging={messaging}
            loading={messagingOverride?.loading}
            readOnly={!reserveInteractive}
            dateFormat={reservationContext?.dateFormat}
            guestToken={messagingOverride?.guestToken}
            guestLanguage={messagingOverride?.guestLanguage}
            onBack={() => openTab(lastTab)}
            onSend={reserveInteractive ? messagingOverride?.onSend : undefined}
            onOpenProduct={catalogItemId => {
              const exists = boutiqueCatalogProducts.some(entry => entry.item.id === catalogItemId)
              if (!exists) {
                showToast(t('portal.productNotFound'))
                return
              }
              setInitialCatalogItemId(catalogItemId)
              setBoutiqueOrderFromMessage(true)
              openTab('boutique')
            }}
            onOpenService={propertyServiceId => {
              const item = enabledServices.find(
                entry => entry.assignment?.id === propertyServiceId || entry.service.id === propertyServiceId,
              )
              if (!item) {
                showToast(t('portal.serviceNotFound'))
                return
              }
              setServiceRequestDraft(buildStayServiceRequestDraft(item))
              openTab('concierge')
            }}
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
            onBookDirect={reserveInteractive ? stayReserve.bookDirectService : undefined}
            onOpenRequests={() => openTab('requests')}
            onOpenReserve={() => openTab('reserve')}
          />
        )}

        {activeTab === 'boutique' && showBoutique && (
          <BoutiqueGuestPanel
            categories={boutiqueCategoriesProducts}
            catalog={boutiqueCatalogProducts}
            reserve={stayReserve.reserve}
            guestLanguage={lang}
            welcomeText={settings.boutique_welcome_text}
            loading={boutiqueOverride?.loading ?? boutiqueLoading}
            readOnly={!reserveInteractive}
            initialCatalogItemId={initialCatalogItemId}
            initialOrderMode={boutiqueOrderFromMessage}
            onInitialItemConsumed={() => {
              setInitialCatalogItemId(null)
              setBoutiqueOrderFromMessage(false)
            }}
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
            guestLanguage={lang}
            dateFormat={reservationContext?.dateFormat}
            readOnly={!reserveInteractive}
            onApproveQuote={reserveInteractive ? boutiqueOverride?.approveQuote : undefined}
            onApproveRequest={reserveInteractive ? stayReserve.approveRequest : undefined}
            contactVia={!stayEnded && showMessaging ? 'messages' : 'help'}
            onContactService={() => (!stayEnded && showMessaging ? openTab('messages') : openTab('villa', 'help'))}
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

        {activeTab === 'profile' && (
          <GuestProfilePanel
            guestName={guestName}
            propertyName={propertyName}
            arrival={reservationContext?.arrival}
            departure={reservationContext?.departure}
            dateFormat={reservationContext?.dateFormat}
            reserve={stayReserve.reserve}
            pendingCount={stayEnded ? 0 : pendingCount}
            showBoutique={showBoutique}
            stayEnded={stayEnded}
            onOpenRequests={() => openTab('requests')}
            onOpenReserve={() => openTab('reserve')}
            onOpenBoutique={() => openTab('boutique')}
            onOpenConcierge={() => openTab('concierge')}
            onOpenHelp={() => openTab('villa', 'help')}
          />
        )}

        {activeTab === 'reserve' && (
          <StayReserveGuestPanel
            reserve={stayReserve.reserve}
            requests={stayReserve.requests}
            transactions={stayReserve.transactions}
            recommendedAmount={stayReserve.recommendedAmount}
            guestLanguage={lang}
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

      <nav
        className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[24px] border-t border-white/10 bg-[#071A2F] px-1 pt-1.5 shadow-[0_-8px_24px_rgba(7,26,47,0.12)]"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch justify-around">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            const badge =
              tab.id === 'profile'
                ? stayEnded ? 0 : pendingCount
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
                className={`relative flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors ${
                  active ? 'text-[#D2B27C]' : 'text-white/55'
                }`}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.5} />
                <span className={`truncate text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
                {badge > 0 && (
                  <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D2B27C] px-1 text-[9px] font-bold text-[#071A2F]">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
