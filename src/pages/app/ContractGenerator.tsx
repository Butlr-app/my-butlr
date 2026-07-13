import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useProperties, useReservations, useNotifications } from '@/lib/useSupabase'
import { useContractTemplates } from '@/lib/useContractTemplates'
import { uploadFile } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { sha256Blob } from '@/lib/cryptoHash'
import {
  FileText, Download, Loader2, ChevronRight, ChevronLeft, Plus, Trash2,
  GripVertical, Eye, EyeOff, Pencil, Save, Copy, Settings2, BookOpen,
  AlertTriangle, CheckCircle2, Users, Building2, CreditCard, Calendar,
} from 'lucide-react'
import {
  createDefaultTemplate,
  type ContractArticle,
  type ContractTemplate,
} from '@/data/defaultContractTemplate'
import {
  generateContractPDF,
  type TenantForm,
  type IntermediaryForm,
  type StayForm,
} from '@/lib/contractPdf'

// ─── Step indicator ────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Modele', icon: BookOpen },
  { label: 'Parties', icon: Users },
  { label: 'Sejour', icon: Calendar },
  { label: 'Articles', icon: Settings2 },
  { label: 'Apercu', icon: Eye },
]

function StepIndicator({ current, onStep }: { current: number; onStep: (s: number) => void }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <button
          key={i}
          onClick={() => onStep(i)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            i === current
              ? 'bg-foreground text-background'
              : i < current
                ? 'bg-muted text-foreground'
                : 'bg-muted/50 text-muted-foreground'
          }`}
        >
          <s.icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{s.label}</span>
          {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground ml-1" />}
        </button>
      ))}
    </div>
  )
}

// ─── Article editor component ──────────────────────────────────────────────

function ArticleEditor({
  article,
  onUpdate,
  onRemove,
  onToggle,
  dragHandleProps,
}: {
  article: ContractArticle
  onUpdate: (a: ContractArticle) => void
  onRemove: () => void
  onToggle: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(article.title)
  const [editContent, setEditContent] = useState(article.content)

  const save = () => {
    onUpdate({ ...article, title: editTitle, content: editContent })
    setEditing(false)
  }

  const cancel = () => {
    setEditTitle(article.title)
    setEditContent(article.content)
    setEditing(false)
  }

  return (
    <div className={`border rounded-md transition-colors ${article.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span {...dragHandleProps} className="touch-none">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground w-8 shrink-0">Art. {article.number}</span>

        {editing ? (
          <input
            className="flex-1 h-8 px-2 bg-background border border-input rounded text-sm"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
          />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">{article.title}</span>
        )}

        {article.isHighlighted && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 tabular-nums uppercase shrink-0">
            cle
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button onClick={save} className="p-1.5 rounded hover:bg-muted" title="Sauvegarder">
                <Save className="w-3.5 h-3.5 text-emerald-500" />
              </button>
              <button onClick={cancel} className="p-1.5 rounded hover:bg-muted" title="Annuler">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-muted" title="Modifier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onToggle} className="p-1.5 rounded hover:bg-muted" title={article.enabled ? 'Desactiver' : 'Activer'}>
            {article.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-muted text-destructive" title="Supprimer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="p-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Contenu de l'article</label>
          <textarea
            className="w-full min-h-[120px] p-3 bg-background border border-input rounded text-sm resize-y"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Variables : {'{bailleur_company}'}, {'{bailleur_representative}'}, {'{tenant_name}'}, {'{property_name}'}, {'{property_address}'}, {'{rent}'}, {'{deposit}'}, {'{max_guests}'}, {'{surface}'}, {'{bedrooms}'}, {'{checkin_time}'}, {'{checkout_time}'}
          </p>
        </div>
      )}

      {!editing && article.enabled && (
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{article.content}</p>
        </div>
      )}
    </div>
  )
}

