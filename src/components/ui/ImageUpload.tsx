import { useRef, useState } from 'react'
import { ImagePlus, Upload, X, Loader2, ImageIcon } from 'lucide-react'
import {
  MAX_PROPERTY_IMAGE_SIZE_MB,
  PROPERTY_IMAGE_ACCEPT,
  formatPropertyImageSizeError,
  isPropertyImageFile,
  isPropertyImageWithinSizeLimit,
} from '@/lib/propertyImageLimits'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/lib/storage'

interface ImageUploadProps {
  label?: string
  className?: string
  /** Local-file mode: parent owns the File and uploads it later. */
  value?: File | null
  previewUrl?: string | null
  onChange?: (file: File | null, previewUrl: string | null) => void
  /** Direct-upload mode: component uploads straight to Supabase storage. */
  storagePath?: string
  onUploaded?: (url: string, storagePath: string) => void
  currentUrl?: string | null
  accept?: string
  maxSizeMB?: number
  variant?: 'area' | 'avatar'
}

export function ImageUpload({
  label = 'Photo de couverture',
  className,
  value,
  previewUrl,
  onChange,
  storagePath,
  onUploaded,
  currentUrl,
  accept = PROPERTY_IMAGE_ACCEPT,
  maxSizeMB = MAX_PROPERTY_IMAGE_SIZE_MB,
  variant = 'area',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(currentUrl ?? null)

  const isDirectUploadMode = Boolean(storagePath && onUploaded)

  const handleLocalFile = (file: File | null) => {
    setLocalError('')

    if (!file) {
      onChange?.(null, null)
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
    onChange?.(file, url)
  }

  const handleDirectUpload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File must be under ${maxSizeMB}MB`)
      return
    }
    setLocalError('')
    setUploading(true)
    try {
      const objectPreview = URL.createObjectURL(file)
      setUploadPreview(objectPreview)
      const url = await uploadFile(storagePath as string, file)
      const pathFromUrl = url.match(/\/storage\/v1\/object\/public\/images\/(.+)$/)?.[1] ?? storagePath as string
      onUploaded?.(url, pathFromUrl)
    } catch (err) {
      setLocalError((err as Error).message)
      setUploadPreview(null)
    }
    setUploading(false)
  }

  const handleFile = (file: File | null) => {
    if (!file) {
      handleLocalFile(null)
      return
    }
    if (isDirectUploadMode) {
      void handleDirectUpload(file)
    } else {
      handleLocalFile(file)
    }
  }

  const removeImage = () => {
    setLocalError('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onChange?.(null, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    handleFile(file)
    if (isDirectUploadMode) e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  if (isDirectUploadMode && variant === 'avatar') {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div
          className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer border-2 border-border hover:border-foreground/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : uploadPreview ? (
            <img src={uploadPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm font-medium hover:underline"
          >
            {uploading ? 'Uploading...' : 'Change avatar'}
          </button>
          {localError && <p className="text-xs text-destructive mt-1">{localError}</p>}
        </div>
        <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
      </div>
    )
  }

  if (isDirectUploadMode) {
    return (
      <div className={className}>
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          ) : uploadPreview ? (
            <img src={uploadPreview} alt="" className="mx-auto max-h-40 rounded-md object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Click or drag to upload</p>
              <p className="text-[10px] text-muted-foreground/60">Max {maxSizeMB}MB &middot; JPG, PNG, WebP</p>
            </div>
          )}
        </div>
        {localError && <p className="text-xs text-destructive mt-2">{localError}</p>}
        <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
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
          onDrop={handleDrop}
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

interface ImageGalleryProps {
  images: Array<{ id: string; url: string; caption?: string | null }>
  onRemove?: (id: string) => void
  loading?: boolean
}

export function ImageGallery({ images, onRemove, loading }: ImageGalleryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-lg">
        <p className="text-xs text-muted-foreground">No images yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map(img => (
        <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
          <img src={img.url} alt={img.caption ?? ''} className="w-full h-full object-cover" />
          {onRemove && (
            <button
              onClick={() => onRemove(img.id)}
              className="absolute top-2 right-2 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
          {img.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
              <p className="text-[10px] text-white truncate">{img.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
