import { useMemo } from 'react'
import { useRole, type Role } from './roleContext'
import { useAuth } from './authContext'
import { useRoleAssignments, type Property, type Reservation, type Task, type Service, type Payment, type Partner } from './useSupabase'

export function useRoleFilter() {
  const { role } = useRole()
  const { user } = useAuth()
  const { assignedPropertyIds, loading } = useRoleAssignments(user?.id)

  const assignedSet = useMemo(() => new Set(assignedPropertyIds), [assignedPropertyIds])

  function filterProperties(properties: Property[]): Property[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return properties
      case 'house_manager':
        return properties.filter(p => assignedSet.has(p.id))
      case 'concierge':
        return properties.filter(p => assignedSet.has(p.id))
      case 'partner':
        return []
      case 'guest':
        return []
      default:
        return properties
    }
  }

  function filterReservations(reservations: Reservation[]): Reservation[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return reservations
      case 'house_manager':
        return reservations.filter(r => r.property_id && assignedSet.has(r.property_id))
      case 'concierge':
        return reservations.filter(r => r.property_id && assignedSet.has(r.property_id))
      case 'partner':
        return []
      case 'guest':
        return reservations.filter(r => r.guest_email === user?.email)
      default:
        return reservations
    }
  }

  function filterTasks(tasks: Task[]): Task[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return tasks
      case 'house_manager':
        return tasks.filter(t => t.property_id && assignedSet.has(t.property_id))
      case 'concierge':
        return tasks
      case 'partner':
        return []
      case 'guest':
        return []
      default:
        return tasks
    }
  }

  function filterServices(services: Service[]): Service[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return services
      case 'house_manager':
        return services
      case 'concierge':
        return services
      case 'partner':
        return services
      case 'guest':
        return services.filter(s => s.available)
      default:
        return services
    }
  }

  function filterPayments(payments: Payment[]): Payment[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return payments
      case 'house_manager':
        return payments
      case 'concierge':
        return []
      case 'partner':
        return payments.filter(p => p.type === 'commission')
      case 'guest':
        return []
      default:
        return payments
    }
  }

  function filterPartners(partners: Partner[]): Partner[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return partners
      default:
        return []
    }
  }

  function isVisible(page: string): boolean {
    const visibility: Record<string, Role[]> = {
      dashboard: ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest'],
      properties: ['owner', 'house_manager', 'concierge', 'agency'],
      reservations: ['owner', 'house_manager', 'concierge', 'agency'],
      'guest-portal': ['owner', 'house_manager', 'concierge', 'agency', 'guest'],
      services: ['owner', 'house_manager', 'concierge', 'agency', 'partner'],
      tasks: ['owner', 'house_manager', 'concierge', 'agency'],
      calendar: ['owner', 'house_manager', 'concierge', 'agency'],
      partners: ['owner', 'agency'],
      payments: ['owner', 'agency', 'partner'],
      contracts: ['owner', 'agency'],
      reports: ['owner', 'agency'],
      settings: ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest'],
    }
    return (visibility[page] ?? []).includes(role)
  }

  return {
    role,
    loading,
    assignedPropertyIds,
    filterProperties,
    filterReservations,
    filterTasks,
    filterServices,
    filterPayments,
    filterPartners,
    isVisible,
  }
}
