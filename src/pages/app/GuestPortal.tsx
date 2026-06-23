import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Wifi, BookOpen, Plane, Users, ConciergeBell, MapPin, Phone, Heart
} from 'lucide-react'

export function GuestPortal() {
  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Guest Portal Preview</p>

      {/* Welcome */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Welcome, M. & Mme Laurent</h2>
            <p className="text-sm text-muted-foreground">Villa French Way, Saint-Tropez</p>
            <p className="text-xs text-muted-foreground mt-1">20 Jun - 28 Jun 2026</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Day 4 of 8</p>
          </div>
        </div>
      </Card>

      {/* Quick info */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Wifi, label: 'Wi-Fi', value: 'VillaFW_Guest / luxury2026' },
          { icon: BookOpen, label: 'House Rules', value: 'Quiet hours 22h-8h' },
          { icon: Plane, label: 'Arrival Info', value: 'Code: 4829#' },
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

      {/* Staff contacts */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Your Team</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: 'Sophie Martin', role: 'House Manager', phone: '+33 6 12 34 56 78' },
            { name: 'Pierre Duval', role: 'Concierge', phone: '+33 6 98 76 54 32' },
            { name: 'Marie Blanc', role: 'Housekeeper', phone: '+33 6 11 22 33 44' },
          ].map(staff => (
            <div key={staff.name} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{staff.name}</p>
                <p className="text-xs text-muted-foreground">{staff.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Services */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Book a Service</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: ConciergeBell, label: 'Private Chef', price: 'From €850' },
            { icon: Plane, label: 'Airport Transfer', price: 'From €250' },
            { icon: Heart, label: 'Wellness', price: 'From €200' },
            { icon: MapPin, label: 'Boat Rental', price: 'From €2,000' },
          ].map(svc => (
            <div key={svc.label} className="border border-border rounded-md p-3 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mx-auto mb-2">
                <svc.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium">{svc.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{svc.price}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
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
