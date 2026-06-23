import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full h-10 px-3 bg-card border rounded-sm text-sm transition-colors',
          'focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20',
          'placeholder:text-muted-foreground',
          error ? 'border-destructive' : 'border-input',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
