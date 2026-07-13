import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ConciergeBell,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { uploadImageAsset } from '@/lib/uploadImageAsset'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/authContext'

type PricingMode = 'fixed' | 'per_person' | 'quote'

interface Service {
  id: string
  name: string | null
  description: string | null
  category: string | null
  starting_price: number | null
  commission: number | null
  available: boolean | null
  image_url: string | null
  pricing_mode: PricingMode | null
  provider_name: string | null
  includes_text: string | null
}

const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  fixed: 'Prix fixe',
  per_person: 'Par personne',
  quote: 'Sur devis',
}

const PRICING_MODE_OPTIONS = [
  { value: 'fixed', label: 'Prix fixe' },
  { value: 'per_person', label: 'Par personne' },
  { value: 'quote', label: 'Sur devis' },
]

function formatServicePrice(service: Service): string {
  const mode = service.pricing_mode ?? 'fixed'
  if (mode === 'quote' || service.starting_price == null) return 'Sur devis'
  const amount = `€${service.starting_price.toFixed(0)}`
  if (mode === 'per_person') return `${amount} / pers.`
  return `dès ${amount}`
}

interface FormState {
  name: string
  description: string
  category: string
  price: string
  commission: string
  available: boolean
  pricingMode: PricingMode
  providerName: string
  includesText: string
  imageUrl: string | null
  imageFile: File | null
  imagePreview: string | null
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  category: '',
  price: '',
  commission: '',
  available: true,
  pricingMode: 'fixed',
  providerName: '',
  includesText: '',
  imageUrl: null,
  imageFile: null,
  imagePreview: null,
}

