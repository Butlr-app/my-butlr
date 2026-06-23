import { useParams, Link } from 'react-router-dom'
import { properties } from '@/data/mockData'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

const tabs = ['Overview', 'Bookings', 'Guest Portal', 'Services', 'Staff', 'Maintenance', 'Documents', 'Financials']

export function PropertyDetail() {
  const { id } = useParams()
  const property = properties.find(p => p.id === id) || properties[0]
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div className="space-y-6">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Properties
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{property.name}</h2>
          <p className="text-sm text-muted-foreground">{property.location}</p>
        </div>
        <Badge variant={property.status === 'occupied' ? 'success' : property.status === 'available' ? 'info' : 'warning'}>
          {property.status}
        </Badge>
      </div>

      {/* Tabs */}
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

      {/* Tab content */}
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
            <p className="text-2xl font-mono font-medium">{property.maxGuests}</p>
          </Card>
          <Card className="p-5 md:col-span-2">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Current Guest</p>
            <p className="text-lg font-medium">{property.currentGuest || 'No current guest'}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Revenue</p>
            <p className="text-2xl font-mono font-medium">€{property.revenueThisMonth.toLocaleString()}</p>
          </Card>
        </div>
      )}

      {activeTab === 'Bookings' && (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Upcoming reservations for {property.name}</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">M. & Mme Laurent</p>
                <p className="text-xs text-muted-foreground">20 Jun - 28 Jun 2026</p>
              </div>
              <Badge variant="success">Confirmed</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Mme Chen</p>
                <p className="text-xs text-muted-foreground">1 Jul - 8 Jul 2026</p>
              </div>
              <Badge variant="warning">Pending</Badge>
            </div>
          </div>
        </Card>
      )}

      {activeTab !== 'Overview' && activeTab !== 'Bookings' && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">{activeTab} content for {property.name}</p>
          <Button variant="secondary" size="sm" className="mt-4">Configure {activeTab.toLowerCase()}</Button>
        </Card>
      )}
    </div>
  )
}
