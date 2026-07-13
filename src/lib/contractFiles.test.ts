import { describe, expect, it } from 'vitest'
import {
  extractContractPrefillData,
  extractStructuredContractData,
  MAX_CONTRACT_FILE_SIZE,
  validateContractFiles,
} from './contractFiles'

describe('contractFiles', () => {
  it('récupère les données clés d’un contrat', () => {
    const result = extractStructuredContractData(`
      BAILLEUR : SAS Maison Azur
      12 avenue de la Mer, 06000 Nice
      LOCATAIRE : Jeanne Martin
      jeanne@example.com
      +33 6 12 34 56 78
      Séjour du 01/08/2026 au 08/08/2026
      Montant total : 1 250,00 €
    `)

    expect(result.emails).toEqual(['jeanne@example.com'])
    expect(result.phones).toEqual(['+33 6 12 34 56 78'])
    expect(result.dates).toEqual(['01/08/2026', '08/08/2026'])
    expect(result.amounts).toEqual(['1 250,00 €'])
    expect(result.parties).toHaveLength(2)
    expect(result.addresses).toEqual(['12 avenue de la Mer, 06000 Nice'])
  })

  it('prépare les champs de réservation à partir du contrat OCR', () => {
    const result = extractContractPrefillData(`
      CONTRAT DE LOCATION SAISONNIÈRE
      BAILLEUR : Maison Azur
      contact@maison-azur.fr
      04 93 12 34 56
      LOCATAIRE :
      Jeanne Martin
      jeanne@example.com
      +33 6 12 34 56 78
      Le séjour se déroulera du 01/08/2026 au 08/08/2026.
      Le montant total de la location est fixé à 1 250,00 euros.
      Dépôt de garantie : 500 EUR
    `)

    expect(result).toEqual({
      guestName: 'Jeanne Martin',
      guestEmail: 'jeanne@example.com',
      guestPhone: '+33 6 12 34 56 78',
      arrival: '2026-08-01',
      departure: '2026-08-08',
      totalAmount: 1250,
    })
  })

  it('tolère les erreurs OCR courantes et distingue le loyer de la caution', () => {
    const result = extractContractPrefillData(`
      Dépôt de garantie : 900 euros
      Nom du locataire : Mme Léa D'Hervé
      lea.herve@example.fr
      06.42.18.73.90
      Période de location du O1/O8/2O26 au O8/O8/2O26
      Loyer global : 2.450,50 EUR
    `)

    expect(result).toMatchObject({
      guestName: "Léa D'Hervé",
      guestEmail: 'lea.herve@example.fr',
      guestPhone: '06.42.18.73.90',
      arrival: '2026-08-01',
      departure: '2026-08-08',
      totalAmount: 2450.5,
    })
  })

  it('accepte PDF et images dans les limites', () => {
    expect(validateContractFiles([
      new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' }),
      new File(['image'], 'page.jpg', { type: 'image/jpeg' }),
    ])).toBeNull()
  })

  it('refuse un fichier absent, inconnu ou trop volumineux', () => {
    expect(validateContractFiles([])).toMatch(/au moins un PDF/)
    expect(validateContractFiles([
      new File(['text'], 'contrat.txt', { type: 'text/plain' }),
    ])).toMatch(/n’est pas accepté/)

    const oversized = new File(['x'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversized, 'size', { value: MAX_CONTRACT_FILE_SIZE + 1 })
    expect(validateContractFiles([oversized])).toMatch(/15 Mo/)
  })
})
