import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { useRole } from '@/lib/roleContext'
import { useProperties } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { Loader2, Building2, Monitor, LogOut, ChevronRight } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  agency: 'Agency',
  house_manager: 'House Manager',
  concierge: 'Concierge',
  partner: 'Partner',
  guest: 'Guest',
}

export function HmProfile() {
  const { user, signOut } = useAuth()
  const { role } = useRole()
  const navigate = useNavigate()
  const { data: rawProperties, loading: lProps } = useProperties()
  const { filterProperties, loading: lRole } = useRoleFilter()

  if (lProps || lRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const properties = filterProperties(rawProperties)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-14 pb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <span className="text-white font-bold text-lg">
            {(user?.email?.[0] ?? 'M').toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
            {user?.email?.split('@')[0] ?? 'Manager'}
          </h1>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            {ROLE_LABEL[role] ?? role}
          </span>
        </div>
      </div>

      {/* Assigned properties */}
      <div className="px-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">My properties</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-4">No assigned properties</p>
        ) : (
          <div className="space-y-3">
            {properties.map(p => (
              <div key={p.id} className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{p.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 mt-6 pb-8 space-y-3">
        <Link
          to="/app"
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-blue-500" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-gray-900">Open desktop dashboard</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-red-600">Sign out</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </div>
  )
}
