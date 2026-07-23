import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { amenityLabels } from '@/lib/propertyAmenities'
import type { Property } from '@/lib/types'
import { ImagePlus, Pencil, Plus } from 'lucide-react'

const typeLabels: Record<string, string> = {
  villa: 'Villa',
  yacht: 'Yacht',
  apartment: 'Appartement',
  chalet: 'Chalet',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
}

interface DetailRowProps {
  label: string
  value?: string | null
  onAdd?: () => void
  children?: React.ReactNode
}

function DetailRow({ label, value, onAdd, children }: DetailRowProps) {
  const hasValue = Boolean(value?.trim()) || Boolean(children)

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">{label}</p>
        {children ?? (
          <p className={`text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground italic'}`}>
            {hasValue ? value : 'Non renseigné'}
          </p>
        )}
      </div>
      {!hasValue && onAdd && (
        <Button type="button" variant="secondary" size="sm" onClick={onAdd} className="shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Ajouter
        </Button>
      )}
    </div>
  )
}

interface PropertyDetailsPanelProps {
  property: Property
  onEdit: () => void
  onAddPhoto: () => void
}

export function PropertyDetailsPanel({ property, onEdit, onAddPhoto }: PropertyDetailsPanelProps) {
  const amenities = Array.isArray(property.amenities) ? property.amenities : []

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold">Détails de la propriété</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Informations complémentaires du bien</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Modifier
        </Button>
      </div>

      <div>
        <DetailRow label="Type" value={typeLabels[property.type] ?? property.type} onAdd={onEdit} />
        <DetailRow label="Statut" onAdd={onEdit}>
          <Badge variant={property.status === 'active' ? 'success' : 'warning'}>
            {statusLabels[property.status] ?? property.status}
          </Badge>
        </DetailRow>
        <DetailRow label="Localisation" value={property.location} onAdd={onEdit} />
        <DetailRow label="Adresse" value={property.address} onAdd={onEdit} />
        <DetailRow
          label="Surface"
          value={property.surface_m2 ? `${property.surface_m2} m²` : null}
          onAdd={onEdit}
        />
        <DetailRow label="Équipements" onAdd={onEdit}>
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {amenityLabels(amenities).map(label => (
                <Badge key={label} variant="muted">{label}</Badge>
              ))}
            </div>
          ) : null}
        </DetailRow>
        <DetailRow label="Photo de couverture" onAdd={onAddPhoto}>
          {property.image_url ? (
            <div className="mt-2 aspect-[16/9] max-w-xs rounded-md overflow-hidden border border-border">
              <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
            </div>
          ) : null}
        </DetailRow>
      </div>
    </Card>
  )
}

interface PropertyOverviewSummaryProps {
  property: Property
  displayImage?: string | null
  onEdit: () => void
  onAddPhoto: () => void
}

export function PropertyOverviewSummary({ property, displayImage, onEdit, onAddPhoto }: PropertyOverviewSummaryProps) {
  return (
    <div className="space-y-4">
      {displayImage ? (
        <div className="aspect-[21/9] rounded-lg overflow-hidden border border-border">
          <img src={displayImage} alt={property.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <button
          type="button"
          onClick={onAddPhoto}
          className="w-full aspect-[21/9] rounded-lg border border-dashed border-border bg-card flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
        >
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Ajouter une photo</span>
        </button>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Chambres</p>
          <p className="text-2xl font-mono font-medium">{property.bedrooms}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Salles de bain</p>
          <p className="text-2xl font-mono font-medium">{property.bathrooms}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground mb-1">Invités max</p>
          <p className="text-2xl font-mono font-medium">{property.max_guests}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Description</p>
          {!property.description && (
            <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
        {property.description ? (
          <p className="text-sm">{property.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucune description pour le moment.</p>
        )}
      </Card>

      <PropertyDetailsPanel property={property} onEdit={onEdit} onAddPhoto={onAddPhoto} />
    </div>
  )
}
