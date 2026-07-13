import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Compass,
  Gem,
  Home,
  Minus,
  PartyPopper,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  Car,
  ShoppingBasket,
} from 'lucide-react'
import {
  CatalogListRow,
  CategoryListRow,
  FeatureBullet,
  GoldButton,
  ItemThumbnail,
  MenuCardRow,
  MobileHeader,
  MobileScreen,
  MobileSearch,
  ReserveBalanceBar,
  StickyFooter,
} from '@/components/guest/boutiqueMobileUi'
import { boutiqueMobile, itemPlaceholderGradient } from '@/components/guest/boutiqueMobileStyles'
import {
  cartEstimatedTotal,
  filterBoutiqueCatalogEntries,
  filterBoutiqueCategories,
  formatCatalogPrice,
  type BoutiqueCartLine,
  type BoutiqueCatalogEntry,
  type CatalogCategory,
  type StoreOrderItem,
} from '@/lib/boutique'
import { formatReserveAmount, type StayReserve } from '@/lib/stayReserve'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  clearBoutiqueCart,
  loadBoutiqueCart,
  pruneBoutiqueCart,
  saveBoutiqueCart,
} from '@/lib/boutiqueCartStorage'

type BoutiqueView =
  | 'home'
  | 'category'
  | 'item'
  | 'configure'
  | 'summary'
  | 'cart'
  | 'confirm'

const categoryIcons: Record<string, typeof ShoppingBag> = {
  'groceries-arrival': ShoppingBasket,
  'chef-dining': Utensils,
  transport: Car,
  wellness: Sparkles,
  experiences: Compass,
  'home-comfort': Home,
  events: PartyPopper,
  'premium-shopping': Gem,
}

const categoryFeatures: Record<string, string[]> = {
  'groceries-arrival': ['Livraison à la villa', 'Produits frais sélectionnés', 'Préparation avant votre arrivée'],
  'chef-dining': ['Cuisine sur-mesure', 'Produits frais et locaux', 'Service discret et attentif'],
  transport: ['Chauffeurs professionnels', 'Véhicules premium', 'Suivi en temps réel'],
  wellness: ['Prestataires certifiés', 'Intervention à domicile', 'Discrétion garantie'],
  experiences: ['Sélection locale premium', 'Réservation simplifiée', 'Accompagnement dédié'],
  'home-comfort': ['Équipe villa réactive', 'Intervention rapide', 'Qualité garantie'],
  events: ['Organisation sur-mesure', 'Coordination complète', 'Expérience mémorable'],
  'premium-shopping': ['Sélection personnalisée', 'Livraison villa', 'Produits d\'exception'],
}

function formatScheduledLabel(date: string | undefined | null, dateFormat?: string | null): string {
  if (!date) return ''
  return formatDateForDisplay(date, dateFormat)
}

interface BoutiqueGuestPanelProps {
  categories: CatalogCategory[]
  catalog: BoutiqueCatalogEntry[]
  orderItems?: StoreOrderItem[]
  reserve: StayReserve | null
  welcomeText?: string | null
  dateFormat?: string | null
  readOnly?: boolean
  loading?: boolean
  cartStorageKey?: string
  onCheckout?: (
    lines: BoutiqueCartLine[],
    paymentMethod: 'stay_reserve' | 'card',
    notes?: string,
  ) => Promise<void>
  onTopUpReserve?: () => void
  onOpenRequests?: () => void
}

