import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { AmenityPicker } from '@/components/ui/AmenityPicker'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { PropertyOverviewSummary } from '@/components/property/PropertyDetailsPanel'
import { StorageBucketSetupHint } from '@/components/property/StorageBucketSetupHint'
import { PropertyColumnsSetupHint } from '@/components/property/PropertyColumnsSetupHint'
import { PropertyPricingPanel } from '@/components/property/PropertyPricingPanel'
import { PropertyGuestPortalPanel } from '@/components/property/PropertyGuestPortalPanel'
import { PropertyServicesPanel } from '@/components/property/PropertyServicesPanel'
import { PropertyTeamPanel } from '@/components/property/PropertyTeamPanel'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import { supabase } from '@/lib/supabase'
import { fetchOwnerReservations } from '@/lib/data'
import { updateOwnerProperty } from '@/lib/createProperty'
import { uploadPropertyImage } from '@/lib/uploadPropertyImage'
import type { Property, Reservation } from '@/lib/types'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { useReservationDetail } from '@/lib/reservationDetailContext'

const tabs = [
  { id: 'Overview', label: 'Aperçu' },
  { id: 'Tarifs & calendrier', label: 'Tarifs & calendrier' },
  { id: 'Bookings', label: 'Réservations' },
  { id: 'Guest Portal', label: 'Portail voyageur' },
  { id: 'Conciergerie', label: 'Offres conciergerie' },
  { id: 'Staff', label: 'Équipe' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Documents', label: 'Documents' },
  { id: 'Financials', label: 'Finances' },
]

interface PropertyFormState {
  name: string
  location: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  surfaceSqm: number
  address: string
  amenities: string[]
  description: string
}

function toFormState(property: Property): PropertyFormState {
  return {
    name: property.name,
    location: property.location ?? '',
    type: property.type,
    status: property.status,
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    maxGuests: property.max_guests ?? 0,
    surfaceSqm: property.surface_m2 ?? 0,
    address: property.address ?? '',
    amenities: Array.isArray(property.amenities) ? property.amenities : [],
    description: property.description ?? '',
  }
}

export function PropertyDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [property, setProperty] = useState<Property | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [activeTab, setActiveTab] = useState('Overview')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PropertyFormState | null>(null)
  const [error, setError] = useState('')
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false)
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false)

  const updateTabScrollState = useCallback(() => {
    const element = tabsRef.current
    if (!element) return
    setCanScrollTabsLeft(element.scrollLeft > 4)
    setCanScrollTabsRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    )
  }, [])

  useEffect(() => {
    updateTabScrollState()
    window.addEventListener('resize', updateTabScrollState)
    return () => window.removeEventListener('resize', updateTabScrollState)
  }, [updateTabScrollState])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      tabsRef.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      updateTabScrollState()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, updateTabScrollState])

  const scrollTabs = (direction: -1 | 1) => {
    tabsRef.current?.scrollBy({
      left: direction * Math.max(220, (tabsRef.current?.clientWidth ?? 0) * 0.65),
      behavior: 'smooth',
    })
  }

  const handleTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : Math.max(0, Math.min(
          tabs.length - 1,
          currentIndex + (event.key === 'ArrowRight' ? 1 : -1),
        ))
    setActiveTab(tabs[nextIndex].id)
  }

  useEffect(() => {
    if (!user || !id) return
    const userId = user.id

    async function load() {
      const [{ data: prop }, { data: res }] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        fetchOwnerReservations(userId),
      ])

      const loaded = prop as Property | null
      setProperty(loaded)
      if (loaded) setForm(toFormState(loaded))
      setReservations(((res as Reservation[]) ?? []).filter(r => r.property_id === id))
      setLoading(false)
    }

    load()
  }, [user, id])

  const startEditing = (focusPhoto = false) => {
    if (!property) return
    setForm(toFormState(property))
    setCoverFile(null)
    setCoverPreview(property.image_url)
    setError('')
    setEditing(true)
    if (focusPhoto && !property.image_url) {
      setTimeout(() => {
        document.getElementById('property-cover-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }

  const cancelEditing = () => {
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview(null)
    if (property) setForm(toFormState(property))
    setError('')
    setEditing(false)
  }

  const handleCoverChange = (file: File | null, previewUrl: string | null) => {
    if (coverPreview?.startsWith('blob:') && coverPreview !== previewUrl) {
      URL.revokeObjectURL(coverPreview)
    }
    setCoverFile(file)
    setCoverPreview(previewUrl)
  }

  const handleSave = async () => {
    if (!user || !property || !form) return

    if (!form.name.trim() || !form.location.trim()) {
      setError('Name and location are required.')
      return
    }

    setSaving(true)
    setError('')

    let imageUrl: string | null = property.image_url

    if (coverFile) {
      const { url, error: uploadError } = await uploadPropertyImage(coverFile)
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      imageUrl = url
    } else if (!coverPreview) {
      imageUrl = null
    }

    const { property: updated, error: saveError, missingColumns: missing } = await updateOwnerProperty({
      id: property.id,
      ownerId: user.id,
      name: form.name,
      location: form.location,
      type: form.type,
      status: form.status,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      maxGuests: form.maxGuests,
      description: form.description,
      address: form.address,
      surfaceSqm: form.surfaceSqm,
      amenities: form.amenities,
      imageUrl,
    })

    setSaving(false)

    if (saveError || !updated) {
      setError(saveError?.message ?? 'Failed to save changes.')
      return
    }

    setProperty(updated)
    setForm(toFormState(updated))
    setCoverFile(null)
    setCoverPreview(updated.image_url)
    setMissingColumns(missing ?? [])

    if (!missing || missing.length === 0) {
      setEditing(false)
    }
  }

  if (loading) return <LoadingState />

  if (!property || !form) {
    return (
      <div className="space-y-6">
        <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Properties
        </Link>
        <EmptyState title="Property not found" description="This property doesn't exist or you don't have access." />
      </div>
    )
  }

  const displayImage = coverPreview ?? property.image_url

  return (
    <div className="space-y-6">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Properties
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{editing ? 'Edit property' : property.name}</h2>
          <p className="text-sm text-muted-foreground">{editing ? property.name : property.location}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && (
            <>
              <Badge variant={property.status === 'active' ? 'success' : 'warning'}>{property.status}</Badge>
              {activeTab === 'Overview' && (
                <Button variant="secondary" size="sm" onClick={() => startEditing()}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Modifier
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <nav
        aria-label="Sections de la propriété"
        className="sticky top-16 z-20 rounded-lg border border-border bg-background/95 p-1 shadow-sm backdrop-blur"
      >
        <div className="relative">
          {canScrollTabsLeft && (
            <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-background via-background to-transparent pr-5">
              <button
                type="button"
                onClick={() => scrollTabs(-1)}
                aria-label="Afficher les sections précédentes"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-border bg-card shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Navigation de la fiche villa"
            onScroll={updateTabScrollState}
            onKeyDown={handleTabsKeyDown}
            className="flex touch-pan-x gap-1 overflow-x-auto scroll-smooth px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => { if (!editing) setActiveTab(tab.id) }}
                disabled={editing}
                className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeTab === tab.id
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {canScrollTabsRight && (
            <div className="absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-background via-background to-transparent pl-5">
              <button
                type="button"
                onClick={() => scrollTabs(1)}
                aria-label="Afficher les sections suivantes"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-border bg-card shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {activeTab === 'Overview' && !editing && (
        <PropertyOverviewSummary
          property={property}
          displayImage={displayImage}
          onEdit={() => startEditing()}
          onAddPhoto={() => startEditing(true)}
        />
      )}

      {activeTab === 'Overview' && editing && (
        <div className="space-y-4 max-w-2xl">
          <div id="property-cover-upload">
            <ImageUpload
              label="Photo de couverture"
              value={coverFile}
              previewUrl={coverPreview}
              onChange={handleCoverChange}
            />
          </div>

          <Input label="Nom de la propriété" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Input label="Localisation" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Grimaud, France" required />
          <AddressAutocomplete
            label="Adresse"
            value={form.address}
            onChange={address => setForm({ ...form, address })}
            context={form.location}
            enabled={form.location.toLocaleLowerCase('fr').includes('france')}
            placeholder="Commencez à saisir l’adresse…"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              options={[
                { value: 'villa', label: 'Villa' },
                { value: 'yacht', label: 'Yacht' },
                { value: 'apartment', label: 'Apartment' },
                { value: 'chalet', label: 'Chalet' },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumberStepper label="Bedrooms" value={form.bedrooms} onChange={v => setForm({ ...form, bedrooms: v })} min={0} max={30} />
            <NumberStepper label="Bathrooms" value={form.bathrooms} onChange={v => setForm({ ...form, bathrooms: v })} min={0} max={30} />
            <NumberStepper label="Max guests" value={form.maxGuests} onChange={v => setForm({ ...form, maxGuests: v })} min={1} max={50} />
            <NumberStepper label="Surface m²" value={form.surfaceSqm} onChange={v => setForm({ ...form, surfaceSqm: v })} min={0} max={10000} />
          </div>

          <AmenityPicker value={form.amenities} onChange={amenities => setForm({ ...form, amenities })} />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              rows={5}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
            />
          </div>

          {error && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{error}</p>
              <StorageBucketSetupHint error={error} />
            </div>
          )}

          {missingColumns.length > 0 && <PropertyColumnsSetupHint columns={missingColumns} />}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={cancelEditing} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" size="md" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'Bookings' && (
        <Card className="p-5">
          {reservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reservations for this property yet.</p>
          ) : (
            <div className="space-y-3">
              {reservations.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openReservation(r)}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-border py-3 text-left last:border-0 hover:bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateForDisplay(r.arrival, profile?.date_format)}
                      {' — '}
                      {formatDateForDisplay(r.departure, profile?.date_format)}
                    </p>
                  </div>
                  <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Tarifs & calendrier' && (
        <PropertyPricingPanel propertyId={property.id} reservations={reservations} />
      )}

      {activeTab === 'Guest Portal' && (
        <PropertyGuestPortalPanel
          propertyId={property.id}
          propertyName={property.name}
          propertyImageUrl={property.image_url}
        />
      )}

      {activeTab === 'Conciergerie' && (
        <PropertyServicesPanel
          propertyId={property.id}
          propertyName={property.name}
          userId={user?.id}
        />
      )}

      {activeTab === 'Staff' && (
        <PropertyTeamPanel
          propertyId={property.id}
          propertyName={property.name}
          ownerId={property.owner_id}
          userId={user?.id}
          dateFormat={profile?.date_format}
        />
      )}

      {activeTab !== 'Overview' && activeTab !== 'Bookings' && activeTab !== 'Tarifs & calendrier' && activeTab !== 'Guest Portal' && activeTab !== 'Conciergerie' && activeTab !== 'Staff' && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">{activeTab} for {property.name} — coming soon</p>
          <Button variant="secondary" size="sm" className="mt-4">Configure {activeTab.toLowerCase()}</Button>
        </Card>
      )}
    </div>
  )
}
