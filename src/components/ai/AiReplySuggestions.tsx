import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateReplySuggestions } from '@/lib/ai/aiService'
import { useTranslation } from '@/i18n/LanguageContext'

interface AiReplySuggestionsProps {
  lastGuestMessage: string | null
  guestName?: string
  propertyName?: string
  onSelect: (reply: string) => void
}

export function AiReplySuggestions({ lastGuestMessage, guestName, propertyName, onSelect }: AiReplySuggestionsProps) {
  const { t } = useTranslation()
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!lastGuestMessage) {
      setSuggestions([])
      return
    }
    setHidden(false)
    setLoading(true)
    let cancelled = false
    generateReplySuggestions(lastGuestMessage, { guestName, propertyName }).then(result => {
      if (!cancelled) {
        setSuggestions(result)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [lastGuestMessage, guestName, propertyName])

  if (hidden || (!loading && suggestions.length === 0)) return null

  return (
    <div className="px-4 py-2 border-t border-border bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
          {t('ai.suggestedReplies')}
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
      </div>
      {!loading && (
        <div className="space-y-1.5">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(suggestion)
                setHidden(true)
              }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors line-clamp-2"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
