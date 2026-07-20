import { supabase } from './supabase'

const BUCKET = 'images'

export async function uploadFile(
  path: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filePath = `${path}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) throw new Error(error.message)
}

export function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

export function extractStoragePath(publicUrl: string): string | null {
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/images\/(.+)$/)
  return match ? match[1] : null
}

const CHAT_BUCKET = 'chat-attachments'

export async function uploadChatAttachment(
  file: File | Blob,
  folder: 'voice' | 'images',
): Promise<string> {
  const mimeExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
  }
  const baseType = file.type.split(';')[0]
  const ext =
    file instanceof File
      ? (file.name.split('.').pop() ?? (folder === 'voice' ? 'webm' : 'jpg'))
      : folder === 'voice'
        ? (mimeExt[baseType] ?? 'webm')
        : 'jpg'
  const filePath = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: folder === 'voice' ? (baseType || 'audio/webm') : file.type,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(CHAT_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}
