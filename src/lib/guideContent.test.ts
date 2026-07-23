import { describe, expect, it } from 'vitest'
import {
  getVideoEmbed,
  guideContentSummary,
  hasGuideContent,
  hasRichContent,
  normalizeRichContentForSave,
  parseGuideContent,
  serializeGuideContent,
  type GuideBlock,
} from './guideContent'

describe('guideContent', () => {
  it('parses legacy plain text as a text block', () => {
    const blocks = parseGuideContent('Instructions pour la piscine')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('text')
    if (blocks[0].type === 'text') {
      expect(blocks[0].text).toBe('Instructions pour la piscine')
    }
  })

  it('round-trips structured blocks', () => {
    const blocks: GuideBlock[] = [
      { id: '1', type: 'text', text: 'Intro' },
      {
        id: '2',
        type: 'steps',
        items: [{ id: 's1', title: 'Ouvrir la porte', description: 'Code 1234' }],
      },
      { id: '3', type: 'list', ordered: true, items: ['Item A', 'Item B'] },
      { id: '4', type: 'image', url: 'https://example.com/a.jpg', caption: 'Entrée' },
      { id: '5', type: 'video', url: 'https://youtu.be/abc123', caption: 'Visite' },
    ]

    const serialized = serializeGuideContent(blocks)
    const parsed = parseGuideContent(serialized)

    expect(parsed).toHaveLength(5)
    expect(parsed[1].type).toBe('steps')
    expect(parsed[3].type).toBe('image')
  })

  it('detects non-empty guide content', () => {
    expect(hasGuideContent(parseGuideContent(''))).toBe(false)
    expect(hasGuideContent(parseGuideContent('Hello'))).toBe(true)
    expect(hasGuideContent(parseGuideContent(serializeGuideContent([
      { id: '1', type: 'list', ordered: false, items: [''] },
    ])))).toBe(false)
  })

  it('builds a readable summary', () => {
    const content = serializeGuideContent([
      { id: '1', type: 'text', text: 'Bienvenue au parking' },
      { id: '2', type: 'list', ordered: false, items: ['Place 12', 'Badge bleu'] },
    ])
    expect(guideContentSummary(content)).toContain('Bienvenue au parking')
    expect(guideContentSummary(content)).toContain('2 élément(s)')
  })

  it('detects rich content and normalizes empty saves', () => {
    expect(hasRichContent('Fêtes interdites')).toBe(true)
    expect(hasRichContent(null)).toBe(false)
    expect(normalizeRichContentForSave('Animaux acceptés')).toBe('Animaux acceptés')
    expect(normalizeRichContentForSave(serializeGuideContent([
      { id: '1', type: 'text', text: '' },
    ]))).toBeNull()
  })

  it('extracts YouTube and Vimeo embed URLs', () => {
    expect(getVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl)
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(getVideoEmbed('https://youtu.be/dQw4w9WgXcQ')?.kind).toBe('youtube')
    expect(getVideoEmbed('https://vimeo.com/123456789')?.embedUrl)
      .toBe('https://player.vimeo.com/video/123456789')
    expect(getVideoEmbed('https://cdn.example.com/clip.mp4')?.kind).toBe('direct')
  })
})
