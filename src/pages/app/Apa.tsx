import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePayments, usePayouts, usePartners, useNotifications, type Payout } from '@/lib/useSupabase'
import { buildPayoutDrafts, DEFAULT_PLATFORM_RATE } from '@/lib/apa'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { Loader2, Wallet, Building2, Handshake, RefreshCw, CheckCircle2, Banknote } from 'lucide-react'

const euro = (n: number) => `€${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export function Apa() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: payments, loading: lPay, update: updatePayment } = usePayments()
  const { data: payouts, loading: lPayouts, insertMany, update: updatePayout, refetch } = usePayouts()
  const { data: partners, loading: lPart } = usePartners()
  const { insertNotification } = useNotifications()
  const loading = lPay || lPayouts || lPart

  const [platformRate, setPlatformRate] = useState(DEFAULT_PLATFORM_RATE)
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
    const awaiting = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)
    const platformCommission = payouts.reduce((s, p) => s + Number(p.commission_amount), 0)
      + payments.filter(p => p.status === 'paid' && p.type === 'commission').reduce((s, p) => s + Number(p.amount), 0)
    const toReverse = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.net_amount), 0)
    const reversed = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.net_amount), 0)
    return { collected, awaiting, platformCommission, toReverse, reversed }
  }, [payments, payouts])

  const existingIds = useMemo(() => new Set(payouts.map(p => p.payment_id).filter(Boolean) as string[]), [payouts])
  const pendingPayments = useMemo(() => payments.filter(p => p.status === 'pending'), [payments])
  const ungenerated = useMemo(
    () => buildPayoutDrafts(payments, partners, existingIds, platformRate),
    [payments, partners, existingIds, platformRate],
  )

  const handleEncaisser = async (id: string) => {
    setBusyId(id)
    try {
      await updatePayment(id, { status: 'paid' })
      toast(t('apa.collected_toast'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setBusyId(null)
  }

  const handleGenerate = async () => {
    if (ungenerated.length === 0) { toast(t('apa.nothingToGenerate')); return }
    setGenerating(true)
    try {
      await insertMany(ungenerated)
      toast(t('apa.generated').replace('{n}', String(ungenerated.length)))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setGenerating(false)
  }

  const handleReverse = async (po: Payout) => {
    setBusyId(po.id)
    try {
      await updatePayout(po.id, { status: 'paid', paid_at: new Date().toISOString() })
      await insertNotification({
        user_id: null,
        type: 'payment',
        title: t('apa.payoutSent'),
        message: `${po.payee_name} — ${euro(po.net_amount)}`,
        data: { payee: po.payee_name, net: po.net_amount },
        related_id: po.id,
      }).catch(() => {})
      toast(t('apa.reversed_toast'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setBusyId(null)
  }

  const handleReverseAll = async () => {
    const pending = payouts.filter(p => p.status === 'pending')
    if (pending.length === 0) { toast(t('apa.nothingToReverse')); return }
    setGenerating(true)
    try {
      for (const po of pending) {
        await updatePayout(po.id, { status: 'paid', paid_at: new Date().toISOString() })
      }
      await refetch()
      toast(t('apa.reversedAll').replace('{n}', String(pending.length)))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sortedPayouts = [...payouts].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    return Number(b.net_amount) - Number(a.net_amount)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4" /> {t('apa.title')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{t('apa.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">{t('apa.platformRate')}</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={platformRate}
              onChange={e => setPlatformRate(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label={t('apa.collected')} prefix="€" value={stats.collected} />
        <MetricCard label={t('apa.awaiting')} prefix="€" value={stats.awaiting} />
        <MetricCard label={t('apa.platformCommission')} prefix="€" value={stats.platformCommission} />
        <MetricCard label={t('apa.toReverse')} prefix="€" value={stats.toReverse} />
        <MetricCard label={t('apa.reversed')} prefix="€" value={stats.reversed} />
      </div>

      {/* ── Encaissements ───────────────────────────────────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Banknote className="w-4 h-4" /> {t('apa.collectionsTitle')}</h3>
          {pendingPayments.length > 0 && (
            <span className="text-xs text-muted-foreground">{pendingPayments.length} {t('apa.pendingCollection')}</span>
          )}
        </div>
        {pendingPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('apa.allCollected')}</p>
        ) : (
          <div className="space-y-2">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.guest_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.property_name} · <span className="capitalize">{p.type}</span></p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-mono">{euro(Number(p.amount))}</span>
                  <Button size="sm" disabled={busyId === p.id} onClick={() => handleEncaisser(p.id)}>
                    {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apa.collect')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Reversements ────────────────────────────────────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> {t('apa.payoutsTitle')}</h3>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={generating || ungenerated.length === 0} onClick={handleGenerate}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {t('apa.generate')}{ungenerated.length > 0 ? ` (${ungenerated.length})` : ''}
            </Button>
            <Button size="sm" disabled={generating || payouts.every(p => p.status === 'paid')} onClick={handleReverseAll}>
              {t('apa.reverseAll')}
            </Button>
          </div>
        </div>

        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('apa.noPayouts')}</p>
        ) : (
          <>
            {/* mobile cards */}
            <div className="lg:hidden space-y-3">
              {sortedPayouts.map(po => (
                <div key={po.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {po.payee_type === 'villa' ? <Building2 className="w-3.5 h-3.5 shrink-0" /> : <Handshake className="w-3.5 h-3.5 shrink-0" />}
                        {po.payee_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{t(`apa.payeeType.${po.payee_type}`)}</p>
                    </div>
                    <Badge variant={po.status === 'paid' ? 'success' : 'warning'}>{t(`apa.status.${po.status}`)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('apa.gross')}: {euro(Number(po.gross_amount))}</span>
                    <span>{t('apa.commission')}: {euro(Number(po.commission_amount))} ({po.commission_rate}%)</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                    <span className="text-sm font-mono font-medium">{t('apa.net')}: {euro(Number(po.net_amount))}</span>
                    {po.status === 'pending' && (
                      <Button size="sm" disabled={busyId === po.id} onClick={() => handleReverse(po)}>
                        {busyId === po.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apa.reverse')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* desktop table */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('apa.payee')}</th>
                    <th className="px-3 py-2 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('apa.type')}</th>
                    <th className="px-3 py-2 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('apa.gross')}</th>
                    <th className="px-3 py-2 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('apa.commission')}</th>
                    <th className="px-3 py-2 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('apa.net')}</th>
                    <th className="px-3 py-2 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('apa.statusCol')}</th>
                    <th className="px-3 py-2 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPayouts.map(po => (
                    <tr key={po.id} className="border-b border-border hover:bg-muted/50 transition-colors h-12">
                      <td className="px-3 text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                          {po.payee_type === 'villa' ? <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> : <Handshake className="w-3.5 h-3.5 text-muted-foreground" />}
                          {po.payee_name}
                        </span>
                      </td>
                      <td className="px-3 text-sm text-muted-foreground">{t(`apa.payeeType.${po.payee_type}`)}</td>
                      <td className="px-3 text-sm font-mono text-right">{euro(Number(po.gross_amount))}</td>
                      <td className="px-3 text-sm font-mono text-right text-muted-foreground">{euro(Number(po.commission_amount))} <span className="text-xs">({po.commission_rate}%)</span></td>
                      <td className="px-3 text-sm font-mono text-right font-medium">{euro(Number(po.net_amount))}</td>
                      <td className="px-3">
                        <Badge variant={po.status === 'paid' ? 'success' : 'warning'}>{t(`apa.status.${po.status}`)}</Badge>
                      </td>
                      <td className="px-3 text-right">
                        {po.status === 'pending' ? (
                          <Button size="sm" disabled={busyId === po.id} onClick={() => handleReverse(po)}>
                            {busyId === po.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apa.reverse')}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" /> {t('apa.done')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
