import { useState, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  id: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOOLTIPS_KEY = 'butlr_seen_tooltips'

function getSeenTooltips(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TOOLTIPS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function markTooltipSeen(id: string) {
  const seen = getSeenTooltips()
  if (!seen.includes(id)) {
    seen.push(id)
    localStorage.setItem(TOOLTIPS_KEY, JSON.stringify(seen))
  }
}

export function HelpTooltip({ id, title, description, position = 'bottom' }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const seen = getSeenTooltips()
    if (!seen.includes(id)) {
      setDismissed(false)
      setVisible(true)
    }
  }, [id])

  const dismiss = () => {
    setVisible(false)
    setDismissed(true)
    markTooltipSeen(id)
  }

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex">
      {!dismissed && (
        <button
          onClick={() => setVisible(!visible)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}

      {visible && !dismissed && (
        <div className={`absolute z-50 ${positionClasses[position]} w-64`}>
          <div className="bg-card border border-border rounded-lg shadow-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </div>
              <button
                onClick={dismiss}
                className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <button
              onClick={dismiss}
              className="text-xs text-foreground underline mt-2 hover:text-foreground/80"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
