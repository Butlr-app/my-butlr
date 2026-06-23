import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium uppercase tracking-wider',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'success' && 'bg-success-soft text-success',
        variant === 'warning' && 'bg-warning-soft text-warning-foreground',
        variant === 'destructive' && 'bg-destructive/10 text-destructive',
        variant === 'info' && 'bg-info-soft text-info',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        variant === 'success' && 'bg-success',
        variant === 'warning' && 'bg-warning',
        variant === 'destructive' && 'bg-destructive',
        variant === 'info' && 'bg-info',
        variant === 'default' && 'bg-muted-foreground',
        variant === 'muted' && 'bg-muted-foreground',
      )} />
      {children}
    </span>
  )
}
