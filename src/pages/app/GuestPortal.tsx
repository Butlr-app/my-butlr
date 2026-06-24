import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useReservations, useServices } from '@/lib/useSupabase'
import {
  Wifi, BookOpen, Plane, Users, Phone, Loader2, Calendar, Download
} from 'lucide-react'

export function GuestPortal() {
  const { data: reservations, loading: lRes } = useReservations()
  const { data: services, loading: lSvc } = useServices()

  const loading = lRes || lSvc

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const activeReservation = reservations.find(r =>
    r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
  )

  const upcomingReservations = reservations.filter(r =>
    r.arrival > today && (r.status === 'confirmed' || r.status === 'pending')
  ).slice(0, 3)

  const pastReservations = reservations.filter(r =>
    r.departure < today || r.status === 'completed'
  ).slice(0, 3)

  const availableServices = services.filter(s => s.available).slice(0, 8)

  const daysBetween = (a: string, b: string) => {
    const d1 = new Date(a).getTime()
    const d2 = new Date(b).getTime()
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
  }

  const exportReservationsCSV = () => {
    const headers = ['Guest', 'Property', 'Arrival', 'Departure', 'Guests', 'Status', 'Amount']
    const rows = reservations.map(r => [r.guest_name, r.property?.name ?? '', r.arrival, r.departure, String(r.guests_count), r.status, String(r.total_amount)])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Guest Portal</p>
        <Button variant="secondary" size="sm" onClick={exportReservationsCSV}>
          <Download className="w-4 h-4 mr-1" /> Export Reservations
        </Button>
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
                  <p className="text-xs font-mono mt-1">€{Number(r.total_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {availableServices.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Available Services</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {availableServices.map(svc => (
              <div key={svc.id} className="border border-border rounded-md p-3 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium">{svc.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">From €{Number(svc.starting_price).toLocaleString()}</p>
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

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-2">Request Assistance</h3>
          <p className="text-xs text-muted-foreground mb-4">Need anything? Our concierge team is available 24/7.</p>
          <Button size="sm">Send a request</Button>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-2">Local Recommendations</h3>
          <p className="text-xs text-muted-foreground mb-4">Restaurants, beaches, activities curated for you.</p>
          <Button variant="secondary" size="sm">Explore</Button>
        </Card>
      </div>
    </div>
  )
}
