import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useDocuments, useProperties, type Document } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useAuth } from '@/lib/authContext'
import { uploadFile, deleteFile, extractStoragePath } from '@/lib/storage'
import { useTranslation } from '@/i18n/LanguageContext'
import { FolderOpen, FileText, Download, Trash2, Upload, Loader2, Plus } from 'lucide-react'

const categories: Document['category'][] = ['manual', 'warranty', 'contract', 'insurance', 'certificate', 'floorplan', 'other']

export function Documents() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: rawDocs, loading, insert, remove } = useDocuments()
  const { data: rawProperties } = useProperties()
  const { filterProperties, filterDocuments } = useRoleFilter()

  const properties = filterProperties(rawProperties)
  const documents = filterDocuments(rawDocs)
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'

  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)

  const [propertyId, setPropertyId] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Document['category']>('manual')
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  const filtered = useMemo(
    () =>
      documents
        .filter(d => !propertyFilter || d.property_id === propertyFilter)
        .filter(d => !categoryFilter || d.category === categoryFilter)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [documents, propertyFilter, categoryFilter],
  )

  const openForm = () => {
    setPropertyId(properties[0]?.id ?? '')
    setTitle('')
    setCategory('manual')
    setFile(null)
    setNotes('')
    setFormError('')
    setShowForm(true)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !propertyId || !file) {
      setFormError(t('documents.formError'))
      return
    }
    setUploading(true)
    try {
      const url = await uploadFile('documents', file)
      await insert({
        property_id: propertyId,
        title: title.trim(),
        category,
        file_url: url,
        file_name: file.name,
        notes: notes.trim() || null,
        uploaded_by: user?.id ?? null,
      })
      toast(t('documents.uploaded'))
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setUploading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const path = extractStoragePath(deleteTarget.file_url)
      if (path) await deleteFile(path).catch(() => {})
      await remove(deleteTarget.id)
      toast(t('documents.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6" data-testid="documents">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <FolderOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('documents.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('documents.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto">
          <Button size="sm" onClick={openForm}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('documents.upload')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[{ value: '', label: t('documents.allProperties') }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
        />
        <Select
          className="w-48"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          options={[{ value: '', label: t('documents.allCategories') }, ...categories.map(c => ({ value: c, label: t(`documents.category.${c}`) }))]}
        />
      </div>

      {filtered.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('documents.empty')}</Card>
      )}

      <div className="grid gap-2">
        {filtered.map(doc => (
          <Card key={doc.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{doc.title}</p>
                    <Badge variant="muted">{t(`documents.category.${doc.category}`)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {propertyName(doc.property_id)} · {fmtDate(doc.created_at)}
                    {doc.file_name && <> · {doc.file_name}</>}
                  </p>
                  {doc.notes && <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={doc.file_url} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
                <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(doc)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('documents.upload')}>
        <form onSubmit={handleUpload} className="space-y-4">
          <Select
            label={t('documents.property')}
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            options={properties.map(p => ({ value: p.id, label: p.name }))}
          />
          <Input
            label={t('documents.docTitle')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('documents.titlePlaceholder')}
          />
          <Select
            label={t('documents.categoryLabel')}
            value={category}
            onChange={e => setCategory(e.target.value as Document['category'])}
            options={categories.map(c => ({ value: c, label: t(`documents.category.${c}`) }))}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('documents.file')}</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-input rounded-sm text-sm cursor-pointer hover:bg-muted">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{file ? file.name : t('documents.chooseFile')}</span>
              <input
                type="file"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('documents.notes')}</label>
            <textarea
              className="w-full min-h-16 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t('documents.upload')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('documents.deleteTitle')}
        message={deleteTarget ? t('documents.deleteMessage').replace('{title}', deleteTarget.title) : ''}
      />
    </div>
  )
}
