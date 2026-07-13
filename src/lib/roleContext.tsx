import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from './authContext'

export type Role = 'owner' | 'house_manager' | 'concierge' | 'agency' | 'partner' | 'guest'

interface RoleContextType {
  role: Role
}

const RoleContext = createContext<RoleContextType>({ role: 'owner' })

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const role = (profile?.role ?? 'owner') as Role

  return (
    <RoleContext.Provider value={{ role }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
