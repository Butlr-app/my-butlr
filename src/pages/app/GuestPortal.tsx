import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { PropertyGuestPortalPanel } from '@/components/property/PropertyGuestPortalPanel'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import {
  countPublishedGuides,
  defaultGuestPortalSettings,
  fetchGuestPortalSettings,
  fetchPropertyGuides,
} from '@/lib/guestPortal'
import { guestPortalSetupProgress } from '@/lib/guestPortalSetup'
import type { Property } from '@/lib/types'
import type { GuestGuide, GuestPortalSettings } from '@/lib/guestPortal'

interface PropertyPortalSummary {
  settings: GuestPortalSettings
  guides: GuestGuide[]
  progress: ReturnType<typeof guestPortalSetupProgress>
}

export function GuestPortal() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [summaries, setSummaries] = useState<Record<string, PropertyPortalSummary>>({})

  useEffect(() => {
    if (!user) return

    fetchOwnerProperties(user.id).then(async ({ data }) => {
      const items = (data as Property[]) ?? []
      setProperties(items)
      setSelectedPropertyId(current => current || items[0]?.id || '')

      const nextSummaries: Record<string, PropertyPortalSummary> = {}
      await Promise.all(items.map(async property => {
        const [settingsResult, guidesResult] = await Promise.all([
          fetchGuestPortalSettings(property.id),
          fetchPropertyGuides(property.id),
        ])
        const settings = settingsResult.data ?? defaultGuestPortalSettings(property.id)
        const guides = (guidesResult.data ?? []) as GuestGuide[]
        nextSummaries[property.id] = {
          settings,
          guides,
          progress: guestPortalSetupProgress(settings, guides),
        }
      }))

      setSummaries(nextSummaries)
      setLoading(false)
    })
  }, [user])

  const selectedProperty = properties.find(property => property.id === selectedPropertyId)
  const selectedSummary = selectedPropertyId ? summaries[selectedPropertyId] : undefined

  const sortedProperties = useMemo(
    () => [...properties].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [properties],
  )

  if (loading) return <LoadingState label="Chargement des portails voyageur…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Portail voyageur
          </p>
          <h1 className="mt-1 text-lg font-semibold">Configuration du portail invité</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Organisez l’expérience voyageur en 5 blocs : activation, accueil, séjour, règlement et guides pratiques.
          </p>
        </div>
        {selectedProperty && (
          <Link
            to={`/app/properties/${selectedProperty.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
          >
            Fiche propriété
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="Aucune propriété"
          description="Créez une propriété pour configurer son portail voyageur."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-muted/40 px-3 py-2">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Villas
                </p>
              </div>
              <div className="space-y-1 p-2">
                {sortedProperties.map(property => {
                  const summary = summaries[property.id]
                  const isSelected = property.id === selectedPropertyId
                  const enabled = summary?.settings.enabled ?? true
                  const progress = summary?.progress.percent ?? 0

                  return (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => setSelectedPropertyId(property.id)}
                      className={`relative flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'border-foreground/20 bg-info-soft/40 ring-1 ring-border'
                          : 'border-transparent hover:border-border hover:bg-muted/60'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-info" aria-hidden />
                      )}
                      {property.image_url ? (
                        <img
                          src={property.image_url}
                          alt=""
                          className="mt-0.5 h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                          {property.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{property.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={enabled ? 'success' : 'muted'} className="text-[10px]">
                            {enabled ? 'Actif' : 'Off'}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {progress}% prêt
                          </span>
                        </span>
                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className={`block h-full rounded-full transition-all ${isSelected ? 'bg-info' : 'bg-foreground/30'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </Card>

            {selectedSummary && (
              <Card className="overflow-hidden p-0">
                <div className="h-1 w-full bg-info" aria-hidden />
                <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Avancement
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {selectedSummary.progress.percent}%
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{ width: `${selectedSummary.progress.percent}%` }}
                  />
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    {selectedSummary.progress.complete} section{selectedSummary.progress.complete > 1 ? 's' : ''} complète{selectedSummary.progress.complete > 1 ? 's' : ''}
                  </li>
                  <li className="flex items-center gap-2">
                    <Circle className="h-3.5 w-3.5" />
                    {countPublishedGuides(selectedSummary.guides)} guide{countPublishedGuides(selectedSummary.guides) > 1 ? 's' : ''} publié{countPublishedGuides(selectedSummary.guides) > 1 ? 's' : ''}
                  </li>
                </ul>
                </div>
              </Card>
            )}
          </aside>

          {selectedProperty && (
            <PropertyGuestPortalPanel
              propertyId={selectedProperty.id}
              propertyName={selectedProperty.name}
              propertyImageUrl={selectedProperty.image_url}
              onSummaryChange={(settings, guides) => {
                setSummaries(current => ({
                  ...current,
                  [selectedProperty.id]: {
                    settings,
                    guides,
                    progress: guestPortalSetupProgress(settings, guides),
                  },
                }))
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
