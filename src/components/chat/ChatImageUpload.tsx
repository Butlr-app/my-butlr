import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { uploadChatAttachment } from '@/lib/storage'

interface ChatImageUploadProps {
  onUploaded: (url: string) => void
  disabled?: boolean
}

export function ChatImageUpload({ onUploaded, disabled }: ChatImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const url = await uploadChatAttachment(file, 'images')
      onUploaded(url)
    } catch {
      // upload failed silently
    }
    setUploading(false)
    setPreview(null)
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      {preview && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-card border border-border rounded-lg shadow-lg">
          <div className="relative w-32 h-24 rounded overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
        title="Send an image"
      >
        <ImagePlus className="w-4 h-4 text-muted-foreground" />
      </button>
    </>
  )
}
