import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MetricCard } from '@/components/ui/MetricCard'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerContracts } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { createContractFileSignedUrl } from '@/lib/contractFiles'
import type { Contract } from '@/lib/types'
import { Link } from 'react-router-dom'
import { FileSignature, Layers3 } from 'lucide-react'
import { signatureStatusLabels } from '@/lib/signatureWorkflow'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { CalendarDays } from 'lucide-react'

export function Contracts() {
  const { user, profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selected, setSelected] = useState<Contract | null>(null)
  const [openingFile, setOpeningFile] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    fetchOwnerContracts(user.id).then(({ data }) => {
      setContracts((data as Contract[]) ?? [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  const openFile = async (storagePath: string) => {
    setOpeningFile(storagePath)
    setError('')
    try {
      const url = await createContractFileSignedUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Impossible d’ouvrir le fichier.')
    } finally {
      setOpeningFile('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Contracts</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/contracts/templates">
            <Button size="sm" variant="secondary">
              <Layers3 className="mr-2 h-4 w-4" />
              Modèles
            </Button>
          </Link>
          <Link to="/app/contracts/generate">
            <Button size="sm">Nouveau contrat</Button>
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Contracts" value={contracts.length} />
        <MetricCard label="Signed" value={contracts.filter(c => c.status === 'signed').length} />
        <MetricCard label="Pending" value={contracts.filter(c => c.status === 'sent').length} />
        <MetricCard label="Drafts" value={contracts.filter(c => c.status === 'draft').length} />
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          description="Generate rental contracts from the Contracts page once you have reservations."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guest / Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Signature</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Documents</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Analyse</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Réservation</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                    <td className="px-4 text-sm font-medium">{c.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">{c.property_name}</td>
                    <td className="px-4">
                      <Badge variant={c.type === 'rental' ? 'default' : 'info'}>{c.type}</Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={
                        c.status === 'signed' ? 'success' :
                        c.status === 'sent' ? 'info' : 'muted'
                      }>{c.status}</Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={
                        c.signing_status === 'completed' ? 'success'
                          : c.signing_status === 'declined' ? 'destructive'
                            : c.signing_status && c.signing_status !== 'not_started' ? 'info' : 'muted'
                      }>
                        {signatureStatusLabels[c.signing_status ?? 'not_started']}
                      </Badge>
                    </td>
                    <td className="px-4 text-sm">
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="cursor-pointer text-foreground underline-offset-4 hover:underline"
                      >
                        {c.contract_files?.length ?? 0} fichier{(c.contract_files?.length ?? 0) > 1 ? 's' : ''}
                      </button>
                    </td>
                    <td className="px-4">
                      <Badge variant={
                        c.analysis_status === 'completed' ? 'success'
                          : c.analysis_status === 'failed' ? 'destructive'
                            : c.analysis_status === 'processing' ? 'info'
                              : 'muted'
                      }>
                        {c.analysis_status === 'not_required' ? 'modèle' : c.analysis_status ?? '—'}
                      </Badge>
                    </td>
                    <td className="px-4 text-sm font-mono text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>{c.date ? formatDateForDisplay(c.date, profile?.date_format) : '—'}</span>
                        <Link
                          to={`/app/contracts/${c.id}`}
                          aria-label={`Gérer la signature de ${c.guest_name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                        >
                          <FileSignature className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-4">
                      {c.reservation_id ? (
                        <button
                          type="button"
                          onClick={() => openReservation(c.reservation_id!)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
                        >
                          <CalendarDays className="h-4 w-4" />
                          Ouvrir
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Dossier du contrat"
      >
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium">{selected.guest_name}</p>
              <p className="text-xs text-muted-foreground">{selected.property_name}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Documents privés
              </p>
              {selected.reservation_id && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openReservation(selected.reservation_id!)}
                >
                  <CalendarDays className="mr-1.5 h-4 w-4" />
                  Voir la réservation
                </Button>
              )}
              {(selected.contract_files ?? []).map(file => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => openFile(file.storage_path)}
                  disabled={openingFile === file.storage_path}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted disabled:cursor-wait"
                >
                  <span className="truncate text-sm">{file.file_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {openingFile === file.storage_path ? 'Ouverture…' : 'Ouvrir'}
                  </span>
                </button>
              ))}
              {(selected.contract_files?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Aucun fichier transféré.</p>
              )}
            </div>

            {selected.extracted_data && Object.values(selected.extracted_data).some(values => values.length > 0) && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Données détectées par OCR
                </p>
                {Object.entries(selected.extracted_data).map(([category, values]) =>
                  values.length > 0 ? (
                    <div key={category}>
                      <p className="text-xs font-medium capitalize">{category}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{values.join(' · ')}</p>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
