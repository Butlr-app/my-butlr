import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Trash2,
  Type,
  Video,
  Workflow,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  createEmptyGuideBlock,
  createGuideBlockId,
  moveGuideBlock,
  type GuideBlock,
  type GuideBlockType,
} from '@/lib/guideContent'
import { uploadGuideImage } from '@/lib/uploadGuideImage'

const blockTypeOptions: { type: GuideBlockType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'steps', label: 'Étapes', icon: Workflow },
  { type: 'list', label: 'Liste', icon: List },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'video', label: 'Vidéo', icon: Video },
]

interface GuideBlockEditorProps {
  blocks: GuideBlock[]
  onChange: (blocks: GuideBlock[]) => void
  propertyId: string
  userId?: string | null
}

function updateBlock(blocks: GuideBlock[], blockId: string, next: GuideBlock): GuideBlock[] {
  return blocks.map(block => (block.id === blockId ? next : block))
}

function removeBlock(blocks: GuideBlock[], blockId: string): GuideBlock[] {
  const next = blocks.filter(block => block.id !== blockId)
  return next.length > 0 ? next : [createEmptyGuideBlock('text')]
}

export function GuideBlockEditor({
  blocks,
  onChange,
  propertyId,
  userId,
}: GuideBlockEditorProps) {
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const addBlock = (type: GuideBlockType) => {
    onChange([...blocks, createEmptyGuideBlock(type)])
  }

  const handleImageUpload = async (blockId: string, file: File | null) => {
    if (!file) return
    setUploadError('')

    if (!userId) {
      setUploadError('Connectez-vous pour téléverser une image, ou collez une URL.')
      return
    }

    setUploadingBlockId(blockId)
    const { url, error } = await uploadGuideImage(file, userId, propertyId)
    setUploadingBlockId(null)

    if (error || !url) {
      setUploadError(error?.message ?? 'Impossible de téléverser l’image.')
      return
    }

    const existing = blocks.find(block => block.id === blockId && block.type === 'image')
    onChange(updateBlock(blocks, blockId, {
      id: blockId,
      type: 'image',
      url,
      caption: existing?.type === 'image' ? existing.caption : '',
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {blockTypeOptions.map(option => {
          const Icon = option.icon
          return (
            <Button
              key={option.type}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => addBlock(option.type)}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {option.label}
            </Button>
          )
        })}
      </div>

      {uploadError && (
        <p role="alert" className="text-sm text-destructive">{uploadError}</p>
      )}

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={block.id} className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {blockTypeOptions.find(option => option.type === block.type)?.label ?? block.type}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => onChange(moveGuideBlock(blocks, block.id, -1))}
                  aria-label="Monter le bloc"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === blocks.length - 1}
                  onClick={() => onChange(moveGuideBlock(blocks, block.id, 1))}
                  aria-label="Descendre le bloc"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onChange(removeBlock(blocks, block.id))}
                  aria-label="Supprimer le bloc"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {block.type === 'text' && (
              <textarea
                rows={4}
                value={block.text}
                onChange={event => onChange(updateBlock(blocks, block.id, {
                  ...block,
                  text: event.target.value,
                }))}
                placeholder="Paragraphe explicatif…"
                className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
              />
            )}

            {block.type === 'steps' && (
              <div className="space-y-3">
                {block.items.map((item, stepIndex) => (
                  <div key={item.id} className="rounded-md border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Étape {stepIndex + 1}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={block.items.length === 1}
                        onClick={() => onChange(updateBlock(blocks, block.id, {
                          ...block,
                          items: block.items.filter(step => step.id !== item.id),
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      label="Titre"
                      value={item.title}
                      onChange={event => onChange(updateBlock(blocks, block.id, {
                        ...block,
                        items: block.items.map(step => step.id === item.id
                          ? { ...step, title: event.target.value }
                          : step),
                      }))}
                      placeholder="Ex. Ouvrir le portail"
                    />
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={event => onChange(updateBlock(blocks, block.id, {
                        ...block,
                        items: block.items.map(step => step.id === item.id
                          ? { ...step, description: event.target.value }
                          : step),
                      }))}
                      placeholder="Détails optionnels…"
                      className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onChange(updateBlock(blocks, block.id, {
                    ...block,
                    items: [...block.items, { id: createGuideBlockId(), title: '', description: '' }],
                  }))}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter une étape
                </Button>
              </div>
            )}

            {block.type === 'list' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={block.ordered ? 'secondary' : 'primary'}
                    onClick={() => onChange(updateBlock(blocks, block.id, { ...block, ordered: false }))}
                  >
                    <List className="mr-1.5 h-4 w-4" />
                    À puces
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={block.ordered ? 'primary' : 'secondary'}
                    onClick={() => onChange(updateBlock(blocks, block.id, { ...block, ordered: true }))}
                  >
                    <ListOrdered className="mr-1.5 h-4 w-4" />
                    Numérotée
                  </Button>
                </div>
                {block.items.map((item, itemIndex) => (
                  <div key={`${block.id}-${itemIndex}`} className="flex gap-2">
                    <Input
                      label={`Élément ${itemIndex + 1}`}
                      value={item}
                      onChange={event => onChange(updateBlock(blocks, block.id, {
                        ...block,
                        items: block.items.map((value, index) => (
                          index === itemIndex ? event.target.value : value
                        )),
                      }))}
                      placeholder="Contenu de la liste"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-6"
                      disabled={block.items.length === 1}
                      onClick={() => onChange(updateBlock(blocks, block.id, {
                        ...block,
                        items: block.items.filter((_, index) => index !== itemIndex),
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onChange(updateBlock(blocks, block.id, {
                    ...block,
                    items: [...block.items, ''],
                  }))}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter un élément
                </Button>
              </div>
            )}

            {block.type === 'image' && (
              <div className="space-y-3">
                <Input
                  label="URL de l’image"
                  value={block.url}
                  onChange={event => onChange(updateBlock(blocks, block.id, {
                    ...block,
                    url: event.target.value,
                  }))}
                  placeholder="https://…"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={element => { fileInputRefs.current[block.id] = element }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={event => {
                      void handleImageUpload(block.id, event.target.files?.[0] ?? null)
                      event.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={uploadingBlockId === block.id}
                    onClick={() => fileInputRefs.current[block.id]?.click()}
                  >
                    {uploadingBlockId === block.id ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Téléversement…
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-1.5 h-4 w-4" />
                        Téléverser une image
                      </>
                    )}
                  </Button>
                </div>
                {block.url && (
                  <img
                    src={block.url}
                    alt={block.caption || 'Aperçu'}
                    className="max-h-48 w-full rounded-md border border-border object-cover"
                  />
                )}
                <Input
                  label="Légende (optionnelle)"
                  value={block.caption}
                  onChange={event => onChange(updateBlock(blocks, block.id, {
                    ...block,
                    caption: event.target.value,
                  }))}
                  placeholder="Description de l’image"
                />
              </div>
            )}

            {block.type === 'video' && (
              <div className="space-y-3">
                <Input
                  label="URL de la vidéo"
                  value={block.url}
                  onChange={event => onChange(updateBlock(blocks, block.id, {
                    ...block,
                    url: event.target.value,
                  }))}
                  placeholder="YouTube, Vimeo ou lien .mp4"
                />
                <p className="text-xs text-muted-foreground">
                  Formats supportés : YouTube, Vimeo, ou fichier vidéo direct (.mp4, .webm).
                </p>
                <Input
                  label="Légende (optionnelle)"
                  value={block.caption}
                  onChange={event => onChange(updateBlock(blocks, block.id, {
                    ...block,
                    caption: event.target.value,
                  }))}
                  placeholder="Description de la vidéo"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
