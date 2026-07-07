import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/lib/authContext'
import { supabase } from '@/lib/supabase'
import { roleHome, type Role } from '@/lib/roleContext'
import { useState } from 'react'

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
      setError(error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    let dest = '/app'
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      dest = roleHome(data?.role as Role | undefined)
    }
    setLoading(false)
    navigate(dest)
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" name="email" type="email" placeholder="you@company.com" required />
          <Input label="Password" name="password" type="password" placeholder="••••••••" required />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="md" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link to="/forgot-password" className="text-foreground hover:underline">Forgot your password?</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/signup" className="text-foreground hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
