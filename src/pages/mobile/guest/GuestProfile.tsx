import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { useReservations, useContracts } from '@/lib/useSupabase'
import {
  User, Settings, FileText, Shield, HelpCircle, LogOut,
  ChevronRight, Calendar, Bell, Globe, Award, CreditCard
} from 'lucide-react'

export function GuestProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: reservations } = useReservations()
  const { data: contracts } = useContracts()

  const guestReservations = reservations.filter(r => r.guest_email === user?.email)
  const totalStays = guestReservations.filter(r => r.status === 'completed').length
  const totalSpent = guestReservations.reduce((sum, r) => sum + Number(r.total_amount), 0)

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'Recently'

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Personal Information', subtitle: 'Name, email, phone number' },
        { icon: Shield, label: 'Login & Security', subtitle: 'Password, two-factor auth' },
        { icon: CreditCard, label: 'Payment Methods', subtitle: 'Saved cards and billing' },
        { icon: Bell, label: 'Notifications', subtitle: 'Push, email, SMS preferences' },
        { icon: Globe, label: 'Language & Region', subtitle: 'English (EN)' },
      ],
    },
    {
      title: 'Your Activity',
      items: [
        { icon: Calendar, label: 'Stay History', subtitle: `${totalStays} completed stays` },
        { icon: FileText, label: 'Documents & Contracts', subtitle: `${contracts.length} documents` },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', subtitle: 'FAQs, contact support' },
        { icon: Settings, label: 'App Settings', subtitle: 'Theme, data, privacy' },
      ],
    },
  ]

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-8">
      {/* Profile Header */}
      <div className="bg-white px-5 pt-14 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg" style={{ width: 72, height: 72 }}>
            <span className="text-white font-bold text-2xl">
              {(user?.email?.[0] ?? 'G').toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {user?.email?.split('@')[0] ?? 'Guest'}
            </h1>
            <p className="text-sm text-gray-400">{user?.email ?? ''}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Premium Guest</span>
            </div>
          </div>
          <button className="text-sm font-semibold text-gray-900 border border-gray-200 rounded-xl px-3 py-2">
            Edit
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="text-center p-4 bg-[#FAFAF8] rounded-2xl">
            <p className="text-xl font-bold text-gray-900">{guestReservations.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Total Stays</p>
          </div>
          <div className="text-center p-4 bg-[#FAFAF8] rounded-2xl">
            <p className="text-xl font-bold text-gray-900">{totalStays}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Completed</p>
          </div>
          <div className="text-center p-4 bg-[#FAFAF8] rounded-2xl">
            <p className="text-xl font-bold text-gray-900">&euro;{(totalSpent / 1000).toFixed(0)}k</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Total Spent</p>
          </div>
        </div>
      </div>

      {/* Membership Card */}
      <div className="px-5 mt-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full translate-y-8 -translate-x-8" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Member since</p>
              <p className="text-sm font-semibold text-white mt-0.5">{memberSince}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Butlr Gold</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-5 mt-5 space-y-5">
        {menuSections.map(section => (
          <div key={section.title}>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-gray-50 transition-colors ${
                    idx < section.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FAFAF8] flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="px-5 mt-6">
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-semibold bg-white rounded-2xl border border-gray-100 shadow-sm active:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <p className="text-center text-[11px] text-gray-300 mt-6">My Butlr v1.0 &middot; Made with care</p>
    </div>
  )
}
