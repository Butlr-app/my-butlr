import { describe, expect, it } from 'vitest'
import {
  homePathForRole,
  isPartnerProfileComplete,
  partnerMissionStatusLabels,
  validatePartnerProfileForm,
} from './partnerPortal'

describe('partnerPortal helpers', () => {
  it('isPartnerProfileComplete requires name, category and phone unless flagged', () => {
    expect(isPartnerProfileComplete(null)).toBe(false)
    expect(isPartnerProfileComplete({
      name: 'Chef Martin',
      category: 'Chef',
      phone: '',
      onboarding_completed: false,
    })).toBe(false)
    expect(isPartnerProfileComplete({
      name: 'Chef Martin',
      category: 'Chef',
      phone: '+33 6 00 00 00 00',
      onboarding_completed: false,
    })).toBe(true)
    expect(isPartnerProfileComplete({
      name: '',
      category: '',
      phone: '',
      onboarding_completed: true,
    })).toBe(true)
  })

  it('validatePartnerProfileForm enforces required marketplace fields', () => {
    expect(validatePartnerProfileForm({
      name: '',
      category: 'Chef',
      location: '',
      contact: '',
      email: '',
      phone: '0600000000',
      description: '',
      serviceAreas: '',
      status: 'active',
    })).toBe('Le nom est obligatoire.')

    expect(validatePartnerProfileForm({
      name: 'Chef Martin',
      category: 'Inconnu',
      location: '',
      contact: '',
      email: '',
      phone: '0600000000',
      description: '',
      serviceAreas: '',
      status: 'active',
    })).toBe('Catégorie invalide.')

    expect(validatePartnerProfileForm({
      name: 'Chef Martin',
      category: 'Chef & restauration',
      location: 'Saint-Barth',
      contact: '',
      email: 'chef@example.com',
      phone: '0600000000',
      description: 'Cuisine privée',
      serviceAreas: 'Gustavia',
      status: 'active',
    })).toBeNull()
  })

  it('maps mission statuses for partner UI', () => {
    expect(partnerMissionStatusLabels.todo).toBe('À faire')
    expect(partnerMissionStatusLabels.in_progress).toBe('En cours')
    expect(partnerMissionStatusLabels.done).toBe('Terminée')
  })

  it('routes partners to /partner and others to /app', () => {
    expect(homePathForRole('partner')).toBe('/partner')
    expect(homePathForRole('owner')).toBe('/app')
    expect(homePathForRole('house_manager')).toBe('/app')
    expect(homePathForRole(null)).toBe('/app')
    expect(homePathForRole(undefined)).toBe('/app')
  })
})
