import { ShoppingBag, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StayMessage } from '@/lib/stayMessaging'
import type {
  StayMessageProductPayload,
  StayMessageServicePayload,
} from '@/lib/stayMessageTypes'

interface StayMessageContentProps {
  message: StayMessage
  variant: 'staff' | 'guest'
  onOpenProduct?: (catalogItemId: string) => void
  onOpenService?: (propertyServiceId: string) => void
}

function cardShellClass(variant: 'staff' | 'guest', isOwn: boolean) {
  if (variant === 'guest') {
    return isOwn
      ? 'border-white/15 bg-white/10 text-white'
      : 'border-[#E5DDD2] bg-white text-[#071A2F]'
  }
  return isOwn
    ? 'border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground'
    : 'border-border bg-card text-foreground'
}

function priceToneClass(variant: 'staff' | 'guest', isOwn: boolean) {
  if (variant === 'guest') {
    return isOwn
      ? 'bg-white/15 text-[#F0D9A8]'
      : 'bg-[#F4EADF] text-[#8A6A35]'
  }
  return isOwn
    ? 'bg-primary-foreground/15 text-primary-foreground'
    : 'bg-muted text-foreground'
}

function ctaClass(variant: 'staff' | 'guest') {
  return variant === 'guest'
    ? 'bg-[#071A2F] text-white active:opacity-90'
    : 'bg-foreground text-background'
}

function OfferCard({
  variant,
  isOwn,
  kind,
  eyebrow,
  title,
  subtitle,
  priceLabel,
  body,
  ctaLabel,
  onAction,
  imageUrl,
}: {
  variant: 'staff' | 'guest'
  isOwn: boolean
  kind: 'product' | 'service'
  eyebrow: string
  title: string
  subtitle?: string | null
  priceLabel?: string | null
  body?: string | null
  ctaLabel: string
  onAction?: () => void
  imageUrl?: string | null
}) {
  const Icon = kind === 'product' ? ShoppingBag : Sparkles
  const price = priceLabel?.trim() || (kind === 'service' ? 'Sur devis' : 'Prix sur demande')

  return (
    <div className={cn('w-[248px] max-w-full overflow-hidden rounded-2xl border', cardShellClass(variant, isOwn))}>
      {imageUrl ? (
        <div className="relative h-36 bg-[#DED7CD]">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          <span
            className={cn(
              'absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums shadow-sm',
              priceToneClass(variant, isOwn),
            )}
          >
            {price}
          </span>
        </div>
      ) : (
        <div className={cn('flex items-center justify-between gap-2 px-3.5 pt-3.5')}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEE7DB]">
            <Icon className="h-4 w-4 text-[#A8844F]" strokeWidth={1.6} />
          </span>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums',
              priceToneClass(variant, isOwn),
            )}
          >
            {price}
          </span>
        </div>
      )}

      <div className="space-y-2.5 p-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60">
            {eyebrow}
          </p>
          <p className="mt-1 font-['Cormorant_Garamond',Georgia,serif] text-[20px] font-semibold leading-tight">
            {title}
          </p>
          {subtitle && (
            <p className="mt-1 text-[11px] leading-snug opacity-70">{subtitle}</p>
          )}
        </div>

        {!imageUrl && (
          <p className="text-[13px] font-semibold tabular-nums opacity-90">{price}</p>
        )}

        {body?.trim() && (
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed opacity-85">{body}</p>
        )}

        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className={cn(
              'flex min-h-10 w-full items-center justify-center rounded-xl px-3 text-[12px] font-semibold transition',
              ctaClass(variant),
            )}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function serviceCtaLabel(priceLabel?: string | null) {
  const label = priceLabel?.toLowerCase() ?? ''
  if (label.includes('devis') || label.includes('demande')) return 'Demander un devis'
  return 'Demander'
}

export function StayMessageContent({
  message,
  variant,
  onOpenProduct,
  onOpenService,
}: StayMessageContentProps) {
  const isOwn = variant === 'guest'
    ? message.sender_type === 'guest'
    : message.sender_type === 'staff'

  if (message.message_type === 'image') {
    const imageUrl = String((message.payload as { image_url?: string }).image_url ?? '')
    return (
      <div className="space-y-2">
        {imageUrl && (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
            <img src={imageUrl} alt="" className="max-h-64 w-full object-cover" />
          </a>
        )}
        {message.body?.trim() && (
          <p className="whitespace-pre-wrap text-sm">{message.body}</p>
        )}
      </div>
    )
  }

  if (message.message_type === 'product_card') {
    const card = message.payload as StayMessageProductPayload
    return (
      <OfferCard
        variant={variant}
        isOwn={isOwn}
        kind="product"
        eyebrow={card.subtitle?.trim() || 'Boutique'}
        title={card.title}
        subtitle="Livré à la villa pendant votre séjour"
        priceLabel={card.price_label}
        body={message.body}
        imageUrl={card.image_url}
        ctaLabel={variant === 'guest' ? 'Commander' : 'Voir le produit'}
        onAction={
          onOpenProduct && card.catalog_item_id
            ? () => onOpenProduct(card.catalog_item_id)
            : undefined
        }
      />
    )
  }

  if (message.message_type === 'service_card') {
    const card = message.payload as StayMessageServicePayload
    return (
      <OfferCard
        variant={variant}
        isOwn={isOwn}
        kind="service"
        eyebrow={card.category?.trim() || 'Conciergerie'}
        title={card.title}
        subtitle={card.subtitle}
        priceLabel={card.price_label}
        body={message.body}
        imageUrl={card.image_url}
        ctaLabel={variant === 'guest' ? serviceCtaLabel(card.price_label) : 'Voir le service'}
        onAction={
          onOpenService && card.property_service_id
            ? () => onOpenService(card.property_service_id)
            : undefined
        }
      />
    )
  }

  return <p className="whitespace-pre-wrap">{message.body ?? ''}</p>
}
