import { type ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-border rounded-lg p-12 text-center">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}
