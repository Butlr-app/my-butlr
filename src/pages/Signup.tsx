import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export function Signup() {
  const navigate = useNavigate()

  return (
    <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Create your account</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); navigate('/app') }}
          className="space-y-4"
        >
          <Input label="Full name" placeholder="Jean Dupont" required />
          <Input label="Email" type="email" placeholder="you@company.com" required />
          <Input label="Password" type="password" placeholder="••••••••" required />
          <Select
            label="Role"
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'house_manager', label: 'House Manager' },
              { value: 'concierge', label: 'Concierge' },
              { value: 'agency', label: 'Agency' },
              { value: 'partner', label: 'Partner' },
            ]}
          />
          <Button type="submit" size="md" className="w-full">
            Create account
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
