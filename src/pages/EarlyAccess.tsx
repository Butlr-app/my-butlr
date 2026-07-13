import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Select } from '@/components/ui/Select'
import { ArrowLeft, Check } from 'lucide-react'

export function EarlyAccess() {
  const [submitted, setSubmitted] = useState(false)
  const [phone, setPhone] = useState('')

  if (submitted) {
    return (
      <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center px-6">
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
    <div className="dark bg-background text-foreground min-h-screen py-16 px-6">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Request early access</h1>
        <p className="text-muted-foreground mb-8">Join the private beta of My Butlr.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
          className="space-y-5"
        >
          <Input label="Full name" placeholder="Jean Dupont" required />
          <Input label="Company name" placeholder="Your company" />
          <Input label="Email" type="email" placeholder="jean@company.com" required />
          <PhoneInput label="Phone" value={phone} onChange={setPhone} />
          <Select
            label="Profile type"
            options={[
              { value: '', label: 'Select a profile' },
              { value: 'villa_owner', label: 'Villa owner' },
              { value: 'house_manager', label: 'House manager' },
              { value: 'concierge', label: 'Concierge' },
              { value: 'family_office', label: 'Family office' },
              { value: 'real_estate', label: 'Real estate agency' },
              { value: 'partner', label: 'Service partner' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input label="Number of properties" type="number" placeholder="1" min={1} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Message</label>
            <textarea
              className="w-full h-24 px-3 py-2 bg-card border border-input rounded-sm text-sm resize-none focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 placeholder:text-muted-foreground"
              placeholder="Tell us about your needs..."
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Submit request
          </Button>
        </form>
      </div>
    </div>
  )
}
