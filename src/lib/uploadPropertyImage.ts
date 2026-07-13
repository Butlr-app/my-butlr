import {
  formatPropertyImageSizeError,
  isPropertyImageFile,
  isPropertyImageWithinSizeLimit,
} from './propertyImageLimits'

const MAX_DIMENSION = 1920
const TARGET_MAX_BYTES = 1_400_000

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Impossible de lire l'image."))
    img.src = src
  })
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.floor((base64.length * 3) / 4)
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const img = await loadImage(objectUrl)

    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Le navigateur ne supporte pas le traitement d'image.")

    ctx.drawImage(img, 0, 0, width, height)

    let quality = 0.85
    let dataUrl = canvas.toDataURL('image/jpeg', quality)

    while (estimateDataUrlBytes(dataUrl) > TARGET_MAX_BYTES && quality > 0.4) {
      quality -= 0.1
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadPropertyImage(
  file: File,
): Promise<{ url: string | null; error: Error | null }> {
  if (!isPropertyImageFile(file)) {
    return { url: null, error: new Error('Veuillez téléverser une image (JPG, PNG ou WebP).') }
  }

  if (!isPropertyImageWithinSizeLimit(file)) {
    return { url: null, error: new Error(formatPropertyImageSizeError()) }
  }

  try {
    const dataUrl = await compressImageToDataUrl(file)
    return { url: dataUrl, error: null }
  } catch (error) {
    return { url: null, error: error as Error }
  }
}
