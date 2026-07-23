import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardList, Receipt } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import type { PartnerRecord } from '@/lib/partners'
import {
  fetchMyCalendarDays,
  fetchMyInvoices,
  fetchMyMissions,
  fetchMyPartnerProfile,
  partnerMissionStatusLabels,
  type PartnerMission,
} from '@/lib/partnerPortal'
import type { ProviderInvoice } from '@/lib/providerOperations'
import { providerInvoiceStatusLabels } from '@/lib/providerOperations'
import { formatDateForDisplay } from '@/lib/dateFormat'

export function PartnerDashboard() {
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<PartnerRecord | null>(null)
  const [missions, setMissions] = useState<PartnerMission[]>([])
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([])
  const [openMissionCount, setOpenMissionCount] = useState(0)
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0)
  const [blockedDayCount, setBlockedDayCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: profile } = await fetchMyPartnerProfile()
      if (cancelled) return
      const partnerRow = (profile as PartnerRecord | null) ?? null
      setPartner(partnerRow)
      if (!partnerRow) {
        setLoading(false)
        return
      }

      const today = new Date()
      const from = today.toISOString().slice(0, 10)
      const toDate = new Date(today)
      toDate.setDate(toDate.getDate() + 30)
      const to = toDate.toISOString().slice(0, 10)

      const [missionsResult, invoicesResult, calendarResult] = await Promise.all([
        fetchMyMissions(partnerRow.id),
        fetchMyInvoices(partnerRow.id),
        fetchMyCalendarDays(partnerRow.id, from, to),
      ])

      if (cancelled) return
      const openMissions = ((missionsResult.data ?? []) as PartnerMission[]).filter(m => m.status !== 'done')
      const pendingInvoices = ((invoicesResult.data ?? []) as ProviderInvoice[]).filter(i => i.status !== 'paid')
      const blockedCount = ((calendarResult.data ?? []) as Array<{ status: string }>)
        .filter(d => d.status === 'blocked' || d.status === 'busy')
        .length

      setOpenMissionCount(openMissions.length)
      setPendingInvoiceCount(pendingInvoices.length)
      setBlockedDayCount(blockedCount)
      setMissions(openMissions.slice(0, 5))
      setInvoices(pendingInvoices.slice(0, 5))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingState label="Chargement de votre espace…" />

  if (!partner) {
    return (
      <EmptyState
        title="Fiche prestataire introuvable"
        description="Votre compte partner n’est pas encore lié à une fiche marketplace. Rechargez la page ou contactez le support."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          Espace prestataire
        </p>
        <h2 className="mt-1 text-lg font-semibold">Bonjour{partner.name ? `, ${partner.name}` : ''}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Missions, planning et factures pour vos interventions villa.
        </p>
      </div>

      {!partner.onboarding_completed && (
        <Card className="border-warning/40 bg-warning/5 p-4">
          <p className="text-sm font-medium">Complétez votre fiche prestataire</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Une fiche complète aide les propriétaires à vous trouver et à vous assigner des missions.
          </p>
          <Link to="/partner/profile" className="mt-2 inline-block text-sm underline">
            Mettre à jour ma fiche
          </Link>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wider">Missions ouvertes</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{openMissionCount}</p>
          <Link to="/partner/missions" className="mt-2 inline-block text-sm text-foreground underline">
            Voir les missions
          </Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wider">Créneaux bloqués (30 j)</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{blockedDayCount}</p>
          <Link to="/partner/planning" className="mt-2 inline-block text-sm text-foreground underline">
            Gérer le planning
          </Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wider">Factures en cours</p>
          </div>
          <p className="mt-2 text-2xl font-semibold">{pendingInvoiceCount}</p>
          <Link to="/partner/payments" className="mt-2 inline-block text-sm text-foreground underline">
            Voir les paiements
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Prochaines missions</h3>
            <Link to="/partner/missions" className="text-sm underline">Tout voir</Link>
          </div>
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune mission en cours.</p>
          ) : (
            <ul className="divide-y divide-border">
              {missions.map(mission => (
                <li key={mission.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{mission.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {mission.properties?.name ?? 'Villa'}
                      {mission.due_date ? ` · ${formatDateForDisplay(mission.due_date)}` : ''}
                    </p>
                  </div>
                  <Badge variant="muted">{partnerMissionStatusLabels[mission.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Factures en attente</h3>
            <Link to="/partner/payments" className="text-sm underline">Tout voir</Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune facture en attente.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map(invoice => (
                <li key={invoice.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {Number(invoice.amount).toLocaleString('fr-FR')} {invoice.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.properties?.name ?? 'Villa'} · {formatDateForDisplay(invoice.issue_date)}
                    </p>
                  </div>
                  <Badge variant="muted">{providerInvoiceStatusLabels[invoice.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
