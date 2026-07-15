import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import {
  bootstrapAuthSession,
  clearAuthCallbackFromUrl,
  getAuthCallbackType,
} from '@/lib/authCallback'
import { supabase } from '@/lib/supabase'
import { formatAuthError } from '@/lib/authErrors'

type CallbackStatus = 'checking' | 'error'

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const verify = async () => {
      const type = getAuthCallbackType()

      if (type === 'recovery') {
        navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true })
        return
      }

      const hasParams = Boolean(window.location.search || window.location.hash)
      if (!hasParams && !type) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!cancelled) {
          if (session) navigate('/app', { replace: true })
          else {
            setStatus('error')
            setError('Aucun lien de connexion détecté.')
          }
        }
        return
      }

      const result = await bootstrapAuthSession(type ?? 'magiclink')
      if (cancelled) return

      if (result.ok) {
        clearAuthCallbackFromUrl()
        navigate('/app', { replace: true })
        return
      }

      setStatus('error')
      setError(result.error ? formatAuthError(result.error) : 'Ce lien magique est invalide ou a expiré.')
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (status === 'checking') {
    return (
      <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Connexion en cours…</p>
      </div>
    )
  }

  return (
    <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <Sparkles className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-lg font-semibold">Connexion impossible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error}
        </p>
        <Button
          type="button"
          size="md"
          className="mt-6 w-full"
          onClick={() => navigate('/magic-link')}
        >
          Demander un nouveau lien
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/login" className="text-foreground hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
