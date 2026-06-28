import { useReservations } from '@/lib/useSupabase'
import { Loader2, ArrowUpRight, DollarSign } from 'lucide-react'

export function PartnerEarnings() {
  const { data: reservations, loading } = useReservations()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const totalRevenue = reservations.reduce((sum, r) => sum + Number(r.total_amount), 0)
  const paidBookings = reservations.filter(r => r.payment_status === 'paid')
  const paidRevenue = paidBookings.reduce((sum, r) => sum + Number(r.total_amount), 0)
  const pendingRevenue = totalRevenue - paidRevenue

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()

  const monthlyData = months.map((name, idx) => {
    const monthReservations = reservations.filter(r => {
      const month = new Date(r.arrival).getMonth()
      return month === idx
    })
    const revenue = monthReservations.reduce((sum, r) => sum + Number(r.total_amount), 0)
    return { name, revenue, bookings: monthReservations.length }
  })

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Track your revenue</p>
      </div>

      {/* Revenue Summary */}
      <div className="px-5 mt-5">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400">Total Earnings</span>
            <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">&euro;{totalRevenue.toLocaleString()}</p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-400">Received</p>
              <p className="text-lg font-bold text-green-400">&euro;{paidRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-lg font-bold text-amber-400">&euro;{pendingRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Monthly Overview</h2>
        <div className="flex items-end gap-1 h-32">
          {monthlyData.map((d, idx) => (
            <div key={d.name} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-24">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    idx === currentMonth ? 'bg-rose-500' : 'bg-gray-200'
                  }`}
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 4)}%` }}
                />
              </div>
              <span className={`text-[9px] font-medium ${
                idx === currentMonth ? 'text-rose-500' : 'text-gray-400'
              }`}>
                {d.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 mt-6 pb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Recent Transactions</h2>
        <div className="space-y-2">
          {reservations.slice(0, 10).map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                r.payment_status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                <DollarSign className={`w-4 h-4 ${
                  r.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.guest_name}</p>
                <p className="text-xs text-gray-500">{r.arrival}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">&euro;{Number(r.total_amount).toLocaleString()}</p>
                <span className={`text-[10px] font-medium ${
                  r.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {r.payment_status}
                </span>
              </div>
            </div>
          ))}

          {reservations.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
