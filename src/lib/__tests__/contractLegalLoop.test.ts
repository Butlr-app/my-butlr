import { describe, it, expect } from 'vitest'
import { sha256Hex } from '../cryptoHash'
import { resolveArticleKind, createDefaultArticles } from '@/data/defaultContractTemplate'

describe('sha256Hex', () => {
  it('hashes a known string', async () => {
    const hex = await sha256Hex('butlr')
    expect(hex).toHaveLength(64)
    expect(hex).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic', async () => {
    const a = await sha256Hex('contrat')
    const b = await sha256Hex('contrat')
    expect(a).toBe(b)
  })
})

describe('resolveArticleKind', () => {
  it('uses explicit kind when present', () => {
    expect(resolveArticleKind({
      id: '1', number: 99, title: 'x', content: '', enabled: true, isHighlighted: false, kind: 'payment',
    })).toBe('payment')
  })

  it('falls back to legacy article numbers', () => {
    expect(resolveArticleKind({
      id: '1', number: 2, title: 'x', content: '', enabled: true, isHighlighted: false,
    })).toBe('stay')
    expect(resolveArticleKind({
      id: '1', number: 10, title: 'x', content: '', enabled: true, isHighlighted: false,
    })).toBe('checkinout')
  })

  it('default template articles have kinds and accents', () => {
    const articles = createDefaultArticles()
    expect(articles.find(a => a.kind === 'stay')).toBeTruthy()
    expect(articles.find(a => a.kind === 'deposit')).toBeTruthy()
    expect(articles.some(a => a.content.includes('présent') || a.content.includes('séjour'))).toBe(true)
  })
})
