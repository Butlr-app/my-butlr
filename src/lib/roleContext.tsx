import { createContext, useContext, useState, type ReactNode } from 'react'

export type Role = 'owner' | 'house_manager' | 'concierge' | 'agency' | 'partner' | 'guest'

interface RoleContextType {
  role: Role
  setRole: (role: Role) => void
}

const RoleContext = createContext<RoleContextType>({ role: 'owner', setRole: () => {} })

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('owner')
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
