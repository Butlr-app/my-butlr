import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/authContext'
import { useState } from 'react'
import { formatAuthError } from '@/lib/authErrors'
import { homePathForRole } from '@/lib/partnerPortal'
import { supabase } from '@/lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string

    const { error } = await signIn(email, password)
    if (error) {
      setLoading(false)
      setError(formatAuthError(error.message))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    let role: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      role = profile?.role ?? null
    }
    setLoading(false)
    navigate(homePathForRole(role))
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" name="email" type="email" placeholder="you@company.com" required />
          <div className="space-y-1.5">
            <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="md" className="w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => navigate('/magic-link')}
        >
          Se connecter avec un lien magique
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas de compte ?{' '}
          <Link to="/signup" className="text-foreground hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
