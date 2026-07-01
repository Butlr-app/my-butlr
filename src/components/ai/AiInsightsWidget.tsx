import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sparkles, ArrowRight, Loader2, TrendingUp, TrendingDown, Users, Wrench, Lightbulb } from 'lucide-react'
import { Link } from 'react-router-dom'
import { generateDashboardInsights, type AiInsight } from '@/lib/ai/aiService'
import { useTranslation } from '@/i18n/LanguageContext'

const categoryIcons: Record<string, typeof TrendingUp> = {
  revenue: TrendingUp,
  occupancy: TrendingDown,
  guest: Users,
  maintenance: Wrench,
  opportunity: Lightbulb,
}

const categoryColors: Record<string, string> = {
  revenue: 'text-emerald-500 bg-emerald-500/10',
  occupancy: 'text-amber-500 bg-amber-500/10',
  guest: 'text-blue-500 bg-blue-500/10',
  maintenance: 'text-orange-500 bg-orange-500/10',
  opportunity: 'text-purple-500 bg-purple-500/10',
}

interface AiInsightsWidgetProps {
  occupancyRate: number
  revenue: number
  previousRevenue: number
  upcomingArrivals: number
  pendingTasks: number
  propertiesCount: number
}

export function AiInsightsWidget(props: AiInsightsWidgetProps) {
  const { t } = useTranslation()
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    generateDashboardInsights(props).then(result => {
      if (!cancelled) {
        setInsights(result)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.occupancyRate, props.revenue, props.previousRevenue, props.upcomingArrivals, props.pendingTasks, props.propertiesCount])

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('ai.insights')}</h3>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-semibold">{t('ai.insights')}</h3>
        <Badge variant="muted" className="ml-auto text-[10px]">AI</Badge>
      </div>
      <div className="space-y-3">
        {insights.map(insight => {
          const Icon = categoryIcons[insight.category] ?? Lightbulb
          const colorClass = categoryColors[insight.category] ?? 'text-gray-500 bg-gray-500/10'
          return (
            <div key={insight.id} className="flex gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold truncate">{insight.title}</p>
                  {insight.priority === 'high' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.description}</p>
                {insight.actionRoute && (
                  <Link
                    to={insight.actionRoute}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1.5 hover:underline"
                  >
                    {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
