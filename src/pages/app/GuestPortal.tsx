import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useReservations, useServices, useContracts, useMessages, useServiceRequests } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { useRole } from '@/lib/roleContext'
import { useToast } from '@/components/ui/Toast'
import {
  Wifi, BookOpen, Plane, Phone, Loader2, Calendar, Download,
  Send, MessageSquare, FileText, Plus, Clock
} from 'lucide-react'

export function GuestPortal() {
  const { data: reservations, loading: lRes } = useReservations()
  const { data: services, loading: lSvc } = useServices()
  const { data: contracts } = useContracts()
  const { user } = useAuth()
  const { role } = useRole()
  const { toast } = useToast()

  const loading = lRes || lSvc

  const [activeSection, setActiveSection] = useState<'overview' | 'services' | 'messages'>('overview')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({
    service_name: '',
    details: '',
    preferred_date: '',
    preferred_time: '',
  })
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({})
  const [savingRequest, setSavingRequest] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  const guestReservations = role === 'guest'
    ? reservations.filter(r => r.guest_email === user?.email)
    : reservations

  const activeReservation = guestReservations.find(r =>
    r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
  )

  const upcomingReservations = guestReservations.filter(r =>
    r.arrival > today && (r.status === 'confirmed' || r.status === 'pending')
  ).slice(0, 3)

  const pastReservations = guestReservations.filter(r =>
    r.departure < today || r.status === 'completed'
  ).slice(0, 3)

  const currentReservation = activeReservation ?? guestReservations[0]
  const availableServices = services.filter(s => s.available).slice(0, 8)

  const reservationContracts = currentReservation
    ? contracts.filter(c => c.reservation_id === currentReservation.id)
    : []

  const daysBetween = (a: string, b: string) => {
    const d1 = new Date(a).getTime()
    const d2 = new Date(b).getTime()
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
  }

  const exportReservationsCSV = () => {
    const headers = ['Guest', 'Property', 'Arrival', 'Departure', 'Guests', 'Status', 'Amount']
    const rows = guestReservations.map(r => [r.guest_name, r.property?.name ?? '', r.arrival, r.departure, String(r.guests_count), r.status, String(r.total_amount)])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const validateRequest = () => {
    const errs: Record<string, string> = {}
    if (!requestForm.service_name.trim()) errs.service_name = 'Service is required'
    setRequestErrors(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Guest Portal</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportReservationsCSV}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {activeReservation ? (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Welcome, {activeReservation.guest_name}</h2>
              <p className="text-sm text-muted-foreground">{activeReservation.property?.name ?? 'Property'}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeReservation.arrival} — {activeReservation.departure}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Day {daysBetween(activeReservation.arrival, today) + 1} of {daysBetween(activeReservation.arrival, activeReservation.departure)}
              </p>
              <Badge variant="success" className="mt-1">Active Stay</Badge>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No active stay</p>
          <p className="text-xs text-muted-foreground mt-1">There is no guest currently checked in.</p>
        </Card>
      )}

      <div className="flex gap-2 border-b border-border pb-0">
        {(['overview', 'services', 'messages'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeSection === section
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {section === 'overview' && 'Overview'}
            {section === 'services' && 'Services'}
            {section === 'messages' && 'Messages'}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wifi, label: 'Wi-Fi', value: 'Check property details' },
              { icon: BookOpen, label: 'House Rules', value: 'Quiet hours 22h-8h' },
              { icon: Plane, label: 'Check-in Info', value: 'See reservation details' },
              { icon: Phone, label: 'Emergency', value: '+33 4 94 00 00 00' },
            ].map(item => (
              <Card key={item.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5">{item.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {reservationContracts.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Contracts & Documents
              </h3>
              <div className="space-y-3">
                {reservationContracts.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{c.type} Contract</p>
                      <p className="text-xs text-muted-foreground">{c.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.status === 'signed' ? 'success' : c.status === 'sent' ? 'warning' : 'muted'}>
                        {c.status}
                      </Badge>
                      {c.document_url && (
                        <a
                          href={c.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {upcomingReservations.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Upcoming Reservations</h3>
              <div className="space-y-3">
                {upcomingReservations.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">{r.property?.name ?? 'Property'} — {r.arrival} to {r.departure}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status}</Badge>
                      <p className="text-xs font-mono mt-1">&euro;{Number(r.total_amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {pastReservations.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Past Stays</h3>
              <div className="space-y-3">
                {pastReservations.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">{r.property?.name ?? 'Property'} — {r.arrival} to {r.departure}</p>
                    </div>
                    <Badge variant="muted">{r.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {activeSection === 'services' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">
              Available Services
            </p>
            <Button size="sm" onClick={() => setShowRequestModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Request Service
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {availableServices.map(svc => (
              <div
                key={svc.id}
                className="border border-border rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  setRequestForm(f => ({ ...f, service_name: svc.name }))
                  setShowRequestModal(true)
                }}
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-3">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium">{svc.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">From &euro;{Number(svc.starting_price).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {currentReservation && (
            <ServiceRequestsList reservationId={currentReservation.id} />
          )}
        </>
      )}

      {activeSection === 'messages' && currentReservation && (
        <ChatSection reservationId={currentReservation.id} userId={user?.id} />
      )}

      {activeSection === 'messages' && !currentReservation && (
        <Card className="p-12 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No active reservation</p>
          <p className="text-xs text-muted-foreground mt-1">Messages are linked to reservations.</p>
        </Card>
      )}

      <Modal open={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request a Service">
        <ServiceRequestForm
          currentReservation={currentReservation}
          userId={user?.id}
          services={services}
          form={requestForm}
          setForm={setRequestForm}
          errors={requestErrors}
          saving={savingRequest}
          onSubmit={async () => {
            if (!validateRequest()) return
            setSavingRequest(true)
            // handled by the form component
          }}
          onClose={() => setShowRequestModal(false)}
          toast={toast}
          setSaving={setSavingRequest}
        />
      </Modal>
    </div>
  )
}

function ServiceRequestForm({ currentReservation, userId, services, form, setForm, errors, saving, onClose, toast, setSaving }: {
  currentReservation: { id: string } | undefined
  userId: string | undefined
  services: Array<{ id: string; name: string }>
  form: { service_name: string; details: string; preferred_date: string; preferred_time: string }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  errors: Record<string, string>
  saving: boolean
  onSubmit: () => void
  onClose: () => void
  toast: (msg: string, variant?: 'success' | 'error' | 'warning' | 'info') => void
  setSaving: (v: boolean) => void
}) {
  const { addRequest } = useServiceRequests(currentReservation?.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.service_name.trim()) {
      toast('Service name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const matchedService = services.find(s => s.name === form.service_name)
      await addRequest({
        reservation_id: currentReservation?.id ?? null,
        guest_user_id: userId ?? null,
        service_id: matchedService?.id ?? null,
        service_name: form.service_name,
        details: form.details || null,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        status: 'pending',
      })
      toast('Service requested')
      setForm({ service_name: '', details: '', preferred_date: '', preferred_time: '' })
      onClose()
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Select
          label="Service"
          value={form.service_name}
          onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))}
          options={[
            { value: '', label: 'Select a service...' },
            ...services.map(s => ({ value: s.name, label: s.name })),
          ]}
        />
        {errors.service_name && <p className="text-xs text-destructive mt-1">{errors.service_name}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Details / Special requests</label>
        <textarea
          value={form.details}
          onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
          className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info resize-none"
          placeholder="Any special requirements..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Preferred date"
          type="date"
          value={form.preferred_date}
          onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
        />
        <Input
          label="Preferred time"
          type="time"
          value={form.preferred_time}
          onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Submit Request
        </Button>
      </div>
    </form>
  )
}

function ServiceRequestsList({ reservationId }: { reservationId: string }) {
  const { requests, loading } = useServiceRequests(reservationId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (requests.length === 0) return null

  const statusVariant = (s: string) => {
    if (s === 'completed') return 'success' as const
    if (s === 'cancelled') return 'destructive' as const
    if (s === 'in_progress' || s === 'approved') return 'warning' as const
    return 'muted' as const
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" /> My Requests
      </h3>
      <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{req.service_name}</p>
              <p className="text-xs text-muted-foreground">
                {req.preferred_date && `${req.preferred_date} `}
                {req.preferred_time && `at ${req.preferred_time}`}
                {!req.preferred_date && !req.preferred_time && 'No date preference'}
              </p>
              {req.details && <p className="text-xs text-muted-foreground mt-0.5">{req.details}</p>}
            </div>
            <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ChatSection({ reservationId, userId }: { reservationId: string; userId: string | undefined }) {
  const { messages, loading, sendMessage } = useMessages(reservationId)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!msgText.trim()) return
    setSending(true)
    try {
      await sendMessage({
        reservation_id: reservationId,
        sender_id: userId ?? '',
        sender_name: 'Guest',
        content: msgText.trim(),
      })
      setMsgText('')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="flex flex-col" style={{ height: '480px' }}>
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Messages
        </h3>
        <p className="text-xs text-muted-foreground">Chat with your house manager</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                isMe ? 'bg-foreground text-background' : 'bg-muted'
              }`}>
                {!isMe && <p className="text-[10px] font-medium mb-0.5">{msg.sender_name}</p>}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-background/60' : 'text-muted-foreground'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          type="text"
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 h-9 px-3 bg-muted border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !msgText.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </Card>
  )
}
