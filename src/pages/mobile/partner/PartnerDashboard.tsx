import { useReservations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { Loader2, TrendingUp, Calendar, Star, ArrowUpRight, Clock, ChevronRight } from 'lucide-react'

export function PartnerDashboard() {
  const { data: reservations, loading: lRes } = useReservations()
  const { user } = useAuth()

  const loading = lRes

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const totalBookings = reservations.length
  const confirmedBookings = reservations.filter(r => r.status === 'confirmed' || r.status === 'in_progress').length
  const totalRevenue = reservations.reduce((sum, r) => sum + Number(r.total_amount), 0)
  const paidRevenue = reservations.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + Number(r.total_amount), 0)
  const pendingCount = reservations.filter(r => r.status === 'pending').length

  const recentBookings = reservations
    .filter(r => r.status === 'confirmed' || r.status === 'pending')
    .slice(0, 5)

  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const currentMonth = new Date().getMonth()
  const monthlyRevenue = months.map((_, idx) => {
    return reservations.filter(r => new Date(r.arrival).getMonth() === idx)
      .reduce((sum, r) => sum + Number(r.total_amount), 0)
  })
  const maxMonthly = Math.max(...monthlyRevenue, 1)

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {user?.email?.split('@')[0] ?? 'Partner'}
            </h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-white font-bold text-sm">
              {(user?.email?.[0] ?? 'P').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="px-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full translate-y-12 -translate-x-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-amber-900/80 font-medium">Total Revenue</span>
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                <ArrowUpRight className="w-3 h-3 text-white" />
                <span className="text-xs font-bold text-white">+12%</span>
              </div>
            </div>
            <p className="text-4xl font-bold text-white tracking-tight">&euro;{totalRevenue.toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                <p className="text-[11px] text-white/70 font-medium">Received</p>
                <p className="text-lg font-bold text-white mt-0.5">&euro;{paidRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                <p className="text-[11px] text-white/70 font-medium">Pending</p>
                <p className="text-lg font-bold text-white mt-0.5">&euro;{(totalRevenue - paidRevenue).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4 text-center border border-gray-800">
            <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{totalBookings}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Bookings</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center border border-gray-800">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{confirmedBookings}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Active</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 text-center border border-gray-800">
            <Star className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">4.9</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Rating</p>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="px-5 mt-5">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Revenue Trend</h3>
            <span className="text-[10px] text-gray-500 font-medium">This year</span>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {monthlyRevenue.map((rev, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-16">
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      idx === currentMonth ? 'bg-amber-500' :
                      idx < currentMonth ? 'bg-gray-700' : 'bg-gray-800'
                    }`}
                    style={{ height: `${Math.max((rev / maxMonthly) * 100, 6)}%` }}
                  />
                </div>
                <span className={`text-[8px] font-medium ${idx === currentMonth ? 'text-amber-500' : 'text-gray-600'}`}>
                  {months[idx]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      {pendingCount > 0 && (
        <div className="px-5 mt-5">
          <button className="w-full flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 active:bg-amber-500/15 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-amber-400">{pendingCount} pending request{pendingCount > 1 ? 's' : ''}</p>
              <p className="text-[11px] text-amber-500/60">Tap to review and respond</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500/60" />
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div className="px-5 mt-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Recent Activity</h2>
          <button className="text-xs font-medium text-amber-500">View all</button>
        </div>
        <div className="space-y-3">
          {recentBookings.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800">
              <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            recentBookings.map(r => (
              <div key={r.id} className="flex items-center gap-3.5 p-4 rounded-2xl bg-gray-900 border border-gray-800 active:bg-gray-800 transition-colors">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={r.property?.image_url ?? '/images/villa-hero.jpg'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.guest_name}</p>
                  <p className="text-[11px] text-gray-500">{r.property?.name ?? 'Property'} &middot; {new Date(r.arrival).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">&euro;{Number(r.total_amount).toLocaleString()}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    r.status === 'confirmed' ? 'text-emerald-500' : 'text-amber-500'
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
