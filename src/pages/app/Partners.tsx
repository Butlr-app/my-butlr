import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Handshake, Pencil, Plus, Star, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { PartnerDetailModal } from '@/components/partners/PartnerDetailModal'
import { PartnerFormModal } from '@/components/partners/PartnerFormModal'
import { useAuth } from '@/lib/authContext'
import {
  canManageManualPartner,
  fetchManualPartners,
  fetchMarketplacePartners,
  isIntervenantPartnerCategory,
  partnerDisplayContact,
  partnerSourceLabels,
  partnerStatusLabels,
  type PartnerRecord,
} from '@/lib/partners'

type PartnerTab = 'all' | 'manual' | 'marketplace'

const tabs: Array<{ id: PartnerTab; label: string; icon: typeof Handshake }> = [
  { id: 'all', label: 'Tous', icon: Handshake },
  { id: 'manual', label: 'Partenaires habituels', icon: Handshake },
  { id: 'marketplace', label: 'Plateforme', icon: Globe },
]

function PartnerCard({
  partner,
  ownerId,
  onClick,
  onEdit,
}: {
  partner: PartnerRecord
  ownerId?: string
  onClick: (partner: PartnerRecord) => void
  onEdit?: (partner: PartnerRecord) => void
}) {
  const isManual = partner.source === 'manual'
  const manageable = canManageManualPartner(partner, ownerId)

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <button type="button" onClick={() => onClick(partner)} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold">{partner.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{partnerDisplayContact(partner)}</p>
        </button>
        <Badge variant={isManual ? 'info' : 'warning'}>
          {isManual ? 'Habituel' : 'En ligne'}
        </Badge>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {partner.category && <Badge variant="muted">{partner.category}</Badge>}
        <Badge variant={partner.status === 'active' ? 'success' : 'muted'}>
          {partnerStatusLabels[partner.status]}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground">{partner.commission} % commission</span>
        {partner.rating > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-warning" />
            {partner.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-dashed border-border pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => onClick(partner)}>
          Voir la fiche
        </Button>
        {manageable && onEdit && (
          <Button type="button" size="sm" onClick={() => onEdit(partner)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Configurer
          </Button>
        )}
      </div>
    </div>
  )
}

function PartnerSection({
  title,
  description,
  partners,
  ownerId,
  emptyTitle,
  emptyDescription,
  onPartnerClick,
  onPartnerEdit,
  action,
}: {
  title: string
  description: string
  partners: PartnerRecord[]
  ownerId?: string
  emptyTitle: string
  emptyDescription: string
  onPartnerClick: (partner: PartnerRecord) => void
  onPartnerEdit?: (partner: PartnerRecord) => void
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>

      {partners.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={action} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {partners.map(partner => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              ownerId={ownerId}
              onClick={onPartnerClick}
              onEdit={onPartnerEdit}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function Partners() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<PartnerTab>('manual')
  const [manualPartners, setManualPartners] = useState<PartnerRecord[]>([])
  const [marketplacePartners, setMarketplacePartners] = useState<PartnerRecord[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<PartnerRecord | null>(null)

  const loadPartners = async () => {
    if (!user) return
    setLoading(true)

    const [manualResult, marketplaceResult] = await Promise.all([
      fetchManualPartners(user.id),
      fetchMarketplacePartners(),
    ])

    setManualPartners((manualResult.data as PartnerRecord[]) ?? [])
    setMarketplacePartners((marketplaceResult.data as PartnerRecord[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadPartners()
  }, [user?.id])

  const serviceManualPartners = useMemo(
    () => manualPartners.filter(partner => !isIntervenantPartnerCategory(partner.category)),
    [manualPartners],
  )

  const serviceMarketplacePartners = useMemo(
    () => marketplacePartners.filter(partner => !isIntervenantPartnerCategory(partner.category)),
    [marketplacePartners],
  )

  const intervenantCount = useMemo(
    () => [...manualPartners, ...marketplacePartners]
      .filter(partner => isIntervenantPartnerCategory(partner.category)).length,
    [manualPartners, marketplacePartners],
  )

  const visibleManual = useMemo(() => {
    if (tab === 'marketplace') return []
    return serviceManualPartners
  }, [serviceManualPartners, tab])

  const visibleMarketplace = useMemo(() => {
    if (tab === 'manual') return []
    return serviceMarketplacePartners
  }, [serviceMarketplacePartners, tab])

  const openCreate = () => {
    setEditingPartner(null)
    setFormOpen(true)
  }

  const openDetail = (partner: PartnerRecord) => {
    setSelectedPartner(partner)
    setDetailOpen(true)
  }

  const openEdit = (partner: PartnerRecord) => {
    setEditingPartner(partner)
    setDetailOpen(false)
    setFormOpen(true)
  }

  const handleSaved = (partner: PartnerRecord) => {
    setManualPartners(current => {
      const exists = current.some(item => item.id === partner.id)
      if (exists) {
        return current.map(item => item.id === partner.id ? partner : item)
      }
      return [partner, ...current]
    })
    setSelectedPartner(partner)
    setEditingPartner(null)
  }

  const handleDeleted = (partnerId: string) => {
    setManualPartners(current => current.filter(item => item.id !== partnerId))
    setSelectedPartner(null)
  }

  const addManualButton = (
    <Button size="sm" onClick={openCreate}>
      <Plus className="mr-1.5 h-4 w-4" />
      Ajouter un prestataire de services
    </Button>
  )

  if (loading) return <LoadingState label="Chargement des prestataires…" />

  const totalCount = serviceManualPartners.length + serviceMarketplacePartners.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Réseau
          </p>
          <h1 className="mt-1 text-lg font-semibold">Prestataires de services</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Chef, spa & bien-être, transport, yacht et activités pour les voyageurs.
            Les intervenants techniques villa (ménage, piscine, jardin, travaux) se gèrent dans
            Entretien & travaux.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/operations"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-input bg-card px-3 text-sm font-medium hover:bg-muted"
          >
            <Wrench className="h-4 w-4" />
            Intervenants ({intervenantCount})
          </Link>
          {addManualButton}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(option => {
          const Icon = option.icon
          const count = option.id === 'manual'
            ? serviceManualPartners.length
            : option.id === 'marketplace'
              ? serviceMarketplacePartners.length
              : totalCount

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                tab === option.id
                  ? 'border-foreground/20 bg-foreground text-background'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
              <span className="font-mono text-xs opacity-80">({count})</span>
            </button>
          )
        })}
      </div>

      {tab === 'all' && totalCount === 0 ? (
        <EmptyState
          title="Aucun prestataire de services"
          description="Ajoutez un chef, un spa, un chauffeur ou une activité pour les voyageurs."
          action={addManualButton}
        />
      ) : (
        <div className="space-y-8">
          {(tab === 'all' || tab === 'manual') && (
            <PartnerSection
              title="Prestataires habituels"
              description="Services voyageur de confiance — commission, contacts et notes internes."
              partners={visibleManual}
              ownerId={user?.id}
              emptyTitle="Aucun prestataire habituel"
              emptyDescription="Ajoutez un chef, un spa, un chauffeur ou une activité avec la commission négociée."
              onPartnerClick={openDetail}
              onPartnerEdit={openEdit}
              action={addManualButton}
            />
          )}

          {(tab === 'all' || tab === 'marketplace') && (
            <PartnerSection
              title="Partenaires plateforme"
              description={`Prestataires de services inscrits en ligne (${partnerSourceLabels.marketplace.toLowerCase()}). Fiches synchronisées — consultation uniquement.`}
              partners={visibleMarketplace}
              ownerId={user?.id}
              emptyTitle="Aucun partenaire plateforme"
              emptyDescription="Les prestataires de services qui s'inscrivent avec le profil « Partenaire » apparaîtront ici automatiquement."
              onPartnerClick={openDetail}
            />
          )}
        </div>
      )}

      <Card className="border-dashed p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Prestataires habituels</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cliquez sur « Configurer » pour modifier commission, contacts ou notes à tout moment.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Partenaires plateforme</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fiches en lecture seule, mises à jour automatiquement depuis le compte du prestataire.
            </p>
          </div>
        </div>
      </Card>

      <PartnerFormModal
        open={formOpen}
        partner={editingPartner}
        categoryScope="service"
        onClose={() => {
          setFormOpen(false)
          setEditingPartner(null)
        }}
        onSaved={handleSaved}
      />

      <PartnerDetailModal
        open={detailOpen}
        partner={selectedPartner}
        ownerId={user?.id}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
