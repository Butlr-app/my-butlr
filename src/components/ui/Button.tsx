import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'gold'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variant === 'primary' && 'bg-primary text-primary-foreground hover:opacity-90',
          variant === 'secondary' && 'border border-border bg-transparent text-foreground hover:bg-muted',
          variant === 'ghost' && 'bg-transparent text-white border border-white/40 hover:bg-white/10',
          variant === 'destructive' && 'bg-destructive text-white hover:opacity-90',
          variant === 'gold' && 'bg-gold text-gold-foreground shadow-sm hover:opacity-90',
          size === 'sm' && 'h-9 px-4 text-sm rounded-md',
          size === 'md' && 'h-10 px-5 text-sm rounded-md',
          size === 'lg' && 'h-12 px-8 text-base rounded-md',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
