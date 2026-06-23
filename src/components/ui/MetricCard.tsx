import { Card } from './Card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  delta?: number
  prefix?: string
  className?: string
}

export function MetricCard({ label, value, delta, prefix, className }: MetricCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-2">
        {label}
      </p>
      <p className="text-2xl font-mono font-medium">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {delta !== undefined && (
        <div className={cn(
          'flex items-center gap-1 mt-2 text-xs font-medium',
          delta >= 0 ? 'text-success' : 'text-destructive'
        )}>
          {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(delta)}%
        </div>
      )}
    </Card>
  )
}
