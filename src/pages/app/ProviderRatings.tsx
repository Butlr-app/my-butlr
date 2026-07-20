import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  useProviderRatings, useServiceProviders, useWorkOrders, useProperties,
  type WorkOrder,
} from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Star, Award, Loader2, Timer } from 'lucide-react'

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={n <= Math.round(value) ? 'fill-gold text-gold' : 'text-muted-foreground/40'}
        />
      ))}
    </span>
  )
}

export function ProviderRatings() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: rawRatings, insert, refetch } = useProviderRatings()
  const { data: providers } = useServiceProviders()
  const { data: rawWorkOrders } = useWorkOrders()
  const { data: rawProperties } = useProperties()
  const { filterWorkOrders, filterProviderRatings } = useRoleFilter()

  const [rateTarget, setRateTarget] = useState<WorkOrder | null>(null)
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const ratings = filterProviderRatings(rawRatings)
  const workOrders = filterWorkOrders(rawWorkOrders)
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'

  const providerName = (id: string) => providers.find(p => p.id === id)?.name ?? '—'
  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'

  const stats = useMemo(() => {
    const byProvider: Record<string, { sum: number; count: number; completed: number; totalDays: number; completedTimed: number }> = {}
    for (const w of workOrders) {
      const s = (byProvider[w.provider_id] ??= { sum: 0, count: 0, completed: 0, totalDays: 0, completedTimed: 0 })
      if (w.status === 'completed') {
        s.completed += 1
        if (w.completed_at) {
          s.totalDays += (new Date(w.completed_at).getTime() - new Date(w.created_at).getTime()) / 86400000
          s.completedTimed += 1
        }
      }
    }
    for (const r of ratings) {
      const s = (byProvider[r.provider_id] ??= { sum: 0, count: 0, completed: 0, totalDays: 0, completedTimed: 0 })
      s.sum += r.rating
      s.count += 1
    }
    return byProvider
  }, [workOrders, ratings])

  const rankedProviders = Object.keys(stats)
    .map(id => ({ id, ...stats[id] }))
    .sort((a, b) => (b.count ? b.sum / b.count : 0) - (a.count ? a.sum / a.count : 0))

  const ratedWorkOrderIds = new Set(ratings.map(r => r.work_order_id).filter(Boolean))
  const rateable = workOrders
    .filter(w => w.status === 'completed' && !ratedWorkOrderIds.has(w.id))
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  const openRate = (w: WorkOrder) => {
    setRateTarget(w)
    setStars(5)
    setComment('')
  }

  const submitRating = async () => {
    if (!rateTarget) return
    setSaving(true)
    try {
      await insert({
        provider_id: rateTarget.provider_id,
        work_order_id: rateTarget.id,
        property_id: rateTarget.property_id,
        rating: stars,
        comment: comment.trim() || null,
        created_by: user?.id ?? null,
      })
      toast(t('providerRatings.rated'))
      setRateTarget(null)
      refetch()
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6" data-testid="provider-ratings">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('providerRatings.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('providerRatings.subtitle')}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">{t('providerRatings.performance')}</h3>
        {rankedProviders.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">{t('providerRatings.noData')}</Card>
        )}
        <div className="grid gap-3">
          {rankedProviders.map(p => {
            const avg = p.count ? p.sum / p.count : 0
            const avgDays = p.completedTimed ? p.totalDays / p.completedTimed : null
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">{providerName(p.id)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Stars value={avg} />
                      <span className="text-xs text-muted-foreground">
                        {p.count ? `${avg.toFixed(1)} (${p.count})` : t('providerRatings.unrated')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{p.completed}</p>
                      <p>{t('providerRatings.completedJobs')}</p>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      <Timer className="w-4 h-4" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {avgDays != null ? t('providerRatings.days').replace('{n}', avgDays.toFixed(1)) : '—'}
                        </p>
                        <p>{t('providerRatings.avgTime')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">{t('providerRatings.rateJobs')}</h3>
        {rateable.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{t('providerRatings.nothingToRate')}</Card>
        ) : (
          <div className="grid gap-2">
            {rateable.map(w => (
              <Card key={w.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {providerName(w.provider_id)} · {propertyName(w.property_id)}
                    {w.completed_at && <> · {fmtDate(w.completed_at)}</>}
                  </p>
                </div>
                <Button size="sm" onClick={() => openRate(w)}>
                  <Star className="w-4 h-4 mr-1.5" />
                  {t('providerRatings.rate')}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!rateTarget} onClose={() => setRateTarget(null)} title={t('providerRatings.rateProvider')}>
        {rateTarget && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{providerName(rateTarget.provider_id)}</p>
              <p className="text-xs text-muted-foreground">{rateTarget.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('providerRatings.rating')}</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setStars(n)} className="p-0.5">
                    <Star className={`w-7 h-7 ${n <= stars ? 'fill-gold text-gold' : 'text-muted-foreground/40'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('providerRatings.comment')}</label>
              <textarea
                className="w-full min-h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t('providerRatings.commentPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRateTarget(null)}>{t('common.cancel')}</Button>
              <Button onClick={submitRating} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {t('providerRatings.submit')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
