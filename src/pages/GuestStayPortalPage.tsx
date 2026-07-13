import { useParams } from 'react-router-dom'
import { GuestPortalPreview } from '@/components/guest/GuestPortalPreview'
import { useGuestStayPortal } from '@/lib/useGuestStayPortal'

export function GuestStayPortalPage() {
  const { token } = useParams<{ token: string }>()
  const portal = useGuestStayPortal(token)

  if (portal.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <p className="font-['Cormorant_Garamond',Georgia,serif] text-xl text-[#1A1614]/60">
          Chargement de votre séjour…
        </p>
      </div>
    )
  }

  if (portal.error || !portal.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1614] px-6 text-center">
        <div className="max-w-sm">
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-semibold text-white">
            Portail indisponible
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {portal.error || 'Ce lien n’est plus valide. Contactez votre conciergerie.'}
          </p>
        </div>
      </div>
    )
  }

  const {
    reservation,
    settings,
    guides,
    propertyServices,
    boutiqueCategories,
    boutiqueCatalog,
    storeOrders,
    storeOrderItems,
    reserve,
    serviceRequests,
    transactions,
    recommendedAmount,
    messaging,
  } = portal.data

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col shadow-2xl">
        <GuestPortalPreview
          propertyName={reservation.property_name}
          propertyImageUrl={reservation.property_image_url}
          settings={settings}
          guides={guides}
          propertyServices={propertyServices}
          guestName={reservation.guest_name}
          reservationContext={{
            reservationId: reservation.id,
            propertyId: reservation.property_id,
            arrival: reservation.arrival,
            departure: reservation.departure,
            maxGuests: reservation.max_guests ?? reservation.guests_count,
            propertyType: reservation.property_type,
            interactive: true,
          }}
          stayReserveOverride={{
            reserve,
            requests: serviceRequests,
            transactions,
            recommendedAmount,
            loading: false,
            createReserve: portal.createReserve,
            topUp: portal.topUp,
            createRequest: portal.createRequest,
            approveRequest: portal.approveRequest,
          }}
          boutiqueOverride={{
            categories: boutiqueCategories,
            catalog: boutiqueCatalog,
            orders: storeOrders,
            orderItems: storeOrderItems,
            loading: false,
            checkout: portal.checkoutBoutique,
            approveQuote: portal.approveStoreQuote,
          }}
          messagingOverride={{
            messaging,
            onSend: portal.sendMessage,
            onMarkRead: portal.markMessagesRead,
          }}
          cartStorageKey={token}
        />
      </div>
    </div>
  )
}
