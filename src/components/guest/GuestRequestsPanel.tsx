import { useMemo, useState } from 'react'
import { ClipboardList, ConciergeBell, MessageSquare, ShoppingBag } from 'lucide-react'
import {
  GoldButton,
  MobileHeader,
  MobileScreen,
  OrderTimeline,
} from '@/components/guest/guestMobileUi'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import {
  storeOrderStatusLabels,
  type StoreOrder,
  type StoreOrderItem,
  type StoreOrderStatus,
} from '@/lib/boutique'
import {
  formatReserveAmount,
  stayServiceStatusLabels,
  type StayServiceRequest,
} from '@/lib/stayReserve'
import { formatDateForDisplay } from '@/lib/dateFormat'

type RequestTab = 'active' | 'done'
type DetailView =
  | { kind: 'boutique'; order: StoreOrder }
  | { kind: 'reserve'; request: StayServiceRequest }

const COMPLETED_ORDER: StoreOrderStatus[] = ['completed', 'cancelled', 'refunded', 'delivered']
const COMPLETED_REQUEST = ['completed', 'cancelled']

function buildBoutiqueTimeline(order: StoreOrder, items: StoreOrderItem[]) {
  const mainItem = items[0]
  const status = order.status
  const steps: { label: string; detail?: string; state: 'done' | 'active' | 'pending' }[] = [
    { label: 'Demande reçue', detail: formatDateForDisplay(order.created_at.slice(0, 10)), state: 'done' },
  ]
  if (['pending_quote', 'quoted', 'waiting_client_approval'].includes(status)) {
    steps.push({ label: 'Devis en préparation', state: status === 'pending_quote' ? 'active' : 'done' })
    steps.push({ label: 'À valider', state: status === 'waiting_client_approval' ? 'active' : 'pending' })
  } else {
    steps.push({
      label: 'En cours de traitement',
      state: ['paid', 'approved', 'preparing', 'assigned_to_provider'].includes(status) ? 'active' : 'done',
    })
    steps.push({
      label: 'Confirmée',
      detail: mainItem?.scheduled_date ? formatDateForDisplay(mainItem.scheduled_date) : undefined,
      state: ['scheduled', 'in_progress'].includes(status) ? 'active' : ['completed', 'delivered'].includes(status) ? 'done' : 'pending',
    })
  }
  steps.push({ label: 'Terminée', state: status === 'completed' ? 'done' : 'pending' })
  return steps
}

interface GuestRequestsPanelProps {
  storeOrders: StoreOrder[]
  storeOrderItems: StoreOrderItem[]
  serviceRequests: StayServiceRequest[]
  dateFormat?: string | null
  readOnly?: boolean
  onApproveQuote?: (orderItemId: string) => Promise<void>
  onApproveRequest?: (requestId: string) => Promise<void>
  contactVia?: 'messages' | 'help'
  onContactService?: () => void
}

