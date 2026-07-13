import { Search, Bell, Moon, Sun, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, type Role } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'

interface TopbarProps {
  title: string
}

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  house_manager: 'House Manager',
  concierge: 'Concierge',
  agency: 'Agency',
  partner: 'Partner',
  guest: 'Guest',
}

export function Topbar({ title }: TopbarProps) {
  const [dark, setDark] = useState(true)
  const { role } = useRole()
  const { signOut, user } = useAuth()
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
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <h1 className="text-lg font-bold">{title}</h1>

      <div className="flex items-center gap-3">
        <span className="h-8 px-2 bg-muted rounded-md text-xs font-mono uppercase tracking-wider flex items-center">
          {roleLabels[role]}
        </span>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
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

        <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" title={user?.email ?? ''}>
          <User className="w-4 h-4" />
        </button>

        <button onClick={handleSignOut} className="p-2 rounded-md hover:bg-muted transition-colors" title="Sign out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
