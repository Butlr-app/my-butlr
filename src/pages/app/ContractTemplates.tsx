import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  FileUp,
  GripVertical,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import {
  ACCEPTED_CONTRACT_TEMPLATE_FILE_TYPES,
  CONTRACT_TEMPLATE_VARIABLES,
  createContractTemplate,
  createContractTemplateFileSignedUrl,
  deleteContractTemplate,
  duplicateContractTemplate,
  fetchContractTemplates,
  importContractTemplateFile,
  setDefaultContractTemplate,
  updateContractTemplate,
  type ContractTemplate,
  type ContractTemplateBlock,
} from '@/lib/contractTemplates'
import type { Property } from '@/lib/types'

const blockTypeOptions = [
  { value: 'preamble', label: 'Préambule / parties' },
  { value: 'article', label: 'Article' },
  { value: 'callout', label: 'Clause clé mise en avant' },
  { value: 'signatures', label: 'Signatures' },
]

function cloneTemplate(template: ContractTemplate): ContractTemplate {
  return {
    ...template,
    blocks: template.blocks.map(block => ({ ...block })),
  }
}

export function ContractTemplates() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<ContractTemplate | null>(null)
  const [focusedBlockId, setFocusedBlockId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (preferredId?: string) => {
    if (!user) return
    const [templateResult, propertyResult] = await Promise.all([
      fetchContractTemplates(),
      fetchOwnerProperties(user.id),
    ])
    const nextTemplates = templateResult.data
    setTemplates(nextTemplates)
    setProperties((propertyResult.data as Property[] | null) ?? [])
    setError(templateResult.error?.message ?? propertyResult.error?.message ?? '')
    const nextId = preferredId
      ?? (nextTemplates.some(template => template.id === selectedId) ? selectedId : nextTemplates[0]?.id)
      ?? ''
    const selected = nextTemplates.find(template => template.id === nextId) ?? null
    setSelectedId(nextId)
    setDraft(selected ? cloneTemplate(selected) : null)
    setLoading(false)
  }, [selectedId, user])

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectTemplate = (template: ContractTemplate) => {
    setSelectedId(template.id)
    setDraft(cloneTemplate(template))
    setError('')
    setNotice('')
    setFocusedBlockId('')
  }

  const createNew = async () => {
    if (!user) return
    setBusy('create')
    setError('')
    try {
      const template = await createContractTemplate({
        userId: user.id,
        name: 'Nouveau modèle de location',
      })
      await load(template.id)
      setNotice('Modèle créé. Personnalisez ses blocs puis enregistrez.')
    } catch (createError) {
      setError(messageFrom(createError))
    } finally {
      setBusy('')
    }
  }

  const duplicateSelected = async () => {
    if (!user || !draft) return
    setBusy('duplicate')
    setError('')
    try {
      const template = await duplicateContractTemplate(draft, user.id)
      await load(template.id)
      setNotice('Copie créée.')
    } catch (duplicateError) {
      setError(messageFrom(duplicateError))
    } finally {
      setBusy('')
    }
  }

  const save = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      setError('Donnez un nom au modèle.')
      return
    }
    if (draft.blocks.length === 0) {
      setError('Ajoutez au moins un bloc au modèle.')
      return
    }
    setBusy('save')
    setError('')
    try {
      const saved = await updateContractTemplate(draft.id, draft)
      await load(saved.id)
      setNotice('Modèle enregistré.')
    } catch (saveError) {
      setError(messageFrom(saveError))
    } finally {
      setBusy('')
    }
  }

  const makeDefault = async () => {
    if (!draft) return
    setBusy('default')
    setError('')
    try {
      const saved = await setDefaultContractTemplate(draft)
      await load(saved.id)
      setNotice(saved.property_id
        ? 'Modèle par défaut de cette villa.'
        : 'Modèle par défaut pour toutes les villas.')
    } catch (defaultError) {
      setError(messageFrom(defaultError))
    } finally {
      setBusy('')
    }
  }

  const remove = async () => {
    if (!draft || !window.confirm(`Supprimer définitivement « ${draft.name} » ?`)) return
    setBusy('delete')
    setError('')
    try {
      await deleteContractTemplate(draft)
      setSelectedId('')
      setDraft(null)
      await load()
      setNotice('Modèle supprimé.')
    } catch (deleteError) {
      setError(messageFrom(deleteError))
    } finally {
      setBusy('')
    }
  }

  const importFile = async (file?: File) => {
    if (!file || !draft || !user) return
    setBusy('import')
    setError('')
    setNotice('Lecture du document…')
    try {
      const imported = await importContractTemplateFile({
        template: draft,
        userId: user.id,
        file,
        onProgress: setNotice,
      })
      await load(imported.id)
      setNotice(`${imported.blocks.length} blocs extraits. Vérifiez-les avant utilisation.`)
    } catch (importError) {
      setError(messageFrom(importError))
      setNotice('')
    } finally {
      setBusy('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openSource = async () => {
    if (!draft?.source_file_path) return
    setBusy('source')
    try {
      const url = await createContractTemplateFileSignedUrl(draft.source_file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (sourceError) {
      setError(messageFrom(sourceError))
    } finally {
      setBusy('')
    }
  }

  const updateBlock = (blockId: string, updates: Partial<ContractTemplateBlock>) => {
    setDraft(current => current ? {
      ...current,
      blocks: current.blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      ),
    } : current)
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    setDraft(current => {
      if (!current) return current
      const target = index + direction
      if (target < 0 || target >= current.blocks.length) return current
      const blocks = [...current.blocks]
      ;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]
      return { ...current, blocks }
    })
  }

  const addBlock = () => {
    const block: ContractTemplateBlock = {
      id: crypto.randomUUID(),
      type: 'article',
      title: `Nouvel article`,
      content: '',
      required: false,
    }
    setDraft(current => current
      ? { ...current, blocks: [...current.blocks, block] }
      : current)
    setFocusedBlockId(block.id)
  }

  const insertVariable = async (token: string) => {
    if (!focusedBlockId) {
      await navigator.clipboard.writeText(token)
      setNotice(`${token} copié.`)
      return
    }
    const block = draft?.blocks.find(item => item.id === focusedBlockId)
    updateBlock(focusedBlockId, {
      content: `${block?.content ?? ''}${block?.content ? ' ' : ''}${token}`,
    })
  }

  const editable = Boolean(draft && draft.user_id === user?.id)

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement des modèles…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Contrats · Modèles
          </p>
          <h1 className="mt-1 text-2xl font-bold">Modèles de contrats par villa</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Importez votre PDF ou DOCX, puis adaptez les clauses sous forme de blocs. Les variables sont remplacées par les données de la réservation lors de la génération.
          </p>
        </div>
        <Button onClick={createNew} disabled={busy === 'create'}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {(error || notice) && (
        <p
          role={error ? 'alert' : 'status'}
          className={error ? 'text-sm text-destructive' : 'text-sm text-success'}
        >
          {error || notice}
        </p>
      )}

      <Card className="border-info/30 bg-info/5 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <p className="text-sm text-muted-foreground">
            Le modèle « Base Pavard » reprend les 15 articles du PDF fourni, sans exposer les données personnelles du locataire. Faites valider toute modification juridique par votre conseil.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {templates.length} modèle{templates.length > 1 ? 's' : ''}
          </p>
          {templates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              className={`w-full cursor-pointer rounded-lg border p-4 text-left transition-colors ${
                selectedId === template.id
                  ? 'border-info bg-info/5'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{template.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {properties.find(property => property.id === template.property_id)?.name
                      ?? 'Toutes les villas'}
                  </span>
                </span>
                {template.is_default && <Badge variant="info">Défaut</Badge>}
              </span>
              <span className="mt-3 block text-xs text-muted-foreground">
                {template.blocks.length} blocs · version {template.version}
              </span>
            </button>
          ))}
          {templates.length === 0 && (
            <Card className="p-5 text-center">
              <p className="text-sm font-medium">Aucun modèle</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Créez un modèle vide puis importez votre contrat.
              </p>
            </Card>
          )}
        </aside>

        {draft ? (
          <section className="min-w-0 space-y-5">
            <Card className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nom du modèle"
                  value={draft.name}
                  disabled={!editable}
                  onChange={event => setDraft({ ...draft, name: event.target.value })}
                />
                <Select
                  label="Villa concernée"
                  value={draft.property_id ?? ''}
                  disabled={!editable}
                  onChange={event => setDraft({
                    ...draft,
                    property_id: event.target.value || null,
                    is_default: false,
                  })}
                  options={[
                    { value: '', label: 'Toutes mes villas' },
                    ...properties.map(property => ({
                      value: property.id,
                      label: property.name,
                    })),
                  ]}
                />
              </div>
              <label className="mt-4 block text-sm font-medium" htmlFor="template-description">
                Description
              </label>
              <textarea
                id="template-description"
                value={draft.description ?? ''}
                disabled={!editable}
                onChange={event => setDraft({ ...draft, description: event.target.value })}
                rows={2}
                className="mt-1.5 w-full resize-y rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
              />

              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept={ACCEPTED_CONTRACT_TEMPLATE_FILE_TYPES.join(',')}
                  onChange={event => importFile(event.target.files?.[0])}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!editable || busy === 'import'}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {busy === 'import' ? 'Import en cours…' : 'Importer PDF ou DOCX'}
                </Button>
                {draft.source_file_path && (
                  <Button variant="secondary" onClick={openSource} disabled={busy === 'source'}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Document source
                  </Button>
                )}
                <Button variant="secondary" onClick={duplicateSelected} disabled={busy === 'duplicate'}>
                  <Copy className="mr-2 h-4 w-4" />
                  Dupliquer
                </Button>
                <Button
                  variant="secondary"
                  onClick={makeDefault}
                  disabled={!editable || draft.is_default || busy === 'default'}
                >
                  {draft.is_default ? 'Modèle par défaut' : 'Définir par défaut'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={remove}
                  disabled={!editable || busy === 'delete'}
                  className="sm:ml-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
              {draft.source_file_name && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Source : {draft.source_file_name}
                </p>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold">Variables dynamiques</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cliquez pour ajouter la variable au dernier bloc sélectionné. Sans bloc sélectionné, elle est copiée.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {CONTRACT_TEMPLATE_VARIABLES.map(variable => (
                  <button
                    key={variable.token}
                    type="button"
                    onClick={() => insertVariable(variable.token)}
                    disabled={!editable}
                    title={variable.label}
                    className="min-h-9 cursor-pointer rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-xs hover:border-info hover:text-info disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {variable.token}
                  </button>
                ))}
              </div>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Blocs du contrat</h2>
                  <p className="text-xs text-muted-foreground">
                    Modifiez, ajoutez, supprimez ou réordonnez les clauses.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={addBlock} disabled={!editable}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {draft.blocks.map((block, index) => (
                <Card
                  key={block.id}
                  className={focusedBlockId === block.id ? 'border-info/60' : undefined}
                >
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <IconButton
                        label="Monter le bloc"
                        onClick={() => moveBlock(index, -1)}
                        disabled={!editable || index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Descendre le bloc"
                        onClick={() => moveBlock(index, 1)}
                        disabled={!editable || index === draft.blocks.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Supprimer le bloc"
                        onClick={() => setDraft({
                          ...draft,
                          blocks: draft.blocks.filter(item => item.id !== block.id),
                        })}
                        disabled={!editable || (block.required && draft.blocks.length === 1)}
                        destructive
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <Select
                        label="Type de bloc"
                        value={block.type}
                        disabled={!editable}
                        onChange={event => updateBlock(block.id, {
                          type: event.target.value as ContractTemplateBlock['type'],
                        })}
                        options={blockTypeOptions}
                      />
                      <Input
                        label="Titre"
                        value={block.title}
                        disabled={!editable}
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={event => updateBlock(block.id, { title: event.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`block-${block.id}`} className="block text-sm font-medium">
                        Contenu
                      </label>
                      <textarea
                        id={`block-${block.id}`}
                        rows={Math.min(14, Math.max(5, block.content.split('\n').length + 2))}
                        value={block.content}
                        disabled={!editable}
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={event => updateBlock(block.id, { content: event.target.value })}
                        className="mt-1.5 w-full resize-y rounded-sm border border-input bg-card px-3 py-2 text-sm leading-6 focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
                      />
                    </div>
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={block.required}
                        disabled={!editable}
                        onChange={event => updateBlock(block.id, { required: event.target.checked })}
                        className="h-4 w-4 accent-primary"
                      />
                      Bloc obligatoire
                    </label>
                  </div>
                </Card>
              ))}
            </div>

            <div className="sticky bottom-4 z-10 flex justify-end">
              <Button size="lg" onClick={save} disabled={!editable || busy === 'save'} className="shadow-lg">
                <Save className="mr-2 h-4 w-4" />
                {busy === 'save' ? 'Enregistrement…' : 'Enregistrer le modèle'}
              </Button>
            </div>
          </section>
        ) : (
          <Card className="flex min-h-72 items-center justify-center p-8 text-center">
            <div>
              <p className="font-medium">Créez votre premier modèle</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vous pourrez partir de blocs standards ou importer votre contrat existant.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function IconButton({
  label,
  destructive = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      {...props}
    />
  )
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}
