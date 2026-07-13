import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/authContext'
import { useState } from 'react'
import { isEmailRateLimitError } from '@/lib/authErrors'

export function MagicLink() {
  const { signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setRateLimited(false)
    setLoading(true)

    const { error: magicLinkError, rateLimited: limited } = await signInWithMagicLink(email.trim())
    setLoading(false)

    if (magicLinkError) {
      setError(magicLinkError.message)
      setRateLimited(Boolean(limited) || isEmailRateLimitError(magicLinkError.message))
      return
    }

    setSent(true)
  }

  const handleResend = async () => {
    setError('')
    setRateLimited(false)
    setLoading(true)
    const { error: magicLinkError, rateLimited: limited } = await signInWithMagicLink(email.trim())
    setLoading(false)
    if (magicLinkError) {
      setError(magicLinkError.message)
      setRateLimited(Boolean(limited) || isEmailRateLimitError(magicLinkError.message))
    }
  }

  if (sent) {
    return (
      <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-info-soft">
            <Sparkles className="h-6 w-6 text-info" />
          </div>

          <span className="text-xl font-bold tracking-tight">butlr</span>
          <h1 className="mt-4 mb-2 text-lg font-semibold">Lien magique envoyé</h1>
          <p className="mb-1 text-sm text-muted-foreground">
            Ouvrez le lien reçu pour vous connecter sans mot de passe :
          </p>
          <p className="mb-6 text-sm font-medium">{email}</p>

          <div className="mb-6 space-y-2 rounded-lg border border-border bg-card p-4 text-left">
            <p className="text-sm text-muted-foreground">
              Le lien est valable quelques minutes. Cliquez dessus sur le même appareil si possible.
            </p>
            <p className="text-xs text-muted-foreground">
              Vérifiez vos spams si le message n’arrive pas rapidement.
            </p>
          </div>

          {error && (
            <p role="alert" className="mb-4 text-xs text-destructive">{error}</p>
          )}

          <div className="mb-6 flex flex-col gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              disabled={loading || rateLimited}
              onClick={handleResend}
            >
              {loading ? 'Renvoi…' : 'Renvoyer le lien'}
            </Button>
            <Link to="/login" className="text-sm text-foreground hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-info-soft">
            <Sparkles className="h-5 w-5 text-info" />
          </div>
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="mt-2 text-sm text-muted-foreground">
            Connexion sans mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">{error}</p>
          )}
          {rateLimited && (
            <div className="rounded-lg border border-border bg-card p-4 text-left text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Limite d’envoi atteinte</p>
              <p className="mt-2">
                Attendez environ 1 heure avant de redemander un lien magique.
              </p>
            </div>
          )}
          <Button type="submit" size="md" className="w-full" disabled={loading || rateLimited}>
            {loading ? 'Envoi…' : 'Envoyer le lien magique'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-foreground hover:underline">
            Connexion avec mot de passe
          </Link>
        </p>
      </div>
    </div>
  )
}
