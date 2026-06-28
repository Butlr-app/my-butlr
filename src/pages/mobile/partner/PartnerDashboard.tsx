import { useReservations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { Loader2, TrendingUp, Calendar, DollarSign, Star, ArrowUpRight, Clock } from 'lucide-react'

export function PartnerDashboard() {
  const { data: reservations, loading: lRes } = useReservations()
  const { user } = useAuth()

  const loading = lRes

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const totalBookings = reservations.length
  const confirmedBookings = reservations.filter(r => r.status === 'confirmed' || r.status === 'in_progress').length
  const totalRevenue = reservations.reduce((sum, r) => sum + Number(r.total_amount), 0)
  const avgRating = 4.8

  const recentBookings = reservations
    .filter(r => r.status === 'confirmed' || r.status === 'pending')
    .slice(0, 5)

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-400">Good morning</p>
            <h1 className="text-xl font-bold text-white">
              {user?.email?.split('@')[0] ?? 'Partner'}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {(user?.email?.[0] ?? 'P').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">Total Revenue</span>
            <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">&euro;{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Across all bookings</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-5 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{totalBookings}</p>
            <p className="text-[10px] text-gray-500">Bookings</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{confirmedBookings}</p>
            <p className="text-[10px] text-gray-500">Active</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-2">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">{avgRating}</p>
            <p className="text-[10px] text-gray-500">Rating</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">New booking</p>
              <p className="text-[10px] text-gray-500">Accept requests</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Earnings</p>
              <p className="text-[10px] text-gray-500">View payouts</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="px-5 mt-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
          <button className="text-sm font-medium text-rose-500">See all</button>
        </div>
        <div className="space-y-3">
          {recentBookings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            recentBookings.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.guest_name}</p>
                  <p className="text-xs text-gray-500">{r.property?.name ?? 'Property'} &middot; {r.arrival}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">&euro;{Number(r.total_amount).toLocaleString()}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
