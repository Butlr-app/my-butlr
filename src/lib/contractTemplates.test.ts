import { describe, expect, it } from 'vitest'
import {
  parseContractTemplateBlocks,
  replaceContractVariables,
  selectContractTemplate,
  type ContractTemplate,
} from './contractTemplates'

describe('contract templates', () => {
  it('transforme les articles importés en blocs réordonnables', () => {
    const blocks = parseContractTemplateBlocks(`
      CONTRAT DE LOCATION SAISONNIÈRE
      Le présent contrat est conclu entre les soussignés.
      Article 1 Parties au contrat
      Le contrat est conclu entre le Bailleur et le Locataire.
      Article 2 Le séjour
      La villa est louée pour douze nuits.
      SIGNATURES DES PARTIES
      Lu et approuvé.
    `)

    expect(blocks.map(block => block.type)).toEqual([
      'preamble',
      'article',
      'article',
      'signatures',
    ])
    expect(blocks[2].title).toBe('Article 2 — Le séjour')
    expect(blocks[2].content).toContain('douze nuits')
  })

  it('remplace les variables et signale celles restant à compléter', () => {
    expect(replaceContractVariables(
      '{{tenant.name}} loue {{property.name}} — {{tenant.phone}}',
      {
        'tenant.name': 'Camille Martin',
        'property.name': 'Villa Azur',
        'tenant.phone': null,
      },
    )).toBe('Camille Martin loue Villa Azur — [tenant.phone]')
  })

  it('privilégie le modèle par défaut de la villa', () => {
    const global = template({ id: 'global', property_id: null, is_default: true })
    const property = template({ id: 'property', property_id: 'villa-1', is_default: true })

    expect(selectContractTemplate([global, property], 'villa-1')?.id).toBe('property')
    expect(selectContractTemplate([global, property], 'villa-2')?.id).toBe('global')
  })
})

function template(overrides: Partial<ContractTemplate>): ContractTemplate {
  return {
    id: 'template',
    user_id: 'owner',
    property_id: null,
    name: 'Modèle',
    description: null,
    blocks: [],
    source_file_path: null,
    source_file_name: null,
    source_mime_type: null,
    import_status: 'not_imported',
    import_error: null,
    is_default: false,
    version: 1,
    created_by: 'owner',
    created_at: '2026-07-13T00:00:00Z',
    updated_at: '2026-07-13T00:00:00Z',
    ...overrides,
  }
}
