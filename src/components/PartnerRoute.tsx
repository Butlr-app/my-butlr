import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import { isPartnerProfileComplete } from '@/lib/partnerPortal'
import { useEffect, useState } from 'react'
import { fetchMyPartnerProfile } from '@/lib/partnerPortal'
import type { PartnerRecord } from '@/lib/partners'

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

export function PartnerRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth()

  if (loading || profileLoading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />
  }
  if (profile?.role !== 'partner') {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}

/** Redirects partners with incomplete profile to onboarding (except when already there). */
export function PartnerOnboardingGate({
  children,
  allowIncomplete = false,
}: {
  children: React.ReactNode
  allowIncomplete?: boolean
}) {
  const [partner, setPartner] = useState<PartnerRecord | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    fetchMyPartnerProfile().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setPartner(null)
        return
      }
      setPartner((data as PartnerRecord | null) ?? null)
    })
    return () => { cancelled = true }
  }, [])

  if (partner === undefined) return <AuthLoading />

  if (loadError) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium">Impossible de charger votre fiche</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <button
            type="button"
            className="mt-4 text-sm underline"
            onClick={() => {
              setPartner(undefined)
              setLoadError(null)
              fetchMyPartnerProfile().then(({ data, error }) => {
                if (error) {
                  setLoadError(error.message)
                  setPartner(null)
                  return
                }
                setPartner((data as PartnerRecord | null) ?? null)
              })
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!allowIncomplete && !isPartnerProfileComplete(partner)) {
    return <Navigate to="/partner/onboarding" replace />
  }

  if (allowIncomplete && isPartnerProfileComplete(partner)) {
    return <Navigate to="/partner" replace />
  }

  return <>{children}</>
}
