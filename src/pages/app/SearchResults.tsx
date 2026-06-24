import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSearch } from '@/lib/searchContext'
import { useProperties, useReservations, usePayments, useTasks, usePartners } from '@/lib/useSupabase'
import { useTranslation } from '@/i18n/LanguageContext'
import { Search, Building2, CalendarDays, CreditCard, ClipboardList, Handshake, Loader2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'

export function SearchResults() {
  const { t } = useTranslation()
  const { query, setQuery } = useSearch()
  const [searchParams] = useSearchParams()
  const { data: properties, loading: lProp } = useProperties()
  const { data: reservations, loading: lRes } = useReservations()
  const { data: payments, loading: lPay } = usePayments()
  const { data: tasks, loading: lTasks } = useTasks()
  const { data: partners, loading: lPart } = usePartners()

  const loading = lProp || lRes || lPay || lTasks || lPart

  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q !== query) setQuery(q)
  }, [searchParams, query, setQuery])

  const searchTerm = query.toLowerCase()

  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    (p.location ?? '').toLowerCase().includes(searchTerm) ||
    p.type.toLowerCase().includes(searchTerm)
  )

  const filteredReservations = reservations.filter(r =>
    r.guest_name.toLowerCase().includes(searchTerm) ||
    (r.property?.name ?? '').toLowerCase().includes(searchTerm) ||
    r.status.toLowerCase().includes(searchTerm)
  )

  const filteredPayments = payments.filter(p =>
    p.guest_name.toLowerCase().includes(searchTerm) ||
    (p.property_name ?? '').toLowerCase().includes(searchTerm) ||
    p.type.toLowerCase().includes(searchTerm)
  )

  const filteredTasks = tasks.filter(tk =>
    tk.title.toLowerCase().includes(searchTerm) ||
    (tk.description ?? '').toLowerCase().includes(searchTerm) ||
    tk.status.toLowerCase().includes(searchTerm)
  )

  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm) ||
    (p.category ?? '').toLowerCase().includes(searchTerm) ||
    (p.location ?? '').toLowerCase().includes(searchTerm)
  )

  const totalResults = filteredProperties.length + filteredReservations.length + filteredPayments.length + filteredTasks.length + filteredPartners.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {t('search.resultsFor')} &ldquo;{query}&rdquo; &mdash; {totalResults} {totalResults === 1 ? 'result' : 'results'}
        </span>
      </div>

      {totalResults === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
        </Card>
      )}

      {filteredProperties.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('search.properties')} ({filteredProperties.length})</h3>
          </div>
          <div className="space-y-3">
            {filteredProperties.slice(0, 5).map(p => (
              <Link key={p.id} to={`/app/properties/${p.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.location} &middot; {p.type}</p>
                </div>
                <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {filteredReservations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('search.reservations')} ({filteredReservations.length})</h3>
          </div>
          <div className="space-y-3">
            {filteredReservations.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.guest_name}</p>
                  <p className="text-xs text-muted-foreground">{r.property?.name ?? '—'} &middot; {r.arrival} → {r.departure}</p>
                </div>
                <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filteredPayments.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('search.payments')} ({filteredPayments.length})</h3>
          </div>
          <div className="space-y-3">
            {filteredPayments.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.guest_name}</p>
                  <p className="text-xs text-muted-foreground">{p.property_name} &middot; {p.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium">{'\u20AC'}{Number(p.amount).toLocaleString()}</p>
                  <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="mt-1">{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filteredTasks.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('search.tasks')} ({filteredTasks.length})</h3>
          </div>
          <div className="space-y-3">
            {filteredTasks.slice(0, 5).map(tk => (
              <div key={tk.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{tk.title}</p>
                  <p className="text-xs text-muted-foreground">{tk.status.replace('_', ' ')} &middot; {tk.priority}</p>
                </div>
                <Badge variant={tk.priority === 'high' ? 'destructive' : tk.priority === 'medium' ? 'warning' : 'muted'}>
                  {tk.priority}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filteredPartners.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Handshake className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('search.partners')} ({filteredPartners.length})</h3>
          </div>
          <div className="space-y-3">
            {filteredPartners.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category} &middot; {p.location}</p>
                </div>
                <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
