import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check } from 'lucide-react'

export function EarlyAccess() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [propertiesCount, setPropertiesCount] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const parsedPropertiesCount = propertiesCount.trim()
      ? Number.parseInt(propertiesCount, 10)
      : null

    const { error: insertError } = await supabase.from('early_access_leads').insert({
      full_name: fullName.trim() || null,
      email: email.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
      role: role || null,
      properties_count: Number.isFinite(parsedPropertiesCount) ? parsedPropertiesCount : null,
      message: message.trim() || null,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message || 'Unable to submit your request. Please try again.')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Thank you</h1>
          <p className="text-muted-foreground mb-8">The My Butlr team will contact you shortly.</p>
          <Link to="/">
            <Button variant="secondary">Back to homepage</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen py-16 px-6">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Request early access</h1>
        <p className="text-muted-foreground mb-8">Join the private beta of My Butlr.</p>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <Input
            label="Full name"
            placeholder="Jean Dupont"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Company name"
            placeholder="Your company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="jean@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PhoneInput label="Phone" value={phone} onChange={setPhone} />
          <Select
            label="Type de profil"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: '', label: 'Choisir un profil' },
              { value: 'villa_owner', label: 'Propriétaire de villa' },
              { value: 'house_manager', label: 'House manager' },
              { value: 'concierge', label: 'Conciergerie' },
              { value: 'family_office', label: 'Family office' },
              { value: 'agency', label: 'Agence immobilière' },
              { value: 'partner', label: 'Prestataire de services' },
              { value: 'other', label: 'Autre' },
            ]}
          />
          <Input
            label="Number of properties"
            type="number"
            placeholder="1"
            min={1}
            value={propertiesCount}
            onChange={(e) => setPropertiesCount(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Message</label>
            <textarea
              className="w-full h-24 px-3 py-2 bg-card border border-input rounded-sm text-sm resize-none focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 placeholder:text-muted-foreground"
              placeholder="Tell us about your needs..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit request'}
          </Button>
        </form>
      </div>
    </div>
  )
}
