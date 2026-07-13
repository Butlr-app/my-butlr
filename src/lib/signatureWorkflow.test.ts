import { describe, expect, it } from 'vitest'
import {
  activeSigningOrder,
  createFieldDraft,
  createRecipientDraft,
  envelopeProgress,
  validateEnvelopeDraft,
} from './signatureWorkflow'

describe('signatureWorkflow', () => {
  it('valide une enveloppe multi-signataires complète', () => {
    const guest = createRecipientDraft({
      key: 'guest',
      name: 'Jeanne Martin',
      email: 'jeanne@example.com',
      role: 'guest',
      signingOrder: 1,
    })
    const owner = createRecipientDraft({
      key: 'owner',
      name: 'Marc Bailleur',
      email: 'marc@example.com',
      role: 'owner',
      signingOrder: 2,
    })
    const fields = [
      createFieldDraft({ recipientKey: guest.key, fieldType: 'signature' }),
      createFieldDraft({ recipientKey: owner.key, fieldType: 'initials' }),
    ]

    expect(validateEnvelopeDraft({
      title: 'Contrat Villa Azur',
      sourceFileId: 'file-1',
      recipients: [guest, owner],
      fields,
    })).toBeNull()
  })

  it('refuse les e-mails dupliqués et les parties sans signature', () => {
    const first = createRecipientDraft({
      key: 'first',
      name: 'A',
      email: 'same@example.com',
    })
    const second = createRecipientDraft({
      key: 'second',
      name: 'B',
      email: 'same@example.com',
    })

    expect(validateEnvelopeDraft({
      title: 'Contrat',
      sourceFileId: 'file-1',
      recipients: [first, second],
      fields: [createFieldDraft({ recipientKey: first.key, fieldType: 'signature' })],
    })).toContain('adresse e-mail différente')

    second.email = 'second@example.com'
    expect(validateEnvelopeDraft({
      title: 'Contrat',
      sourceFileId: 'file-1',
      recipients: [first, second],
      fields: [createFieldDraft({ recipientKey: first.key, fieldType: 'signature' })],
    })).toContain('Ajoutez une signature ou un paraphe')
  })

  it('calcule l’ordre actif et la progression', () => {
    const recipients = [
      { signing_order: 1, status: 'signed' as const },
      { signing_order: 2, status: 'invited' as const },
      { signing_order: 3, status: 'pending' as const },
    ]
    expect(activeSigningOrder(recipients)).toBe(2)
    expect(envelopeProgress(recipients)).toBe(33)
  })

  it('génère des champs normalisés pour le placement PDF', () => {
    const field = createFieldDraft({
      recipientKey: 'guest',
      fieldType: 'signature',
      pageNumber: 3,
      index: 2,
    })
    expect(field).toMatchObject({
      recipientKey: 'guest',
      fieldType: 'signature',
      pageNumber: 3,
      required: true,
    })
    expect(field.x).toBeGreaterThanOrEqual(0)
    expect(field.x + field.width).toBeLessThanOrEqual(1)
    expect(field.y + field.height).toBeLessThanOrEqual(1)
  })
})
