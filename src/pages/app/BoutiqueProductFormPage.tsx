import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SwitchField } from '@/components/ui/Switch'
import { CatalogImagesEditor } from '@/components/boutique/CatalogImagesEditor'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import {
  catalogPriceTypeLabels,
  createCatalogItem,
  fetchCatalogCategories,
  fetchCatalogItemById,
  fetchCatalogItemPropertyIds,
  updateCatalogItem,
  type CatalogItemType,
  type CatalogPriceType,
} from '@/lib/boutique'

const typeOptions: { value: CatalogItemType; label: string }[] = [
  { value: 'product', label: 'Produit' },
  { value: 'experience', label: 'Expérience packagée' },
]

const priceTypeOptions: { value: CatalogPriceType; label: string }[] = [
  { value: 'fixed_price', label: 'Prix fixe' },
  { value: 'starting_from', label: 'À partir de' },
  { value: 'per_person', label: 'Par personne' },
  { value: 'per_hour', label: 'Par heure' },
  { value: 'per_day', label: 'Par jour' },
  { value: 'custom_quote', label: 'Sur devis' },
]

const defaultForm = {
  type: 'product' as CatalogItemType,
  category_id: '',
  title: '',
  short_description: '',
  long_description: '',
  base_price: '',
  price_type: 'fixed_price' as CatalogPriceType,
  provider_name: '',
  requires_quote: false,
  is_featured: false,
  is_active: true,
  max_quantity: '99',
  minimum_notice_hours: '0',
  property_ids: [] as string[],
  images: [] as string[],
}

