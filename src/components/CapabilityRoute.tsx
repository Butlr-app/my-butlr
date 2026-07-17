import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from '@/lib/permissionsContext'

function PermissionsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Chargement des droits…
        </p>
      </div>
    </div>
  )
}

/** Redirects away from routes the current role cannot access. */
export function CapabilityRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { canPath, loading } = usePermissions()

  if (loading) return <PermissionsLoading />
  if (!canPath(location.pathname)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
