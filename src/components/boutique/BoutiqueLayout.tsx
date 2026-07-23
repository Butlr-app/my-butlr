import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, Package, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/app/boutique', label: 'Commandes', icon: ClipboardList, end: true },
  { to: '/app/boutique/catalog', label: 'Catalogue', icon: Package, end: false },
  { to: '/app/boutique/products/new', label: 'Ajouter un produit', icon: Plus, end: false },
]

export function BoutiqueLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Boutique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Objets physiques uniquement : gérez les produits, leur prix unitaire et les commandes par quantité.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => cn(
              'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
