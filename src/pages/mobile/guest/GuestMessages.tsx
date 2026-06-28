import { useReservations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { ChatThread } from '@/components/ChatThread'
import { Loader2, MessageSquare } from 'lucide-react'

export function GuestMessages() {
  const { data: reservations, loading } = useReservations()
  const { user } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const guestReservations = reservations.filter(r => r.guest_email === user?.email)
  const currentReservation = guestReservations.find(r =>
    r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
  ) ?? guestReservations[0]

  if (!currentReservation) {
    return (
      <div className="bg-white min-h-screen">
        <div className="px-5 pt-12 pb-4 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-5 pt-24">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No messages yet</h3>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Messages will appear here once you have an active reservation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Chat with your host &middot; {currentReservation.property?.name ?? 'Your stay'}
        </p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatThread
          reservationId={currentReservation.id}
          userId={user?.id}
          senderName={currentReservation.guest_name || 'Guest'}
          subtitle="Your host"
        />
      </div>
    </div>
  )
}
