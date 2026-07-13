import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import {
  MAX_PROPERTY_IMAGE_SIZE_MB,
  PROPERTY_IMAGE_ACCEPT,
  formatPropertyImageSizeError,
  isPropertyImageFile,
  isPropertyImageWithinSizeLimit,
} from '@/lib/propertyImageLimits'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  label?: string
  value: File | null
  previewUrl: string | null
  onChange: (file: File | null, previewUrl: string | null) => void
  className?: string
}

export function ImageUpload({
  label = 'Photo de couverture',
  value,
  previewUrl,
  onChange,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleFile = (file: File | null) => {
    setLocalError('')

    if (!file) {
      onChange(null, null)
      return
    }

    if (!isPropertyImageFile(file)) {
      setLocalError('Format non pris en charge. Utilisez JPG, PNG ou WebP.')
      return
    }

    if (!isPropertyImageWithinSizeLimit(file)) {
      setLocalError(formatPropertyImageSizeError())
      return
    }

    const url = URL.createObjectURL(file)
    onChange(file, url)
  }

  const removeImage = () => {
    setLocalError('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onChange(null, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={PROPERTY_IMAGE_ACCEPT}
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="relative aspect-[16/9] rounded-md overflow-hidden border border-border bg-muted">
          <img src={previewUrl} alt="Aperçu de la propriété" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border hover:bg-background transition-colors"
            aria-label="Supprimer la photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files?.[0] ?? null)
          }}
          className={cn(
            'w-full aspect-[16/9] rounded-md border border-dashed border-border bg-card flex flex-col items-center justify-center gap-2 transition-colors hover:bg-muted/30',
            dragOver && 'border-foreground bg-muted/40',
          )}
        >
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cliquez ou glissez une photo</span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG, WebP · max {MAX_PROPERTY_IMAGE_SIZE_MB} Mo
          </span>
        </button>
      )}

      {value && (
        <p className="text-xs text-muted-foreground truncate">{value.name}</p>
      )}

      {localError && (
        <p className="text-xs text-destructive">{localError}</p>
      )}
    </div>
  )
}
