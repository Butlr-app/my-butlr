import { useId, useRef } from 'react'
import { FileImage, FileText, Plus, Trash2 } from 'lucide-react'
import {
  ACCEPTED_CONTRACT_FILE_TYPES,
  MAX_CONTRACT_FILES,
  validateContractFiles,
} from '@/lib/contractFiles'
import { Button } from '@/components/ui/Button'

interface ContractFilePickerProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  error?: string
}

export function ContractFilePicker({
  files,
  onChange,
  disabled = false,
  error,
}: ContractFilePickerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (nextFiles: File[]) => {
    const merged = [...files, ...nextFiles].slice(0, MAX_CONTRACT_FILES)
    onChange(merged)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Fichiers du contrat</p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, JPG, PNG ou WebP · 15 Mo maximum par fichier · analyse Vision automatique
        </p>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        disabled={disabled}
        accept={ACCEPTED_CONTRACT_FILE_TYPES.join(',')}
        onChange={event => {
          addFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
        className="sr-only"
      />

      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_CONTRACT_FILES}
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter PDF ou images
      </Button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const Icon = file.type === 'application/pdf' ? FileText : FileImage
            return (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} Mo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                  disabled={disabled}
                  aria-label={`Retirer ${file.name}`}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {(error || (files.length > 0 && validateContractFiles(files))) && (
        <p role="alert" className="text-xs text-destructive">
          {error ?? validateContractFiles(files)}
        </p>
      )}
    </div>
  )
}
