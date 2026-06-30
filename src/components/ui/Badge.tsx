import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'primary'
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'success' && 'bg-success-soft text-success',
        variant === 'warning' && 'bg-warning-soft text-warning',
        variant === 'destructive' && 'bg-destructive/10 text-destructive',
        variant === 'info' && 'bg-info-soft text-info',
        variant === 'primary' && 'bg-primary-soft text-primary',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-success',
          variant === 'warning' && 'bg-warning',
          variant === 'destructive' && 'bg-destructive',
          variant === 'info' && 'bg-info',
          variant === 'primary' && 'bg-primary',
          variant === 'default' && 'bg-muted-foreground',
          variant === 'muted' && 'bg-muted-foreground',
        )} />
      )}
      {children}
    </span>
  )
}
