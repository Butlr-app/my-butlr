import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success' | 'gold'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variant === 'primary' && 'bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:bg-primary-hover',
          variant === 'secondary' && 'border border-border bg-card text-foreground hover:bg-muted',
          variant === 'ghost' && 'bg-transparent text-white border border-white/40 hover:bg-white/10',
          variant === 'destructive' && 'bg-destructive text-white hover:opacity-90',
          variant === 'success' && 'bg-success text-success-foreground hover:opacity-90',
          variant === 'gold' && 'bg-gold text-gold-foreground shadow-sm hover:opacity-90',
          size === 'sm' && 'h-9 px-4 text-sm rounded-xl',
          size === 'md' && 'h-11 px-5 text-sm rounded-xl',
          size === 'lg' && 'h-12 px-8 text-base rounded-xl',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
