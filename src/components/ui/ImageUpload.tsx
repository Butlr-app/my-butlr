import { useState, useRef } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { uploadFile } from '@/lib/storage'

interface ImageUploadProps {
  storagePath: string
  onUploaded: (url: string, storagePath: string) => void
  className?: string
  accept?: string
  maxSizeMB?: number
  variant?: 'area' | 'avatar'
  currentUrl?: string | null
}

export function ImageUpload({
  storagePath,
  onUploaded,
  className = '',
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  variant = 'area',
  currentUrl,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`)
      return
    }
    setError(null)
    setUploading(true)
    try {
      const objectPreview = URL.createObjectURL(file)
      setPreview(objectPreview)
      const url = await uploadFile(storagePath, file)
      const pathFromUrl = url.match(/\/storage\/v1\/object\/public\/images\/(.+)$/)?.[1] ?? storagePath
      onUploaded(url, pathFromUrl)
    } catch (err) {
      setError((err as Error).message)
      setPreview(null)
    }
    setUploading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  if (variant === 'avatar') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div
          className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer border-2 border-border hover:border-foreground/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
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
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      </div>
    )
  }

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
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Click or drag to upload</p>
            <p className="text-[10px] text-muted-foreground/60">Max {maxSizeMB}MB &middot; JPG, PNG, WebP</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
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
