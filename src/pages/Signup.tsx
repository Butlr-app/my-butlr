import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { useState } from 'react'
import { Mail } from 'lucide-react'

export function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const fullName = form.get('fullName') as string
    const email = form.get('email') as string
    const password = form.get('password') as string
    const role = form.get('role') as string

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error, needsConfirmation } = await signUp(email, password, fullName, role)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else if (needsConfirmation) {
      setSubmittedEmail(email)
      setNeedsConfirmation(true)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/app'), 1500)
    }
  }

  if (needsConfirmation) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-5 h-5 text-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{submittedEmail}</span>.
            Click it to activate your account, then sign in.
          </p>
          <Button size="md" className="w-full mt-6" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-success text-lg">✓</span>
          </div>
          <h2 className="text-lg font-semibold mb-2">Account created</h2>
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full name" name="fullName" placeholder="Jean Dupont" required />
          <Input label="Email" name="email" type="email" placeholder="you@company.com" required />
          <Input label="Password" name="password" type="password" placeholder="••••••••" required />
          <Select
            label="Role"
            name="role"
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'house_manager', label: 'House Manager' },
              { value: 'concierge', label: 'Concierge' },
              { value: 'agency', label: 'Agency' },
              { value: 'partner', label: 'Partner' },
            ]}
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="md" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
