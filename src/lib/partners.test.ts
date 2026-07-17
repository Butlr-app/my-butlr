import { describe, expect, it } from 'vitest'
import {
  buildPartnerPayload,
  canManageManualPartner,
  isIntervenantPartnerCategory,
  isServicePartnerCategory,
  isTechnicalPartnerCategory,
  matchesIntervenantCategoryFilter,
  matchesTechnicalCategoryFilter,
  partnerKindFromCategory,
  partnerSelectLabel,
  validatePartnerInput,
  type PartnerRecord,
} from './partners'

describe('partners', () => {
  it('valide le nom et la commission', () => {
    expect(validatePartnerInput({
      name: '',
      category: '',
      location: '',
      contact: '',
      email: '',
      phone: '',
      commission: '10',
      status: 'active',
      notes: '',
    })).toBe('Le nom du partenaire est obligatoire.')

    expect(validatePartnerInput({
      name: 'Chef Martin',
      category: 'Chef',
      location: '',
      contact: '',
      email: '',
      phone: '',
      commission: '150',
      status: 'active',
      notes: '',
    })).toBe('La commission doit être entre 0 et 100 %.')
  })

  it('construit le payload partenaire habituel', () => {
    expect(buildPartnerPayload({
      name: ' Spa Azur ',
      category: 'Spa',
      location: 'Saint-Tropez',
      contact: 'Marie',
      email: 'marie@spa.fr',
      phone: '+33 6 00 00 00 00',
      commission: '15',
      status: 'active',
      notes: 'Commission négociée',
    }, 'owner-1')).toMatchObject({
      name: 'Spa Azur',
      source: 'manual',
      owner_id: 'owner-1',
      commission: 15,
      notes: 'Commission négociée',
    })
  })

  it('libellé select différencie la plateforme', () => {
    const marketplacePartner = {
      id: 'p-1',
      name: 'Yacht Services',
      category: 'Transport',
      location: null,
      contact: null,
      email: null,
      phone: null,
      commission: 10,
      status: 'active',
      rating: 0,
      bookings_count: 0,
      source: 'marketplace',
      owner_id: null,
      profile_id: 'profile-1',
      notes: null,
    } as PartnerRecord

    expect(partnerSelectLabel(marketplacePartner)).toContain('(plateforme)')
  })

  it('autorise la gestion des partenaires habituels legacy sans owner_id', () => {
    const partner = {
      id: 'p-1',
      source: 'manual',
      owner_id: null,
    } as PartnerRecord

    expect(canManageManualPartner(partner, 'owner-1')).toBe(true)
    expect(canManageManualPartner(partner, undefined)).toBe(false)
    expect(canManageManualPartner({ ...partner, source: 'marketplace' } as PartnerRecord, 'owner-1')).toBe(false)
  })

  it('sépare intervenants et prestataires de services', () => {
    expect(isIntervenantPartnerCategory('Ménage & entretien')).toBe(true)
    expect(isIntervenantPartnerCategory('Électricité')).toBe(true)
    expect(isIntervenantPartnerCategory('Menuiserie')).toBe(true)
    expect(isIntervenantPartnerCategory('Piscine & spa technique')).toBe(true)
    expect(isIntervenantPartnerCategory('Chef & restauration')).toBe(false)
    expect(isServicePartnerCategory('Spa & bien-être')).toBe(true)
    expect(isServicePartnerCategory('Chef & restauration')).toBe(true)
    expect(isServicePartnerCategory('Ménage & entretien')).toBe(false)
    expect(partnerKindFromCategory('Électricité')).toBe('intervenant')
    expect(partnerKindFromCategory('Spa & bien-être')).toBe('service')
    expect(partnerKindFromCategory('Autre')).toBe('unknown')
  })

  it('identifie les catégories techniques de l’hub entretien', () => {
    expect(isTechnicalPartnerCategory('Piscine & spa technique')).toBe(true)
    expect(isTechnicalPartnerCategory('Jardinage & espaces verts')).toBe(true)
    expect(isTechnicalPartnerCategory('Maintenance & réparations')).toBe(true)
    expect(isTechnicalPartnerCategory('Chef & restauration')).toBe(false)
    expect(isTechnicalPartnerCategory(null)).toBe(false)
  })

  it('filtre les catégories intervenants pour le hub', () => {
    expect(matchesIntervenantCategoryFilter('Piscine & spa technique', 'all')).toBe(true)
    expect(matchesIntervenantCategoryFilter('Chef & restauration', 'all')).toBe(false)
    expect(matchesIntervenantCategoryFilter('Ménage & entretien', 'cleaning')).toBe(true)
    expect(matchesIntervenantCategoryFilter('Piscine & spa technique', 'pool')).toBe(true)
    expect(matchesIntervenantCategoryFilter('Jardinage & espaces verts', 'pool')).toBe(false)
    expect(matchesIntervenantCategoryFilter('Jardinage & espaces verts', 'garden')).toBe(true)
    expect(matchesIntervenantCategoryFilter('Maintenance & réparations', 'works')).toBe(true)
    expect(matchesIntervenantCategoryFilter('Électricité', 'works')).toBe(true)
    expect(matchesIntervenantCategoryFilter('Menuiserie', 'works')).toBe(true)
    expect(matchesTechnicalCategoryFilter('Maintenance & réparations', 'works')).toBe(true)
  })
})
