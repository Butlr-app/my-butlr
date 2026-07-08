import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/authContext'
import {
  usePartnerPortal, usePartnerAvailability, usePartnerReviews, usePartnerDocuments,
} from '@/lib/useSupabase'
import type { PartnerDocument } from '@/lib/useSupabase'
import { uploadFile } from '@/lib/storage'
import { useToast } from '@/components/ui/Toast'
import {
  User, Settings, Shield, HelpCircle, LogOut, ChevronRight,
  Building2, Star, Award, CreditCard, Bell, FileText, BarChart3, Loader2,
  Clock, Plus, Trash2, Upload, MessageSquare,
} from 'lucide-react'
import { PartnerUnlinked } from './PartnerUnlinked'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function PartnerProfile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { partner, bookings, payments, loading } = usePartnerPortal()
  const { average, count } = usePartnerReviews(partner?.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!partner) {
    return <PartnerUnlinked title="Profile" />
  }

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalBookings = bookings.length
  const displayRating = average ?? Number(partner.rating)

  const menuSections = [
    {
      title: 'Business',
      items: [
        { icon: Building2, label: 'Business Information', subtitle: 'Company name, address, tax ID' },
        { icon: CreditCard, label: 'Payment & Banking', subtitle: 'Bank account, payment schedule' },
        { icon: BarChart3, label: 'Analytics', subtitle: 'Performance insights' },
        { icon: FileText, label: 'Invoices', subtitle: 'Download past invoices' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Personal Information', subtitle: 'Name, email, phone' },
        { icon: Shield, label: 'Security', subtitle: 'Password, 2FA' },
        { icon: Bell, label: 'Notifications', subtitle: 'Alerts and preferences' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', subtitle: 'FAQs, contact support' },
        { icon: Settings, label: 'Settings', subtitle: 'App configuration' },
      ],
    },
  ]

  return (
    <div className="bg-gray-950 min-h-screen pb-8">
      {/* Profile Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20" style={{ width: 72, height: 72 }}>
            <span className="text-white font-bold text-2xl">
              {partner.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {partner.name}
            </h1>
            <p className="text-sm text-gray-500">{partner.email ?? user?.email ?? ''}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">
                {partner.status === 'active' ? 'Verified Partner' : 'Inactive'}
                {partner.category ? ` · ${partner.category}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="text-center p-4 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-xl font-bold text-white">{totalBookings}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Bookings</p>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-2xl border border-gray-800">
            <p className="text-xl font-bold text-white">&euro;{(totalRevenue / 1000).toFixed(1)}k</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Revenue</p>
          </div>
          <div className="text-center p-4 bg-gray-900 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="w-4 h-4 fill-current text-amber-400" />
              <p className="text-xl font-bold text-white">{displayRating.toFixed(1)}</p>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              {count > 0 ? `${count} review${count > 1 ? 's' : ''}` : 'Rating'}
            </p>
          </div>
        </div>
      </div>

      {/* Membership Card */}
      <div className="px-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] text-amber-900/60 uppercase tracking-wider font-bold">Commission Rate</p>
              <p className="text-lg font-bold text-white mt-0.5">{partner.commission}% per booking</p>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-5 h-5 text-white" />
              <span className="text-sm font-bold text-white">PRO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="px-5 mt-6">
        <AvailabilityCard partnerId={partner.id} />
      </div>

      {/* Documents */}
      <div className="px-5 mt-6">
        <DocumentsCard partnerId={partner.id} />
      </div>

      {/* Reviews */}
      <div className="px-5 mt-6">
        <ReviewsCard partnerId={partner.id} />
      </div>

      {/* Menu Sections */}
      <div className="px-5 mt-6 space-y-5">
        {menuSections.map(section => (
          <div key={section.title}>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-gray-800 transition-colors ${
                    idx < section.items.length - 1 ? 'border-b border-gray-800' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="px-5 mt-6">
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center justify-center gap-2 py-4 text-red-400 font-semibold bg-gray-900 rounded-2xl border border-gray-800 active:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      <p className="text-center text-[11px] text-gray-700 mt-6">My Butlr Partner v1.0</p>
    </div>
  )
}

function SectionShell({ title, icon: Icon, action, children }: {
  title: string
  icon: typeof Clock
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function AvailabilityCard({ partnerId }: { partnerId: string }) {
  const { availability, loading, setDay, clearDay } = usePartnerAvailability(partnerId)
  const { toast } = useToast()

  const byDay = new Map(availability.map(a => [a.weekday, a]))

  const toggle = async (weekday: number) => {
    try {
      if (byDay.has(weekday)) await clearDay(weekday)
      else await setDay(weekday, '09:00', '17:00')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update availability', 'error')
    }
  }

  const changeTime = async (weekday: number, which: 'start' | 'end', value: string) => {
    const row = byDay.get(weekday)
    if (!row) return
    try {
      await setDay(
        weekday,
        which === 'start' ? value : row.start_time.slice(0, 5),
        which === 'end' ? value : row.end_time.slice(0, 5),
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update hours', 'error')
    }
  }

  return (
    <SectionShell title="Weekly availability" icon={Clock}>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto my-4" />
      ) : (
        <div className="space-y-2">
          {WEEKDAYS.map((label, weekday) => {
            const row = byDay.get(weekday)
            const on = !!row
            return (
              <div key={weekday} className="flex items-center gap-3">
                <button
                  onClick={() => toggle(weekday)}
                  className={`w-12 flex-shrink-0 text-xs font-bold py-1.5 rounded-lg transition-colors ${
                    on ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {label}
                </button>
                {on && row ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={row.start_time.slice(0, 5)}
                      onChange={e => changeTime(weekday, 'start', e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                    />
                    <span className="text-gray-600 text-xs">–</span>
                    <input
                      type="time"
                      value={row.end_time.slice(0, 5)}
                      onChange={e => changeTime(weekday, 'end', e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-600 flex-1">Unavailable</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionShell>
  )
}

function DocumentsCard({ partnerId }: { partnerId: string }) {
  const { documents, loading, addDocument, removeDocument } = usePartnerDocuments(partnerId)
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(`partner-documents/${partnerId}`, file)
      await addDocument({ title: file.name, category: 'other', file_url: url, file_name: file.name })
      toast('Document uploaded', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const del = async (doc: PartnerDocument) => {
    try {
      await removeDocument(doc.id)
      toast('Document removed', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove', 'error')
    }
  }

  return (
    <SectionShell
      title="Documents"
      icon={FileText}
      action={
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs font-semibold text-amber-500 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Upload
        </button>
      }
    >
      <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto my-4" />
      ) : documents.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-6 text-gray-500"
        >
          <Upload className="w-6 h-6" />
          <span className="text-xs">Upload contracts, certificates, insurance…</span>
        </button>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 bg-gray-950 rounded-xl px-3 py-2.5 border border-gray-800">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-0 text-sm text-white truncate hover:text-amber-400"
              >
                {doc.title}
              </a>
              <button onClick={() => del(doc)} aria-label="Remove document" className="text-gray-600 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

function ReviewsCard({ partnerId }: { partnerId: string }) {
  const { reviews, average, count, loading } = usePartnerReviews(partnerId)

  return (
    <SectionShell
      title="Reviews"
      icon={MessageSquare}
      action={count > 0 ? (
        <span className="flex items-center gap-1 text-xs font-bold text-white">
          <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
          {average?.toFixed(1)} · {count}
        </span>
      ) : undefined}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto my-4" />
      ) : reviews.length === 0 ? (
        <p className="text-xs text-gray-600 py-2 text-center">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 5).map(r => (
            <div key={r.id} className="border-b border-gray-800 last:border-0 pb-3 last:pb-0">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < r.rating ? 'fill-current text-amber-400' : 'text-gray-700'}`}
                  />
                ))}
              </div>
              {r.comment && <p className="text-xs text-gray-400 mt-1.5">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}
