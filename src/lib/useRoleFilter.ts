import { useMemo } from 'react'
import { useRole, type Role } from './roleContext'
import { useAuth } from './authContext'
import { useRoleAssignments, useRolePermissions, type Property, type Reservation, type Task, type Service, type Payment, type Partner, type Contract, type Invoice, type ServiceProvider, type Incident, type WorkOrder, type Inspection, type InventoryItem } from './useSupabase'

export function useRoleFilter() {
  const { role } = useRole()
  const { user } = useAuth()
  const { assignedPropertyIds, loading } = useRoleAssignments(user?.id)
  const { permissions } = useRolePermissions()

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

  function filterIncidents(incidents: Incident[]): Incident[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return incidents
      case 'house_manager':
      case 'concierge':
        return incidents.filter(i => assignedSet.has(i.property_id))
      default:
        return []
    }
  }

  function filterWorkOrders(workOrders: WorkOrder[]): WorkOrder[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return workOrders
      case 'house_manager':
      case 'concierge':
        return workOrders.filter(w => assignedSet.has(w.property_id))
      default:
        return []
    }
  }

  function filterInspections(inspections: Inspection[]): Inspection[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return inspections
      case 'house_manager':
      case 'concierge':
        return inspections.filter(i => i.property_id !== null && assignedSet.has(i.property_id))
      default:
        return []
    }
  }

  function filterInventoryItems(items: InventoryItem[]): InventoryItem[] {
    switch (role) {
      case 'owner':
      case 'agency':
        return items
      case 'house_manager':
      case 'concierge':
        return items.filter(i => assignedSet.has(i.property_id))
      default:
        return []
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
      case 'concierge':
        return payments
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
      case 'house_manager':
      case 'concierge':
        return partners
      default:
        return []
    }
  }

  function filterContracts(contracts: Contract[]): Contract[] {
    switch (role) {
      case 'owner':
      case 'agency':
      case 'house_manager':
      case 'concierge':
        return contracts
      default:
        return []
    }
  }

  function filterInvoices(invoices: Invoice[]): Invoice[] {
    switch (role) {
      case 'owner':
      case 'agency':
      case 'house_manager':
      case 'concierge':
        return invoices
      default:
        return []
    }
  }

  function filterServiceProviders(providers: ServiceProvider[]): ServiceProvider[] {
    switch (role) {
      case 'owner':
      case 'agency':
      case 'house_manager':
      case 'concierge':
        return providers
      default:
        return []
    }
  }

  function canEdit(page: string): boolean {
    if (role === 'owner' || role === 'agency') return true
    if (page === 'apa') return false
    const rolePerms = permissions[role]
    if (rolePerms && rolePerms[page]) {
      return rolePerms[page].edit
    }
    const editRoles: Record<string, Role[]> = {
      partners: ['owner', 'agency'],
      payments: ['owner', 'agency', 'house_manager'],
      contracts: ['owner', 'agency', 'house_manager'],
      invoices: ['owner', 'agency', 'house_manager'],
      apa: ['owner', 'agency'],
      reports: ['owner', 'agency'],
    }
    return (editRoles[page] ?? []).includes(role)
  }

  function isVisible(page: string): boolean {
    if (role === 'owner' || role === 'agency') return true
    if (page === 'apa') return false
    const rolePerms = permissions[role]
    if (rolePerms && rolePerms[page]) {
      return rolePerms[page].view
    }
    const visibility: Record<string, Role[]> = {
      dashboard: ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest'],
      properties: ['owner', 'house_manager', 'concierge', 'agency'],
      reservations: ['owner', 'house_manager', 'concierge', 'agency'],
      'guest-portal': ['owner', 'house_manager', 'concierge', 'agency', 'guest'],
      messages: ['owner', 'house_manager', 'concierge', 'agency'],
      services: ['owner', 'house_manager', 'concierge', 'agency', 'partner'],
      'service-requests': ['owner', 'house_manager', 'concierge', 'agency', 'partner'],
      tasks: ['owner', 'house_manager', 'concierge', 'agency'],
      'day-sheet': ['owner', 'house_manager', 'concierge', 'agency'],
      incidents: ['owner', 'house_manager', 'concierge', 'agency'],
      'work-orders': ['owner', 'house_manager', 'concierge', 'agency'],
      inventory: ['owner', 'house_manager', 'concierge', 'agency'],
      calendar: ['owner', 'house_manager', 'concierge', 'agency'],
      partners: ['owner', 'agency', 'house_manager', 'concierge'],
      'service-providers': ['owner', 'house_manager', 'concierge', 'agency'],
      'concierge-portal': ['owner', 'agency'],
      payments: ['owner', 'house_manager', 'concierge', 'agency', 'partner'],
      apa: ['owner', 'agency'],
      contracts: ['owner', 'agency', 'house_manager', 'concierge'],
      invoices: ['owner', 'agency', 'house_manager', 'concierge'],
      guides: ['owner', 'house_manager', 'concierge', 'agency'],
      inspections: ['owner', 'house_manager', 'concierge', 'agency'],
      reports: ['owner', 'agency', 'house_manager'],
      notifications: ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest'],
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
    filterIncidents,
    filterWorkOrders,
    filterInspections,
    filterInventoryItems,
    filterServices,
    filterPayments,
    filterPartners,
    filterContracts,
    filterInvoices,
    filterServiceProviders,
    canEdit,
    isVisible,
  }
}
