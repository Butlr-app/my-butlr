import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/authContext'
import {
  bootstrapRecoverySession,
  clearRecoveryCallbackFromUrl,
  hasRecoveryCallback,
} from '@/lib/authCallback'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

type ResetStatus = 'checking' | 'ready' | 'invalid'

export function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<ResetStatus>('checking')

  useEffect(() => {
    let cancelled = false

    const finish = (next: ResetStatus, message = '') => {
      if (cancelled) return
      setStatus(next)
      if (message) setError(message)
    }

    const verify = async () => {
      if (!hasRecoveryCallback()) {
        const { data: { session } } = await supabase.auth.getSession()
        finish(session ? 'ready' : 'invalid')
        return
      }

      const result = await bootstrapRecoverySession()
      if (result.ok) {
        finish('ready')
        return
      }

      finish('invalid', result.error)
    }

    void verify()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session && hasRecoveryCallback())) {
        finish('ready')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await updatePassword(password)
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    clearRecoveryCallbackFromUrl()
    navigate('/app', { replace: true })
  }

  if (status === 'checking') {
    return (
      <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Vérification du lien…</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold">Lien invalide ou expiré</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Demandez un nouveau lien de réinitialisation pour continuer.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>
          )}
          <Button
            type="button"
            size="md"
            className="mt-6 w-full"
            onClick={() => navigate('/forgot-password')}
          >
            Mot de passe oublié
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

  return (
    <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-info-soft">
            <KeyRound className="h-5 w-5 text-info" />
          </div>
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="mt-2 text-sm text-muted-foreground">
            Choisissez un nouveau mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nouveau mot de passe"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirmer le mot de passe"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="md" className="w-full" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-foreground hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