function SortableArticleEditor({
  article,
  onUpdate,
  onRemove,
  onToggle,
}: {
  article: ContractArticle
  onUpdate: (a: ContractArticle) => void
  onRemove: () => void
  onToggle: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ArticleEditor
        article={article}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onToggle={onToggle}
        dragHandleProps={listeners}
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function ContractGenerator() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { insertNotification } = useNotifications()
  const { data: properties } = useProperties()
  const { data: reservations } = useReservations()
  const { templates, loading: templatesLoading, saveTemplate, updateTemplate, deleteTemplate } = useContractTemplates()

  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  // Template state
  const [template, setTemplate] = useState<ContractTemplate>(createDefaultTemplate)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default')
  const [templateName, setTemplateName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Tenant form
  const [tenant, setTenant] = useState<TenantForm>({
    name: '', address: '', phone: '', email: '',
    birthDate: '', birthPlace: '', nationality: '',
    idType: 'passeport', idNumber: '', idIssued: '', idExpiry: '',
  })

  // Intermediary
  const [intermediary, setIntermediary] = useState<IntermediaryForm>({
    enabled: false, name: '', description: '',
  })

  // Stay form
  const [stay, setStay] = useState<StayForm>({
    propertyId: '', propertyName: template.propertyDefaults.name,
    propertyAddress: template.propertyDefaults.address,
    arrivalDate: '', departureDate: '',
    arrivalTime: template.propertyDefaults.checkinTime,
    departureTime: template.propertyDefaults.checkoutTime,
    guestsCount: '1',
    maxGuests: String(template.propertyDefaults.maxGuests),
    rentAmount: String(template.propertyDefaults.rent),
    depositAmount: String(template.propertyDefaults.deposit),
    taxesIncluded: true,
    reservationId: '',
  })

  // New article modal
  const [showNewArticle, setShowNewArticle] = useState(false)
  const [newArticleTitle, setNewArticleTitle] = useState('')
  const [newArticleContent, setNewArticleContent] = useState('')

  // Load template from saved
  const handleLoadTemplate = useCallback((id: string) => {
    setSelectedTemplateId(id)
    if (id === 'default') {
      setTemplate(createDefaultTemplate())
    } else {
      const saved = templates.find(t => t.id === id)
      if (saved) {
        setTemplate(saved.template_data as ContractTemplate)
      }
    }
  }, [templates])

  // Load templates on mount
  useEffect(() => {
    if (!templatesLoading && templates.length > 0 && selectedTemplateId === 'default') {
      // Keep default selected
    }
  }, [templatesLoading, templates, selectedTemplateId])

  // Auto-fill from reservation
  const handleReservationChange = (id: string) => {
    const res = reservations.find(r => r.id === id)
    if (res) {
      setTenant(t => ({ ...t, name: res.guest_name, email: res.guest_email ?? '', phone: res.guest_phone ?? '' }))
      setStay(s => ({
        ...s,
        reservationId: id,
        arrivalDate: res.arrival,
        departureDate: res.departure,
        guestsCount: String(res.guests_count),
        rentAmount: String(res.total_amount),
      }))
      if (res.property_id) {
        const prop = properties.find(p => p.id === res.property_id)
        if (prop) {
          setStay(s => ({
            ...s,
            propertyId: prop.id,
            propertyName: prop.name,
            propertyAddress: prop.location ?? '',
          }))
        }
      }
    }
  }

  const handlePropertyChange = (id: string) => {
    const prop = properties.find(p => p.id === id)
    if (prop) {
      const maxGuests = prop.max_guests || template.propertyDefaults.maxGuests
      setTemplate(t => ({
        ...t,
        propertyDefaults: {
          ...t.propertyDefaults,
          surface: prop.surface_m2 ?? t.propertyDefaults.surface,
          bedrooms: prop.bedrooms ?? t.propertyDefaults.bedrooms,
          maxGuests,
        },
      }))
      setStay(s => ({
        ...s,
        propertyId: id,
        propertyName: prop.name,
        propertyAddress: prop.location ?? '',
        maxGuests: String(maxGuests),
      }))
    }
  }

  // Article management
  const updateArticle = (id: string, updated: ContractArticle) => {
    setTemplate(t => ({
      ...t,
      articles: t.articles.map(a => a.id === id ? updated : a),
    }))
  }

  const toggleArticle = (id: string) => {
    setTemplate(t => ({
      ...t,
      articles: t.articles.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a),
    }))
  }

  const removeArticle = (id: string) => {
    setTemplate(t => ({
      ...t,
      articles: t.articles.filter(a => a.id !== id).map((a, i) => ({ ...a, number: i + 1 })),
    }))
  }

  const handleArticleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setTemplate(t => {
      const oldIndex = t.articles.findIndex(a => a.id === active.id)
      const newIndex = t.articles.findIndex(a => a.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return t
      const reordered = arrayMove(t.articles, oldIndex, newIndex).map((a, i) => ({
        ...a,
        number: i + 1,
      }))
      return { ...t, articles: reordered }
    })
  }

  const articleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const addArticle = () => {
    if (!newArticleTitle.trim()) {
      toast('Titre requis', 'error')
      return
    }
    const nextNum = template.articles.length + 1
    setTemplate(t => ({
      ...t,
      articles: [
        ...t.articles,
        {
          id: crypto.randomUUID(),
          number: nextNum,
          kind: 'generic' as const,
          title: newArticleTitle,
          content: newArticleContent || 'Contenu de l\'article...',
          enabled: true,
          isHighlighted: false,
        },
      ],
    }))
    setNewArticleTitle('')
    setNewArticleContent('')
    setShowNewArticle(false)
    toast('Article ajoute')
  }

  // Save template (create new, or update selected saved template)
  const handleSaveTemplate = async () => {
    const isUpdating = selectedTemplateId !== 'default'
    const name = (templateName.trim() || (isUpdating
      ? templates.find(t => t.id === selectedTemplateId)?.name ?? ''
      : '')).trim()
    if (!name) {
      toast('Nom du modele requis', 'error')
      return
    }
    try {
      if (isUpdating) {
        await updateTemplate(selectedTemplateId, name, template)
        toast('Modele mis a jour')
      } else {
        const created = await saveTemplate(name, template)
        setSelectedTemplateId(created.id)
        toast('Modele sauvegarde')
      }
      setShowSaveModal(false)
      setTemplateName('')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const openSaveModal = () => {
    const existing = selectedTemplateId !== 'default'
      ? templates.find(t => t.id === selectedTemplateId)?.name ?? ''
      : ''
    setTemplateName(existing)
    setShowSaveModal(true)
  }

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id)
      if (selectedTemplateId === id) {
        setSelectedTemplateId('default')
        setTemplate(createDefaultTemplate())
      }
      toast('Modele supprime')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteConfirm(null)
  }

  const validateContractForm = () => {
    if (!tenant.name) {
      toast('Nom du locataire requis', 'error')
      return false
    }
    if (!stay.arrivalDate || !stay.departureDate) {
      toast('Dates du sejour requises', 'error')
      return false
    }
    return true
  }

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPreviewOpen(false)
  }

  const handlePreviewPdf = async () => {
    if (!validateContractForm()) return

    setPreviewing(true)
    try {
      const doc = generateContractPDF(template, tenant, intermediary, stay)
      const blob = doc.output('blob')
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setPreviewing(false)
  }

  // Generate PDF download only
  const handleGenerate = () => {
    if (!validateContractForm()) return

    setGenerating(true)
    try {
      const doc = generateContractPDF(template, tenant, intermediary, stay)
      const fileName = `contrat-${stay.propertyName.replace(/\s+/g, '-').toLowerCase()}-${tenant.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
      doc.save(fileName)
      toast('Contrat PDF genere avec succes')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setGenerating(false)
  }

  // Persist contract row + upload PDF so signing / guest portal can open it
  const handleSaveAndCreate = async () => {
    if (!validateContractForm()) return

    setSaving(true)
    try {
      const doc = generateContractPDF(template, tenant, intermediary, stay)
      const safeProperty = stay.propertyName.replace(/\s+/g, '-').toLowerCase() || 'propriete'
      const safeGuest = tenant.name.replace(/\s+/g, '-').toLowerCase() || 'locataire'
      const fileName = `contrat-${safeProperty}-${safeGuest}.pdf`
      const blob = doc.output('blob')
      const document_hash = await sha256Blob(blob)
      const file = new File([blob], fileName, { type: 'application/pdf' })
      const documentUrl = await uploadFile('contracts', file)

      const { data: { user } } = await supabase.auth.getUser()
      const { data: created, error } = await supabase
        .from('contracts')
        .insert({
          guest_name: tenant.name,
          property_name: stay.propertyName || null,
          type: 'rental',
          status: 'draft',
          date: stay.arrivalDate || new Date().toISOString().split('T')[0],
          reservation_id: stay.reservationId || null,
          document_url: documentUrl,
          document_hash,
          template_version: template.version ?? '2026.07.1',
          template_snapshot: template,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      await insertNotification({
        user_id: user?.id ?? null,
        type: 'system',
        title: 'Contrat cree',
        message: `Contrat de location pour ${tenant.name} — ${stay.propertyName}`,
        data: { contract_id: created.id },
        related_id: created.id,
      })

      // Also offer a local download of the same PDF
      doc.save(fileName)
      toast('Contrat enregistre et PDF genere')
      navigate('/app/contracts')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  // Active articles count
  const activeCount = useMemo(() => template.articles.filter(a => a.enabled).length, [template.articles])
  const totalCount = template.articles.length

  // Nights calculation
  const nights = useMemo(() => {
    if (!stay.arrivalDate || !stay.departureDate) return 0
    const a = new Date(stay.arrivalDate)
    const d = new Date(stay.departureDate)
    return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86400000))
  }, [stay.arrivalDate, stay.departureDate])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">
          Generateur de contrats
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={openSaveModal}>
            <Save className="w-4 h-4 mr-2" />
            {selectedTemplateId === 'default' ? 'Sauvegarder modele' : 'Mettre a jour modele'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handlePreviewPdf} disabled={generating || saving || previewing}>
            {previewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Apercu PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={generating || saving || previewing}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Generer PDF
          </Button>
          <Button size="sm" onClick={handleSaveAndCreate} disabled={generating || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer & creer
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} onStep={setStep} />

      {/* ─── Step 0: Template selection ─────────────────────────────────── */}
      {step === 0 && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Default template */}
          <button
            onClick={() => handleLoadTemplate('default')}
            className={`text-left border rounded-lg p-5 transition-all ${
              selectedTemplateId === 'default' ? 'border-foreground bg-muted/50 ring-1 ring-foreground/20' : 'border-border hover:border-foreground/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">Modele par defaut</span>
            </div>
            <p className="text-xs text-muted-foreground">Contrat de location saisonniere — The French Way. 15 articles, format professionnel.</p>
            {selectedTemplateId === 'default' && (
              <div className="flex items-center gap-1.5 mt-3 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Selectionne
              </div>
            )}
          </button>

          {/* Saved templates */}
          {templates.map(t => (
            <div
              key={t.id}
              className={`relative text-left border rounded-lg p-5 transition-all ${
                selectedTemplateId === t.id ? 'border-foreground bg-muted/50 ring-1 ring-foreground/20' : 'border-border hover:border-foreground/40'
              }`}
            >
              <button onClick={() => handleLoadTemplate(t.id)} className="w-full text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(t.template_data as ContractTemplate).articles.length} articles · Sauvegarde le {new Date(t.created_at).toLocaleDateString('fr-FR')}
                </p>
                {selectedTemplateId === t.id && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selectionne
                  </div>
                )}
              </button>
              <button
                onClick={() => setDeleteConfirm(t.id)}
                className="absolute top-3 right-3 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Bailleur settings */}
          <Card className="p-5 lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Informations du bailleur</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="Societe" value={template.bailleur.company} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, company: e.target.value } }))} />
              <Input label="Representant" value={template.bailleur.representative} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, representative: e.target.value } }))} />
              <Input label="Adresse" value={template.bailleur.address} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, address: e.target.value } }))} />
              <Input label="RCS" value={template.bailleur.rcs} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, rcs: e.target.value } }))} />
              <Input label="SIRET" value={template.bailleur.siret} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, siret: e.target.value } }))} />
              <Input label="Telephone" value={template.bailleur.phone} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, phone: e.target.value } }))} />
              <Input label="Email" value={template.bailleur.email} onChange={e => setTemplate(t => ({ ...t, bailleur: { ...t.bailleur, email: e.target.value } }))} />
            </div>
          </Card>
        </div>
      )}

      {/* ─── Step 1: Parties ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Locataire</h3>
            </div>
            <div className="space-y-3">
              <Select
                label="Remplir depuis une reservation"
                value={stay.reservationId}
                onChange={e => handleReservationChange(e.target.value)}
                options={[
                  { value: '', label: 'Selectionner une reservation (optionnel)' },
                  ...reservations.map(r => ({ value: r.id, label: `${r.guest_name} — ${r.property?.name ?? 'N/A'}` })),
                ]}
              />
              <Input label="Nom complet *" value={tenant.name} onChange={e => setTenant(t => ({ ...t, name: e.target.value }))} required />
              <Input label="Adresse" value={tenant.address} onChange={e => setTenant(t => ({ ...t, address: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" type="email" value={tenant.email} onChange={e => setTenant(t => ({ ...t, email: e.target.value }))} />
                <Input label="Telephone" type="tel" value={tenant.phone} onChange={e => setTenant(t => ({ ...t, phone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date de naissance" type="date" value={tenant.birthDate} onChange={e => setTenant(t => ({ ...t, birthDate: e.target.value }))} />
                <Input label="Lieu de naissance" value={tenant.birthPlace} onChange={e => setTenant(t => ({ ...t, birthPlace: e.target.value }))} />
              </div>
              <Input label="Nationalite" value={tenant.nationality} onChange={e => setTenant(t => ({ ...t, nationality: e.target.value }))} />
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Piece d'identite</h3>
              <div className="space-y-3">
                <Select
                  label="Type de document"
                  value={tenant.idType}
                  onChange={e => setTenant(t => ({ ...t, idType: e.target.value }))}
                  options={[
                    { value: 'passeport', label: 'Passeport' },
                    { value: "carte d'identite", label: "Carte d'identite" },
                    { value: 'permis de conduire', label: 'Permis de conduire' },
                    { value: 'titre de sejour', label: 'Titre de sejour' },
                  ]}
                />
                <Input label="Numero" value={tenant.idNumber} onChange={e => setTenant(t => ({ ...t, idNumber: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Date de delivrance" type="date" value={tenant.idIssued} onChange={e => setTenant(t => ({ ...t, idIssued: e.target.value }))} />
                  <Input label="Date d'expiration" type="date" value={tenant.idExpiry} onChange={e => setTenant(t => ({ ...t, idExpiry: e.target.value }))} />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Intermediaire</h3>
                <button
                  onClick={() => setIntermediary(i => ({ ...i, enabled: !i.enabled }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${intermediary.enabled ? 'bg-foreground' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform ${intermediary.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {intermediary.enabled && (
                <div className="space-y-3">
                  <Input label="Nom de l'intermediaire" value={intermediary.name} onChange={e => setIntermediary(i => ({ ...i, name: e.target.value }))} placeholder="ex: Conciergerie Isidore Paris" />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Description (optionnel)</label>
                    <textarea
                      className="w-full min-h-[60px] p-3 bg-card border border-input rounded-sm text-sm resize-y"
                      value={intermediary.description}
                      onChange={e => setIntermediary(i => ({ ...i, description: e.target.value }))}
                      placeholder="La presente reservation est realisee par l'intermediaire de..."
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── Step 2: Stay details ───────────────────────────────────────── */}
      {step === 2 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Propriete</h3>
            </div>
            <div className="space-y-3">
              <Select
                label="Selectionner une propriete"
                value={stay.propertyId}
                onChange={e => handlePropertyChange(e.target.value)}
                options={[
                  { value: '', label: 'Choisir...' },
                  ...properties.map(p => ({ value: p.id, label: p.name })),
                ]}
              />
              <Input label="Nom de la propriete" value={stay.propertyName} onChange={e => setStay(s => ({ ...s, propertyName: e.target.value }))} />
              <Input label="Adresse" value={stay.propertyAddress} onChange={e => setStay(s => ({ ...s, propertyAddress: e.target.value }))} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Dates du sejour</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date d'arrivee *" type="date" value={stay.arrivalDate} onChange={e => setStay(s => ({ ...s, arrivalDate: e.target.value }))} required />
                <Input label="Date de depart *" type="date" value={stay.departureDate} onChange={e => setStay(s => ({ ...s, departureDate: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Heure d'arrivee" value={stay.arrivalTime} onChange={e => setStay(s => ({ ...s, arrivalTime: e.target.value }))} placeholder="14h00" />
                <Input label="Heure de depart" value={stay.departureTime} onChange={e => setStay(s => ({ ...s, departureTime: e.target.value }))} placeholder="11h00" />
              </div>
              {nights > 0 && (
                <p className="text-xs text-muted-foreground">{nights} nuit{nights > 1 ? 's' : ''}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre d'occupants" type="number" min="1" value={stay.guestsCount} onChange={e => setStay(s => ({ ...s, guestsCount: e.target.value }))} />
                <Input label="Capacite max" type="number" min="1" value={stay.maxGuests} onChange={e => setStay(s => ({ ...s, maxGuests: e.target.value }))} />
              </div>
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Conditions financieres</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Montant du loyer (EUR)" type="number" min="0" value={stay.rentAmount} onChange={e => setStay(s => ({ ...s, rentAmount: e.target.value }))} />
              <Input label="Depot de garantie (EUR)" type="number" min="0" value={stay.depositAmount} onChange={e => setStay(s => ({ ...s, depositAmount: e.target.value }))} />
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stay.taxesIncluded}
                    onChange={e => setStay(s => ({ ...s, taxesIncluded: e.target.checked }))}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm">Taxes de sejour incluses</span>
                </label>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Step 3: Articles ───────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {activeCount}/{totalCount} articles actifs
            </p>
            <Button size="sm" variant="secondary" onClick={() => setShowNewArticle(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un article
            </Button>
          </div>

          <DndContext
            sensors={articleSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleArticleDragEnd}
          >
            <SortableContext
              items={template.articles.map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {template.articles.map(article => (
                  <SortableArticleEditor
                    key={article.id}
                    article={article}
                    onUpdate={a => updateArticle(article.id, a)}
                    onRemove={() => removeArticle(article.id)}
                    onToggle={() => toggleArticle(article.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ─── Step 4: Preview ────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="bg-white border border-border rounded-md p-8 max-h-[600px] overflow-y-auto text-black font-serif">
              {/* Cover preview */}
              <div className="text-center mb-8">
                <p className="text-[10px] tracking-[.3em] text-gray-400 uppercase mb-2">Contrat de location saisonniere</p>
                <h1 className="text-xl font-bold mb-1">{stay.propertyName}</h1>
                <p className="text-xs text-gray-500">Location saisonniere de prestige</p>
              </div>

              <hr className="border-gray-200 mb-6" />

              {/* Parties */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-[10px] tracking-[.2em] text-gray-400 uppercase mb-1">Le bailleur</p>
                  <p className="text-sm font-semibold">{template.bailleur.company}</p>
                  <p className="text-xs text-gray-600">{template.bailleur.representative}</p>
                  <p className="text-xs text-gray-600">{template.bailleur.address}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[.2em] text-gray-400 uppercase mb-1">Le locataire</p>
                  <p className="text-sm font-semibold">{tenant.name || '[Nom du locataire]'}</p>
                  {tenant.address && <p className="text-xs text-gray-600">{tenant.address}</p>}
                  {tenant.nationality && <p className="text-xs text-gray-600">{tenant.nationality}</p>}
                </div>
              </div>

              {intermediary.enabled && intermediary.name && (
                <div className="mb-6">
                  <p className="text-[10px] tracking-[.2em] text-gray-400 uppercase mb-1">Intermediaire</p>
                  <p className="text-xs text-gray-600">{intermediary.name}</p>
                </div>
              )}

              {/* Stay summary box */}
              <div className="bg-gray-50 rounded-md p-4 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Arrivee</p>
                    <p className="font-medium">{stay.arrivalDate || '—'} {stay.arrivalTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Depart</p>
                    <p className="font-medium">{stay.departureDate || '—'} {stay.departureTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Loyer</p>
                    <p className="font-medium">{Number(stay.rentAmount).toLocaleString('fr-FR')} EUR</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase text-[9px] tracking-wider">Depot</p>
                    <p className="font-medium">{Number(stay.depositAmount).toLocaleString('fr-FR')} EUR</p>
                  </div>
                </div>
              </div>

              {/* Articles preview */}
              {template.articles.filter(a => a.enabled).map(art => (
                <div key={art.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-gray-400">Art. {art.number}</span>
                    <h3 className="text-sm font-semibold">{art.title}</h3>
                    {art.isHighlighted && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded uppercase">cle</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed line-clamp-4">{art.content}</p>
                </div>
              ))}

              {/* Signatures preview */}
              <hr className="border-gray-200 my-6" />
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] tracking-[.2em] text-gray-400 uppercase mb-2">Le bailleur</p>
                  <p className="text-sm font-semibold">{template.bailleur.company}</p>
                  <p className="text-xs text-gray-600 italic mt-4">"Lu et approuve"</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[.2em] text-gray-400 uppercase mb-2">Le locataire</p>
                  <p className="text-sm font-semibold">{tenant.name || '[Nom]'}</p>
                  <p className="text-xs text-gray-600 italic mt-4">"Lu et approuve"</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Generate / save buttons */}
          <div className="flex justify-end gap-2">
            <Button size="lg" variant="secondary" onClick={handlePreviewPdf} disabled={generating || saving || previewing}>
              {previewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              Apercu PDF
            </Button>
            <Button size="lg" variant="secondary" onClick={handleGenerate} disabled={generating || saving || previewing}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Generer le PDF
            </Button>
            <Button size="lg" onClick={handleSaveAndCreate} disabled={generating || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer & creer
            </Button>
          </div>
        </div>
      )}

      {/* ─── Navigation ─────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Precedent
        </Button>
        <Button
          size="sm"
          onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
        >
          Suivant
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* ─── Save template modal ────────────────────────────────────────── */}
      <Modal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title={selectedTemplateId === 'default' ? 'Sauvegarder le modele' : 'Mettre a jour le modele'}
      >
        <div className="space-y-4">
          <Input
            label="Nom du modele"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="ex: Contrat Villa Saint-Tropez"
          />
          <p className="text-xs text-muted-foreground">
            {selectedTemplateId === 'default'
              ? `Le modele sera cree avec les ${template.articles.length} articles actuels et les informations du bailleur.`
              : `Le modele selectionne sera mis a jour avec les ${template.articles.length} articles actuels et les informations du bailleur.`}
          </p>
          <div className="flex gap-3 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowSaveModal(false)}>Annuler</Button>
            <Button size="sm" onClick={handleSaveTemplate}>
              {selectedTemplateId === 'default' ? 'Sauvegarder' : 'Mettre a jour'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── New article modal ──────────────────────────────────────────── */}
      <Modal open={showNewArticle} onClose={() => setShowNewArticle(false)} title="Ajouter un article">
        <div className="space-y-4">
          <Input
            label="Titre de l'article *"
            value={newArticleTitle}
            onChange={e => setNewArticleTitle(e.target.value)}
            placeholder="ex: Conditions speciales"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Contenu</label>
            <textarea
              className="w-full min-h-[120px] p-3 bg-card border border-input rounded-sm text-sm resize-y"
              value={newArticleContent}
              onChange={e => setNewArticleContent(e.target.value)}
              placeholder="Redigez le contenu de l'article..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowNewArticle(false)}>Annuler</Button>
            <Button size="sm" onClick={addArticle}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* ─── PDF preview modal ─────────────────────────────────────────── */}
      <Modal
        open={previewOpen}
        onClose={closePreview}
        title="Apercu PDF"
        className="max-w-4xl"
      >
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title="Apercu du contrat PDF"
            className="w-full h-[70vh] border border-border rounded-md"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Aucun apercu disponible.</p>
        )}
      </Modal>

      {/* ─── Delete template confirm ────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteTemplate(deleteConfirm)}
        title="Supprimer ce modele ?"
        message="Cette action est irreversible. Le modele sera definitivement supprime."
        confirmLabel="Supprimer"
      />
    </div>
  )
}