export function BoutiqueGuestPanel({
  categories,
  catalog,
  orderItems = [],
  reserve,
  welcomeText,
  dateFormat,
  readOnly = false,
  loading = false,
  cartStorageKey,
  onCheckout,
  onTopUpReserve,
  onOpenRequests,
}: BoutiqueGuestPanelProps) {
  const productCatalog = useMemo(() => filterBoutiqueCatalogEntries(catalog), [catalog])
  const productCategories = useMemo(
    () => filterBoutiqueCategories(categories, catalog),
    [categories, catalog],
  )
  const [view, setView] = useState<BoutiqueView>('home')
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | null>(null)
  const [activeEntry, setActiveEntry] = useState<BoutiqueCatalogEntry | null>(null)
  const [cart, setCart] = useState<BoutiqueCartLine[]>([])
  const [search, setSearch] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('19:30')
  const [clientNotes, setClientNotes] = useState('')
  const [lastOrderTotal, setLastOrderTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cartHydrated, setCartHydrated] = useState(!cartStorageKey)

  const validItemIds = useMemo(
    () => new Set(productCatalog.map(e => e.item.id)),
    [productCatalog],
  )

  useEffect(() => {
    if (!cartStorageKey || readOnly) {
      setCartHydrated(true)
      return
    }
    if (loading) return
    const stored = loadBoutiqueCart(cartStorageKey)
    const pruned = pruneBoutiqueCart(stored, validItemIds)
    setCart(pruned)
    if (pruned.length !== stored.length) {
      saveBoutiqueCart(cartStorageKey, pruned)
    }
    setCartHydrated(true)
  }, [cartStorageKey, readOnly, loading, validItemIds])

  useEffect(() => {
    if (!cartStorageKey || !cartHydrated || readOnly) return
    saveBoutiqueCart(cartStorageKey, cart)
  }, [cart, cartStorageKey, cartHydrated, readOnly])

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

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0)
  const { total: cartTotal, hasQuote: cartHasQuote } = cartEstimatedTotal(cart, productCatalog)

  const pendingQuotes = useMemo(
    () => orderItems.filter(i => i.status === 'waiting_client_approval'),
    [orderItems],
  )

  const resetItemForm = () => {
    setQuantity(1)
    setScheduledDate('')
    setScheduledTime('19:30')
    setClientNotes('')
  }

  const openItem = (entry: BoutiqueCatalogEntry, category: CatalogCategory | null) => {
    setActiveEntry(entry)
    setActiveCategory(category)
    resetItemForm()
    setView('item')
  }

  const addToCart = (entry: BoutiqueCatalogEntry, qty = quantity) => {
    const notes = [clientNotes, scheduledTime && scheduledDate ? `Heure: ${scheduledTime}` : '']
      .filter(Boolean)
      .join('\n')
    setCart(current => {
      const existing = current.find(l => l.catalogItemId === entry.item.id)
      if (existing) {
        return current.map(l => l.catalogItemId === entry.item.id
          ? {
            ...l,
            quantity: l.quantity + qty,
            scheduledDate: scheduledDate || l.scheduledDate,
            clientNotes: notes || l.clientNotes,
          }
          : l)
      }
      return [...current, {
        catalogItemId: entry.item.id,
        quantity: qty,
        scheduledDate: scheduledDate || undefined,
        clientNotes: notes || undefined,
      }]
    })
    resetItemForm()
  }

  const setLineQuantity = (catalogItemId: string, qty: number) => {
    setCart(current => {
      if (qty <= 0) return current.filter(l => l.catalogItemId !== catalogItemId)
      return current.map(l => (l.catalogItemId === catalogItemId ? { ...l, quantity: qty } : l))
    })
  }

  const removeLine = (catalogItemId: string) => {
    setCart(current => current.filter(l => l.catalogItemId !== catalogItemId))
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

  const cartBadge = cartCount > 0 && view !== 'cart' ? (
    <button
      type="button"
      onClick={() => setView('cart')}
      className="relative rounded-full p-2 active:bg-[#F2F2F7]"
      aria-label="Panier"
    >
      <ShoppingBag className="h-5 w-5" />
      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C9AD7F] text-[10px] font-bold text-[#1A1614]">
        {cartCount}
      </span>
    </button>
  ) : null

  if (loading) {
    return (
      <MobileScreen className="flex min-h-[320px] items-center justify-center">
        <p className={boutiqueMobile.subtitle}>Chargement de la Boutique…</p>
      </MobileScreen>
    )
  }

  // ── Confirmation ──
  if (view === 'confirm') {
    return (
      <MobileScreen className="flex min-h-[420px] flex-col items-center px-2 pt-8 text-center">
        <MobileHeader title="Confirmation commande" />
        <CheckCircle2 className="mt-6 h-16 w-16 text-[#34C759]" strokeWidth={1.5} />
        <p className="mt-6 text-[20px] font-bold text-[#1A1614]">Votre commande a été reçue !</p>
        <p className={`mt-2 max-w-[280px] ${boutiqueMobile.body}`}>
          Merci, notre équipe va la traiter dans les plus brefs délais.
        </p>
        {lastOrderTotal > 0 && (
          <div className={`mt-8 flex w-full max-w-xs items-center justify-between border-y border-[#E5E5EA] py-4`}>
            <span className={boutiqueMobile.subtitle}>Total</span>
            <span className="text-[22px] font-bold">{formatReserveAmount(lastOrderTotal)}</span>
          </div>
        )}
        <div className="mt-auto w-full pt-8">
          <GoldButton onClick={() => { setView('home'); onOpenRequests?.() }}>Voir mes commandes</GoldButton>
        </div>
      </MobileScreen>
    )
  }

  // ── Panier ──
  if (view === 'cart') {
    return (
      <MobileScreen>
        <MobileHeader
          title="Mon panier"
          subtitle={cartCount > 0 ? `${cartCount} article${cartCount > 1 ? 's' : ''}` : undefined}
          onBack={() => setView('home')}
        />

        {cart.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#C7C7CC]" />
            <p className={`mt-3 ${boutiqueMobile.subtitle}`}>Votre panier est vide.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#E5E5EA]">
              {cart.map(line => {
                const entry = productCatalog.find(e => e.item.id === line.catalogItemId)
                if (!entry) return null
                const lineTotal = entry.item.requires_quote
                  ? null
                  : (entry.assignment.custom_price ?? entry.item.base_price ?? 0) * line.quantity
                const maxQty = entry.item.max_quantity || 99
                return (
                  <div key={line.catalogItemId} className="flex gap-3 py-4">
                    <ItemThumbnail
                      imageUrl={entry.item.images[0]}
                      gradientClass={itemPlaceholderGradient(entry.category.slug)}
                      alt={entry.item.title}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1A1614]">{entry.item.title}</p>
                      {line.scheduledDate && (
                        <p className={`mt-0.5 ${boutiqueMobile.subtitle}`}>
                          {formatScheduledLabel(line.scheduledDate, dateFormat)}
                          {line.clientNotes?.includes('Heure:') ? ` — ${line.clientNotes.match(/Heure: (\d{2}:\d{2})/)?.[1] ?? ''}` : ''}
                        </p>
                      )}
                      {readOnly ? (
                        line.quantity > 1 && <p className={boutiqueMobile.subtitle}>{line.quantity} ×</p>
                      ) : (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center gap-3 rounded-full border border-[#E5E5EA] px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setLineQuantity(line.catalogItemId, line.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center text-[#5C534C] active:opacity-60"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-4 text-center text-sm font-semibold">{line.quantity}</span>
                            <button
                              type="button"
                              disabled={line.quantity >= maxQty}
                              onClick={() => setLineQuantity(line.catalogItemId, line.quantity + 1)}
                              className="flex h-6 w-6 items-center justify-center text-[#5C534C] active:opacity-60 disabled:opacity-30"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.catalogItemId)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93] active:bg-[#F2F2F7]"
                            aria-label="Retirer du panier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold text-[#1A1614]">
                      {lineTotal != null ? formatReserveAmount(lineTotal) : 'Sur devis'}
                    </p>
                  </div>
                )
              })}
            </div>

            {reserve && (
              <ReserveBalanceBar
                label="Solde Réserve séjour disponible"
                amount={formatReserveAmount(reserve.current_balance, reserve.currency)}
              />
            )}

            {cartHasQuote && (
              <p className={`mb-3 text-center text-[13px] ${boutiqueMobile.subtitle}`}>
                Certains articles nécessitent un devis. Les articles à prix fixe seront débités immédiatement.
              </p>
            )}

            <StickyFooter>
              {cartTotal > 0 && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[15px] text-[#8E8E93]">Total estimé</span>
                  <span className="text-[22px] font-bold">{formatReserveAmount(cartTotal)}</span>
                </div>
              )}
              {!readOnly && onCheckout && (
                <GoldButton
                  disabled={busy || (!reserve && cartTotal > 0)}
                  onClick={() => run(async () => {
                    await onCheckout(cart, 'stay_reserve')
                    setLastOrderTotal(cartTotal)
                    setCart([])
                    if (cartStorageKey) clearBoutiqueCart(cartStorageKey)
                    setView('confirm')
                  })}
                >
                  {cartTotal > 0 ? 'Commander' : 'Envoyer la demande'}
                </GoldButton>
              )}
              {!reserve && cartTotal > 0 && !readOnly && onTopUpReserve && (
                <button
                  type="button"
                  onClick={onTopUpReserve}
                  className={`mt-2 w-full py-2 text-[14px] font-medium text-[#9A7B4F]`}
                >
                  Ajouter des fonds à ma Réserve séjour
                </button>
              )}
            </StickyFooter>
          </>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </MobileScreen>
    )
  }

  // ── Récapitulatif ──
  if (view === 'summary' && activeEntry) {
    const isQuote = activeEntry.item.requires_quote
    const price = formatCatalogPrice(activeEntry.item, activeEntry.assignment)
    return (
      <MobileScreen className="flex min-h-[480px] flex-col">
        <MobileHeader title="Récapitulatif" step="Étape 3/3" onBack={() => setView('configure')} />

        <div className="space-y-3 py-2">
          <p className="text-[17px] font-semibold">{activeEntry.item.title}</p>
          {scheduledDate && (
            <p className={boutiqueMobile.body}>
              {formatScheduledLabel(scheduledDate, dateFormat)} à {scheduledTime}
            </p>
          )}
          {quantity > 1 && (
            <p className={boutiqueMobile.body}>
              {activeEntry.item.type === 'product' ? `Quantité : ${quantity}` : `${quantity} personnes`}
            </p>
          )}
          {clientNotes && <p className={boutiqueMobile.body}>{clientNotes}</p>}
        </div>

        {!isQuote && (
          <div className={`mt-4 flex items-center justify-between border-y border-[#E5E5EA] py-4`}>
            <span className={boutiqueMobile.subtitle}>Total estimé</span>
            <span className="text-[22px] font-bold">{price}</span>
          </div>
        )}

        <p className={`mt-4 text-center text-[13px] ${boutiqueMobile.subtitle}`}>
          {isQuote
            ? 'Une confirmation vous sera envoyée sous 24h.'
            : 'Votre commande sera débitée de votre Réserve séjour.'}
        </p>

        <StickyFooter>
          {!readOnly && (
            <GoldButton
              onClick={() => {
                addToCart(activeEntry, quantity)
                if (isQuote) {
                  setView('cart')
                } else {
                  setView('cart')
                }
              }}
            >
              {isQuote ? 'Confirmer la demande' : 'Ajouter au panier'}
            </GoldButton>
          )}
        </StickyFooter>
      </MobileScreen>
    )
  }

  // ── Configuration (formulaire) ──
  if (view === 'configure' && activeEntry) {
    const isProduct = activeEntry.item.type === 'product'
    return (
      <MobileScreen className="flex min-h-[480px] flex-col">
        <MobileHeader
          title={isProduct ? 'Commande' : 'Commande de service'}
          step="Étape 1/3"
          onBack={() => setView('item')}
        />

        <p className="mb-4 text-[17px] font-semibold">{activeEntry.item.title}</p>

        {!isProduct && (
          <>
            <label htmlFor="boutique-date" className={`block cursor-pointer py-4 ${boutiqueMobile.divider}`}>
              <p className={boutiqueMobile.label}>Date</p>
              <p className={`mt-1 ${boutiqueMobile.value}`}>
                {scheduledDate ? formatScheduledLabel(scheduledDate, dateFormat) : 'Choisir une date'}
              </p>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="sr-only"
                id="boutique-date"
              />
            </label>
            <label className="block" htmlFor="boutique-time">
              <span className={`block py-4 ${boutiqueMobile.divider}`}>
                <span className={boutiqueMobile.label}>Heure</span>
                <input
                  id="boutique-time"
                  type="time"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className={`mt-1 block w-full bg-transparent ${boutiqueMobile.value}`}
                />
              </span>
            </label>
          </>
        )}

        {isProduct && (
          <div className={`flex items-center justify-between py-4 ${boutiqueMobile.divider}`}>
            <span className={boutiqueMobile.label}>Quantité</span>
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
        )}

        <label className={`block py-4 ${boutiqueMobile.divider}`}>
          <span className={boutiqueMobile.label}>Demandes spéciales</span>
          <textarea
            rows={2}
            value={clientNotes}
            onChange={e => setClientNotes(e.target.value)}
            placeholder="Anniversaire, allergies…"
            className={`mt-2 w-full resize-none bg-transparent ${boutiqueMobile.value} placeholder:text-[#C7C7CC]`}
          />
        </label>

        <StickyFooter>
          <GoldButton onClick={() => setView('summary')}>Continuer</GoldButton>
        </StickyFooter>
      </MobileScreen>
    )
  }

  // ── Demande spéciale → déplacée vers Conciergerie ──

  // ── Fiche article ──
  if (view === 'item' && activeEntry) {
    const gradient = itemPlaceholderGradient(activeEntry.category.slug)
    const price = formatCatalogPrice(activeEntry.item, activeEntry.assignment)
    const isQuote = activeEntry.item.requires_quote

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
          <p className="text-[17px] font-bold">{price}{!isQuote && activeEntry.item.price_type === 'fixed_price' ? '' : ''}</p>
          {activeEntry.item.provider_name && (
            <p className={boutiqueMobile.subtitle}>Par {activeEntry.item.provider_name}</p>
          )}

          <ul className="mt-2">
            {(categoryFeatures[activeEntry.category.slug] ?? categoryFeatures['chef-dining']).map(f => (
              <FeatureBullet key={f}>{f}</FeatureBullet>
            ))}
          </ul>

          <p className={`pt-2 text-[13px] ${boutiqueMobile.subtitle}`}>
            Les articles à prix fixe sont débités immédiatement de votre Réserve séjour. Les articles sur devis seront confirmés avant paiement.
          </p>
        </div>

        {!readOnly && (
          <StickyFooter>
            <GoldButton onClick={() => setView('configure')}>
              {isQuote ? 'Demander un devis' : 'Ajouter au panier'}
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
        <MobileHeader title={activeCategory.name} onBack={() => { setView('home'); setSearch('') }} right={cartBadge} />
        <MobileSearch value={search} onChange={setSearch} />
        {categoryItems.length === 0 ? (
          <p className={`py-8 text-center ${boutiqueMobile.subtitle}`}>Aucun article dans cette catégorie.</p>
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
      <MobileHeader title="Boutique" right={cartBadge} />

      {reserve && (
        <ReserveBalanceBar
          label="Solde Réserve séjour disponible"
          amount={formatReserveAmount(reserve.current_balance, reserve.currency)}
        />
      )}

      <p className={`mb-5 ${boutiqueMobile.body}`}>
        {welcomeText ?? 'Commandez produits et packs pour votre villa — livraison et préparation avant votre arrivée.'}
      </p>

      {pendingQuotes.length > 0 && (
        <MenuCardRow
          icon={ClipboardList}
          title={`${pendingQuotes.length} devis à valider`}
          subtitle="Consultez et confirmez vos commandes"
          onClick={() => onOpenRequests?.()}
        />
      )}

      <MobileSearch value={search} onChange={setSearch} placeholder="Rechercher un article" />

      <div className="divide-y divide-[#E5E5EA]">
        {filteredCategories.map(cat => {
          const Icon = categoryIcons[cat.slug] ?? ShoppingBag
          const count = productCatalog.filter(e => e.category.id === cat.id).length
          return (
            <CategoryListRow
              key={cat.id}
              icon={Icon}
              title={cat.name}
              subtitle={cat.description ?? `${count} article${count > 1 ? 's' : ''}`}
              onClick={() => { setActiveCategory(cat); setSearch(''); setView('category') }}
            />
          )
        })}
      </div>

      {productCategories.length === 0 && (
        <p className={`py-12 text-center ${boutiqueMobile.subtitle}`}>
          Aucun article disponible pour le moment.
        </p>
      )}

      {featured.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Recommandés pour vous
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
          title="Suivi des commandes"
          subtitle="Historique et devis en cours"
          onClick={onOpenRequests}
        />
      )}
    </MobileScreen>
  )
}