export function GuestRequestsPanel({
  storeOrders,
  storeOrderItems,
  serviceRequests,
  dateFormat,
  readOnly = false,
  onApproveQuote,
  onApproveRequest,
  contactVia = 'help',
  onContactService,
}: GuestRequestsPanelProps) {
  const [tab, setTab] = useState<RequestTab>('active')
  const [detail, setDetail] = useState<DetailView | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pendingQuotes = useMemo(
    () => storeOrderItems.filter(i => i.status === 'waiting_client_approval'),
    [storeOrderItems],
  )
  const pendingRequests = useMemo(
    () => serviceRequests.filter(r => r.status === 'waiting_client_approval'),
    [serviceRequests],
  )

  const boutiqueActive = storeOrders.filter(o => !COMPLETED_ORDER.includes(o.status))
  const boutiqueDone = storeOrders.filter(o => COMPLETED_ORDER.includes(o.status))
  const reserveActive = serviceRequests.filter(r => !COMPLETED_REQUEST.includes(r.status))
  const reserveDone = serviceRequests.filter(r => COMPLETED_REQUEST.includes(r.status))

  const activeCount = boutiqueActive.length + reserveActive.length
  const doneCount = boutiqueDone.length + reserveDone.length

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

  if (detail?.kind === 'boutique') {
    const items = storeOrderItems.filter(i => i.order_id === detail.order.id)
    const mainItem = items[0]
    const pendingQuote = items.find(i => i.status === 'waiting_client_approval')

    return (
      <MobileScreen className="flex min-h-[420px] flex-col">
        <MobileHeader
          title="Commande boutique"
          subtitle={`Réf. #${detail.order.id.slice(0, 8).toUpperCase()}`}
          onBack={() => setDetail(null)}
        />
        <span className="mb-4 inline-flex w-fit rounded-full bg-[#FFF3CD] px-3 py-1 text-[13px] font-medium text-[#856404]">
          {storeOrderStatusLabels[detail.order.status]}
        </span>
        <OrderTimeline steps={buildBoutiqueTimeline(detail.order, items)} />
        {mainItem && (
          <div className="mt-2 border-t border-[#E5E5EA] pt-4">
            <p className="font-semibold">{mainItem.title_snapshot}</p>
            {mainItem.scheduled_date && (
              <p className={guestMobile.subtitle}>
                {formatDateForDisplay(mainItem.scheduled_date, dateFormat)}
              </p>
            )}
          </div>
        )}
        {pendingQuote && !readOnly && onApproveQuote && (
          <div className="mt-auto space-y-3 pt-6">
            <div className="flex justify-between">
              <span className={guestMobile.subtitle}>Devis proposé</span>
              <span className="text-[20px] font-bold">
                {formatReserveAmount(Number(pendingQuote.quoted_amount ?? 0))}
              </span>
            </div>
            <GoldButton disabled={busy} onClick={() => run(async () => { await onApproveQuote(pendingQuote.id) })}>
              Valider ce devis
            </GoldButton>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </MobileScreen>
    )
  }

  if (detail?.kind === 'reserve') {
    const request = detail.request
    const pending = request.status === 'waiting_client_approval'

    return (
      <MobileScreen className="flex min-h-[420px] flex-col">
        <MobileHeader title="Prestation conciergerie" onBack={() => setDetail(null)} />
        <span className="mb-4 inline-flex w-fit rounded-full bg-[#FFF3CD] px-3 py-1 text-[13px] font-medium text-[#856404]">
          {stayServiceStatusLabels[request.status]}
        </span>
        <p className="text-[17px] font-semibold">{request.title}</p>
        {request.description && <p className={`mt-2 ${guestMobile.body}`}>{request.description}</p>}
        {request.requested_date && (
          <p className={`mt-2 ${guestMobile.subtitle}`}>
            {formatDateForDisplay(request.requested_date, dateFormat)}
          </p>
        )}
        {(request.final_amount ?? request.estimated_amount) != null && (
          <p className="mt-4 text-[22px] font-bold">
            {formatReserveAmount(Number(request.final_amount ?? request.estimated_amount))}
          </p>
        )}
        {pending && !readOnly && onApproveRequest && (
          <div className="mt-auto pt-6">
            <GoldButton disabled={busy} onClick={() => run(async () => { await onApproveRequest(request.id) })}>
              Valider cette dépense
            </GoldButton>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <MobileHeader title="Suivi" subtitle="Commandes et prestations" />

      {(pendingQuotes.length > 0 || pendingRequests.length > 0) && (
        <div className="mb-4 space-y-2">
          {pendingQuotes.map(item => (
            <div key={item.id} className={`${guestMobile.cardSoft} p-4`}>
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{item.title_snapshot}</p>
                <p className="font-bold text-[#9A7B4F]">
                  {formatReserveAmount(Number(item.quoted_amount ?? 0))}
                </p>
              </div>
              {!readOnly && onApproveQuote && (
                <GoldButton
                  disabled={busy}
                  onClick={() => run(async () => { await onApproveQuote(item.id) })}
                >
                  Valider le devis
                </GoldButton>
              )}
            </div>
          ))}
          {pendingRequests.map(request => (
            <div key={request.id} className={`${guestMobile.cardSoft} p-4`}>
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{request.title}</p>
                <p className="font-bold text-[#9A7B4F]">
                  {formatReserveAmount(Number(request.final_amount ?? request.estimated_amount ?? 0))}
                </p>
              </div>
              {!readOnly && onApproveRequest && (
                <GoldButton
                  disabled={busy}
                  onClick={() => run(async () => { await onApproveRequest(request.id) })}
                >
                  Valider la dépense
                </GoldButton>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex gap-6 border-b border-[#E5E5EA]">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={tab === 'active' ? guestMobile.tabActive : guestMobile.tabIdle}
        >
          En cours ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={tab === 'done' ? guestMobile.tabActive : guestMobile.tabIdle}
        >
          Terminées ({doneCount})
        </button>
      </div>

      {tab === 'active' && activeCount === 0 && (
        <p className={`py-12 text-center ${guestMobile.subtitle}`}>Aucune demande en cours.</p>
      )}
      {tab === 'done' && doneCount === 0 && (
        <p className={`py-12 text-center ${guestMobile.subtitle}`}>Aucune demande terminée.</p>
      )}

      {tab === 'active' && boutiqueActive.map(order => {
        const mainItem = storeOrderItems.find(i => i.order_id === order.id)
        return (
          <button
            key={order.id}
            type="button"
            onClick={() => setDetail({ kind: 'boutique', order })}
            className={`${guestMobile.listRow} ${guestMobile.divider}`}
          >
            <span className={guestMobile.iconCircle}>
              <ShoppingBag className="h-5 w-5 text-[#9A7B4F]" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-semibold">{mainItem?.title_snapshot ?? 'Commande boutique'}</p>
              <p className={guestMobile.subtitle}>
                Boutique · {formatDateForDisplay(order.created_at.slice(0, 10), dateFormat)}
              </p>
            </div>
            <span className="text-[13px] text-[#FF9500]">
              {storeOrderStatusLabels[order.status]}
            </span>
          </button>
        )
      })}

      {tab === 'active' && reserveActive.map(request => (
        <button
          key={request.id}
          type="button"
          onClick={() => setDetail({ kind: 'reserve', request })}
          className={`${guestMobile.listRow} ${guestMobile.divider}`}
        >
          <span className={guestMobile.iconCircle}>
            <ConciergeBell className="h-5 w-5 text-[#9A7B4F]" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-semibold">{request.title}</p>
            <p className={guestMobile.subtitle}>
              Conciergerie · {stayServiceStatusLabels[request.status]}
            </p>
          </div>
        </button>
      ))}

      {tab === 'done' && boutiqueDone.map(order => {
        const mainItem = storeOrderItems.find(i => i.order_id === order.id)
        return (
          <button
            key={order.id}
            type="button"
            onClick={() => setDetail({ kind: 'boutique', order })}
            className={`${guestMobile.listRow} ${guestMobile.divider}`}
          >
            <span className={guestMobile.iconCircle}>
              <ShoppingBag className="h-5 w-5 text-[#9A7B4F]" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-semibold">{mainItem?.title_snapshot ?? 'Commande'}</p>
              <p className={guestMobile.subtitle}>Boutique · Terminée</p>
            </div>
          </button>
        )
      })}

      {tab === 'done' && reserveDone.map(request => (
        <button
          key={request.id}
          type="button"
          onClick={() => setDetail({ kind: 'reserve', request })}
          className={`${guestMobile.listRow} ${guestMobile.divider}`}
        >
          <span className={guestMobile.iconCircle}>
            <ConciergeBell className="h-5 w-5 text-[#9A7B4F]" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-semibold">{request.title}</p>
            <p className={guestMobile.subtitle}>Conciergerie · Terminée</p>
          </div>
        </button>
      ))}

      {onContactService && (
        <button
          type="button"
          onClick={onContactService}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-medium text-[#9A7B4F]"
        >
          {contactVia === 'messages' ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <ClipboardList className="h-4 w-4" />
          )}
          {contactVia === 'messages' ? 'Contacter votre équipe' : 'Besoin d’aide ?'}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </MobileScreen>
  )
}
