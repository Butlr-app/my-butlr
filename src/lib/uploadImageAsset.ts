import { supabase } from './supabase'
import {
  formatPropertyImageSizeError,
  isPropertyImageFile,
  isPropertyImageWithinSizeLimit,
} from './propertyImageLimits'

const IMAGES_BUCKET = 'images'

function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

export type ImageAssetScope = 'catalog' | 'services'

export async function uploadImageAsset(
  file: File,
  userId: string,
  scope: ImageAssetScope,
  entityId?: string,
): Promise<{ url: string | null; error: Error | null }> {
  if (!isPropertyImageFile(file)) {
    return { url: null, error: new Error('Veuillez téléverser une image (JPG, PNG ou WebP).') }
  }

  if (!isPropertyImageWithinSizeLimit(file)) {
    return { url: null, error: new Error(formatPropertyImageSizeError()) }
  }

  const folder = entityId ?? `draft-${crypto.randomUUID()}`
  const storagePath = `${userId}/${scope}/${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { url: null, error: uploadError as unknown as Error }
  }

  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(storagePath)
  return { url: data.publicUrl, error: null }
}
