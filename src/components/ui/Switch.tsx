import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef, useId } from 'react'

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-success/40 bg-success shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
          : 'border-border bg-muted/80 hover:bg-muted',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-2)] transition-transform duration-200 ease-out',
          checked ? 'translate-x-[1.35rem]' : 'translate-x-1',
        )}
      />
    </button>
  ),
)
Switch.displayName = 'Switch'

interface SwitchFieldProps {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SwitchFieldProps) {
  const labelId = useId()

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-1 py-3 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-labelledby={labelId}
      />
    </div>
  )
}
