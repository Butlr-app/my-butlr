import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold font-mono mb-4">404</p>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button variant="secondary" size="sm">Home</Button>
          </Link>
          <Link to="/app">
            <Button size="sm">Go to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
