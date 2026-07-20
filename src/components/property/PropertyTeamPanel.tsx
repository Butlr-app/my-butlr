import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, RefreshCw, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import {
  cancelPropertyTeamInvitation,
  fetchPropertyOwner,
  fetchPropertyTeamInvitations,
  fetchPropertyTeamMembers,
  invitePropertyTeamMember,
  PROPERTY_TEAM_ROLES,
  propertyTeamPermissions,
  propertyTeamRoleDescriptions,
  propertyTeamRoleLabel,
  removePropertyTeamMember,
  resendPropertyTeamInvitation,
  updatePropertyTeamMemberRole,
  type PropertyOwnerSummary,
  type PropertyTeamInvitation,
  type PropertyTeamMember,
  type PropertyTeamRole,
} from '@/lib/propertyTeam'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { usePermissions } from '@/lib/permissionsContext'

interface PropertyTeamPanelProps {
  propertyId: string
  propertyName: string
  ownerId: string | null
  userId?: string | null
  dateFormat?: string | null
}

function memberDisplayName(member: PropertyTeamMember | PropertyOwnerSummary): string {
  if ('profile' in member) {
    return member.profile?.full_name?.trim()
      || member.profile?.email?.trim()
      || 'Membre sans nom'
  }
  return member.full_name?.trim() || member.email?.trim() || 'Membre sans nom'
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function PropertyTeamPanel({
  propertyId,
  propertyName,
  ownerId,
  userId,
  dateFormat,
}: PropertyTeamPanelProps) {
  const { can } = usePermissions()
  const canManageTeam = can('team_manage')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [owner, setOwner] = useState<PropertyOwnerSummary | null>(null)
  const [members, setMembers] = useState<PropertyTeamMember[]>([])
  const [invitations, setInvitations] = useState<PropertyTeamInvitation[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    role: 'house_manager' as PropertyTeamRole,
    message: '',
  })

  const loadTeam = useCallback(async () => {
    setLoading(true)
    setError('')

    const [ownerResult, membersResult, invitationsResult] = await Promise.all([
      ownerId ? fetchPropertyOwner(ownerId) : Promise.resolve({ data: null, error: null }),
      fetchPropertyTeamMembers(propertyId),
      fetchPropertyTeamInvitations(propertyId),
    ])

    if (ownerResult.error) {
      setError(ownerResult.error.message)
    } else {
      setOwner(ownerResult.data as PropertyOwnerSummary | null)
    }

    if (membersResult.error) {
      setError(membersResult.error.message)
      setMembers([])
    } else {
      setMembers(membersResult.data)
    }

    if (invitationsResult.error) {
      setError(invitationsResult.error.message)
      setInvitations([])
    } else {
      setInvitations((invitationsResult.data ?? []) as PropertyTeamInvitation[])
    }

    setLoading(false)
  }, [ownerId, propertyId])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  const clearFeedback = () => {
    setError('')
    setSuccess('')
  }

  const handleInvite = async () => {
    if (!userId) {
      setError('Vous devez être connecté pour inviter un membre.')
      return
    }
    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) {
      setError('Le nom et l’e-mail sont obligatoires.')
      return
    }

    setSaving(true)
    clearFeedback()

    const result = await invitePropertyTeamMember({
      propertyId,
      propertyName,
      fullName: inviteForm.fullName,
      email: inviteForm.email,
      role: inviteForm.role,
      message: inviteForm.message,
      invitedBy: userId,
    })

    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (result.kind === 'member' && result.data) {
      setMembers(current => {
        const withoutDuplicate = current.filter(
          member => member.user_id !== result.data!.user_id || member.role !== result.data!.role,
        )
        return [...withoutDuplicate, result.data!]
      })
      setSuccess(`${memberDisplayName(result.data)} a été ajouté à l’équipe.`)
    } else if (result.data) {
      setInvitations(current => [result.data!, ...current.filter(inv => inv.id !== result.data!.id)])
      setSuccess(
        result.emailWarning
          ? `Invitation enregistrée pour ${result.data.email}. ${result.emailWarning}`
          : `Invitation envoyée à ${result.data.email}.`,
      )
    }

    setInviteForm({ fullName: '', email: '', role: 'house_manager', message: '' })
    setShowInvite(false)
  }

  const handleRoleChange = async (member: PropertyTeamMember, role: PropertyTeamRole) => {
    if (member.role === role) return

    setSaving(true)
    clearFeedback()

    const { data, error: updateError } = await updatePropertyTeamMemberRole(
      member.id,
      member.user_id,
      propertyId,
      role,
    )

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    if (data) {
      setMembers(current => current.map(entry => (entry.id === member.id ? data : entry)))
      setSuccess(`Rôle mis à jour pour ${memberDisplayName(data)}.`)
    }
  }

  const handleRemoveMember = async (member: PropertyTeamMember) => {
    if (!confirm(`Retirer ${memberDisplayName(member)} de l’équipe ?`)) return

    setSaving(true)
    clearFeedback()

    const { error: removeError } = await removePropertyTeamMember(member.id)

    setSaving(false)

    if (removeError) {
      setError(removeError.message)
      return
    }

    setMembers(current => current.filter(entry => entry.id !== member.id))
    setSuccess(`${memberDisplayName(member)} a été retiré de l’équipe.`)
  }

  const handleCancelInvitation = async (invitation: PropertyTeamInvitation) => {
    if (!confirm(`Annuler l’invitation pour ${invitation.email} ?`)) return

    setSaving(true)
    clearFeedback()

    const { error: cancelError } = await cancelPropertyTeamInvitation(invitation.id)

    setSaving(false)

    if (cancelError) {
      setError(cancelError.message)
      return
    }

    setInvitations(current => current.filter(entry => entry.id !== invitation.id))
    setSuccess(`Invitation annulée pour ${invitation.email}.`)
  }

  const handleResendInvitation = async (invitation: PropertyTeamInvitation) => {
    setSaving(true)
    clearFeedback()

    const { data, error: resendError } = await resendPropertyTeamInvitation(invitation.id)

    setSaving(false)

    if (resendError) {
      setError(resendError.message)
      return
    }

    if (data) {
      setInvitations(current => current.map(entry => (entry.id === invitation.id ? data as PropertyTeamInvitation : entry)))
      setSuccess(`Invitation renvoyée à ${invitation.email}.`)
    }
  }

  if (loading) {
    return <LoadingState label="Chargement de l’équipe…" />
  }

  const roleOptions = PROPERTY_TEAM_ROLES.map(role => ({
    value: role,
    label: propertyTeamRoleLabel(role),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Équipe</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les rôles et invitations pour {propertyName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPermissions(true)}>
            <Shield className="w-4 h-4 mr-1.5" />
            Permissions
          </Button>
          {canManageTeam && (
            <Button size="sm" onClick={() => setShowInvite(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Inviter
            </Button>
          )}
        </div>
      </div>

      {!canManageTeam && (
        <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Seul le propriétaire peut inviter ou modifier les membres de l’équipe.
        </p>
      )}

      {(error || success) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          error
            ? 'border-destructive/30 bg-destructive/5 text-destructive'
            : 'border-success/30 bg-success-soft text-success'
        }`}>
          {error || success}
        </div>
      )}

      {owner && (
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Propriétaire</p>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
              {initials(memberDisplayName(owner))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{memberDisplayName(owner)}</p>
              <p className="text-xs text-muted-foreground truncate">{owner.email ?? '—'}</p>
            </div>
            <Badge variant="success">Propriétaire</Badge>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Membres actifs</h3>
          <Badge variant="muted">{members.length}</Badge>
        </div>

        {members.length === 0 ? (
          <EmptyState
            title="Aucun membre pour l’instant"
            description={
              canManageTeam
                ? 'Invitez un house manager, concierge, maintenance ou prestataire pour cette propriété.'
                : 'Aucun membre actif sur cette propriété pour le moment.'
            }
            action={canManageTeam ? (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                Inviter un membre
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {members.map(member => {
              const name = memberDisplayName(member)
              const email = member.profile?.email ?? '—'
              return (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    {canManageTeam ? (
                      <>
                        <Select
                          value={member.role}
                          onChange={event => handleRoleChange(member, event.target.value as PropertyTeamRole)}
                          options={roleOptions}
                          disabled={saving}
                          className="min-w-[180px]"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          disabled={saving}
                          aria-label={`Retirer ${name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="muted">{propertyTeamRoleLabel(member.role)}</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {canManageTeam && invitations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Invitations en attente</h3>
            <Badge variant="warning">{invitations.length}</Badge>
          </div>

          <div className="divide-y divide-border">
            {invitations.map(invitation => (
              <div key={invitation.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invitation.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {propertyTeamRoleLabel(invitation.role)}
                    {' · '}
                    Expire le {formatDateForDisplay(invitation.expires_at.slice(0, 10), dateFormat)}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleResendInvitation(invitation)}
                    disabled={saving}
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Renvoyer
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation)}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Inviter un membre"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            value={inviteForm.fullName}
            onChange={event => setInviteForm(current => ({ ...current, fullName: event.target.value }))}
            placeholder="Marie Dupont"
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={inviteForm.email}
            onChange={event => setInviteForm(current => ({ ...current, email: event.target.value }))}
            placeholder="marie@exemple.com"
            required
          />
          <Select
            label="Rôle"
            value={inviteForm.role}
            onChange={event => setInviteForm(current => ({
              ...current,
              role: event.target.value as PropertyTeamRole,
            }))}
            options={roleOptions}
          />
          <p className="text-xs text-muted-foreground -mt-2">
            {propertyTeamRoleDescriptions[inviteForm.role]}
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Message (optionnel)</label>
            <textarea
              rows={3}
              value={inviteForm.message}
              onChange={event => setInviteForm(current => ({ ...current, message: event.target.value }))}
              placeholder="Message personnalisé pour l’invitation…"
              className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowInvite(false)} disabled={saving}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleInvite} disabled={saving}>
              {saving ? 'Envoi…' : 'Envoyer l’invitation'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
        title="Matrice des permissions"
        className="max-w-2xl"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Droits par rôle pour cette propriété. Le propriétaire conserve tous les accès.
          Pour le house manager, les droits détaillés se configurent dans{' '}
          <Link to="/app/settings?tab=Roles" className="font-medium text-foreground underline">
            Paramètres → Rôles
          </Link>
          {' '}(par défaut : comme le propriétaire, sans montants ni contrats, sans suppression de propriété).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Permission</th>
                {PROPERTY_TEAM_ROLES.map(role => (
                  <th key={role} className="text-center py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">
                    {propertyTeamRoleLabel(role).split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyTeamPermissions.map(row => (
                <tr key={row.permission} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">{row.permission}</td>
                  {PROPERTY_TEAM_ROLES.map(role => (
                    <td key={role} className="text-center py-2.5 px-2">
                      {row.roles[role] ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
