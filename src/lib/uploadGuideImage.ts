import { supabase } from './supabase'
import {
  formatPropertyImageSizeError,
  isPropertyImageFile,
  isPropertyImageWithinSizeLimit,
} from './propertyImageLimits'

const GUIDE_IMAGES_BUCKET = 'images'

function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

export async function uploadGuideImage(
  file: File,
  userId: string,
  propertyId: string,
): Promise<{ url: string | null; error: Error | null }> {
  if (!isPropertyImageFile(file)) {
    return { url: null, error: new Error('Veuillez téléverser une image (JPG, PNG ou WebP).') }
  }

  if (!isPropertyImageWithinSizeLimit(file)) {
    return { url: null, error: new Error(formatPropertyImageSizeError()) }
  }

  const storagePath = `${userId}/${propertyId}/guides/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(GUIDE_IMAGES_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { url: null, error: uploadError as unknown as Error }
  }

  const { data } = supabase.storage.from(GUIDE_IMAGES_BUCKET).getPublicUrl(storagePath)
  return { url: data.publicUrl, error: null }
}
