import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function Login() {
  const navigate = useNavigate()

  return (
    <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); navigate('/app') }}
          className="space-y-4"
        >
          <Input label="Email" type="email" placeholder="you@company.com" required />
          <Input label="Password" type="password" placeholder="••••••••" required />
          <Button type="submit" size="md" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No account?{' '}
          <Link to="/signup" className="text-foreground hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  )
}