export function BoutiqueProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(defaultForm)
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCatalogCategories().then(({ data }) => {
      const opts = (data ?? []).map(c => ({ value: c.id, label: c.name }))
      setCategories(opts)
      if (!isEdit && opts.length > 0) {
        setForm(current => ({ ...current, category_id: current.category_id || opts[0].value }))
      }
    })
  }, [isEdit])

  useEffect(() => {
    if (!user) return
    fetchOwnerProperties(user.id).then(({ data }) => {
      setProperties((data ?? []).map(p => ({ id: p.id, name: p.name })))
    })
  }, [user?.id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchCatalogItemById(id),
      fetchCatalogItemPropertyIds(id),
    ]).then(([itemRes, propsRes]) => {
      const item = itemRes.data
      if (!item) {
        setError('Article introuvable.')
        setLoading(false)
        return
      }
      setForm({
        type: item.type as CatalogItemType,
        category_id: item.category_id,
        title: item.title,
        short_description: item.short_description ?? '',
        long_description: item.long_description ?? '',
        base_price: item.base_price != null ? String(item.base_price) : '',
        price_type: item.price_type as CatalogPriceType,
        provider_name: item.provider_name ?? '',
        requires_quote: item.requires_quote,
        is_featured: item.is_featured,
        is_active: item.is_active,
        max_quantity: String(item.max_quantity),
        minimum_notice_hours: String(item.minimum_notice_hours),
        property_ids: (propsRes.data ?? []).map(row => row.property_id),
        images: Array.isArray(item.images) ? item.images as string[] : [],
      })
      setLoading(false)
    })
  }, [id])

  const toggleProperty = (propertyId: string) => {
    setForm(current => ({
      ...current,
      property_ids: current.property_ids.includes(propertyId)
        ? current.property_ids.filter(pid => pid !== propertyId)
        : [...current.property_ids, propertyId],
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.category_id) {
      setError('Le titre et la catégorie sont obligatoires.')
      return
    }
    if (!form.requires_quote && !form.base_price.trim()) {
      setError('Indiquez un prix ou activez « Sur devis ».')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      type: form.type,
      category_id: form.category_id,
      title: form.title,
      short_description: form.short_description || null,
      long_description: form.long_description || null,
      base_price: form.base_price ? Number(form.base_price) : null,
      price_type: form.price_type,
      provider_name: form.provider_name || null,
      requires_quote: form.requires_quote,
      is_featured: form.is_featured,
      is_active: form.is_active,
      max_quantity: Number(form.max_quantity) || 99,
      minimum_notice_hours: Number(form.minimum_notice_hours) || 0,
      property_ids: form.property_ids,
      images: form.images,
    }

    const { error: saveError } = isEdit && id
      ? await updateCatalogItem(id, payload)
      : await createCatalogItem(payload)

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    navigate('/app/boutique/catalog')
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/app/boutique/catalog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">
          {isEdit ? 'Modifier l\'article' : 'Nouvel article Boutique'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Produits et packs commandables via panier dans le portail voyageur.
          Pour chef, transport ou bien-être, utilisez le catalogue Conciergerie (Settings → Conciergerie).
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as CatalogItemType }))}
              options={typeOptions}
            />
            <Select
              label="Catégorie"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              options={categories.length > 0 ? categories : [{ value: '', label: 'Aucune catégorie' }]}
            />
          </div>

          <Input
            label="Titre"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Ex. Pack arrivée Villa Frenchway"
            required
          />

          <Input
            label="Description courte"
            value={form.short_description}
            onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
            placeholder="Une phrase pour la liste Boutique"
          />

          {user && (
            <CatalogImagesEditor
              images={form.images}
              onChange={images => setForm(f => ({ ...f, images }))}
              userId={user.id}
              entityId={id}
            />
          )}

          <div className="space-y-1.5">
            <label htmlFor="long-description" className="block text-sm font-medium text-foreground">
              Description détaillée
            </label>
            <textarea
              id="long-description"
              rows={4}
              value={form.long_description}
              onChange={e => setForm(f => ({ ...f, long_description: e.target.value }))}
              placeholder="Conditions, détails de la prestation…"
              className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
            />
          </div>

          <SwitchField
            label="Sur devis"
            description="Le client envoie une demande — vous fixez le prix ensuite."
            checked={form.requires_quote}
            onCheckedChange={requires_quote => setForm(f => ({
              ...f,
              requires_quote,
              price_type: requires_quote ? 'custom_quote' : f.price_type,
            }))}
          />

          {!form.requires_quote && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type de prix"
                value={form.price_type}
                onChange={e => setForm(f => ({ ...f, price_type: e.target.value as CatalogPriceType }))}
                options={priceTypeOptions.filter(o => o.value !== 'custom_quote')}
              />
              <Input
                label="Prix (€)"
                type="number"
                min="0"
                step="0.01"
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="250"
              />
            </div>
          )}

          <Input
            label="Prestataire (optionnel)"
            value={form.provider_name}
            onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
            placeholder="Ex. Chef Antoine Dubois"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Quantité max."
              type="number"
              min="1"
              value={form.max_quantity}
              onChange={e => setForm(f => ({ ...f, max_quantity: e.target.value }))}
            />
            <Input
              label="Délai minimum (heures)"
              type="number"
              min="0"
              value={form.minimum_notice_hours}
              onChange={e => setForm(f => ({ ...f, minimum_notice_hours: e.target.value }))}
            />
          </div>

          <SwitchField
            label="Mettre en avant"
            description="Affiché dans la sélection recommandée du portail."
            checked={form.is_featured}
            onCheckedChange={is_featured => setForm(f => ({ ...f, is_featured }))}
          />

          <SwitchField
            label="Actif"
            description="Désactivez pour masquer temporairement l'article."
            checked={form.is_active}
            onCheckedChange={is_active => setForm(f => ({ ...f, is_active }))}
          />

          {properties.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Villas concernées</p>
              <p className="text-xs text-muted-foreground">
                Sélectionnez les villas où cet article apparaît dans la Boutique.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-3">
                {properties.map(property => (
                  <label
                    key={property.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.property_ids.includes(property.id)}
                      onChange={() => toggleProperty(property.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{property.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer l\'article'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/app/boutique/catalog')}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>

      {!form.requires_quote && form.base_price && form.price_type !== 'fixed_price' && (
        <p className="text-xs text-muted-foreground">
          Affichage portail : {catalogPriceTypeLabels[form.price_type]} {form.base_price} €
        </p>
      )}
    </div>
  )
}
