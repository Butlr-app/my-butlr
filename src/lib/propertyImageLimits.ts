export const MAX_PROPERTY_IMAGE_SIZE_MB = 10
export const MAX_PROPERTY_IMAGE_SIZE_BYTES = MAX_PROPERTY_IMAGE_SIZE_MB * 1024 * 1024

export const PROPERTY_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export function isPropertyImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isPropertyImageWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_PROPERTY_IMAGE_SIZE_BYTES
}

export function formatPropertyImageSizeError(): string {
  return `L'image ne doit pas dépasser ${MAX_PROPERTY_IMAGE_SIZE_MB} Mo.`
}

export function isStorageBucketMissingError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('bucket not found') || normalized.includes('property-images')
}

export function formatPropertyImageUploadError(message: string): string {
  const normalized = message.toLowerCase()

  if (isStorageBucketMissingError(message)) {
    return 'Le bucket de stockage « property-images » est introuvable. Créez-le via le SQL Editor Supabase (voir le lien ci-dessous).'
  }

  if (normalized.includes('payload too large') || normalized.includes('file size')) {
    return formatPropertyImageSizeError()
  }

  return message
}
