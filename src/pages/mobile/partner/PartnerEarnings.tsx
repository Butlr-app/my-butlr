import { usePartnerPortal } from '@/lib/useSupabase'
import { Loader2, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PartnerUnlinked } from './PartnerUnlinked'

export function PartnerEarnings() {
  const { partner, payments, loading } = usePartnerPortal()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!partner) {
    return <PartnerUnlinked title="Earnings" />
  }

  const rate = Number(partner.commission)
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const paidRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
  const unpaidRevenue = totalRevenue - paidRevenue
  const commission = Math.round((totalRevenue * rate) / 100 * 100) / 100
  const netEarnings = totalRevenue - commission

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyRevenue = months.map((_, idx) => {
    return payments.filter(p => { const d = new Date(p.date); return d.getFullYear() === currentYear && d.getMonth() === idx })
      .reduce((sum, p) => sum + Number(p.amount), 0)
  })
  const maxMonthly = Math.max(...monthlyRevenue, 1)

  const transactions = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Track your revenue and payments</p>
      </div>

      {/* Revenue Summary */}
      <div className="px-5 mt-2">
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500 font-medium">Net Earnings</span>
            <div className="flex items-center gap-1 bg-emerald-500/10 rounded-full px-2 py-0.5">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">after {rate}%</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">&euro;{netEarnings.toLocaleString()}</p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-gray-800 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-medium">Gross</p>
              <p className="text-sm font-bold text-white mt-1">&euro;{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-medium">Received</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">&euro;{paidRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-gray-500 font-medium">Pending</p>
              <p className="text-sm font-bold text-amber-400 mt-1">&euro;{unpaidRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="px-5 mt-5">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white">Monthly Revenue</h3>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-gray-500">{new Date().getFullYear()}</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-32">
            {monthlyRevenue.map((rev, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex flex-col justify-end h-24 relative group">
                  {rev > 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap">
                      &euro;{rev.toLocaleString()}
                    </div>
                  )}
                  <div
                    className={`w-full rounded-sm transition-all ${
                      idx === currentMonth ? 'bg-amber-500 rounded-t-md' :
                      rev > 0 ? 'bg-gray-700' : 'bg-gray-800'
                    }`}
                    style={{ height: `${Math.max((rev / maxMonthly) * 100, 4)}%` }}
                  />
                </div>
                <span className={`text-[9px] font-medium ${idx === currentMonth ? 'text-amber-500' : 'text-gray-600'}`}>
                  {months[idx].substring(0, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commission Info */}
      <div className="px-5 mt-5">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-500/80 font-medium">Platform Commission ({rate}%)</p>
              <p className="text-lg font-bold text-amber-400 mt-0.5">&euro;{commission.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 mt-5 pb-8">
        <h3 className="text-sm font-bold text-white mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800">
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          ) : (
            transactions.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-900 border border-gray-800">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  p.status === 'paid' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                }`}>
                  {p.status === 'paid' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.guest_name}</p>
                  <p className="text-[10px] text-gray-500">
                    {p.type} · {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${p.status === 'paid' ? 'text-emerald-400' : 'text-white'}`}>
                    {p.status === 'paid' ? '+' : ''}&euro;{Number(p.amount).toLocaleString()}
                  </p>
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${
                    p.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {p.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