export function Services() {
  const { user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select(
        'id, name, description, category, starting_price, commission, available, image_url, pricing_mode, provider_name, includes_text',
      )
      .order('name', { ascending: true })
    if (error) {
      setFeedback({ message: `Erreur de chargement : ${error.message}`, type: 'error' })
    } else {
      setServices(data as Service[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const categories = useMemo(() => {
    const set = new Set<string>()
    services.forEach(s => {
      if (s.category?.trim()) set.add(s.category.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [services])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter(s => {
      if (categoryFilter !== 'all' && s.category?.trim() !== categoryFilter) return false
      if (!q) return true
      return (
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q) ||
        (s.provider_name ?? '').toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [services, search, categoryFilter])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (service: Service) => {
    setEditingId(service.id)
    setForm({
      name: service.name ?? '',
      description: service.description ?? '',
      category: service.category ?? '',
      price: service.starting_price?.toString() ?? '',
      commission: service.commission?.toString() ?? '',
      available: service.available ?? true,
      pricingMode: service.pricing_mode ?? 'fixed',
      providerName: service.provider_name ?? '',
      includesText: service.includes_text ?? '',
      imageUrl: service.image_url,
      imageFile: null,
      imagePreview: service.image_url,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (form.imagePreview?.startsWith('blob:')) URL.revokeObjectURL(form.imagePreview)
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const patch = (partial: Partial<FormState>) => setForm(prev => ({ ...prev, ...partial }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFeedback({ message: 'Le nom du service est requis.', type: 'error' })
      return
    }
    setSaving(true)
    setFeedback(null)

    let imageUrl = form.imageUrl
    if (form.imageFile && user) {
      const { url, error: uploadError } = await uploadImageAsset(
        form.imageFile,
        user.id,
        'services',
        editingId ?? undefined,
      )
      if (uploadError || !url) {
        setSaving(false)
        setFeedback({ message: uploadError?.message ?? "Échec de l'envoi de l'image.", type: 'error' })
        return
      }
      imageUrl = url
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      starting_price: form.pricingMode === 'quote' ? null : form.price ? parseFloat(form.price) : null,
      commission: form.commission ? parseFloat(form.commission) : null,
      available: form.available,
      pricing_mode: form.pricingMode,
      provider_name: form.providerName.trim() || null,
      includes_text: form.includesText.trim() || null,
      image_url: imageUrl,
    }

    const { error } = editingId
      ? await supabase.from('services').update(payload).eq('id', editingId)
      : await supabase.from('services').insert(payload)

    setSaving(false)
    if (error) {
      setFeedback({ message: `Erreur d'enregistrement : ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: editingId ? 'Service mis à jour.' : 'Service créé.', type: 'success' })
      closeModal()
      fetchServices()
    }
  }

  const handleDelete = async (service: Service) => {
    if (!confirm(`Supprimer « ${service.name ?? 'ce service'} » ?`)) return
    setFeedback(null)
    const { error } = await supabase.from('services').delete().eq('id', service.id)
    if (error) {
      setFeedback({ message: `Erreur de suppression : ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Service supprimé.', type: 'success' })
      fetchServices()
    }
  }

  const handleToggleAvailable = async (service: Service) => {
    const next = !service.available
    setServices(prev => prev.map(s => (s.id === service.id ? { ...s, available: next } : s)))
    const { error } = await supabase.from('services').update({ available: next }).eq('id', service.id)
    if (error) {
      setFeedback({ message: `Erreur : ${error.message}`, type: 'error' })
      fetchServices()
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conciergerie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Services et expériences organisés pour les voyageurs : chef, transport, bien-être, activités…
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau service
        </Button>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
        <p className="text-xs text-muted-foreground">
          <ConciergeBell className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" />
          <strong className="text-foreground">Conciergerie</strong> = services, expériences, dates et devis.
          Pour les objets physiques commandés par quantité, utilisez la&nbsp;
          <strong className="text-foreground">Boutique</strong>.
        </p>
        <Link to="/app/boutique/catalog">
          <Button variant="secondary" size="sm">
            <ShoppingBag className="mr-1.5 h-4 w-4" />
            Gérer la Boutique
          </Button>
        </Link>
      </Card>

      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-success/30 bg-success-soft text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un service…"
              className="pl-9"
            />
          </div>
          {categories.length > 0 && (
            <Select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-auto min-w-[180px]"
              options={[
                { value: 'all', label: 'Toutes les catégories' },
                ...categories.map(c => ({ value: c, label: c })),
              ]}
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="aspect-[16/9] bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ConciergeBell className="h-7 w-7 text-muted-foreground" />
          </span>
          <div>
            <p className="font-medium">Aucun service pour l'instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre première prestation de conciergerie.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau service
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          Aucun service ne correspond à votre recherche.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(service => (
            <Card key={service.id} className="group flex flex-col overflow-hidden">
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name ?? ''}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <ConciergeBell className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <Badge variant={service.available ? 'success' : 'muted'}>
                    {service.available ? 'Actif' : 'Masqué'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{service.name || '—'}</p>
                    {service.provider_name && (
                      <p className="truncate text-xs text-muted-foreground">par {service.provider_name}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatServicePrice(service)}</span>
                </div>

                {service.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {service.category && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {service.category}
                    </span>
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {PRICING_MODE_LABELS[service.pricing_mode ?? 'fixed']}
                  </span>
                  {service.commission != null && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {service.commission}% comm.
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={!!service.available}
                      onCheckedChange={() => handleToggleAvailable(service)}
                    />
                    Visible
                  </label>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" className="px-2.5" onClick={() => openEdit(service)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="px-2.5 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? 'Modifier le service' : 'Nouveau service'}>
        <div className="space-y-4">
          <Input
            label="Nom"
            value={form.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Chef privé"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={e => patch({ description: e.target.value })}
            placeholder="Dîner gastronomique préparé à la villa"
          />

          {user && (
            <ImageUpload
              label="Photo du service"
              value={form.imageFile}
              previewUrl={form.imagePreview}
              onChange={(file, previewUrl) =>
                patch({
                  imageFile: file,
                  imagePreview: previewUrl,
                  ...(file ? {} : { imageUrl: null }),
                })
              }
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Catégorie"
              value={form.category}
              onChange={e => patch({ category: e.target.value })}
              placeholder="Gastronomie"
              list="service-categories"
            />
            <datalist id="service-categories">
              {categories.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Input
              label="Prestataire"
              value={form.providerName}
              onChange={e => patch({ providerName: e.target.value })}
              placeholder="Chef Rémi"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Tarification"
              value={form.pricingMode}
              onChange={e => patch({ pricingMode: e.target.value as PricingMode })}
              options={PRICING_MODE_OPTIONS}
            />
            <Input
              label="Prix (€)"
              type="number"
              value={form.price}
              onChange={e => patch({ price: e.target.value })}
              placeholder="150"
              disabled={form.pricingMode === 'quote'}
            />
            <Input
              label="Commission (%)"
              type="number"
              value={form.commission}
              onChange={e => patch({ commission: e.target.value })}
              placeholder="10"
            />
          </div>

          <Input
            label="Inclus"
            value={form.includesText}
            onChange={e => patch({ includesText: e.target.value })}
            placeholder="Courses et vaisselle incluses"
          />

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Visible dans le portail voyageur</p>
              <p className="text-xs text-muted-foreground">Les voyageurs peuvent demander ce service.</p>
            </div>
            <Switch checked={form.available} onCheckedChange={v => patch({ available: v })} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer le service'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
