import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { CountryCitySelect } from '@/components/ui/CountryCitySelect'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Select } from '@/components/ui/Select'
import { AddressInput } from '@/components/ui/AddressInput'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { AmenityPicker } from '@/components/ui/AmenityPicker'
import { StorageBucketSetupHint } from '@/components/property/StorageBucketSetupHint'
import { useAuth } from '@/lib/authContext'
import { supabase } from '@/lib/supabase'
import { formatLocation, getCountryByCode } from '@/lib/locations'
import { canGeneratePropertyDescription, generatePropertyDescription } from '@/lib/generatePropertyDescription'
import { formatFullAddress } from '@/lib/formatAddress'
import { uploadPropertyImage } from '@/lib/uploadPropertyImage'
import { createOwnerProperty } from '@/lib/createProperty'
import { clearPropertyDraft, loadPropertyDraft, savePropertyDraft } from '@/lib/propertyDraft'

const steps = ['Profile', 'Property', 'Details', 'Done'] as const

export function OwnerOnboarding() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')

  const [propertyName, setPropertyName] = useState('')
  const [countryCode, setCountryCode] = useState('FR')
  const [city, setCity] = useState('')
  const [propertyType, setPropertyType] = useState('villa')
  const [bedrooms, setBedrooms] = useState(4)
  const [bathrooms, setBathrooms] = useState(3)
  const [maxGuests, setMaxGuests] = useState(8)

  const [addressStreet, setAddressStreet] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [surfaceSqm, setSurfaceSqm] = useState(0)
  const [amenities, setAmenities] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone)
    if (profile?.company) setCompany(profile.company)
  }, [profile?.phone, profile?.company])

  useEffect(() => {
    const draft = loadPropertyDraft()
    if (!draft) return

    setPropertyName(draft.propertyName)
    setCountryCode(draft.countryCode)
    setCity(draft.city)
    setPropertyType(draft.propertyType)
    setBedrooms(draft.bedrooms)
    setBathrooms(draft.bathrooms)
    setMaxGuests(draft.maxGuests)
    setAddressStreet(draft.addressStreet ?? (draft as { address?: string }).address ?? '')
    setAddressLine2(draft.addressLine2 ?? '')
    setPostalCode(draft.postalCode ?? '')
    setSurfaceSqm(draft.surfaceSqm)
    setAmenities(draft.amenities)
    setDescription(draft.description)
  }, [])

  const persistPropertyDraft = () => {
    savePropertyDraft({
      propertyName,
      countryCode,
      city,
      propertyType,
      bedrooms,
      bathrooms,
      maxGuests,
      addressStreet,
      addressLine2,
      postalCode,
      surfaceSqm,
      amenities,
      description,
    })
  }

  const saveProfile = async () => {
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? profile?.email,
      full_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined),
      role: profile?.role ?? 'owner',
      phone: phone || null,
      company: company || null,
    })

    return { error }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('Session expired. Please sign in again.')
      return
    }

    setLoading(true)
    setError('')

    const { error: saveError } = await saveProfile()
    setLoading(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setStep(1)
  }

  const handlePropertyContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!propertyName.trim()) {
      setError('Please enter a property name.')
      return
    }

    if (!city.trim()) {
      setError('Please select a country and city.')
      return
    }

    if (!addressStreet.trim()) {
      setError('Veuillez renseigner le numéro et la voie.')
      return
    }

    if (!postalCode.trim()) {
      setError('Veuillez renseigner le code postal.')
      return
    }

    persistPropertyDraft()
    setStep(2)
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const country = getCountryByCode(countryCode)
    if (!country || !city.trim()) {
      setError('Please select a country and city.')
      return
    }

    const location = formatLocation(city, country)
    const fullAddress = formatFullAddress({
      street: addressStreet,
      line2: addressLine2,
      postalCode,
      city,
      country: country.name,
    })

    setLoading(true)
    setError('')

    persistPropertyDraft()

    const { property, error: propertyError } = await createOwnerProperty({
      ownerId: user.id,
      name: propertyName,
      location,
      type: propertyType,
      bedrooms,
      bathrooms,
      maxGuests,
      description,
      address: fullAddress,
      surfaceSqm: surfaceSqm > 0 ? surfaceSqm : null,
      amenities,
    })

    if (propertyError || !property) {
      setLoading(false)
      setError(propertyError?.message ?? 'Failed to create property.')
      return
    }

    if (coverFile) {
      const { url, error: uploadError } = await uploadPropertyImage(coverFile)

      if (uploadError) {
        setLoading(false)
        setError(`Property created but photo upload failed: ${uploadError.message}`)
        return
      }

      if (url) {
        await supabase.from('properties').update({ image_url: url }).eq('id', property.id)
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    setLoading(false)

    if (profileError) {
      if (profileError.message.includes('onboarding_completed')) {
        setError('Database migration required. Run supabase/migrations/20260709120000_owner_onboarding.sql')
      } else {
        setError(profileError.message)
      }
      return
    }

    await refreshProfile({ silent: true })
    clearPropertyDraft()
    setStep(3)
  }

  const finishOnboarding = async () => {
    await refreshProfile({ silent: true })
    clearPropertyDraft()
    navigate('/app')
  }

  const handleGenerateDescription = () => {
    const country = getCountryByCode(countryCode)
    const generated = generatePropertyDescription({
      name: propertyName,
      type: propertyType,
      city,
      country: country?.name ?? '',
      bedrooms,
      bathrooms,
      maxGuests,
      surfaceSqm,
      amenities,
    })
    setDescription(generated)
  }

  const canGenerate = canGeneratePropertyDescription({
    name: propertyName,
    city,
    bedrooms,
    bathrooms,
    maxGuests,
  })

  const handleCoverChange = (file: File | null, previewUrl: string | null) => {
    if (coverPreview && coverPreview !== previewUrl) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(previewUrl)
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Set up your owner account</p>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 overflow-x-auto">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono ${
                index < step ? 'bg-foreground text-background' :
                index === step ? 'border-2 border-foreground text-foreground' :
                'border border-border text-muted-foreground'
              }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`text-xs hidden md:inline ${index === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {index < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 mb-4">
              <p className="text-sm text-muted-foreground">
                Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}. Tell us a bit about yourself before adding your first property.
              </p>
            </div>

            <PhoneInput label="Phone" name="phone" placeholder="6 12 34 56 78" value={phone} onChange={setPhone} />
            <Input label="Company (optional)" name="company" placeholder="Your company or family office" value={company} onChange={e => setCompany(e.target.value)} />

            {error && (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{error}</p>
                <StorageBucketSetupHint error={error} />
              </div>
            )}

            <Button type="submit" size="md" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handlePropertyContinue} className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 mb-4 flex items-start gap-3">
              <Building2 className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Start with the essentials. You'll add photos and details in the next step.
              </p>
            </div>

            <Input label="Property name" name="propertyName" placeholder="Villa Azure" value={propertyName} onChange={e => setPropertyName(e.target.value)} required />
            <CountryCitySelect countryCode={countryCode} city={city} onCountryChange={setCountryCode} onCityChange={setCity} required />
            <AddressInput
              street={addressStreet}
              line2={addressLine2}
              postalCode={postalCode}
              countryCode={countryCode}
              onStreetChange={setAddressStreet}
              onLine2Change={setAddressLine2}
              onPostalCodeChange={setPostalCode}
              city={city}
              onCityChange={setCity}
              required
            />
            <Select
              label="Type"
              name="type"
              value={propertyType}
              onChange={e => setPropertyType(e.target.value)}
              options={[
                { value: 'villa', label: 'Villa' },
                { value: 'yacht', label: 'Yacht' },
                { value: 'apartment', label: 'Apartment' },
                { value: 'chalet', label: 'Chalet' },
              ]}
            />

            <div className="grid grid-cols-3 gap-3">
              <NumberStepper label="Bedrooms" name="bedrooms" value={bedrooms} onChange={setBedrooms} min={0} max={30} />
              <NumberStepper label="Bathrooms" name="bathrooms" value={bathrooms} onChange={setBathrooms} min={0} max={30} />
              <NumberStepper label="Max guests" name="maxGuests" value={maxGuests} onChange={setMaxGuests} min={1} max={50} />
            </div>

            {error && (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{error}</p>
                <StorageBucketSetupHint error={error} />
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setStep(0)}>Back</Button>
              <Button type="submit" size="md" className="flex-1">Continue</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 mb-4">
              <p className="text-sm text-muted-foreground">
                Add a cover photo and property details for <span className="text-foreground font-medium">{propertyName}</span>.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Récapitulatif</p>
              <p className="font-medium">{propertyName}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {bedrooms} ch. · {bathrooms} sdb. · {maxGuests} pers.
              </p>
              {addressStreet.trim() && (
                <p className="text-muted-foreground text-xs mt-2 whitespace-pre-line">
                  {formatFullAddress({
                    street: addressStreet,
                    line2: addressLine2,
                    postalCode,
                    city,
                    country: getCountryByCode(countryCode)?.name ?? '',
                  })}
                </p>
              )}
            </div>

            <ImageUpload
              label="Cover photo (optional)"
              value={coverFile}
              previewUrl={coverPreview}
              onChange={handleCoverChange}
            />

            <NumberStepper
              label="Surface (m²)"
              name="surfaceSqm"
              value={surfaceSqm}
              onChange={setSurfaceSqm}
              min={0}
              max={10000}
            />

            <AmenityPicker value={amenities} onChange={setAmenities} />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-foreground">Description (optional)</label>
                <Button type="button" variant="secondary" size="sm" disabled={!canGenerate} onClick={handleGenerateDescription} className="shrink-0">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Générer
                </Button>
              </div>
              <textarea
                name="description"
                rows={4}
                placeholder="Brief description of the property..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
              />
            </div>

            {error && (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{error}</p>
                <StorageBucketSetupHint error={error} />
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="md" className="flex-1" onClick={() => setStep(1)} disabled={loading}>Back</Button>
              <Button type="submit" size="md" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Complete setup'}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-success" />
            </div>
            {coverPreview && (
              <div className="aspect-[16/9] rounded-md overflow-hidden border border-border">
                <img src={coverPreview} alt={propertyName} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold mb-2">You're all set</h2>
              <p className="text-sm text-muted-foreground">
                {propertyName} has been added to your portfolio. You can now manage reservations, tasks, and more.
              </p>
            </div>
            <Button type="button" size="md" className="w-full" onClick={finishOnboarding}>
              Go to dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
