import { useState } from 'react'
import { Globe, Handshake, Mail, MapPin, Pencil, Phone, Trash2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PartnerOperationsPanel } from './PartnerOperationsPanel'
import {
  canManageManualPartner,
  deleteManualPartner,
  partnerDisplayContact,
  partnerSourceLabels,
  partnerStatusLabels,
  type PartnerRecord,
} from '@/lib/partners'

interface PartnerDetailModalProps {
  open: boolean
  partner: PartnerRecord | null
  ownerId?: string
  onClose: () => void
  onEdit?: (partner: PartnerRecord) => void
  onDeleted?: (partnerId: string) => void
}

export function PartnerDetailModal({
  open,
  partner,
  ownerId,
  onClose,
  onEdit,
  onDeleted,
}: PartnerDetailModalProps) {
  const [deleteError, setDeleteError] = useState('')
  if (!partner) return null

  const isManual = partner.source === 'manual'
  const canManage = canManageManualPartner(partner, ownerId)

  const handleDelete = async () => {
    if (!ownerId || !canManage) return
    if (!confirm(`Supprimer le partenaire « ${partner.name} » ?`)) return
    setDeleteError('')

    const { error } = await deleteManualPartner(partner.id, ownerId)
    if (!error) {
      onDeleted?.(partner.id)
      onClose()
      return
    }
    setDeleteError(
      error.code === '23503'
        ? 'Ce prestataire possède des factures. Archivez-le plutôt que de supprimer son historique.'
        : error.message,
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={partner.name}
      className="max-w-5xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isManual ? 'info' : 'warning'}>
            {isManual ? <Handshake className="mr-1 h-3.5 w-3.5" /> : <Globe className="mr-1 h-3.5 w-3.5" />}
            {partnerSourceLabels[partner.source]}
          </Badge>
          <Badge variant={partner.status === 'active' ? 'success' : 'muted'}>
            {partnerStatusLabels[partner.status]}
          </Badge>
          {partner.category && <Badge variant="muted">{partner.category}</Badge>}
        </div>

        {!isManual && (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Ce prestataire s’est inscrit sur la plateforme. Vous pouvez consulter sa fiche et échanger avec lui, mais les informations sont synchronisées depuis son compte.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Contact</p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              {partnerDisplayContact(partner)}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Commission</p>
            <p className="mt-1 font-mono text-sm">{partner.commission} %</p>
          </div>
          {partner.location && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Localisation</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {partner.location}
              </p>
            </div>
          )}
          {partner.email && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">E-mail</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {partner.email}
              </p>
            </div>
          )}
          {partner.phone && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Téléphone</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {partner.phone}
              </p>
            </div>
          )}
        </div>

        {partner.notes && (
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Notes internes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{partner.notes}</p>
          </div>
        )}

        {open && ownerId && (
          <PartnerOperationsPanel partner={partner} ownerId={ownerId} />
        )}

        {deleteError && (
          <p role="alert" className="text-sm text-destructive">{deleteError}</p>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">
            {partner.bookings_count > 0 && `${partner.bookings_count} réservation${partner.bookings_count > 1 ? 's' : ''}`}
            {partner.rating > 0 && ` · Note ${partner.rating.toFixed(1)}`}
          </div>
          <div className="flex gap-2">
            {canManage && onEdit && (
              <Button variant="secondary" size="sm" onClick={() => onEdit(partner)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Configurer
              </Button>
            )}
            {canManage && (
              <Button variant="secondary" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
