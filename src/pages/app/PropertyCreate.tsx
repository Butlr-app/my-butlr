import { useState } from 'react'
import { ArrowLeft, Building2, Sparkles } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AddressInput } from '@/components/ui/AddressInput'
import { AmenityPicker } from '@/components/ui/AmenityPicker'
import { Button } from '@/components/ui/Button'
import { CountryCitySelect } from '@/components/ui/CountryCitySelect'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { createOwnerProperty } from '@/lib/createProperty'
import {
  canGeneratePropertyDescription,
  generatePropertyDescription,
} from '@/lib/generatePropertyDescription'
import { formatFullAddress } from '@/lib/formatAddress'
import { formatLocation, getCountryByCode } from '@/lib/locations'
import { supabase } from '@/lib/supabase'
import { uploadPropertyImage } from '@/lib/uploadPropertyImage'

export function PropertyCreate() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState('FR')
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [type, setType] = useState('villa')
  const [bedrooms, setBedrooms] = useState(1)
  const [bathrooms, setBathrooms] = useState(1)
  const [maxGuests, setMaxGuests] = useState(2)
  const [surfaceSqm, setSurfaceSqm] = useState(0)
  const [amenities, setAmenities] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (profile?.role !== 'owner') {
    return <Navigate to="/app/properties" replace />
  }

  const handleCoverChange = (file: File | null, previewUrl: string | null) => {
    if (coverPreview?.startsWith('blob:') && coverPreview !== previewUrl) {
      URL.revokeObjectURL(coverPreview)
    }
    setCoverFile(file)
    setCoverPreview(previewUrl)
  }

  const generateDescription = () => {
    const country = getCountryByCode(countryCode)
    setDescription(generatePropertyDescription({
      name,
      type,
      city,
      country: country?.name ?? '',
      bedrooms,
      bathrooms,
      maxGuests,
      surfaceSqm,
      amenities,
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    const country = getCountryByCode(countryCode)
    if (!name.trim() || !country || !city.trim()) {
      setError('Renseignez le nom, le pays et la ville.')
      return
    }

    if (!street.trim() || !postalCode.trim()) {
      setError('Renseignez l’adresse et le code postal.')
      return
    }

    setSaving(true)
    setError('')

    const fullAddress = formatFullAddress({
      street,
      line2: addressLine2,
      postalCode,
      city,
      country: country.name,
    })

    const { property, error: createError } = await createOwnerProperty({
      ownerId: user.id,
      name,
      location: formatLocation(city, country),
      type,
      bedrooms,
      bathrooms,
      maxGuests,
      description,
      address: fullAddress,
      surfaceSqm: surfaceSqm > 0 ? surfaceSqm : null,
      amenities,
    })

    if (createError || !property) {
      setSaving(false)
      setError(createError?.message ?? 'Impossible de créer la propriété.')
      return
    }

    if (coverFile) {
      const { url, error: imageError } = await uploadPropertyImage(coverFile)
      if (imageError) {
        setSaving(false)
        setError(`La propriété a été créée, mais la photo n’a pas été enregistrée : ${imageError.message}`)
        return
      }

      if (url) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({ image_url: url })
          .eq('id', property.id)
          .eq('owner_id', user.id)

        if (updateError) {
          setSaving(false)
          setError(`La propriété a été créée, mais la photo n’a pas été enregistrée : ${updateError.message}`)
          return
        }
      }
    }

    navigate(`/app/properties/${property.id}`, { replace: true })
  }

  const canGenerate = canGeneratePropertyDescription({
    name,
    city,
    bedrooms,
    bathrooms,
    maxGuests,
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/app/properties"
          className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux propriétés
        </Link>
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-border bg-card p-2.5">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Ajouter une propriété</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez un nouveau bien à votre portfolio.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Informations principales</h2>

          <Input
            label="Nom de la propriété"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Villa Azure"
            required
          />

          <CountryCitySelect
            countryCode={countryCode}
            city={city}
            onCountryChange={setCountryCode}
            onCityChange={setCity}
            required
          />

          <AddressInput
            street={street}
            line2={addressLine2}
            postalCode={postalCode}
            countryCode={countryCode}
            city={city}
            onStreetChange={setStreet}
            onLine2Change={setAddressLine2}
            onPostalCodeChange={setPostalCode}
            onCityChange={setCity}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={type}
              onChange={event => setType(event.target.value)}
              options={[
                { value: 'villa', label: 'Villa' },
                { value: 'yacht', label: 'Yacht' },
                { value: 'apartment', label: 'Appartement' },
                { value: 'chalet', label: 'Chalet' },
              ]}
            />
            <NumberStepper
              label="Surface (m²)"
              value={surfaceSqm}
              onChange={setSurfaceSqm}
              min={0}
              max={10000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberStepper label="Chambres" value={bedrooms} onChange={setBedrooms} min={0} max={30} />
            <NumberStepper label="Salles de bain" value={bathrooms} onChange={setBathrooms} min={0} max={30} />
            <NumberStepper label="Invités max." value={maxGuests} onChange={setMaxGuests} min={1} max={50} />
          </div>
        </section>

        <section className="space-y-5 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Photo et équipements</h2>

          <ImageUpload
            label="Photo de couverture (optionnel)"
            value={coverFile}
            previewUrl={coverPreview}
            onChange={handleCoverChange}
          />

          <AmenityPicker value={amenities} onChange={setAmenities} />
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Description</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGenerate}
              onClick={generateDescription}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Générer
            </Button>
          </div>
          <textarea
            rows={5}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Décrivez la propriété…"
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
          />
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/app/properties')}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button type="submit" size="md" disabled={saving}>
            {saving ? 'Création…' : 'Ajouter la propriété'}
          </Button>
        </div>
      </form>
    </div>
  )
}
