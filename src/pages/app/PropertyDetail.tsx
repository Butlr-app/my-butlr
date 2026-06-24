import { useParams, Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useProperties, useReservations, useTasks, type Property } from '@/lib/useSupabase'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'

const tabs = ['Overview', 'Bookings', 'Tasks', 'Services', 'Documents']

const statusMap: Record<string, { variant: 'success' | 'muted' | 'warning'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'muted', label: 'Inactive' },
  maintenance: { variant: 'warning', label: 'Maintenance' },
}

export function PropertyDetail() {
  const { id } = useParams()
  const { data: properties, loading } = useProperties()
  const { data: reservations } = useReservations()
  const { data: tasks } = useTasks()
  const [activeTab, setActiveTab] = useState('Overview')

  const property = properties.find(p => p.id === id)
  const propReservations = reservations.filter(r => r.property_id === id)
  const propTasks = tasks.filter(t => t.property_id === id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Properties
        </Link>
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Property not found.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Properties
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{property.name}</h2>
          <p className="text-sm text-muted-foreground">{property.location || 'No location'}</p>
        </div>
        <Badge variant={statusMap[property.status]?.variant ?? 'muted'}>
          {statusMap[property.status]?.label ?? property.status}
        </Badge>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Bedrooms</p>
            <p className="text-2xl font-mono font-medium">{property.bedrooms}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Bathrooms</p>
            <p className="text-2xl font-mono font-medium">{property.bathrooms}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Max Guests</p>
            <p className="text-2xl font-mono font-medium">{property.max_guests}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Type</p>
            <p className="text-lg font-medium capitalize">{property.type}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Reservations</p>
            <p className="text-2xl font-mono font-medium">{propReservations.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Open Tasks</p>
            <p className="text-2xl font-mono font-medium">{propTasks.filter(t => t.status !== 'done').length}</p>
          </Card>
          {property.description && (
            <Card className="p-5 md:col-span-3">
              <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{property.description}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'Bookings' && (
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-4">Reservations for {property.name}</p>
          {propReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No reservations for this property.</p>
          ) : (
            <div className="space-y-3">
              {propReservations.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.arrival} → {r.departure}</p>
                  </div>
                  <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Tasks' && (
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-4">Tasks for {property.name}</p>
          {propTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks for this property.</p>
          ) : (
            <div className="space-y-3">
              {propTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.status.replace('_', ' ')}</p>
                  </div>
                  <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'warning' : 'muted'}>
                    {t.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {(activeTab === 'Services' || activeTab === 'Documents') && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">{activeTab} for {property.name}</p>
          <Button variant="secondary" size="sm" className="mt-4">Configure {activeTab.toLowerCase()}</Button>
        </Card>
      )}
    </div>
  )
}
