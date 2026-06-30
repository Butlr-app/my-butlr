import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SignatureCanvas } from '@/components/SignatureCanvas'
import { useCheckin, type CheckinInput } from '@/lib/useSupabase'
import { uploadFile } from '@/lib/storage'
import { useToast } from '@/components/ui/Toast'
import { Loader2, CheckCircle2, Upload, ClipboardCheck } from 'lucide-react'

interface Reservation {
  id: string
  guest_name: string
  guest_email?: string | null
  guest_phone?: string | null
  guests_count?: number | null
  arrival?: string
  departure?: string
  property?: { name?: string } | null
}

const ID_DOC_OPTIONS = [
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'National ID card' },
  { value: 'driver_license', label: "Driver's license" },
]

export function CheckInForm({ reservation }: { reservation: Reservation }) {
  const { checkin, loading, submitCheckin, refetch } = useCheckin(reservation.id)
  const { toast } = useToast()

  const [form, setForm] = useState({
    guest_name: reservation.guest_name ?? '',
    guest_email: reservation.guest_email ?? '',
    guest_phone: reservation.guest_phone ?? '',
    address: '',
    nationality: '',
    id_doc_type: 'passport' as CheckinInput['id_doc_type'],
    id_doc_number: '',
    num_guests: reservation.guests_count ?? 1,
    estimated_arrival: '',
    special_requests: '',
  })
  const [idFile, setIdFile] = useState<File | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (checkin && checkin.status === 'completed') {
    return <CompletedCheckin checkin={checkin} reservation={reservation} />
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.guest_name.trim()) errs.guest_name = 'Full name is required'
    if (!form.id_doc_number.trim()) errs.id_doc_number = 'ID document number is required'
    if (!form.estimated_arrival.trim()) errs.estimated_arrival = 'Estimated arrival time is required'
    if (!rulesAccepted) errs.rules = 'You must accept the house rules'
    if (!signature) errs.signature = 'Signature is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let idDocumentUrl: string | null = checkin?.id_document_url ?? null
      if (idFile) {
        idDocumentUrl = await uploadFile(`checkins/${reservation.id}`, idFile)
      }
      const input: CheckinInput = {
        reservation_id: reservation.id,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim() || null,
        guest_phone: form.guest_phone.trim() || null,
        address: form.address.trim() || null,
        nationality: form.nationality.trim() || null,
        id_doc_type: form.id_doc_type,
        id_doc_number: form.id_doc_number.trim() || null,
        num_guests: Number(form.num_guests) || 1,
        estimated_arrival: form.estimated_arrival || null,
        special_requests: form.special_requests.trim() || null,
        id_document_url: idDocumentUrl,
        signature_data: signature,
        rules_accepted: rulesAccepted,
        status: 'completed',
        submitted_at: new Date().toISOString(),
      }
      await submitCheckin(input)
      await refetch()
      toast('Check-in completed')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck className="w-4 h-4" />
        <h3 className="text-sm font-semibold">Online Check-in</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        {reservation.property?.name ?? 'Your stay'} · {reservation.arrival} — {reservation.departure}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Full name *"
              value={form.guest_name}
              onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
            />
            {errors.guest_name && <p className="text-xs text-destructive mt-1">{errors.guest_name}</p>}
          </div>
          <Input
            label="Email"
            type="email"
            value={form.guest_email}
            onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))}
          />
          <Input
            label="Phone"
            value={form.guest_phone}
            onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))}
          />
          <Input
            label="Nationality"
            value={form.nationality}
            onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
          />
        </div>

        <Input
          label="Home address"
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="ID document type"
            value={form.id_doc_type}
            onChange={e => setForm(f => ({ ...f, id_doc_type: e.target.value as CheckinInput['id_doc_type'] }))}
            options={ID_DOC_OPTIONS}
          />
          <div>
            <Input
              label="ID document number *"
              value={form.id_doc_number}
              onChange={e => setForm(f => ({ ...f, id_doc_number: e.target.value }))}
            />
            {errors.id_doc_number && <p className="text-xs text-destructive mt-1">{errors.id_doc_number}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Number of guests"
            type="number"
            min={1}
            value={String(form.num_guests)}
            onChange={e => setForm(f => ({ ...f, num_guests: Number(e.target.value) }))}
          />
          <div>
            <Input
              label="Estimated arrival time *"
              type="time"
              value={form.estimated_arrival}
              onChange={e => setForm(f => ({ ...f, estimated_arrival: e.target.value }))}
            />
            {errors.estimated_arrival && <p className="text-xs text-destructive mt-1">{errors.estimated_arrival}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">ID document (photo/scan)</label>
          <label className="flex items-center gap-2 px-3 py-2 border border-input border-dashed rounded-sm text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="w-4 h-4" />
            {idFile ? idFile.name : 'Upload a file (optional)'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => setIdFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Special requests</label>
          <textarea
            value={form.special_requests}
            onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))}
            className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info resize-none"
            placeholder="Late arrival, dietary needs, accessibility..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Signature *</label>
          <p className="text-xs text-muted-foreground">By signing, I confirm the information above is accurate ("Lu et approuvé").</p>
          <SignatureCanvas onSignatureChange={setSignature} />
          {errors.signature && <p className="text-xs text-destructive mt-1">{errors.signature}</p>}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={rulesAccepted}
            onChange={e => setRulesAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span>I have read and accept the house rules and rental conditions.</span>
        </label>
        {errors.rules && <p className="text-xs text-destructive">{errors.rules}</p>}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Complete check-in
          </Button>
        </div>
      </form>
    </Card>
  )
}

function CompletedCheckin({ checkin, reservation }: { checkin: NonNullable<ReturnType<typeof useCheckin>['checkin']>; reservation: Reservation }) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <h3 className="text-sm font-semibold">Check-in completed</h3>
        </div>
        <Badge variant="success">Completed</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {reservation.property?.name ?? 'Your stay'} · submitted {checkin.submitted_at ? new Date(checkin.submitted_at).toLocaleString() : ''}
      </p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Detail label="Full name" value={checkin.guest_name} />
        <Detail label="Email" value={checkin.guest_email} />
        <Detail label="Phone" value={checkin.guest_phone} />
        <Detail label="Nationality" value={checkin.nationality} />
        <Detail label="ID document" value={`${checkin.id_doc_type} · ${checkin.id_doc_number ?? '—'}`} />
        <Detail label="Guests" value={String(checkin.num_guests)} />
        <Detail label="Estimated arrival" value={checkin.estimated_arrival} />
      </div>
      {checkin.special_requests && <Detail label="Special requests" value={checkin.special_requests} />}
      {checkin.signature_data && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Signature</p>
          <img src={checkin.signature_data} alt="Signature" className="border border-border rounded-sm bg-white max-w-[260px]" />
        </div>
      )}
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value || '—'}</p>
    </div>
  )
}
