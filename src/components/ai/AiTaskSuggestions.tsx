import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sparkles, Plus, X, Loader2, CheckCircle2 } from 'lucide-react'
import { generateTaskSuggestions, type AiSuggestion } from '@/lib/ai/aiService'
import { useTranslation } from '@/i18n/LanguageContext'

interface AiTaskSuggestionsProps {
  reservations: Array<{ guest_name: string; arrival: string; departure: string; property_name?: string; status: string }>
  existingTasks: Array<{ title: string; status: string }>
  onAccept: (title: string, description: string) => void
}

export function AiTaskSuggestions({ reservations, existingTasks, onAccept }: AiTaskSuggestionsProps) {
  const { t } = useTranslation()
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [accepted, setAccepted] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    generateTaskSuggestions(reservations, existingTasks).then(result => {
      if (!cancelled) {
        setSuggestions(result)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations.length, existingTasks.length])

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id) && !accepted.has(s.id))

  if (loading) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">{t('ai.analyzingTasks')}</span>
          <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />
        </div>
      </Card>
    )
  }

  if (visibleSuggestions.length === 0) return null

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold">{t('ai.suggestedTasks')}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{t('ai.poweredBy')}</span>
      </div>
      <div className="space-y-2">
        {visibleSuggestions.map(suggestion => (
          <div key={suggestion.id} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{suggestion.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {t('ai.confidence')}: {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setAccepted(prev => new Set(prev).add(suggestion.id))
                  onAccept(suggestion.title, suggestion.description)
                }}
                className="h-7 text-xs px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('ai.accept')}
              </Button>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(suggestion.id))}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {accepted.size > 0 && (
        <div className="flex items-center gap-2 mt-3 text-xs text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {accepted.size} {t('ai.tasksCreated')}
        </div>
      )}
    </Card>
  )
}
