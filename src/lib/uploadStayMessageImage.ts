import { supabase } from './supabase'
import {
  formatPropertyImageSizeError,
  isPropertyImageFile,
  isPropertyImageWithinSizeLimit,
} from './propertyImageLimits'

const BUCKET = 'stay-messages'
const SIGNED_URL_TTL_SECONDS = 60 * 60

function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

function validateImageFile(file: File): Error | null {
  if (!isPropertyImageFile(file)) {
    return new Error('Veuillez téléverser une image (JPG, PNG ou WebP).')
  }
  if (!isPropertyImageWithinSizeLimit(file)) {
    return new Error(formatPropertyImageSizeError())
  }
  return null
}

export async function createStayMessageSignedUrl(
  storagePath: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function guestUploadStayMessageImage(
  token: string,
  file: File,
): Promise<{ url: string | null; storagePath: string | null; error: Error | null }> {
  const validationError = validateImageFile(file)
  if (validationError) return { url: null, storagePath: null, error: validationError }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const { data, error } = await supabase.rpc('guest_prepare_stay_message_upload', {
    p_token: token,
    p_extension: extension,
  })
  if (error) return { url: null, storagePath: null, error: error as unknown as Error }

  const payload = data as { error?: string; storage_path?: string }
  if (payload.error || !payload.storage_path) {
    return {
      url: null,
      storagePath: null,
      error: new Error('Préparation du téléversement impossible.'),
    }
  }

  const storagePath = payload.storage_path

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { url: null, storagePath: null, error: uploadError as unknown as Error }
  }

  const url = await createStayMessageSignedUrl(storagePath)
  return { url, storagePath, error: null }
}

export async function staffUploadStayMessageImage(
  file: File,
  userId: string,
): Promise<{ url: string | null; storagePath: string | null; error: Error | null }> {
  const validationError = validateImageFile(file)
  if (validationError) return { url: null, storagePath: null, error: validationError }

  const storagePath = `staff/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { url: null, storagePath: null, error: uploadError as unknown as Error }
  }

  const url = await createStayMessageSignedUrl(storagePath)
  return { url, storagePath, error: null }
}
