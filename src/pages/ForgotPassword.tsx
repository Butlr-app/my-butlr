import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export function ForgotPassword() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-success text-lg">&#10003;</span>
          </div>
          <h2 className="text-lg font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a password reset link to your email address. Click the link to set a new password.
          </p>
          <Link to="/login" className="text-sm text-foreground hover:underline">Back to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" name="email" type="email" placeholder="you@company.com" required />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="md" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-foreground hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
