import { Outlet } from 'react-router-dom'
import { BottomNav, type NavItem } from './BottomNav'

interface MobileLayoutProps {
  navItems: NavItem[]
  variant?: 'light' | 'dark'
}

export function MobileLayout({ navItems, variant = 'light' }: MobileLayoutProps) {
  return (
    <div className={`min-h-screen safe-area-top ${variant === 'dark' ? 'bg-gray-950' : 'bg-[#FAFAF8]'}`}>
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav items={navItems} variant={variant} />
    </div>
  )
}
