import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import { useAuth } from '@/lib/authContext'
import { usePermissions } from '@/lib/permissionsContext'
import { fetchOwnerProperties } from '@/lib/data'
import type { Property } from '@/lib/types'

export function Properties() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    if (!user) return

    fetchOwnerProperties(user.id).then(({ data }) => {
      setProperties((data as Property[]) ?? [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Portfolio</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {properties.length} propriété{properties.length > 1 ? 's' : ''}
          </p>
        </div>
        {can('properties_create') && (
          <Button size="sm" onClick={() => navigate('/app/properties/new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter une propriété
          </Button>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Your properties will appear here after onboarding."
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map(property => (
            <Card key={property.id} className="overflow-hidden">
              <div className="aspect-[16/9] bg-muted flex items-center justify-center overflow-hidden">
                {property.image_url ? (
                  <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground font-mono">IMAGE</span>
                )}
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-base font-semibold">{property.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {property.location ?? '—'}
                  </p>
                </div>

                <Badge variant={property.status === 'active' ? 'success' : 'warning'}>
                  {property.status}
                </Badge>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                    <p className="text-sm font-medium">{property.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                    <p className="text-sm font-medium">{property.bathrooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Guests</p>
                    <p className="text-sm font-medium">{property.max_guests}</p>
                  </div>
                </div>

                <Link to={`/app/properties/${property.id}`}>
                  <Button variant="secondary" size="sm" className="w-full">Open property</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
