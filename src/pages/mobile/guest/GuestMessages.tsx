import { useReservations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { ChatThread } from '@/components/ChatThread'
import { Loader2, MessageSquare, Shield } from 'lucide-react'

export function GuestMessages() {
  const { data: reservations, loading } = useReservations()
  const { user } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
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
      <div className="bg-[#FAFAF8] min-h-screen">
        <div className="px-5 pt-14 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <p className="text-sm text-gray-400 mt-1">Chat with your concierge</p>
        </div>
        <div className="flex flex-col items-center justify-center px-5 pt-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <MessageSquare className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">No messages yet</h3>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Once you have an active reservation, you can chat directly with your house manager here.
          </p>
          <div className="flex items-center gap-2 mt-6 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100">
            <Shield className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-700">All messages are private and encrypted</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Your Concierge</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-medium">
                Manager
              </span>
              <p className="text-xs text-gray-400">
                {currentReservation.property?.name ?? 'Your stay'}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-gray-400">Online</span>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatThread
          reservationId={currentReservation.id}
          userId={user?.id}
          senderName={currentReservation.guest_name || 'Guest'}
          senderRole="guest"
          subtitle="Your concierge"
          showServicePicker={false}
        />
      </div>
    </div>
  )
}
