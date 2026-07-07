import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavProps {
  items: NavItem[]
  variant?: 'light' | 'dark'
}

export function BottomNav({ items, variant = 'light' }: BottomNavProps) {
  const isDark = variant === 'dark'

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 safe-area-bottom',
      isDark
        ? 'bg-gray-950/95 backdrop-blur-xl border-t border-gray-800'
        : 'bg-white/95 backdrop-blur-xl border-t border-gray-100'
    )}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length <= 3}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-amber-500'
                  : isDark ? 'text-gray-500' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <item.icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="tracking-wide">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
