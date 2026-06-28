import { useAuth } from '@/lib/authContext'
import { useReservations } from '@/lib/useSupabase'
import {
  User, Settings, Star, Award, Bell,
  ChevronRight, LogOut, HelpCircle, FileText, Globe, Shield
} from 'lucide-react'

export function PartnerProfile() {
  const { user, signOut } = useAuth()
  const { data: reservations } = useReservations()

  const totalBookings = reservations.length
  const totalRevenue = reservations.reduce((sum, r) => sum + Number(r.total_amount), 0)

  const menuSections = [
    {
      title: 'Business',
      items: [
        { icon: User, label: 'Business profile', subtitle: 'Company info, logo' },
        { icon: FileText, label: 'Documents', subtitle: 'Contracts, invoices' },
        { icon: Award, label: 'Certifications', subtitle: 'Badges, verifications' },
        { icon: Star, label: 'Reviews', subtitle: 'Guest feedback' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: Bell, label: 'Notifications', subtitle: 'Push, email, SMS' },
        { icon: Globe, label: 'Language', subtitle: 'English' },
        { icon: Shield, label: 'Security', subtitle: 'Password, 2FA' },
        { icon: Settings, label: 'App settings', subtitle: 'Theme, preferences' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', subtitle: 'FAQs, contact us' },
      ],
    },
  ]

  return (
    <div className="bg-white min-h-screen pb-6">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {(user?.email?.[0] ?? 'P').toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {user?.email?.split('@')[0] ?? 'Partner'}
            </h1>
            <p className="text-sm text-gray-500">{user?.email ?? ''}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Award className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs font-medium text-rose-500">Verified Partner</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-gray-900">{totalBookings}</p>
            <p className="text-xs text-gray-500">Bookings</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-gray-900">&euro;{(totalRevenue / 1000).toFixed(0)}k</p>
            <p className="text-xs text-gray-500">Revenue</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-gray-900">4.8</p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-5 mt-4 space-y-6">
        {menuSections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-100 transition-colors ${
                    idx < section.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <item.icon className="w-4.5 h-4.5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
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
          className="w-full flex items-center justify-center gap-2 py-3.5 text-red-500 font-medium bg-red-50 rounded-xl active:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">My Butlr Partner v1.0</p>
    </div>
  )
}
