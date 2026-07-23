import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeStayMessage, resolveStayMessageImageUrls, stayMessageRpcError } from './stayMessaging'
import { parseStayMessagePayload } from './stayMessageTypes'

vi.mock('./uploadStayMessageImage', () => ({
  createStayMessageSignedUrl: vi.fn(async (path: string) =>
    `https://example.com/signed/stay-messages/${path}?token=abc`),
}))

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: 'should-not-use' } }),
        createSignedUrl: async () => ({ data: { signedUrl: null }, error: null }),
      }),
    },
  },
}))

describe('stayMessaging normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults legacy rows to text messages', () => {
    const message = normalizeStayMessage({
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_type: 'guest',
      sender_user_id: null,
      body: 'Bonjour',
      read_at: null,
      created_at: '2026-07-15T10:00:00Z',
    })

    expect(message.message_type).toBe('text')
    expect(message.payload).toEqual({})
    expect(message.body).toBe('Bonjour')
  })

  it('normalizes rich product cards', () => {
    const message = normalizeStayMessage({
      id: 'msg-2',
      conversation_id: 'conv-1',
      sender_type: 'staff',
      sender_user_id: 'user-1',
      body: null,
      message_type: 'product_card',
      payload: {
        catalog_item_id: 'cat-1',
        title: 'Champagne',
        image_url: 'https://example.com/champagne.jpg',
      },
      read_at: null,
      created_at: '2026-07-15T10:05:00Z',
    })

    expect(message.message_type).toBe('product_card')
    expect(message.payload).toMatchObject({ title: 'Champagne' })
  })

  it('keeps storage_path without public URL at normalize time', () => {
    const message = normalizeStayMessage({
      id: 'msg-3',
      conversation_id: 'conv-1',
      sender_type: 'guest',
      sender_user_id: null,
      body: null,
      message_type: 'image',
      payload: { storage_path: 'guest-token/photo.jpg' },
      read_at: null,
      created_at: '2026-07-15T10:10:00Z',
    })

    expect(message.payload).toMatchObject({
      storage_path: 'guest-token/photo.jpg',
    })
    expect((message.payload as { image_url?: string }).image_url).toBeUndefined()
  })

  it('resolves signed image URLs asynchronously', async () => {
    const message = normalizeStayMessage({
      id: 'msg-4',
      conversation_id: 'conv-1',
      sender_type: 'guest',
      sender_user_id: null,
      body: null,
      message_type: 'image',
      payload: { storage_path: 'guest-token/photo.jpg' },
      read_at: null,
      created_at: '2026-07-15T10:10:00Z',
    })

    const [resolved] = await resolveStayMessageImageUrls([message])
    expect(String((resolved.payload as { image_url?: string }).image_url)).toContain(
      '/signed/stay-messages/guest-token/photo.jpg',
    )
    expect(String((resolved.payload as { image_url?: string }).image_url)).not.toContain(
      '/object/public/stay-messages/',
    )
  })
})

describe('stayMessageRpcError', () => {
  it('returns null when RPC succeeded', () => {
    expect(stayMessageRpcError({ message: { id: '1' } })).toBeNull()
  })

  it('maps known error codes', () => {
    expect(stayMessageRpcError({ error: 'invalid_message' })).toBe('Message invalide.')
    expect(stayMessageRpcError({ error: 'forbidden' })).toBe('Accès refusé.')
  })
})

describe('parseStayMessagePayload', () => {
  it('parses JSON string payloads', () => {
    expect(parseStayMessagePayload('{"image_url":"https://example.com/a.jpg"}')).toEqual({
      image_url: 'https://example.com/a.jpg',
    })
  })
})
