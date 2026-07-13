import { useEffect, useMemo, useState } from 'react'
import {
  Car,
  ClipboardList,
  Compass,
  ConciergeBell,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react'
import { GuideContentRenderer } from '@/components/guide/GuideContentRenderer'
import {
  CatalogListRow,
  GoldButton,
  MenuCardRow,
  MobileHeader,
  MobileScreen,
  MobileSearch,
  StickyFooter,
} from '@/components/guest/guestMobileUi'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import { hasRichContent } from '@/lib/guideContent'
import {
  buildStayServiceRequestDraft,
  getServiceDescriptionContent,
  resolveServiceOffer,
  serviceCategoryLabel,
  type PropertyServiceItem,
} from '@/lib/propertyServices'
import {
  stayServiceCategories,
  type StayServiceRequest,
  type StayServiceRequestDraft,
  type StayReserve,
} from '@/lib/stayReserve'

type ConciergeView = 'home' | 'list' | 'detail' | 'request' | 'confirm'

const categoryIcons: Record<string, typeof ConciergeBell> = {
  dining: Utensils,
  transport: Car,
  wellness: Sparkles,
  activities: Compass,
  experiences: Compass,
  lifestyle: Sparkles,
  family: ConciergeBell,
  other: ConciergeBell,
}

function groupServicesByCategory(items: PropertyServiceItem[]) {
  const groups = new Map<string, PropertyServiceItem[]>()
  for (const item of items) {
    const key = item.service.category ?? 'other'
    const current = groups.get(key) ?? []
    current.push(item)
    groups.set(key, current)
  }
  return [...groups.entries()].sort(([a], [b]) =>
    serviceCategoryLabel(a).localeCompare(serviceCategoryLabel(b), 'fr'),
  )
}

interface ConciergeGuestPanelProps {
  propertyServices: PropertyServiceItem[]
  reserve: StayReserve | null
  serviceRequests?: StayServiceRequest[]
  dateFormat?: string | null
  readOnly?: boolean
  serviceRequestDraft?: StayServiceRequestDraft | null
  onDraftConsumed?: () => void
  onCreateRequest?: (input: {
    category: string
    title: string
    description: string
    requestedDate?: string
    estimatedAmount?: number
    propertyServiceId?: string
    providerName?: string
  }) => Promise<void>
  onOpenRequests?: () => void
  onOpenReserve?: () => void
}

export function ConciergeGuestPanel({
  propertyServices,
  reserve,
  serviceRequests = [],
  readOnly = false,
  serviceRequestDraft,
  onDraftConsumed,
  onCreateRequest,
  onOpenRequests,
  onOpenReserve,
}: ConciergeGuestPanelProps) {
  const [view, setView] = useState<ConciergeView>('home')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<PropertyServiceItem | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [requestForm, setRequestForm] = useState({
    category: 'special',
    title: '',
    description: '',
    requestedDate: '',
    estimatedAmount: '',
    propertyServiceId: undefined as string | undefined,
    providerName: undefined as string | undefined,
  })

  const grouped = useMemo(() => groupServicesByCategory(propertyServices), [propertyServices])

  const pendingApproval = useMemo(
    () => serviceRequests.filter(r => r.status === 'waiting_client_approval'),
    [serviceRequests],
  )

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return grouped
    return grouped
      .map(([category, items]) => [
        category,
        items.filter(item => {
          const offer = resolveServiceOffer(item.service, item.assignment)
          return offer.displayName.toLowerCase().includes(q)
            || (item.service.description ?? '').toLowerCase().includes(q)
        }),
      ] as const)
      .filter(([, items]) => items.length > 0)
  }, [grouped, search])

  const listItems = useMemo(() => {
    if (!activeCategory) return []
    const q = search.trim().toLowerCase()
    const items = grouped.find(([cat]) => cat === activeCategory)?.[1] ?? []
    if (!q) return items
    return items.filter(item => {
      const offer = resolveServiceOffer(item.service, item.assignment)
      return offer.displayName.toLowerCase().includes(q)
    })
  }, [activeCategory, grouped, search])

  useEffect(() => {
    if (!serviceRequestDraft) return
    setRequestForm({
      category: serviceRequestDraft.category,
      title: serviceRequestDraft.title,
      description: serviceRequestDraft.description,
      requestedDate: '',
      estimatedAmount: serviceRequestDraft.estimatedAmount != null
        ? String(serviceRequestDraft.estimatedAmount)
        : '',
      propertyServiceId: serviceRequestDraft.propertyServiceId,
      providerName: serviceRequestDraft.providerName,
    })
    setView('request')
    onDraftConsumed?.()
  }, [serviceRequestDraft])

  const openFreeRequest = () => {
    setActiveItem(null)
    setRequestForm({
      category: 'special',
      title: '',
      description: '',
      requestedDate: '',
      estimatedAmount: '',
      propertyServiceId: undefined,
      providerName: undefined,
    })
    setView('request')
  }

  const openServiceRequest = (item: PropertyServiceItem) => {
    const draft = buildStayServiceRequestDraft(item)
    setActiveItem(item)
    setRequestForm({
      category: draft.category,
      title: draft.title,
      description: draft.description,
      requestedDate: '',
      estimatedAmount: draft.estimatedAmount != null ? String(draft.estimatedAmount) : '',
      propertyServiceId: draft.propertyServiceId,
      providerName: draft.providerName,
    })
    setView('request')
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    } finally {
      setBusy(false)
    }
  }

  if (view === 'confirm') {
    return (
      <MobileScreen className="flex min-h-[420px] flex-col items-center px-2 pt-8 text-center">
        <MobileHeader title="Demande envoyée" />
        <ConciergeBell className="mt-8 h-14 w-14 text-[#C9AD7F]" strokeWidth={1.5} />
        <p className="mt-6 text-[20px] font-bold">Votre demande a été transmise</p>
        <p className={`mt-2 max-w-[280px] ${guestMobile.body}`}>
          Votre équipe reviendra vers vous avec un devis ou une confirmation.
        </p>
        <div className="mt-auto w-full space-y-2 pt-8">
          {onOpenRequests && (
            <GoldButton onClick={() => { setView('home'); onOpenRequests() }}>Voir le suivi</GoldButton>
          )}
          <button
            type="button"
            onClick={() => setView('home')}
            className="w-full py-3 text-sm font-medium text-[#8E8E93]"
          >
            Retour à la conciergerie
          </button>
        </div>
      </MobileScreen>
    )
  }

  if (view === 'request') {
    return (
      <MobileScreen className="flex min-h-[520px] flex-col pb-24">
        <MobileHeader
          title={activeItem ? 'Demander cette prestation' : 'Demande sur mesure'}
          onBack={() => setView(activeItem ? 'detail' : 'home')}
        />

        {!reserve && (
          <div className="mb-4 rounded-2xl bg-[#FFF3CD] px-4 py-3 text-sm text-[#856404]">
            Activez votre Réserve séjour pour envoyer une demande.
            {onOpenReserve && (
              <button type="button" onClick={onOpenReserve} className="ml-1 font-semibold underline">
                Activer
              </button>
            )}
          </div>
        )}

        <p className={`mb-4 ${guestMobile.body}`}>
          Décrivez votre besoin — votre house manager ou conciergerie coordonne chaque prestation avec discrétion.
        </p>

        <select
          value={requestForm.category}
          onChange={e => setRequestForm(f => ({ ...f, category: e.target.value }))}
          className="mb-3 w-full rounded-2xl border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3 text-[15px]"
        >
          {stayServiceCategories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <input
          placeholder="Titre — ex. Chef privé ce soir"
          value={requestForm.title}
          onChange={e => setRequestForm(f => ({ ...f, title: e.target.value }))}
          className="mb-3 w-full border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none placeholder:text-[#C7C7CC]"
        />
        <textarea
          rows={4}
          placeholder="Détails, horaires, nombre de personnes…"
          value={requestForm.description}
          onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))}
          className="mb-3 w-full resize-none border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none placeholder:text-[#C7C7CC]"
        />
        <input
          type="date"
          value={requestForm.requestedDate}
          onChange={e => setRequestForm(f => ({ ...f, requestedDate: e.target.value }))}
          className="mb-3 w-full border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none"
        />
        <input
          type="number"
          placeholder="Budget indicatif (€)"
          value={requestForm.estimatedAmount}
          onChange={e => setRequestForm(f => ({ ...f, estimatedAmount: e.target.value }))}
          className="mb-6 w-full border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none placeholder:text-[#C7C7CC]"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <StickyFooter>
          {!readOnly && onCreateRequest && (
            <GoldButton
              disabled={busy || !requestForm.title.trim() || !reserve}
              onClick={() => run(async () => {
                await onCreateRequest({
                  category: requestForm.category,
                  title: requestForm.title,
                  description: requestForm.description,
                  requestedDate: requestForm.requestedDate || undefined,
                  estimatedAmount: requestForm.estimatedAmount
                    ? Number(requestForm.estimatedAmount)
                    : undefined,
                  propertyServiceId: requestForm.propertyServiceId,
                  providerName: requestForm.providerName,
                })
                setView('confirm')
              })}
            >
              Envoyer la demande
            </GoldButton>
          )}
        </StickyFooter>
      </MobileScreen>
    )
  }

  if (view === 'detail' && activeItem) {
    const offer = resolveServiceOffer(activeItem.service, activeItem.assignment)
    const description = getServiceDescriptionContent(activeItem.service, activeItem.assignment)
    const rich = hasRichContent(description)

    return (
      <MobileScreen className="flex min-h-[520px] flex-col pb-24">
        <MobileHeader title={offer.displayName} onBack={() => setView('list')} />

        {activeItem.service.image_url ? (
          <img
            src={activeItem.service.image_url}
            alt=""
            className="mb-4 aspect-[16/10] w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="mb-4 aspect-[16/10] w-full rounded-2xl bg-gradient-to-br from-[#E8DFD4] to-[#B8956B]" />
        )}

        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
          {serviceCategoryLabel(activeItem.service.category)}
        </p>
        <p className="mt-2 text-[22px] font-bold">{offer.displayName}</p>
        <p className="mt-2 text-[17px] font-semibold text-[#9A7B4F]">{offer.pricing.displayLabel}</p>

        {offer.providerLabel && (
          <p className={`mt-2 ${guestMobile.subtitle}`}>Prestataire : {offer.providerLabel}</p>
        )}
        {offer.includesText && (
          <p className={`mt-2 ${guestMobile.body}`}>Inclus : {offer.includesText}</p>
        )}
        {offer.conciergeMessage && (
          <p className={`mt-3 rounded-2xl bg-[#FAFAFA] px-4 py-3 text-[14px] ${guestMobile.body}`}>
            {offer.conciergeMessage}
          </p>
        )}

        {description && (
          <div className="mt-4 border-t border-[#E5E5EA] pt-4">
            {rich ? (
              <GuideContentRenderer content={description} />
            ) : (
              <p className={guestMobile.body}>{description}</p>
            )}
          </div>
        )}

        <p className={`mt-4 text-[13px] ${guestMobile.subtitle}`}>
          Un devis vous sera proposé avant tout débit de votre Réserve séjour.
        </p>

        {!readOnly && (
          <StickyFooter>
            {!reserve && (
              <p className="mb-3 text-center text-[13px] text-[#856404]">
                Activez votre Réserve séjour pour envoyer une demande.
              </p>
            )}
            <GoldButton onClick={() => openServiceRequest(activeItem)} disabled={!reserve}>
              Demander cette prestation
            </GoldButton>
            {!reserve && onOpenReserve && (
              <button
                type="button"
                onClick={onOpenReserve}
                className="mt-2 w-full py-2 text-[14px] font-medium text-[#9A7B4F]"
              >
                Activer la Réserve séjour
              </button>
            )}
          </StickyFooter>
        )}
      </MobileScreen>
    )
  }

  if (view === 'list' && activeCategory) {
    return (
      <MobileScreen>
        <MobileHeader
          title={serviceCategoryLabel(activeCategory)}
          onBack={() => { setView('home'); setSearch('') }}
        />
        <MobileSearch value={search} onChange={setSearch} placeholder="Rechercher une prestation" />
        {listItems.length === 0 ? (
          <p className={`py-8 text-center ${guestMobile.subtitle}`}>Aucune prestation disponible.</p>
        ) : (
          listItems.map(item => {
            const offer = resolveServiceOffer(item.service, item.assignment)
            return (
              <CatalogListRow
                key={item.service.id}
                title={offer.displayName}
                subtitle={offer.providerLabel ?? offer.pricing.displayLabel}
                price={offer.pricing.displayLabel}
                imageUrl={item.service.image_url}
                gradientClass="from-[#E8DFD4] to-[#B8956B]"
                onClick={() => { setActiveItem(item); setView('detail') }}
              />
            )
          })
        )}
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <MobileHeader title="Conciergerie" />

      {!reserve && !readOnly && (
        <div className="mb-4 rounded-2xl border border-[#F5E6C8] bg-[#FFF9EE] px-4 py-3">
          <p className="text-[14px] font-medium text-[#856404]">
            Activez votre Réserve séjour pour commander une prestation.
          </p>
          {onOpenReserve && (
            <button
              type="button"
              onClick={onOpenReserve}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#9A7B4F]"
            >
              <Wallet className="h-4 w-4" />
              Activer la Réserve
            </button>
          )}
        </div>
      )}

      <p className={`mb-5 ${guestMobile.body}`}>
        Chef, transport, bien-être et expériences — votre équipe coordonne chaque prestation sur mesure.
      </p>

      {pendingApproval.length > 0 && onOpenRequests && (
        <MenuCardRow
          icon={Wallet}
          title={`${pendingApproval.length} devis à valider`}
          subtitle="Prestations en attente de votre confirmation"
          onClick={onOpenRequests}
        />
      )}

      <MobileSearch value={search} onChange={setSearch} placeholder="Rechercher une prestation" />

      <div className="divide-y divide-[#E5E5EA]">
        {filteredGroups.map(([category, items]) => {
          const Icon = categoryIcons[category] ?? ConciergeBell
          return (
            <button
              key={category}
              type="button"
              onClick={() => { setActiveCategory(category); setSearch(''); setView('list') }}
              className="flex w-full items-center gap-4 py-4 text-left active:bg-[#FAFAFA]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5EDE3]">
                <Icon className="h-5 w-5 text-[#9A7B4F]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1A1614]">{serviceCategoryLabel(category)}</p>
                <p className={guestMobile.subtitle}>
                  {items.length} prestation{items.length > 1 ? 's' : ''}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {propertyServices.length === 0 && (
        <p className={`py-12 text-center ${guestMobile.subtitle}`}>
          Aucune prestation disponible pour le moment.
        </p>
      )}

      <div className="mt-4 space-y-2">
        <MenuCardRow
          icon={ConciergeBell}
          title="Demande sur mesure"
          subtitle="Une envie particulière ? Décrivez-la à votre équipe."
          onClick={openFreeRequest}
        />
        {onOpenRequests && (
          <MenuCardRow
            icon={ClipboardList}
            title="Suivi des prestations"
            subtitle="Historique et devis en cours"
            onClick={onOpenRequests}
          />
        )}
      </div>
    </MobileScreen>
  )
}
