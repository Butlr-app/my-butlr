import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { PropertyGuestPortalPanel } from '@/components/property/PropertyGuestPortalPanel'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import type { Property } from '@/lib/types'

export function GuestPortal() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  useEffect(() => {
    if (!user) return

    fetchOwnerProperties(user.id).then(({ data }) => {
      const items = (data as Property[]) ?? []
      setProperties(items)
      setSelectedPropertyId(current => current || items[0]?.id || '')
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  const selectedProperty = properties.find(property => property.id === selectedPropertyId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Portail voyageur
          </p>
          <h1 className="mt-1 text-lg font-semibold">Configuration du portail invité</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Personnalisez l’expérience voyageur : accueil, Wi-Fi, consignes d’arrivée, règlement et guides pratiques.
          </p>
        </div>
        {selectedProperty && (
          <Link
            to={`/app/properties/${selectedProperty.id}`}
            className="text-sm font-medium text-foreground hover:underline"
          >
            Voir la propriété
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="Aucune propriété"
          description="Créez une propriété pour configurer son portail voyageur."
        />
      ) : (
        <>
          <Card className="p-4 max-w-xl">
            <Select
              label="Propriété à configurer"
              value={selectedPropertyId}
              onChange={event => setSelectedPropertyId(event.target.value)}
              options={properties.map(property => ({
                value: property.id,
                label: property.name,
              }))}
            />
          </Card>

          {selectedProperty && (
            <PropertyGuestPortalPanel
              propertyId={selectedProperty.id}
              propertyName={selectedProperty.name}
              propertyImageUrl={selectedProperty.image_url}
            />
          )}
        </>
      )}
    </div>
  )
}
