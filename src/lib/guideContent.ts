export type GuideBlockType = 'text' | 'steps' | 'list' | 'image' | 'video'

export interface GuideTextBlock {
  id: string
  type: 'text'
  text: string
}

export interface GuideStepItem {
  id: string
  title: string
  description: string
}

export interface GuideStepsBlock {
  id: string
  type: 'steps'
  items: GuideStepItem[]
}

export interface GuideListBlock {
  id: string
  type: 'list'
  ordered: boolean
  items: string[]
}

export interface GuideImageBlock {
  id: string
  type: 'image'
  url: string
  caption: string
}

export interface GuideVideoBlock {
  id: string
  type: 'video'
  url: string
  caption: string
}

export type GuideBlock =
  | GuideTextBlock
  | GuideStepsBlock
  | GuideListBlock
  | GuideImageBlock
  | GuideVideoBlock

export interface GuideContentDocument {
  v: 1
  blocks: GuideBlock[]
}

export function createGuideBlockId(): string {
  return crypto.randomUUID()
}

export function createEmptyGuideBlock(type: GuideBlockType): GuideBlock {
  const id = createGuideBlockId()
  switch (type) {
    case 'text':
      return { id, type, text: '' }
    case 'steps':
      return {
        id,
        type,
        items: [{ id: createGuideBlockId(), title: '', description: '' }],
      }
    case 'list':
      return { id, type, ordered: false, items: [''] }
    case 'image':
      return { id, type, url: '', caption: '' }
    case 'video':
      return { id, type, url: '', caption: '' }
  }
}

function isGuideContentDocument(value: unknown): value is GuideContentDocument {
  if (!value || typeof value !== 'object') return false
  const doc = value as GuideContentDocument
  return doc.v === 1 && Array.isArray(doc.blocks)
}

function normalizeBlock(raw: unknown): GuideBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const block = raw as GuideBlock
  if (!block.id || !block.type) return null

  switch (block.type) {
    case 'text':
      return { id: block.id, type: 'text', text: typeof block.text === 'string' ? block.text : '' }
    case 'steps': {
      const items = Array.isArray(block.items)
        ? block.items
          .map(item => {
            if (!item || typeof item !== 'object') return null
            const step = item as GuideStepItem
            return {
              id: step.id || createGuideBlockId(),
              title: typeof step.title === 'string' ? step.title : '',
              description: typeof step.description === 'string' ? step.description : '',
            }
          })
          .filter((item): item is GuideStepItem => item !== null)
        : []
      return { id: block.id, type: 'steps', items }
    }
    case 'list': {
      const items = Array.isArray(block.items)
        ? block.items.map(item => (typeof item === 'string' ? item : ''))
        : []
      return {
        id: block.id,
        type: 'list',
        ordered: Boolean(block.ordered),
        items,
      }
    }
    case 'image':
      return {
        id: block.id,
        type: 'image',
        url: typeof block.url === 'string' ? block.url : '',
        caption: typeof block.caption === 'string' ? block.caption : '',
      }
    case 'video':
      return {
        id: block.id,
        type: 'video',
        url: typeof block.url === 'string' ? block.url : '',
        caption: typeof block.caption === 'string' ? block.caption : '',
      }
    default:
      return null
  }
}

export function parseGuideContent(content: string): GuideBlock[] {
  const trimmed = content.trim()
  if (!trimmed) return [createEmptyGuideBlock('text')]

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (isGuideContentDocument(parsed)) {
        const blocks = parsed.blocks
          .map(normalizeBlock)
          .filter((block): block is GuideBlock => block !== null)
        return blocks.length > 0 ? blocks : [createEmptyGuideBlock('text')]
      }
    } catch {
      // fall through to legacy plain text
    }
  }

  return [{ id: createGuideBlockId(), type: 'text', text: content }]
}

export function serializeGuideContent(blocks: GuideBlock[]): string {
  const doc: GuideContentDocument = { v: 1, blocks }
  return JSON.stringify(doc)
}

function blockHasContent(block: GuideBlock): boolean {
  switch (block.type) {
    case 'text':
      return block.text.trim().length > 0
    case 'steps':
      return block.items.some(item => item.title.trim() || item.description.trim())
    case 'list':
      return block.items.some(item => item.trim().length > 0)
    case 'image':
    case 'video':
      return block.url.trim().length > 0
  }
}

export function hasGuideContent(blocks: GuideBlock[]): boolean {
  return blocks.some(blockHasContent)
}

export function hasRichContent(content: string | null | undefined): boolean {
  if (!content?.trim()) return false
  return hasGuideContent(parseGuideContent(content))
}

export function normalizeRichContentForSave(content: string | null | undefined): string | null {
  if (!content?.trim()) return null
  if (!hasRichContent(content)) return null
  return content.trim()
}

export function guideContentSummary(content: string, maxLength = 120): string {
  const blocks = parseGuideContent(content)
  const parts: string[] = []

  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        if (block.text.trim()) parts.push(block.text.trim())
        break
      case 'steps':
        parts.push(`${block.items.filter(i => i.title.trim()).length} étape(s)`)
        break
      case 'list':
        parts.push(`${block.items.filter(i => i.trim()).length} élément(s)`)
        break
      case 'image':
        parts.push(block.caption.trim() || 'Image')
        break
      case 'video':
        parts.push(block.caption.trim() || 'Vidéo')
        break
    }
  }

  const summary = parts.join(' · ')
  if (summary.length <= maxLength) return summary
  return `${summary.slice(0, maxLength - 1)}…`
}

export type VideoEmbedKind = 'youtube' | 'vimeo' | 'direct'

export interface VideoEmbed {
  kind: VideoEmbedKind
  embedUrl: string
}

export function getVideoEmbed(url: string): VideoEmbed | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      if (id) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        return { kind: 'youtube', embedUrl: trimmed }
      }
      const id = parsed.searchParams.get('v')
      if (id) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
    }

    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      if (id && /^\d+$/.test(id)) {
        return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` }
      }
    }

    if (host === 'player.vimeo.com' && parsed.pathname.startsWith('/video/')) {
      return { kind: 'vimeo', embedUrl: trimmed }
    }
  } catch {
    // not a valid URL — try direct file extension below
  }

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
    return { kind: 'direct', embedUrl: trimmed }
  }

  return null
}

export function moveGuideBlock(blocks: GuideBlock[], blockId: string, direction: -1 | 1): GuideBlock[] {
  const index = blocks.findIndex(block => block.id === blockId)
  if (index < 0) return blocks
  const target = index + direction
  if (target < 0 || target >= blocks.length) return blocks

  const next = [...blocks]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}
