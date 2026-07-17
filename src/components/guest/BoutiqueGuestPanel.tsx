import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Gem,
  Home,
  ShoppingBag,
  ShoppingBasket,
} from 'lucide-react'
import {
  CatalogListRow,
  CategoryListRow,
  FeatureBullet,
  GoldButton,
  MenuCardRow,
  MobileHeader,
  MobileScreen,
  MobileSearch,
  ReserveBalanceBar,
  StickyFooter,
} from '@/components/guest/boutiqueMobileUi'
import { boutiqueMobile, itemPlaceholderGradient } from '@/components/guest/boutiqueMobileStyles'
import {
  filterBoutiqueCatalogEntries,
  filterBoutiqueCategories,
  formatCatalogPrice,
  type BoutiqueCartLine,
  type BoutiqueCatalogEntry,
  type CatalogCategory,
} from '@/lib/boutique'
import { formatReserveAmount, type StayReserve } from '@/lib/stayReserve'
import { tGuest } from '@/lib/guestLanguage'

type BoutiqueView =
  | 'home'
  | 'category'
  | 'item'
  | 'configure'
  | 'summary'
  | 'confirm'

const categoryIcons: Record<string, typeof ShoppingBag> = {
  'groceries-arrival': ShoppingBasket,
  'home-comfort': Home,
  'premium-shopping': Gem,
}

const categoryFeatures: Record<string, string[]> = {
  'groceries-arrival': ['Livraison à la villa', 'Produits frais sélectionnés', 'Préparation avant votre arrivée'],
  'home-comfort': ['Livraison à la villa', 'Sélection adaptée au séjour', 'Qualité contrôlée'],
  'premium-shopping': ['Produits d’exception', 'Livraison à la villa', 'Sélection locale premium'],
}

interface BoutiqueGuestPanelProps {
  categories: CatalogCategory[]
  catalog: BoutiqueCatalogEntry[]
  reserve: StayReserve | null
  guestLanguage?: string | null
  welcomeText?: string | null
  readOnly?: boolean
  loading?: boolean
  onCheckout?: (
    lines: BoutiqueCartLine[],
    paymentMethod: 'stay_reserve' | 'card',
    notes?: string,
  ) => Promise<void>
  onTopUpReserve?: () => void
  onOpenRequests?: () => void
  initialCatalogItemId?: string | null
  /** When true, opens the product directly on the order form instead of the detail page. */
  initialOrderMode?: boolean
  onInitialItemConsumed?: () => void
}

