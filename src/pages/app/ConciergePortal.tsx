import { useState, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import {
  useProperties, useReservations, useServices, useServiceRequests,
} from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import {
  Calendar, ShoppingBag, HelpCircle, Loader2,
  ChevronLeft, ChevronRight, BedDouble, Users, MapPin,
  Send, Clock, Sparkles, Building2
} from 'lucide-react'

type Tab = 'availability' | 'services' | 'inquiries'

const SERVICE_IMAGES: Record<string, string> = {
  'Private Chef': '/images/chef.jpg',
  'Boat Rental': '/images/boat.jpg',
  'Wellness & Spa': '/images/spa.jpg',
  'Airport Transfer': '/images/luxury-interior.jpg',
  'Wine Tasting': '/images/villa-pool.jpg',
  'Personal Shopper': '/images/concierge.jpg',
  'Childcare': '/images/beach-villa.jpg',
  'Fitness Coach': '/images/spa.jpg',
  'Event Planning': '/images/villa-hero.jpg',
  'Helicopter Tour': '/images/yacht.jpg',
}

/* ─── Availability Tab ──────────────────────────────────────────────────────── */

function AvailabilityTab() {
  const { data: properties, loading: lProp } = useProperties()
  const { data: reservations, loading: lRes } = useReservations()
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const formatDate = useCallback(
    (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    [year, month],
  )

  const days = useMemo(() => {
    const result: string[] = []
    for (let d = 1; d <= daysInMonth; d++) result.push(formatDate(d))
    return result
  }, [daysInMonth, formatDate])

  const getPropertyReservations = useCallback(
    (propertyId: string) => reservations.filter(r => r.property_id === propertyId && r.status !== 'cancelled'),
    [reservations],
  )

  const getDayStatus = useCallback(
    (propertyId: string, dateStr: string) => {
      for (const r of getPropertyReservations(propertyId)) {
        if (r.arrival <= dateStr && r.departure >= dateStr) {
          return r.status === 'confirmed' || r.status === 'in_progress' ? 'occupied' : r.status === 'pending' ? 'pending' : 'available'
        }
      }
      return 'available'
    },
    [getPropertyReservations],
  )

  const getAvailableDays = useCallback(
    (propertyId: string) => days.filter(d => getDayStatus(propertyId, d) === 'available').length,
    [days, getDayStatus],
  )

  const getMonthReservations = useCallback(
    (propertyId: string) => {
      const monthStart = formatDate(1)
      const monthEnd = formatDate(daysInMonth)
      return getPropertyReservations(propertyId).filter(r => r.arrival <= monthEnd && r.departure >= monthStart)
    },
    [getPropertyReservations, formatDate, daysInMonth],
  )

  if (lProp || lRes) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const activeProps = properties.filter(p => p.status === 'active')

  return (
    <div className="space-y-5">
      {/* Month navigation + legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold min-w-[160px] text-center capitalize">{monthName}</p>
          <button onClick={nextMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
            <span>{t('conciergePortal.available')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-500/50" />
            <span>{t('conciergePortal.occupied')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" />
            <span>{t('conciergePortal.pendingStatus')}</span>
          </div>
        </div>
      </div>

      {activeProps.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeProps.map(prop => {
            const availDays = getAvailableDays(prop.id)
            const monthRes = getMonthReservations(prop.id)
            return (
              <Card key={prop.id} className="overflow-hidden">
                <div className="p-4">
                  {/* Property header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                        <img src={prop.image_url ?? '/images/villa-pool.jpg'} alt={prop.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate">{prop.name}</h3>
                        {prop.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {prop.location}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> {prop.bedrooms}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {prop.max_guests}</span>
                          <span>{prop.surface_m2} m&sup2;</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={availDays > 15 ? 'success' : availDays > 5 ? 'warning' : 'destructive'}>
                      {availDays}/{daysInMonth} {t('conciergePortal.daysAvailable')}
                    </Badge>
                  </div>

                  {/* Availability timeline */}
                  <div className="flex gap-px rounded-lg overflow-hidden">
                    {days.map((dateStr, i) => {
                      const status = getDayStatus(prop.id, dateStr)
                      const isToday = dateStr === today
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-8 relative group cursor-default transition-colors ${
                            status === 'occupied' ? 'bg-blue-500/25' :
                            status === 'pending' ? 'bg-amber-500/25' :
                            'bg-emerald-500/15 hover:bg-emerald-500/25'
                          } ${isToday ? 'ring-1 ring-foreground/40' : ''}`}
                          title={`${i + 1} — ${
                            status === 'available' ? t('conciergePortal.available') :
                            status === 'occupied' ? t('conciergePortal.occupied') :
                            t('conciergePortal.pendingStatus')
                          }`}
                        >
                          <span className={`absolute inset-0 flex items-center justify-center text-[9px] tabular-nums ${
                            isToday ? 'font-bold text-foreground' : 'text-muted-foreground'
                          }`}>
                            {i + 1}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Month reservations summary */}
                  {monthRes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {monthRes.map(r => (
                        <div key={r.id} className="flex items-center justify-between text-[11px] py-1">
                          <span className="text-muted-foreground">
                            {new Date(r.arrival).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            {' — '}
                            {new Date(r.departure).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            <span className="ml-2 text-foreground/60">&middot; {r.guests_count} {t('conciergePortal.guests')}</span>
                          </span>
                          <Badge variant={r.status === 'confirmed' || r.status === 'in_progress' ? 'success' : r.status === 'pending' ? 'warning' : 'muted'} className="text-[9px]">
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Services Tab ──────────────────────────────────────────────────────────── */

function ServicesTab() {
  const { data: services, loading } = useServices()
  const { data: properties } = useProperties()
  const { requests, addRequest } = useServiceRequests()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [showBooking, setShowBooking] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [form, setForm] = useState({ clientName: '', clientEmail: '', propertyId: '', preferredDate: '', preferredTime: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const activeServices = services.filter(s => s.available)

  const openBooking = (serviceName: string) => {
    setSelectedService(serviceName)
    setForm({ clientName: '', clientEmail: '', propertyId: '', preferredDate: '', preferredTime: '', notes: '' })
    setShowBooking(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !form.clientName.trim()) return
    setSaving(true)
    try {
      const details = [
        `Client: ${form.clientName}`,
        form.clientEmail ? `Email: ${form.clientEmail}` : '',
        form.notes || '',
      ].filter(Boolean).join('\n')
      await addRequest({
        service_name: selectedService,
        details,
        preferred_date: form.preferredDate || null,
        preferred_time: form.preferredTime || null,
        reservation_id: null,
        guest_user_id: user?.id ?? null,
        service_id: null,
        partner_id: null,
        quoted_price: null,
        status: 'pending',
      })
      toast(t('conciergePortal.serviceBooked'))
      setShowBooking(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const myBookings = useMemo(
    () => requests.filter(r => r.guest_user_id === user?.id && !r.service_name.startsWith('Inquiry:')),
    [requests, user?.id],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Service catalog */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{t('conciergePortal.serviceCatalog')}</h3>
        {activeServices.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeServices.map(svc => {
              const img = SERVICE_IMAGES[svc.name] ?? svc.image_url ?? '/images/villa-pool.jpg'
              return (
                <Card key={svc.id} className="overflow-hidden group">
                  <div className="relative h-36">
                    <img src={img} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                        {svc.category ?? 'Premium'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-semibold">{svc.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {svc.description ?? t('conciergePortal.premiumService')}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm font-semibold tabular-nums">
                        &euro;{Number(svc.starting_price).toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground"> +</span>
                      </p>
                      <Button size="sm" onClick={() => openBooking(svc.name)}>
                        {t('conciergePortal.bookForClient')}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* My pre-bookings */}
      {myBookings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">{t('conciergePortal.myBookings')}</h3>
          <div className="space-y-2">
            {myBookings.map(req => (
              <Card key={req.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">{req.service_name}</h4>
                      <Badge variant={
                        req.status === 'completed' ? 'success' :
                        req.status === 'cancelled' ? 'destructive' :
                        req.status === 'in_progress' || req.status === 'approved' ? 'warning' : 'muted'
                      }>
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {req.details && <p className="text-xs text-muted-foreground truncate">{req.details}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {req.preferred_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {req.preferred_date} {req.preferred_time ?? ''}
                        </span>
                      )}
                      {req.quoted_price != null && <span>&euro;{Number(req.quoted_price).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Booking modal */}
      <Modal open={showBooking} onClose={() => setShowBooking(false)} title={`${t('conciergePortal.bookService')}: ${selectedService}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('conciergePortal.clientName')}
            required
            value={form.clientName}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
            placeholder="John Doe"
          />
          <Input
            label={t('conciergePortal.clientEmail')}
            type="email"
            value={form.clientEmail}
            onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
            placeholder="client@example.com"
          />
          <Select
            label={t('conciergePortal.property')}
            value={form.propertyId}
            onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
            options={[
              { value: '', label: t('conciergePortal.anyProperty') },
              ...properties.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('conciergePortal.preferredDate')}
              type="date"
              value={form.preferredDate}
              onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
            />
            <Input
              label={t('conciergePortal.preferredTime')}
              type="time"
              value={form.preferredTime}
              onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('conciergePortal.specialRequests')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full h-24 px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('conciergePortal.specialRequestsPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowBooking(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !form.clientName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
              {t('conciergePortal.submitBooking')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ─── Inquiries Tab ─────────────────────────────────────────────────────────── */

function InquiriesTab() {
  const { requests, addRequest, loading } = useServiceRequests()
  const { data: properties } = useProperties()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: 'availability', propertyId: '', clientName: '', message: '' })
  const [saving, setSaving] = useState(false)

  const myInquiries = useMemo(
    () => requests.filter(r => r.guest_user_id === user?.id && r.service_name.startsWith('Inquiry:')),
    [requests, user?.id],
  )

  const subjectLabels: Record<string, { en: string; key: string }> = {
    availability: { en: 'Availability', key: 'conciergePortal.inqAvailability' },
    pricing: { en: 'Pricing', key: 'conciergePortal.inqPricing' },
    services: { en: 'Services', key: 'conciergePortal.inqServices' },
    other: { en: 'Other', key: 'conciergePortal.inqOther' },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.message.trim()) return
    setSaving(true)
    try {
      const label = t(subjectLabels[form.subject]?.key ?? 'conciergePortal.inqOther')
      const property = properties.find(p => p.id === form.propertyId)
      const detailParts = [
        form.clientName ? `Client: ${form.clientName}` : '',
        property ? `Property: ${property.name}` : '',
        form.message,
      ].filter(Boolean)
      await addRequest({
        service_name: `Inquiry: ${label}`,
        details: detailParts.join('\n'),
        preferred_date: null,
        preferred_time: null,
        reservation_id: null,
        guest_user_id: user?.id ?? null,
        service_id: null,
        partner_id: null,
        quoted_price: null,
        status: 'pending',
      })
      toast(t('conciergePortal.inquirySent'))
      setShowForm(false)
      setForm({ subject: 'availability', propertyId: '', clientName: '', message: '' })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('conciergePortal.myInquiries')}</h3>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Send className="w-3.5 h-3.5 mr-1" /> {t('conciergePortal.newInquiry')}
        </Button>
      </div>

      {myInquiries.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">{t('conciergePortal.noInquiries')}</p>
          <Button variant="gold" size="sm" onClick={() => setShowForm(true)}>
            {t('conciergePortal.newInquiry')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {myInquiries.map(inq => (
            <Card key={inq.id} className="p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium">{inq.service_name.replace('Inquiry: ', '')}</h4>
                  <Badge variant={
                    inq.status === 'completed' ? 'success' :
                    inq.status === 'cancelled' ? 'destructive' :
                    inq.status === 'approved' ? 'warning' : 'muted'
                  }>
                    {inq.status === 'pending' ? t('conciergePortal.awaitingResponse') : inq.status.replace('_', ' ')}
                  </Badge>
                </div>
                {inq.details && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{inq.details}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">
                  {new Date(inq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Inquiry modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('conciergePortal.newInquiry')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('conciergePortal.inquiryType')}
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            options={[
              { value: 'availability', label: t('conciergePortal.inqAvailability') },
              { value: 'pricing', label: t('conciergePortal.inqPricing') },
              { value: 'services', label: t('conciergePortal.inqServices') },
              { value: 'other', label: t('conciergePortal.inqOther') },
            ]}
          />
          <Select
            label={t('conciergePortal.property')}
            value={form.propertyId}
            onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
            options={[
              { value: '', label: t('conciergePortal.generalInquiry') },
              ...properties.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <Input
            label={t('conciergePortal.clientName')}
            value={form.clientName}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
            placeholder={t('conciergePortal.clientNamePlaceholder')}
          />
          <div>
            <label className="block text-sm font-medium mb-1">{t('conciergePortal.message')}</label>
            <textarea
              required
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              className="w-full h-32 px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('conciergePortal.messagePlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !form.message.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
              {t('conciergePortal.sendInquiry')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

export function ConciergePortal() {
  const [tab, setTab] = useState<Tab>('availability')
  const { t } = useTranslation()

  const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: 'availability', label: t('conciergePortal.availability'), icon: Calendar },
    { id: 'services', label: t('conciergePortal.bookServices'), icon: ShoppingBag },
    { id: 'inquiries', label: t('conciergePortal.inquiries'), icon: HelpCircle },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('conciergePortal.title')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('conciergePortal.subtitle')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 h-9 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === id
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'availability' && <AvailabilityTab />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'inquiries' && <InquiriesTab />}
    </div>
  )
}
