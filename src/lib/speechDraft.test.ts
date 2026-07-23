import { describe, expect, it } from 'vitest'
import { appendSpeechTranscript } from './speechDraft'

describe('appendSpeechTranscript', () => {
  it('returns transcript when draft is empty', () => {
    expect(appendSpeechTranscript('', 'Bonjour')).toBe('Bonjour')
  })

  it('appends with a space', () => {
    expect(appendSpeechTranscript('Crée une tâche', 'pour le ménage')).toBe('Crée une tâche pour le ménage')
  })

  it('ignores empty transcript', () => {
    expect(appendSpeechTranscript('Hello', '   ')).toBe('Hello')
  })
})
