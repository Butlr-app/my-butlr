import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { GuestPortalPreview } from '@/components/guest/GuestPortalPreview'
import { useGuestStayPortal } from '@/lib/useGuestStayPortal'
import { tGuest } from '@/lib/guestLanguage'

export function GuestStayPortalPage() {
  const { token } = useParams<{ token: string }>()
  const [activeTab, setActiveTab] = useState('home')
  const portal = useGuestStayPortal(token, activeTab)
  const browserLang = typeof navigator !== 'undefined' ? navigator.language : null

  if (portal.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-[15px] text-[#717171]">
          {tGuest('portal.loading', browserLang)}
        </p>
      </div>
    )
  }

  if (portal.error || !portal.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1614] px-6 text-center">
        <div className="max-w-sm">
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-semibold text-white">
            {tGuest('portal.unavailableTitle', browserLang)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {portal.error || tGuest('portal.unavailableBody', browserLang)}
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
    recommendedProperties,
  } = portal.data

  return (
    <div className="h-dvh overflow-hidden bg-[#E9E3DA]">
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-[#F6F1E9] shadow-[0_0_40px_rgba(7,26,47,0.12)]">
        <GuestPortalPreview
          fullViewport
          propertyName={reservation.property_name}
          propertyImageUrl={reservation.property_image_url}
          guestLanguage={reservation.guest_language}
          settings={settings}
          guides={guides}
          propertyServices={propertyServices}
          guestName={reservation.guest_name}
          recommendedProperties={recommendedProperties}
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
            bookDirectService: portal.bookDirectService,
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
            guestToken: token,
            guestLanguage: reservation.guest_language,
            onSend: portal.sendMessage,
            onMarkRead: portal.markMessagesRead,
          }}
          onActiveTabChange={setActiveTab}
        />
      </div>
    </div>
  )
}
