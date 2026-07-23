import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  ConciergeBell,
  Plus,
  Shield,
  Wallet,
} from 'lucide-react'
import { GoldButton, MobileHeader, MobileScreen } from '@/components/guest/guestMobileUi'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import {
  formatReserveAmount,
  formatTransactionLabel,
  stayReserveStatusLabels,
  type ReserveTransaction,
  type StayReserve,
  type StayServiceRequest,
} from '@/lib/stayReserve'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { tGuest } from '@/lib/guestLanguage'

interface StayReserveGuestPanelProps {
  reserve: StayReserve | null
  requests: StayServiceRequest[]
  transactions: ReserveTransaction[]
  recommendedAmount?: number
  guestLanguage?: string | null
  dateFormat?: string | null
  readOnly?: boolean
  loading?: boolean
  onCreateReserve?: (amount: number) => Promise<void>
  onTopUp?: (amount: number) => Promise<void>
  onCreateRequest?: (input: {
    category: string
    title: string
    description: string
    requestedDate?: string
    estimatedAmount?: number
    propertyServiceId?: string
    providerName?: string
  }) => Promise<void>
  onApproveRequest?: (requestId: string) => Promise<void>
  onRejectRequest?: (requestId: string) => Promise<void>
  onOpenRequests?: () => void
  onOpenConcierge?: () => void
}

const CARD = 'rounded-2xl bg-white shadow-[0_2px_12px_rgba(26,22,20,0.06)] ring-1 ring-[#1A1614]/[0.04]'

function BalanceRing({ reserve, guestLanguage }: { reserve: StayReserve; guestLanguage?: string | null }) {
  const total = Number(reserve.initial_amount) || 1
  const available = Number(reserve.current_balance)
  const used = Number(reserve.spent_amount) + Number(reserve.pending_amount)
  const pct = Math.min(100, Math.round((available / total) * 100))

  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#F3EFEA" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#C9AD7F"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * 2.64} 264`}
        />
      </svg>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7B4F]">
          {tGuest('reserve.available', guestLanguage)}
        </p>
        <p className="mt-1 text-2xl font-bold text-[#1A1614]">
          {formatReserveAmount(available, reserve.currency)}
        </p>
        <p className="mt-0.5 text-[11px] text-[#8E8E93]">
          {formatReserveAmount(used, reserve.currency)} {tGuest('reserve.committed', guestLanguage)}
        </p>
      </div>
    </div>
  )
}

