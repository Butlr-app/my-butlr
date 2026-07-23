import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuestMessagesPanel } from './GuestMessagesPanel'
import type { StayMessagingPayload } from '@/lib/stayMessaging'

const messaging: StayMessagingPayload = {
  enabled: true,
  conversation: {
    id: 'conversation-1',
    reservation_id: 'reservation-1',
    property_id: 'property-1',
    recipient_role: 'concierge',
    recipient_user_id: 'staff-1',
    guest_name: 'Camille',
    status: 'open',
    last_message_at: '2026-07-15T10:00:00Z',
    created_at: '2026-07-15T09:00:00Z',
    updated_at: '2026-07-15T10:00:00Z',
  },
  contact: {
    role: 'concierge',
    full_name: 'Conciergerie Test',
    email: null,
    phone: null,
    avatar_url: null,
  },
  unreadCount: 1,
  messages: [
    {
      id: 'message-1',
      conversation_id: 'conversation-1',
      sender_type: 'staff',
      sender_user_id: 'staff-1',
      body: 'Cette sélection pourrait vous plaire.',
      message_type: 'product_card',
      payload: {
        catalog_item_id: 'product-1',
        title: 'Panier d’accueil',
        image_url: 'https://example.com/product.jpg',
        price_label: '120 €',
        subtitle: 'Courses',
      },
      read_at: null,
      created_at: '2026-07-15T10:00:00Z',
    },
  ],
}

describe('GuestMessagesPanel', () => {
  it('renders a product suggestion and opens the matching product', () => {
    const onOpenProduct = vi.fn()

    render(
      <GuestMessagesPanel
        messaging={messaging}
        readOnly
        onOpenProduct={onOpenProduct}
      />,
    )

    expect(screen.getByText('Panier d’accueil')).toBeInTheDocument()
    expect(screen.getAllByText('120 €').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /commander/i }))
    expect(onOpenProduct).toHaveBeenCalledWith('product-1')
  })

  it('renders a service suggestion with price and request CTA', () => {
    const onOpenService = vi.fn()
    const serviceMessaging: StayMessagingPayload = {
      ...messaging,
      messages: [{
        id: 'message-2',
        conversation_id: 'conversation-1',
        sender_type: 'staff',
        sender_user_id: 'staff-1',
        body: 'Je vous recommande cette activité.',
        message_type: 'service_card',
        payload: {
          property_service_id: 'service-assign-1',
          service_id: 'service-1',
          title: 'Location bateau journée',
          image_url: null,
          category: 'Activités',
          price_label: 'À partir de 1 200 €',
          subtitle: 'Skipper inclus',
        },
        read_at: null,
        created_at: '2026-07-15T10:05:00Z',
      }],
    }

    render(
      <GuestMessagesPanel
        messaging={serviceMessaging}
        readOnly
        onOpenService={onOpenService}
      />,
    )

    expect(screen.getByText('Location bateau journée')).toBeInTheDocument()
    expect(screen.getAllByText('À partir de 1 200 €').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /demander/i }))
    expect(onOpenService).toHaveBeenCalledWith('service-assign-1')
  })
})
