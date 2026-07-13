import type { LucideIcon } from 'lucide-react'
import { Check, ChevronRight, Search } from 'lucide-react'
import { boutiqueMobile } from '@/components/guest/boutiqueMobileStyles'

export function MobileScreen({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`${boutiqueMobile.screen} ${className}`}>{children}</div>
}

export function MobileHeader({
  title,
  subtitle,
  onBack,
  right,
  step,
  backOnly,
}: {
  title?: string
  subtitle?: string
  onBack?: () => void
  right?: React.ReactNode
  step?: string
  backOnly?: boolean
}) {
  if (backOnly) {
    return (
      <div className="mb-4 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 rounded-full p-2 text-[#1A1614] active:bg-[#F2F2F7]"
            aria-label="Retour"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
        ) : <span />}
        <div className="flex items-center gap-1">{right}</div>
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-start gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 mt-0.5 rounded-full p-2 text-[#1A1614] active:bg-[#F2F2F7]"
          aria-label="Retour"
        >
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {title && <h2 className={boutiqueMobile.title}>{title}</h2>}
        {subtitle && <p className={`mt-0.5 ${boutiqueMobile.subtitle}`}>{subtitle}</p>}
      </div>
      {step && <span className={boutiqueMobile.stepBadge}>{step}</span>}
      {right}
    </div>
  )
}

export function MobileSearch({
  value,
  onChange,
  placeholder = 'Rechercher',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className={`${boutiqueMobile.search} mb-4`}>
      <Search className="h-4 w-4 shrink-0 text-[#8E8E93]" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={boutiqueMobile.searchInput}
      />
    </div>
  )
}

export function ItemThumbnail({
  imageUrl,
  gradientClass,
  alt,
}: {
  imageUrl?: string | null
  gradientClass: string
  alt: string
}) {
  if (imageUrl) {
    return (
      <div className={boutiqueMobile.thumb}>
        <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${boutiqueMobile.thumb} bg-gradient-to-br ${gradientClass}`} aria-hidden />
  )
}

export function CatalogListRow({
  title,
  subtitle,
  price,
  imageUrl,
  gradientClass,
  onClick,
}: {
  title: string
  subtitle?: string | null
  price?: string
  imageUrl?: string | null
  gradientClass: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`${boutiqueMobile.listRow} ${boutiqueMobile.divider}`}>
      <ItemThumbnail imageUrl={imageUrl} gradientClass={gradientClass} alt={title} />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold text-[#1A1614]">{title}</p>
        {(subtitle || price) && (
          <p className={`mt-0.5 truncate ${boutiqueMobile.subtitle}`}>
            {subtitle ?? price}
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
    </button>
  )
}

export function CategoryListRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string | null
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`${boutiqueMobile.listRow} ${boutiqueMobile.divider}`}>
      <span className={boutiqueMobile.iconCircle}>
        <Icon className="h-5 w-5 text-[#9A7B4F]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold text-[#1A1614]">{title}</p>
        {subtitle && <p className={`mt-0.5 ${boutiqueMobile.subtitle}`}>{subtitle}</p>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
    </button>
  )
}

export function MenuCardRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_2px_12px_rgba(26,22,20,0.06)] ring-1 ring-[#1A1614]/[0.04] active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5EDE3]">
        <Icon className="h-5 w-5 text-[#9A7B4F]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#1A1614]">{title}</p>
        <p className={`mt-0.5 ${boutiqueMobile.subtitle}`}>{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
    </button>
  )
}

export function FormPickerRow({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-center justify-between py-4 text-left ${boutiqueMobile.divider}`}
    >
      <div>
        <p className={boutiqueMobile.label}>{label}</p>
        <p className={`mt-1 ${boutiqueMobile.value}`}>{value}</p>
      </div>
      {onClick && <ChevronRight className="h-5 w-5 text-[#C7C7CC]" />}
    </Tag>
  )
}

export function GoldButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={boutiqueMobile.goldBtn}>
      {children}
    </button>
  )
}

export function StickyFooter({ children }: { children: React.ReactNode }) {
  return <div className={boutiqueMobile.stickyFooter}>{children}</div>
}

export function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={boutiqueMobile.checkCircle}>
        <Check className="h-3 w-3 text-[#34C759]" strokeWidth={3} />
      </span>
      <span className={`${boutiqueMobile.body} pt-0.5`}>{children}</span>
    </li>
  )
}

export function OrderTimeline({ steps }: { steps: { label: string; detail?: string; state: 'done' | 'active' | 'pending' }[] }) {
  return (
    <div className="space-y-0 py-2">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const dotColor = step.state === 'done'
          ? 'border-[#34C759] bg-[#34C759]'
          : step.state === 'active'
            ? 'border-[#FF9500] bg-white'
            : 'border-[#E5E5EA] bg-white'
        const lineColor = step.state === 'done' ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
        return (
          <div key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${dotColor}`} />
              {!isLast && <span className={`my-1 w-0.5 flex-1 min-h-[32px] ${lineColor}`} />}
            </div>
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p className={`text-[15px] font-medium ${step.state === 'pending' ? 'text-[#8E8E93]' : 'text-[#1A1614]'}`}>
                {step.label}
              </p>
              {step.detail && (
                <p className={`mt-0.5 ${boutiqueMobile.subtitle}`}>{step.detail}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ReserveBalanceBar({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#FAFAFA] px-4 py-3">
      <span className={boutiqueMobile.subtitle}>{label}</span>
      <span className="text-[17px] font-bold text-[#1A1614]">{amount}</span>
    </div>
  )
}