export function StayReserveGuestPanel({
  reserve,
  requests,
  transactions,
  recommendedAmount = 3000,
  guestLanguage,
  dateFormat,
  readOnly = false,
  loading = false,
  onCreateReserve,
  onTopUp,
  onApproveRequest,
  onOpenRequests,
  onOpenConcierge,
}: StayReserveGuestPanelProps) {
  const t = (key: Parameters<typeof tGuest>[0]) => tGuest(key, guestLanguage)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [topUpAmount, setTopUpAmount] = useState('')

  const pendingApproval = useMemo(
    () => requests.filter(r => r.status === 'waiting_client_approval'),
    [requests],
  )
  const pendingCredits = useMemo(
    () => transactions.filter(tx => tx.type === 'top_up' && tx.status === 'pending'),
    [transactions],
  )
  const activeRequests = useMemo(
    () => requests.filter(r => !['completed', 'cancelled'].includes(r.status)),
    [requests],
  )

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <MobileScreen className="flex min-h-[420px] items-center justify-center">
        <p className={guestMobile.subtitle}>{t('reserve.loading')}</p>
      </MobileScreen>
    )
  }

  if (!reserve) {
    return (
      <MobileScreen>
        <MobileHeader title={t('reserve.title')} subtitle={t('reserve.subtitleSetup')} />

        <div className={`${CARD} p-6`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5EDE3]">
            <Wallet className="h-6 w-6 text-[#9A7B4F]" strokeWidth={1.5} />
          </span>
          <p className={`mt-4 ${guestMobile.body}`}>{t('reserve.explainer')}</p>
        </div>

        <div className={`${CARD} mt-4 p-5`}>
          <p className={guestMobile.label}>{t('reserve.recommendedAmount')}</p>
          <p className="mt-1 text-3xl font-bold text-[#1A1614]">
            {formatReserveAmount(recommendedAmount)}
          </p>
          <p className={`mt-2 ${guestMobile.subtitle}`}>
            {t('reserve.recommendedNotice')}
          </p>
        </div>

        {!readOnly && onCreateReserve && (
          <div className="mt-5">
            <GoldButton
              disabled={busy}
              onClick={() => run(async () => { await onCreateReserve(recommendedAmount) })}
            >
              {t('reserve.activate')}
            </GoldButton>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <MobileHeader title={t('reserve.title')} subtitle={t('reserve.subtitleActive')} />

      {/* Balance hero */}
      <div className={`${CARD} p-6`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={guestMobile.label}>{t('reserve.status')}</p>
            <p className="mt-0.5 text-[15px] font-semibold text-[#1A1614]">
              {stayReserveStatusLabels[reserve.status]}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#F5EDE3] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A7B4F]">
            <Shield className="h-3 w-3" />
            {t('reserve.dedicatedEnvelope')}
          </span>
        </div>
        <div className="my-5">
          <BalanceRing reserve={reserve} guestLanguage={guestLanguage} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8E8E93]">{t('reserve.deposited')}</p>
            <p className="mt-1 text-sm font-semibold">{formatReserveAmount(reserve.initial_amount, reserve.currency)}</p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8E8E93]">{t('reserve.spent')}</p>
            <p className="mt-1 text-sm font-semibold">{formatReserveAmount(reserve.spent_amount, reserve.currency)}</p>
          </div>
          <div className="rounded-xl bg-[#FAFAFA] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8E8E93]">{t('reserve.pending')}</p>
            <p className="mt-1 text-sm font-semibold">{formatReserveAmount(reserve.pending_amount, reserve.currency)}</p>
          </div>
        </div>
      </div>

      {pendingCredits.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className={guestMobile.label}>{t('reserve.pendingCredits')}</p>
          {pendingCredits.map(tx => (
            <div key={tx.id} className={`${CARD} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#1A1614]">{formatTransactionLabel(tx)}</p>
                  <p className="mt-0.5 text-xs text-[#8E8E93]">{t('reserve.pendingCreditStatus')}</p>
                </div>
                <p className="text-lg font-bold text-[#9A7B4F]">
                  +{formatReserveAmount(tx.amount, tx.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending approvals */}
      {pendingApproval.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className={guestMobile.label}>{t('reserve.pendingApproval')}</p>
          {pendingApproval.map(request => (
            <div key={request.id} className={`${CARD} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#1A1614]">{request.title}</p>
                  {request.provider_name && (
                    <p className="mt-0.5 text-xs text-[#8E8E93]">{request.provider_name}</p>
                  )}
                </div>
                <p className="text-lg font-bold text-[#9A7B4F]">
                  {formatReserveAmount(Number(request.final_amount ?? request.estimated_amount ?? 0), reserve.currency)}
                </p>
              </div>
              {!readOnly && onApproveRequest && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(async () => { await onApproveRequest(request.id) })}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1614] py-3 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {t('reserve.approveExpense')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Top up */}
      {!readOnly && onTopUp && reserve.status !== 'closed' && (
        <div className={`${CARD} mt-5 p-4`}>
          <p className="mb-3 text-sm font-semibold">{t('reserve.addFundsTitle')}</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="100"
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
              placeholder="500"
              aria-label="Montant à ajouter"
              className="flex-1 rounded-xl border border-[#E5E5EA] bg-[#FAFAFA] px-4 py-3 text-sm outline-none focus:border-[#C9AD7F]"
            />
            <button
              type="button"
              disabled={busy || !topUpAmount}
              onClick={() => run(async () => {
                await onTopUp(Number(topUpAmount))
                setTopUpAmount('')
              })}
              aria-label="Ajouter les fonds"
              className="flex items-center gap-1.5 rounded-xl bg-[#C9AD7F] px-4 py-3 text-sm font-semibold text-[#1A1614] transition active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
              {t('reserve.add')}
            </button>
          </div>
          <p className={`mt-2 text-xs ${guestMobile.subtitle}`}>
            {t('reserve.addFundsNotice')}
          </p>
        </div>
      )}

      {onOpenConcierge && (
        <button
          type="button"
          onClick={onOpenConcierge}
          className={`${CARD} mt-5 flex w-full items-center justify-center gap-2 py-4 text-[15px] font-medium active:scale-[0.99]`}
        >
          <ConciergeBell className="h-[18px] w-[18px] text-[#9A7B4F]" strokeWidth={1.75} />
          {t('reserve.requestConcierge')}
        </button>
      )}

      {/* Active requests — lien vers le suivi */}
      {activeRequests.length > 0 && onOpenRequests && (
        <button
          type="button"
          onClick={onOpenRequests}
          className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#FAFAFA] px-4 py-4 text-left active:bg-[#F2F2F7]"
        >
          <div>
            <p className="text-sm font-medium">
              {activeRequests.length} {activeRequests.length > 1 ? t('reserve.requestsInProgress') : t('reserve.requestInProgress')}
            </p>
            <p className="text-xs text-[#8E8E93]">{t('reserve.viewTracking')}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[#C7C7CC]" />
        </button>
      )}

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className={guestMobile.label}>{t('reserve.history')}</p>
          <div className={`${CARD} divide-y divide-[#F2F2F7]`}>
            {transactions.slice(0, 8).map(tx => {
              const isCredit = tx.type === 'top_up' || tx.type === 'refund'
              const isPending = tx.status === 'pending'
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5EDE3]">
                    {isCredit ? (
                      <ArrowDownLeft className="h-4 w-4 text-[#9A7B4F]" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-[#9A7B4F]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{formatTransactionLabel(tx)}</p>
                    <p className="text-[11px] text-[#8E8E93]">
                      {formatDateForDisplay(tx.created_at.slice(0, 10), dateFormat)}
                      {isPending ? ` · ${t('reserve.pendingCreditStatus')}` : ''}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${isCredit && !isPending ? 'text-emerald-700' : ''} ${isPending ? 'text-[#8E8E93]' : ''}`}>
                    {isCredit ? '+' : '−'}
                    {formatReserveAmount(tx.amount, tx.currency)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </MobileScreen>
  )
}
