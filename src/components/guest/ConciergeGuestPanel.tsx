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
  areServiceOptionsComplete,
  buildStayServiceRequestDraft,
  canDirectBookService,
  computeDirectServiceAmount,
  computeServiceAmount,
  defaultSelectedServiceOptions,
  formatServicePrice,
  getServiceDescriptionContent,
  resolveServiceOffer,
  resolveServiceOptions,
  resolveServicePricing,
  serviceCategoryLabel,
  type PropertyServiceItem,
  type ServiceOptionGroup,
  type ServiceSelectedOptions,
} from '@/lib/propertyServices'
import {
  stayServiceCategories,
  type StayServiceRequest,
  type StayServiceRequestDraft,
  type StayReserve,
} from '@/lib/stayReserve'

type ConciergeView = 'home' | 'list' | 'detail' | 'request' | 'direct' | 'confirm'

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
  onBookDirect?: (input: {
    propertyServiceId: string
    quantity?: number
    requestedDate?: string
    clientNotes?: string
    selectedOptions?: ServiceSelectedOptions
  }) => Promise<void>
  onOpenRequests?: () => void
  onOpenReserve?: () => void
}

function ServiceOptionPickers({
  groups,
  selected,
  onChange,
}: {
  groups: ServiceOptionGroup[]
  selected: ServiceSelectedOptions
  onChange: (next: ServiceSelectedOptions) => void
}) {
  if (groups.length === 0) return null
  return (
    <div className="mt-4 space-y-4">
      {groups.map(group => (
        <div key={group.id}>
          <label className={`mb-2 block text-[13px] font-medium ${guestMobile.subtitle}`}>
            {group.label}
            {group.required ? '' : ' (optionnel)'}
          </label>
          <div className="space-y-2">
            {group.choices.map(choice => {
              const active = selected[group.id] === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChange({ ...selected, [group.id]: choice.id })}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-[#9A7B4F] bg-[#F7F1E8]'
                      : 'border-[#E5E5EA] bg-[#FAFAFA]'
                  }`}
                >
                  <span className="text-[15px] font-medium">{choice.label}</span>
                  <span className="text-[14px] font-semibold text-[#9A7B4F]">
                    {formatServicePrice(choice.price)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ConciergeGuestPanel({
  propertyServices,
  reserve,
  serviceRequests = [],
  readOnly = false,
  serviceRequestDraft,
  onDraftConsumed,
  onCreateRequest,
  onBookDirect,
  onOpenRequests,
  onOpenReserve,
}: ConciergeGuestPanelProps) {
  const [view, setView] = useState<ConciergeView>('home')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<PropertyServiceItem | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmMode, setConfirmMode] = useState<'quote' | 'direct'>('quote')
  const [directForm, setDirectForm] = useState({
    quantity: '1',
    requestedDate: '',
    notes: '',
  })
  const [selectedOptions, setSelectedOptions] = useState<ServiceSelectedOptions>({})
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

  const openItemDetail = (item: PropertyServiceItem) => {
    const groups = resolveServiceOptions(item.service, item.assignment)
    setActiveItem(item)
    setSelectedOptions(defaultSelectedServiceOptions(groups))
    setError('')
    setView('detail')
  }

  const openFreeRequest = () => {
    setActiveItem(null)
    setSelectedOptions({})
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
    const draft = buildStayServiceRequestDraft(item, selectedOptions)
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
    setConfirmMode('quote')
    setView('request')
  }

  const openDirectPurchase = (item: PropertyServiceItem) => {
    setActiveItem(item)
    setDirectForm({ quantity: '1', requestedDate: '', notes: '' })
    setError('')
    setConfirmMode('direct')
    setView('direct')
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
        <MobileHeader title={confirmMode === 'direct' ? 'Commande confirmée' : 'Demande envoyée'} />
        <ConciergeBell className="mt-8 h-14 w-14 text-[#C9AD7F]" strokeWidth={1.5} />
        <p className="mt-6 text-[20px] font-bold">
          {confirmMode === 'direct' ? 'Prestation réservée' : 'Votre demande a été transmise'}
        </p>
        <p className={`mt-2 max-w-[280px] ${guestMobile.body}`}>
          {confirmMode === 'direct'
            ? 'Le montant a été prélevé sur votre Réserve séjour. Votre équipe assure la coordination.'
            : 'Votre équipe reviendra vers vous avec un devis ou une confirmation.'}
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

  if (view === 'direct' && activeItem) {
    const offer = resolveServiceOffer(activeItem.service, activeItem.assignment)
    const pricing = resolveServicePricing(activeItem.service, activeItem.assignment)
    const optionGroups = resolveServiceOptions(activeItem.service, activeItem.assignment)
    const quantity = Math.max(1, Number(directForm.quantity) || 1)
    const total = computeDirectServiceAmount(
      activeItem.service,
      activeItem.assignment,
      quantity,
      selectedOptions,
    )
    const optionsReady = areServiceOptionsComplete(optionGroups, selectedOptions)
    const canSubmit = Boolean(
      reserve
      && onBookDirect
      && activeItem.assignment?.id
      && optionsReady
      && total != null
      && total > 0
      && Number(reserve.current_balance) >= total,
    )

    return (
      <MobileScreen className="flex min-h-[520px] flex-col pb-24">
        <MobileHeader title="Commander" onBack={() => setView('detail')} />
        <p className="text-[22px] font-bold">{offer.displayName}</p>
        <p className="mt-1 text-[17px] font-semibold text-[#9A7B4F]">{offer.pricing.displayLabel}</p>

        <ServiceOptionPickers
          groups={optionGroups}
          selected={selectedOptions}
          onChange={setSelectedOptions}
        />

        {pricing.mode === 'per_person' && (
          <div className="mt-6">
            <label className={`mb-2 block text-[13px] font-medium ${guestMobile.subtitle}`}>
              Nombre de personnes
            </label>
            <input
              type="number"
              min={1}
              value={directForm.quantity}
              onChange={e => setDirectForm(f => ({ ...f, quantity: e.target.value }))}
              className="w-full border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none"
            />
          </div>
        )}

        <div className="mt-4">
          <label className={`mb-2 block text-[13px] font-medium ${guestMobile.subtitle}`}>
            Date souhaitée (optionnel)
          </label>
          <input
            type="date"
            value={directForm.requestedDate}
            onChange={e => setDirectForm(f => ({ ...f, requestedDate: e.target.value }))}
            className="w-full border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none"
          />
        </div>

        <div className="mt-4">
          <label className={`mb-2 block text-[13px] font-medium ${guestMobile.subtitle}`}>
            Précisions (optionnel)
          </label>
          <textarea
            rows={3}
            value={directForm.notes}
            onChange={e => setDirectForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Horaires, allergies, préférences…"
            className="w-full resize-none border-b border-[#E5E5EA] bg-transparent py-3 text-[16px] outline-none placeholder:text-[#C7C7CC]"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[#FAFAFA] px-4 py-3">
          <p className="text-[13px] text-[#8E8E93]">Total à prélever sur la Réserve</p>
          <p className="mt-1 text-[22px] font-bold text-[#9A7B4F]">
            {total != null ? formatServicePrice(total) : '—'}
          </p>
          {reserve && (
            <p className={`mt-1 text-[13px] ${guestMobile.subtitle}`}>
              Solde disponible : {formatServicePrice(Number(reserve.current_balance))}
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <StickyFooter>
          {!reserve && (
            <p className="mb-3 text-center text-[13px] text-[#856404]">
              Activez votre Réserve séjour pour commander.
            </p>
          )}
          {reserve && total != null && Number(reserve.current_balance) < total && (
            <p className="mb-3 text-center text-[13px] text-[#856404]">
              Solde insuffisant. Rechargez votre Réserve séjour.
            </p>
          )}
          <GoldButton
            disabled={busy || !canSubmit}
            onClick={() => run(async () => {
              if (!activeItem.assignment?.id || !onBookDirect) return
              await onBookDirect({
                propertyServiceId: activeItem.assignment.id,
                quantity,
                requestedDate: directForm.requestedDate || undefined,
                clientNotes: directForm.notes || undefined,
                selectedOptions,
              })
              setView('confirm')
            })}
          >
            Confirmer l’achat
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
      </MobileScreen>
    )
  }

  if (view === 'request') {
    const optionGroups = activeItem
      ? resolveServiceOptions(activeItem.service, activeItem.assignment)
      : []
    const optionsReady = !activeItem || areServiceOptionsComplete(optionGroups, selectedOptions)

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

        {activeItem && (
          <ServiceOptionPickers
            groups={optionGroups}
            selected={selectedOptions}
            onChange={next => {
              setSelectedOptions(next)
              const draft = buildStayServiceRequestDraft(activeItem, next)
              setRequestForm(f => ({
                ...f,
                description: draft.description,
                estimatedAmount: draft.estimatedAmount != null ? String(draft.estimatedAmount) : f.estimatedAmount,
              }))
            }}
          />
        )}

        <select
          value={requestForm.category}
          onChange={e => setRequestForm(f => ({ ...f, category: e.target.value }))}
          className="mb-3 mt-4 w-full rounded-2xl border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3 text-[15px]"
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
              disabled={busy || !requestForm.title.trim() || !reserve || !optionsReady}
              onClick={() => run(async () => {
                // La description est déjà synchronisée avec les options choisies
                // (buildStayServiceRequestDraft) — ne pas les ré-ajouter.
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
    const direct = canDirectBookService(activeItem.service, activeItem.assignment)
    const optionGroups = resolveServiceOptions(activeItem.service, activeItem.assignment)
    const selectedTotal = computeServiceAmount(
      activeItem.service,
      activeItem.assignment,
      1,
      selectedOptions,
    )
    const optionsReady = areServiceOptionsComplete(optionGroups, selectedOptions)

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
        <p className="mt-2 text-[17px] font-semibold text-[#9A7B4F]">
          {selectedTotal != null ? formatServicePrice(selectedTotal) : offer.pricing.displayLabel}
        </p>

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

        <ServiceOptionPickers
          groups={optionGroups}
          selected={selectedOptions}
          onChange={setSelectedOptions}
        />

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
          {direct
            ? 'Achat immédiat : le montant sera prélevé sur votre Réserve séjour dès confirmation.'
            : 'Un devis vous sera proposé avant tout débit de votre Réserve séjour.'}
        </p>

        {!readOnly && (
          <StickyFooter>
            {!reserve && (
              <p className="mb-3 text-center text-[13px] text-[#856404]">
                Activez votre Réserve séjour pour {direct ? 'commander' : 'envoyer une demande'}.
              </p>
            )}
            <GoldButton
              onClick={() => (direct ? openDirectPurchase(activeItem) : openServiceRequest(activeItem))}
              disabled={!reserve || !optionsReady || (direct ? !onBookDirect : !onCreateRequest)}
            >
              {direct ? 'Commander cette prestation' : 'Demander cette prestation'}
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
                onClick={() => openItemDetail(item)}
              />
            )
          })
        )}
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <MobileHeader title="Services" />

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

      {pendingApproval.length > 0 && onOpenRequests && (
        <MenuCardRow
          icon={Wallet}
          title={`${pendingApproval.length} devis à valider`}
          subtitle="Prestations en attente de votre confirmation"
          onClick={onOpenRequests}
        />
      )}

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {grouped.map(([category]) => {
          const Icon = categoryIcons[category] ?? ConciergeBell
          return (
            <button
              key={category}
              type="button"
              onClick={() => { setActiveCategory(category); setSearch(''); setView('list') }}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#D8CFC2] bg-white px-3 text-[11px] font-medium text-[#071A2F] active:bg-[#EEE7DB]"
            >
              <Icon className="h-3.5 w-3.5 text-[#A8844F]" strokeWidth={1.6} />
              {serviceCategoryLabel(category)}
            </button>
          )
        })}
      </div>

      <MobileSearch value={search} onChange={setSearch} placeholder="Rechercher une prestation" />

      <div className="space-y-4">
        {filteredGroups.flatMap(([, items]) => items).map((item, index) => {
          const offer = resolveServiceOffer(item.service, item.assignment)
          return (
            <article
              key={item.service.id}
              className="overflow-hidden rounded-2xl border border-[#E0D8CD] bg-white"
            >
              {item.service.image_url ? (
                <img
                  src={item.service.image_url}
                  alt=""
                  loading={index > 1 ? 'lazy' : 'eager'}
                  className="aspect-[16/8] w-full object-cover"
                />
              ) : (
                <div className="aspect-[16/8] w-full bg-[#D9C9B2]" aria-hidden />
              )}
              <div className="p-3.5">
                <p className="text-[15px] font-semibold text-[#071A2F]">{offer.displayName}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#7B746C]">
                  {item.service.description || 'Une prestation coordonnée avec soin par votre équipe.'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-[#A8844F]">
                    {offer.pricing.displayLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => openItemDetail(item)}
                    className="min-h-9 rounded-lg bg-[#071A2F] px-4 text-[11px] font-semibold text-white active:opacity-80"
                  >
                    Découvrir
                  </button>
                </div>
              </div>
            </article>
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