export function BoutiqueGuestPanel({
  categories,
  catalog,
  reserve,
  guestLanguage,
  welcomeText,
  readOnly = false,
  loading = false,
  onCheckout,
  onTopUpReserve,
  onOpenRequests,
  initialCatalogItemId,
  initialOrderMode = false,
  onInitialItemConsumed,
}: BoutiqueGuestPanelProps) {
  const t = (key: Parameters<typeof tGuest>[0]) => tGuest(key, guestLanguage)
  const productCatalog = useMemo(() => filterBoutiqueCatalogEntries(catalog), [catalog])
  const productCategories = useMemo(
    () => filterBoutiqueCategories(categories, catalog),
    [categories, catalog],
  )
  const [view, setView] = useState<BoutiqueView>('home')
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | null>(null)
  const [activeEntry, setActiveEntry] = useState<BoutiqueCatalogEntry | null>(null)
  const [search, setSearch] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [clientNotes, setClientNotes] = useState('')
  const [lastOrderTotal, setLastOrderTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!initialCatalogItemId || loading) return
    const entry = productCatalog.find(item => item.item.id === initialCatalogItemId)
    if (!entry) {
      onInitialItemConsumed?.()
      return
    }
    setActiveCategory(entry.category)
    setActiveEntry(entry)
    setQuantity(1)
    setClientNotes('')
    setView(initialOrderMode && !readOnly ? 'configure' : 'item')
    onInitialItemConsumed?.()
  }, [initialCatalogItemId, initialOrderMode, loading, onInitialItemConsumed, productCatalog, readOnly])

  const featured = useMemo(
    () => productCatalog.filter(e => e.assignment.is_featured || e.item.is_featured).slice(0, 4),
    [productCatalog],
  )

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return productCategories
    return productCategories.filter(c =>
      c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q),
    )
  }, [productCategories, search])

  const categoryItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = activeCategory
      ? productCatalog.filter(e => e.category.id === activeCategory.id)
      : []
    if (!q) return base
    return base.filter(e =>
      e.item.title.toLowerCase().includes(q)
      || (e.item.short_description ?? '').toLowerCase().includes(q),
    )
  }, [productCatalog, activeCategory, search])

  const resetItemForm = () => {
    setQuantity(1)
    setClientNotes('')
  }

  const openItem = (entry: BoutiqueCatalogEntry, category: CatalogCategory | null) => {
    setActiveEntry(entry)
    setActiveCategory(category)
    resetItemForm()
    setView('item')
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

  if (loading) {
    return (
      <MobileScreen className="flex min-h-[320px] items-center justify-center">
        <p className={boutiqueMobile.subtitle}>{t('boutique.loading')}</p>
      </MobileScreen>
    )
  }

  // ── Confirmation ──
  if (view === 'confirm') {
    return (
      <MobileScreen className="flex min-h-[420px] flex-col items-center px-2 pt-8 text-center">
        <MobileHeader title={t('boutique.confirmTitle')} />
        <CheckCircle2 className="mt-6 h-16 w-16 text-[#34C759]" strokeWidth={1.5} />
        <p className="mt-6 text-[20px] font-bold text-[#1A1614]">{t('boutique.confirmBody')}</p>
        <p className={`mt-2 max-w-[280px] ${boutiqueMobile.body}`}>
          {t('boutique.confirmSubtitle')}
        </p>
        {lastOrderTotal > 0 && (
          <div className={`mt-8 flex w-full max-w-xs items-center justify-between border-y border-[#E5E5EA] py-4`}>
            <span className={boutiqueMobile.subtitle}>{t('boutique.total')}</span>
            <span className="text-[22px] font-bold">{formatReserveAmount(lastOrderTotal)}</span>
          </div>
        )}
        <div className="mt-auto w-full pt-8">
          <GoldButton onClick={() => { setView('home'); onOpenRequests?.() }}>{t('boutique.viewOrders')}</GoldButton>
        </div>
      </MobileScreen>
    )
  }

  // ── Récapitulatif ──
  if (view === 'summary' && activeEntry) {
    const unitPrice = activeEntry.assignment.custom_price ?? activeEntry.item.base_price ?? 0
    const total = unitPrice * quantity
    return (
      <MobileScreen className="flex min-h-[480px] flex-col">
        <MobileHeader title={t('boutique.summary')} step="Étape 3/3" onBack={() => setView('configure')} />

        <div className="space-y-3 py-2">
          <p className="text-[17px] font-semibold">{activeEntry.item.title}</p>
          <p className={boutiqueMobile.body}>{t('boutique.quantity')} : {quantity}</p>
          {clientNotes && <p className={boutiqueMobile.body}>{clientNotes}</p>}
        </div>

        <div className="mt-4 flex items-center justify-between border-y border-[#E5E5EA] py-4">
          <span className={boutiqueMobile.subtitle}>{t('boutique.total')}</span>
          <span className="text-[22px] font-bold">{formatReserveAmount(total)}</span>
        </div>

        <p className={`mt-4 text-center text-[13px] ${boutiqueMobile.subtitle}`}>
          {t('boutique.debitNotice')}
        </p>

        <StickyFooter>
          {!readOnly && onCheckout && reserve && Number(reserve.current_balance) >= total && (
            <GoldButton
              disabled={busy}
              onClick={() => run(async () => {
                const line: BoutiqueCartLine = {
                  catalogItemId: activeEntry.item.id,
                  quantity,
                  clientNotes: clientNotes.trim() || undefined,
                }
                await onCheckout([line], 'stay_reserve')
                setLastOrderTotal(total)
                resetItemForm()
                setView('confirm')
              })}
            >
              {t('boutique.order')}
            </GoldButton>
          )}
          {!readOnly && (!reserve || Number(reserve.current_balance) < total) && (
            <div className="space-y-2">
              <p className="text-center text-sm text-[#8E8E93]">
                {t('boutique.insufficientBalance')}
              </p>
              {onTopUpReserve && (
                <button
                  type="button"
                  onClick={onTopUpReserve}
                  className="w-full py-2 text-[14px] font-medium text-[#9A7B4F]"
                >
                  {t('boutique.requestFunds')}
                </button>
              )}
            </div>
          )}
        </StickyFooter>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </MobileScreen>
    )
  }

  // ── Configuration (formulaire) ──
  if (view === 'configure' && activeEntry) {
    return (
      <MobileScreen className="flex min-h-[480px] flex-col">
        <MobileHeader
          title={t('boutique.order.step')}
          step="Étape 1/3"
          onBack={() => setView('item')}
        />

        <p className="mb-4 text-[17px] font-semibold">{activeEntry.item.title}</p>

        <div className={`flex items-center justify-between py-4 ${boutiqueMobile.divider}`}>
          <span className={boutiqueMobile.label}>{t('boutique.quantity')}</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-[20px]">−</button>
            <span className={boutiqueMobile.value}>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(activeEntry.item.max_quantity, q + 1))}
              className="text-[20px]"
            >
              +
            </button>
          </div>
        </div>

        <label className={`block py-4 ${boutiqueMobile.divider}`}>
          <span className={boutiqueMobile.label}>{t('boutique.deliveryInstructions')}</span>
          <textarea
            rows={2}
            value={clientNotes}
            onChange={e => setClientNotes(e.target.value)}
            placeholder="Ex. déposer dans la cuisine, emballage cadeau…"
            className={`mt-2 w-full resize-none bg-transparent ${boutiqueMobile.value} placeholder:text-[#C7C7CC]`}
          />
        </label>

        <StickyFooter>
          <GoldButton onClick={() => setView('summary')}>{t('boutique.continue')}</GoldButton>
        </StickyFooter>
      </MobileScreen>
    )
  }

  // ── Demande spéciale → déplacée vers Conciergerie ──

  // ── Fiche article ──
  if (view === 'item' && activeEntry) {
    const gradient = itemPlaceholderGradient(activeEntry.category.slug)
    const price = formatCatalogPrice(activeEntry.item, activeEntry.assignment)

    return (
      <MobileScreen className="flex min-h-[520px] flex-col pb-24">
        <MobileHeader
          backOnly
          onBack={() => setView(activeCategory ? 'category' : 'home')}
        />

        <div className="overflow-hidden rounded-2xl">
          {activeEntry.item.images[0] ? (
            <img
              src={activeEntry.item.images[0]}
              alt={activeEntry.item.title}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className={`aspect-[4/3] w-full bg-gradient-to-br ${gradient}`} />
          )}
        </div>

        <div className="mt-5 space-y-3">
          <h3 className="text-[22px] font-bold">{activeEntry.item.title}</h3>
          {activeEntry.item.short_description && (
            <p className={boutiqueMobile.body}>{activeEntry.item.short_description}</p>
          )}
          <p className="text-[17px] font-bold">{price}</p>

          <ul className="mt-2">
            {(categoryFeatures[activeEntry.category.slug] ?? [
              'Produit physique',
              'Livraison à la villa',
              'Commande par quantité',
            ]).map(f => (
              <FeatureBullet key={f}>{f}</FeatureBullet>
            ))}
          </ul>

          <p className={`pt-2 text-[13px] ${boutiqueMobile.subtitle}`}>
            {t('boutique.physicalNotice')}
          </p>
        </div>

        {!readOnly && (
          <StickyFooter>
            <GoldButton onClick={() => setView('configure')}>
              {t('boutique.order')}
            </GoldButton>
          </StickyFooter>
        )}
      </MobileScreen>
    )
  }

  // ── Liste catégorie ──
  if (view === 'category' && activeCategory) {
    return (
      <MobileScreen>
        <MobileHeader title={activeCategory.name} onBack={() => { setView('home'); setSearch('') }} />
        <MobileSearch value={search} onChange={setSearch} />
        {categoryItems.length === 0 ? (
          <p className={`py-8 text-center ${boutiqueMobile.subtitle}`}>{t('boutique.noItemsCategory')}</p>
        ) : (
          categoryItems.map(entry => (
            <CatalogListRow
              key={entry.item.id}
              title={entry.item.title}
              subtitle={entry.item.short_description}
              price={formatCatalogPrice(entry.item, entry.assignment)}
              imageUrl={entry.item.images[0]}
              gradientClass={itemPlaceholderGradient(entry.category.slug)}
              onClick={() => openItem(entry, activeCategory)}
            />
          ))
        )}
      </MobileScreen>
    )
  }

  // ── Accueil Boutique ──
  return (
    <MobileScreen>
      <MobileHeader title={t('boutique.title')} />

      {reserve && (
        <ReserveBalanceBar
          label={t('boutique.reserveAvailable')}
          amount={formatReserveAmount(reserve.current_balance, reserve.currency)}
        />
      )}

      <p className={`mb-5 ${boutiqueMobile.body}`}>
        {welcomeText ?? t('boutique.welcomeFallback')}
      </p>

      <MobileSearch value={search} onChange={setSearch} placeholder={t('boutique.search')} />

      <div className="divide-y divide-[#E5E5EA]">
        {filteredCategories.map(cat => {
          const Icon = categoryIcons[cat.slug] ?? ShoppingBag
          const count = productCatalog.filter(e => e.category.id === cat.id).length
          return (
            <CategoryListRow
              key={cat.id}
              icon={Icon}
              title={cat.name}
              subtitle={cat.description ?? `${count} ${count > 1 ? t('boutique.items') : t('boutique.item')}`}
              onClick={() => { setActiveCategory(cat); setSearch(''); setView('category') }}
            />
          )
        })}
      </div>

      {productCategories.length === 0 && (
        <p className={`py-12 text-center ${boutiqueMobile.subtitle}`}>
          {t('boutique.noItems')}
        </p>
      )}

      {featured.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            {t('boutique.recommended')}
          </p>
          {featured.map(entry => (
            <CatalogListRow
              key={entry.item.id}
              title={entry.item.title}
              subtitle={entry.item.short_description}
              price={formatCatalogPrice(entry.item, entry.assignment)}
              imageUrl={entry.item.images[0]}
              gradientClass={itemPlaceholderGradient(entry.category.slug)}
              onClick={() => openItem(entry, null)}
            />
          ))}
        </div>
      )}

      {onOpenRequests && (
        <MenuCardRow
          icon={ClipboardList}
          title={t('boutique.trackOrders')}
          subtitle={t('boutique.trackOrdersSubtitle')}
          onClick={onOpenRequests}
        />
      )}
    </MobileScreen>
  )
}
