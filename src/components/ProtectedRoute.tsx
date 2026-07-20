import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { useRole, roleHome, type Role } from '@/lib/roleContext'
import { homePathForRole } from '@/lib/partnerPortal'

function AuthLoading() {
  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Chargement...</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode
  allow?: Role[]
}) {
  const location = useLocation()
  const { user, profile, loading, profileLoading } = useAuth()
  const { actualRole, roleLoading } = useRole()

  if (loading || profileLoading || (user && roleLoading)) return <AuthLoading />

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />
  }

  if (profile?.role === 'partner' && !allow?.includes('partner')) {
    return <Navigate to="/partner" replace />
  }

  if (
    profile?.role === 'owner'
    && !profile.onboarding_completed
    && !location.pathname.startsWith('/app/onboarding')
  ) {
    return <Navigate to="/onboarding" replace />
  }

  if (allow && !allow.includes(actualRole)) {
    return <Navigate to={roleHome(actualRole)} replace />
  }

  return <>{children}</>
}

export function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth()

  // Only block on initial auth load — not on silent profile refreshes during onboarding
  if (loading) return <AuthLoading />
  if (profileLoading && !profile) return <AuthLoading />

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />
  }

  if (profile?.role !== 'owner' || profile.onboarding_completed) {
    return <Navigate to={homePathForRole(profile?.role)} replace />
  }

  return <>{children}</>
}
