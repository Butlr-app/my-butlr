import { describe, expect, it } from 'vitest'
import {
  parseAssistantTaskDraft,
  sanitizeAssistantTaskDraft,
  taskDraftToFormPrefill,
  toIsoDate,
} from './assistantDraft'

describe('assistantDraft', () => {
  it('extrait une intervention pisciniste avec date et heure', () => {
    const now = new Date('2026-07-16T12:00:00')
    const draft = parseAssistantTaskDraft(
      'Ajoute une intervention du pisciniste demain à 10:30 pour le spa.',
      now,
    )

    expect(draft).toMatchObject({
      kind: 'task',
      linkType: 'partner',
      categoryHint: 'pool',
      dueDate: toIsoDate(new Date('2026-07-17T12:00:00')),
      dueTime: '10:30',
    })
    expect(draft?.title.toLowerCase()).toContain('pisciniste')
    expect(draft?.description).toContain('10:30')
  })

  it('convertit le draft en préremplissage de formulaire', () => {
    const prefill = taskDraftToFormPrefill({
      kind: 'task',
      title: 'Intervention pisciniste pour le spa',
      dueDate: '2026-07-17',
      dueTime: '10:30',
      linkType: 'partner',
      priority: 'medium',
      categoryHint: 'pool',
    })

    expect(prefill.title).toBe('Intervention pisciniste pour le spa')
    expect(prefill.dueDate).toBe('2026-07-17')
    expect(prefill.linkType).toBe('partner')
    expect(prefill.description).toContain('10:30')
  })

  it('sanitise un draft assistant invalide', () => {
    expect(sanitizeAssistantTaskDraft({ kind: 'task', title: '   ' })).toBeNull()
    expect(sanitizeAssistantTaskDraft({
      kind: 'task',
      title: 'Rappel client',
      dueDate: '17-07-2026',
      linkType: 'client',
      priority: 'high',
    })).toMatchObject({
      title: 'Rappel client',
      linkType: 'client',
      priority: 'high',
      dueDate: undefined,
    })
  })
})
