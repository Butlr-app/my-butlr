import { Search, Bell, Moon, Sun, User, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, type Role } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useSearch } from '@/lib/searchContext'

interface TopbarProps {
  title: string
  onMenuClick?: () => void
}

const roles: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'house_manager', label: 'House Manager' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'agency', label: 'Agency' },
  { value: 'partner', label: 'Partner' },
  { value: 'guest', label: 'Guest' },
]

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const [dark, setDark] = useState(true)
  const { role, setRole } = useRole()
  const { signOut, user } = useAuth()
  const { query, setQuery } = useSearch()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleTheme = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 rounded-md hover:bg-muted transition-colors lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="h-8 px-2 bg-muted border-0 rounded-md text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-ring hidden sm:block"
        >
          {roles.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-9 pl-9 pr-4 bg-muted border-0 rounded-md text-sm w-56 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <button className="p-2 rounded-md hover:bg-muted transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>

        <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hidden sm:flex" title={user?.email ?? ''}>
          <User className="w-4 h-4" />
        </button>

        <button onClick={handleSignOut} className="p-2 rounded-md hover:bg-muted transition-colors" title="Sign out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
