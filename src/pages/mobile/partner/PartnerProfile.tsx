import { useAuth } from '@/lib/authContext'
import { useReservations } from '@/lib/useSupabase'
import {
  User, Settings, Shield, HelpCircle, LogOut, ChevronRight,
  Building2, Star, Award, CreditCard, Bell, FileText, BarChart3
} from 'lucide-react'

export function PartnerProfile() {
  const { user, signOut } = useAuth()
  const { data: reservations } = useReservations()

  const totalRevenue = reservations.reduce((sum, r) => sum + Number(r.total_amount), 0)
  const totalBookings = reservations.length

  const menuSections = [
    {
      title: 'Business',
      items: [
        { icon: Building2, label: 'Business Information', subtitle: 'Company name, address, tax ID' },
        { icon: CreditCard, label: 'Payment & Banking', subtitle: 'Bank account, payment schedule' },
        { icon: BarChart3, label: 'Analytics', subtitle: 'Performance insights' },
        { icon: FileText, label: 'Invoices', subtitle: 'Download past invoices' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Personal Information', subtitle: 'Name, email, phone' },
        { icon: Shield, label: 'Security', subtitle: 'Password, 2FA' },
        { icon: Bell, label: 'Notifications', subtitle: 'Alerts and preferences' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', subtitle: 'FAQs, contact support' },
        { icon: Settings, label: 'Settings', subtitle: 'App configuration' },
      ],
    },
  ]

  return (
    <div className="bg-gray-950 min-h-screen pb-8">
      {/* Profile Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20" style={{ width: 72, height: 72 }}>
            <span className="text-white font-bold text-2xl">
              {(user?.email?.[0] ?? 'P').toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {user?.email?.split('@')[0] ?? 'Partner'}
            </h1>
            <p className="text-sm text-gray-500">{user?.email ?? ''}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">Verified Partner</span>
            </div>
          </div>
          <button className="text-sm font-semibold text-white border border-gray-700 rounded-xl px-3 py-2 active:bg-gray-800 transition-colors">
            Edit
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="text-center p-4 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-xl font-bold text-white">{totalBookings}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Bookings</p>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-xl font-bold text-white">&euro;{(totalRevenue / 1000).toFixed(0)}k</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Revenue</p>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="w-4 h-4 fill-current text-amber-400" />
              <p className="text-xl font-bold text-white">4.9</p>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Rating</p>
          </div>
        </div>
      </div>

      {/* Membership Card */}
      <div className="px-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] text-amber-900/60 uppercase tracking-wider font-bold">Partner Status</p>
              <p className="text-lg font-bold text-white mt-0.5">Premium Partner</p>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-5 h-5 text-white" />
              <span className="text-sm font-bold text-white">PRO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-5 mt-6 space-y-5">
        {menuSections.map(section => (
          <div key={section.title}>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-gray-800 transition-colors ${
                    idx < section.items.length - 1 ? 'border-b border-gray-800' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="px-5 mt-6">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-400 font-semibold bg-gray-900 rounded-2xl border border-gray-800 active:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <p className="text-center text-[11px] text-gray-700 mt-6">My Butlr Partner v1.0</p>
    </div>
  )
}
