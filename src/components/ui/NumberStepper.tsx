import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  name?: string
  className?: string
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  name,
  className,
}: NumberStepperProps) {
  const decrement = () => onChange(Math.max(min, value - 1))
  const increment = () => onChange(Math.min(max, value + 1))

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center h-10 border border-input rounded-sm bg-card overflow-hidden">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="h-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Minus className="w-4 h-4" />
        </button>

        <input
          type="number"
          name={name}
          min={min}
          max={max}
          value={value}
          onChange={e => {
            const raw = e.target.value
            if (raw === '') return
            const next = Number(raw)
            if (Number.isNaN(next)) return
            onChange(Math.min(max, Math.max(min, next)))
          }}
          className="flex-1 h-full min-w-0 text-center text-sm font-mono bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="h-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
