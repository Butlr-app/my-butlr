import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { useRole, roleHome, type Role } from '@/lib/roleContext'

export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode
  allow?: Role[]
}) {
  const { user, loading } = useAuth()
  const { actualRole, roleLoading } = useRole()

  if (loading || (user && roleLoading)) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allow && !allow.includes(actualRole)) {
    return <Navigate to={roleHome(actualRole)} replace />
  }

  return <>{children}</>
}
