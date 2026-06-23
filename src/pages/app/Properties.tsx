import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { properties } from '@/data/mockData'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'

export function Properties() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Portfolio</p>
        </div>
        <Button size="sm">Add property</Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map(property => (
          <Card key={property.id} className="overflow-hidden">
            <div className="aspect-[16/9] bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground font-mono">IMAGE</span>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <h3 className="text-base font-semibold">{property.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {property.location}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={
                  property.status === 'occupied' ? 'success' :
                  property.status === 'available' ? 'info' : 'warning'
                }>
                  {property.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Current Guest</p>
                  <p className="text-sm font-medium">{property.currentGuest || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Arrival</p>
                  <p className="text-sm font-medium">{property.nextArrival}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Revenue this month</p>
                <p className="text-lg font-mono font-medium">€{property.revenueThisMonth.toLocaleString()}</p>
              </div>

              <Link to={`/app/properties/${property.id}`}>
                <Button variant="secondary" size="sm" className="w-full">Open property</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
