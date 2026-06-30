import { Card } from './Card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react'

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'destructive'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  prefix?: string
  icon?: LucideIcon
  tone?: Tone
  className?: string
}

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  destructive: 'bg-destructive/10 text-destructive',
}

export function MetricCard({ label, value, delta, deltaLabel, prefix, icon: Icon, tone = 'primary', className }: MetricCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start gap-3 mb-3">
        {Icon && (
          <span className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', toneClasses[tone])}>
            <Icon className="w-5 h-5" />
          </span>
        )}
        <p className="text-sm font-medium text-muted-foreground leading-snug">
          {label}
        </p>
      </div>
      <p className="text-3xl font-bold tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {delta !== undefined && (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-medium">
          <span className={cn('flex items-center gap-0.5', delta >= 0 ? 'text-success' : 'text-destructive')}>
            {delta >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {Math.abs(delta)}%
          </span>
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
    </Card>
  )
}
