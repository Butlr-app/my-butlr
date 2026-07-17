import { Menu, Moon, Sun, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, type Role } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'

interface TopbarProps {
  title: string
  onOpenMobileMenu: () => void
}

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  house_manager: 'House Manager',
  concierge: 'Concierge',
  agency: 'Agency',
  partner: 'Partner',
  guest: 'Guest',
}

const THEME_KEY = 'my-butlr-theme'

export function Topbar({ title, onOpenMobileMenu }: TopbarProps) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const { role } = useRole()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-md hover:bg-muted transition-colors md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-lg font-bold">{title}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-8 px-2 bg-muted rounded-md text-xs font-mono uppercase tracking-wider flex items-center">
          {roleLabels[role]}
        </span>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" title={user?.email ?? ''}>
          <User className="w-4 h-4" />
        </button>

        <button
          onClick={handleSignOut}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Se déconnecter"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
