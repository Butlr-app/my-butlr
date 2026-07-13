import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadImageAsset } from '@/lib/uploadImageAsset'
import { MAX_PROPERTY_IMAGE_SIZE_MB, PROPERTY_IMAGE_ACCEPT } from '@/lib/propertyImageLimits'

interface CatalogImagesEditorProps {
  images: string[]
  onChange: (images: string[]) => void
  userId: string
  entityId?: string
  maxImages?: number
  label?: string
}

export function CatalogImagesEditor({
  images,
  onChange,
  userId,
  entityId,
  maxImages = 5,
  label = 'Photos',
}: CatalogImagesEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)

    const next = [...images]
    for (const file of Array.from(files)) {
      if (next.length >= maxImages) break
      const { url, error: uploadError } = await uploadImageAsset(file, userId, 'catalog', entityId)
      if (uploadError || !url) {
        setError(uploadError?.message ?? 'Téléversement impossible.')
        break
      }
      next.push(url)
    }

    onChange(next)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">
        JPG, PNG, WebP · max {MAX_PROPERTY_IMAGE_SIZE_MB} Mo · jusqu&apos;à {maxImages} photos
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={PROPERTY_IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-md border border-border bg-muted">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow-sm hover:bg-background"
              aria-label="Supprimer la photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[9px] font-medium text-white">
                Couverture
              </span>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card text-muted-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
