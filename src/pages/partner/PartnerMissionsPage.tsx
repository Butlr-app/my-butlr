import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import type { PartnerRecord } from '@/lib/partners'
import {
  fetchMyMissions,
  fetchMyPartnerProfile,
  partnerMissionStatusLabels,
  updateMissionStatus,
  type PartnerMission,
} from '@/lib/partnerPortal'
import { taskPriorityLabels, type TaskStatus } from '@/lib/tasks'
import { formatDateForDisplay } from '@/lib/dateFormat'

type MissionFilter = 'open' | 'done' | 'all'

export function PartnerMissionsPage() {
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<MissionFilter>('open')
  const [missions, setMissions] = useState<PartnerMission[]>([])

  const load = async () => {
    setLoading(true)
    setError('')
    const { data: profile, error: profileError } = await fetchMyPartnerProfile()
    if (profileError || !profile) {
      setError(profileError?.message ?? 'Fiche introuvable.')
      setLoading(false)
      return
    }
    const { data, error: missionsError } = await fetchMyMissions((profile as PartnerRecord).id)
    if (missionsError) setError(missionsError.message)
    setMissions((data ?? []) as PartnerMission[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const visible = useMemo(() => {
    if (filter === 'all') return missions
    if (filter === 'done') return missions.filter(m => m.status === 'done')
    return missions.filter(m => m.status !== 'done')
  }, [filter, missions])

  const setStatus = async (mission: PartnerMission, status: TaskStatus) => {
    setBusyId(mission.id)
    setError('')
    const { data, error: updateError } = await updateMissionStatus(mission.id, status)
    setBusyId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    if (data) {
      setMissions(current => current.map(item => (item.id === mission.id ? data as PartnerMission : item)))
    }
  }

  if (loading) return <LoadingState label="Chargement des missions…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Missions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Interventions assignées par les propriétaires et house managers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'open', label: 'Ouvertes' },
            { id: 'done', label: 'Terminées' },
            { id: 'all', label: 'Toutes' },
          ] as const).map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                filter === option.id
                  ? 'border-foreground/20 bg-foreground text-background'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Aucune mission"
          description="Les missions qui vous sont assignées apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {visible.map(mission => (
            <Card key={mission.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{mission.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mission.properties?.name ?? 'Villa'}
                    {mission.properties?.location ? ` · ${mission.properties.location}` : ''}
                    {mission.due_date ? ` · Échéance ${formatDateForDisplay(mission.due_date)}` : ''}
                  </p>
                  {mission.description && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                      {mission.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="muted">{partnerMissionStatusLabels[mission.status]}</Badge>
                  <Badge variant="muted">{taskPriorityLabels[mission.priority]}</Badge>
                </div>
              </div>

              {mission.status !== 'done' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  {mission.status === 'todo' && (
                    <Button
                      size="sm"
                      disabled={busyId === mission.id}
                      onClick={() => setStatus(mission, 'in_progress')}
                    >
                      Démarrer
                    </Button>
                  )}
                  {mission.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === mission.id}
                        onClick={() => setStatus(mission, 'waiting')}
                      >
                        En attente
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === mission.id}
                        onClick={() => setStatus(mission, 'done')}
                      >
                        Marquer terminée
                      </Button>
                    </>
                  )}
                  {mission.status === 'waiting' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === mission.id}
                        onClick={() => setStatus(mission, 'in_progress')}
                      >
                        Reprendre
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === mission.id}
                        onClick={() => setStatus(mission, 'done')}
                      >
                        Marquer terminée
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
