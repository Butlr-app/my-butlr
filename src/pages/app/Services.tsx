import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { services } from '@/data/mockData'

export function Services() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Service Marketplace</p>
        <Button size="sm">Add service</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map(service => (
          <Card key={service.id} className="overflow-hidden flex flex-col">
            <div className="aspect-square bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground font-mono">IMAGE</span>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold">{service.name}</h3>
                <Badge variant={service.available ? 'success' : 'muted'}>
                  {service.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3 flex-1">{service.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-sm font-mono font-medium">€{service.startingPrice}</p>
                  <p className="text-[10px] text-muted-foreground">Starting price</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium">{service.commission}%</p>
                  <p className="text-[10px] text-muted-foreground">Commission</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="w-full mt-3">
                Add to guest portal
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
