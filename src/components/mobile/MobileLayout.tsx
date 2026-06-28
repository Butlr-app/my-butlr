import { Outlet } from 'react-router-dom'
import { BottomNav, type NavItem } from './BottomNav'

interface MobileLayoutProps {
  navItems: NavItem[]
}

export function MobileLayout({ navItems }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="pb-20">
        <Outlet />
      </div>
      <BottomNav items={navItems} />
    </div>
  )
}
