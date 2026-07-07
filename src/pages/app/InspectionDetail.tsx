import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  useInspections,
  useInspectionRooms,
  useInspectionReports,
  type InspectionRoom,
  type InspectionReport,
} from '@/lib/useSupabase'
import { uploadFile } from '@/lib/storage'
import { SignatureCanvas } from '@/components/SignatureCanvas'
import { useRole } from '@/lib/roleContext'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import {
  ArrowLeft, Plus, Loader2, Trash2, Camera, Eye, CheckCircle2,
  AlertTriangle, ImageIcon, ChevronDown, ChevronUp, Shield,
} from 'lucide-react'

export function InspectionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { actualRole } = useRole()
  const { inspections, loading: loadingInspection, update: updateInspection, remove: removeInspection } = useInspections()
  const { rooms, loading: loadingRooms, addRoom, updateRoom, removeRoom } = useInspectionRooms(id)
  const { reports, loading: loadingReports, addReport, updateReport, removeReport } = useInspectionReports(id)

  const inspection = inspections.find(i => i.id === id)

  const [showAddRoom, setShowAddRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)

  const [showAddReport, setShowAddReport] = useState(false)
  const [reportForm, setReportForm] = useState({
    title: '', description: '', severity: 'minor' as InspectionReport['severity'],
    room_name: '', is_known_issue: false,
  })
  const [addingReport, setAddingReport] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)

  const [showComplete, setShowComplete] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  if (loadingInspection) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/app/inspections')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {t('common.back')}
        </Button>
      </div>
    )
  }

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim() || !id) return
    setAddingRoom(true)
    try {
      await addRoom({ inspection_id: id, room_name: roomName, reference_photo_url: null, current_photo_url: null, status: 'pending', notes: null })
      toast(t('toast.saved'))
      setRoomName('')
      setShowAddRoom(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setAddingRoom(false)
  }

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportForm.title.trim() || !id) return
    setAddingReport(true)
    try {
      await addReport({
        inspection_id: id,
        title: reportForm.title,
        description: reportForm.description || null,
        severity: reportForm.severity,
        room_name: reportForm.room_name || null,
        is_known_issue: reportForm.is_known_issue,
        photo_url: null,
        resolved: false,
      })
      toast(t('toast.saved'))
      setReportForm({ title: '', description: '', severity: 'minor', room_name: '', is_known_issue: false })
      setShowAddReport(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setAddingReport(false)
  }

  const handleComplete = async () => {
    if (!signature) return
    setCompleting(true)
    try {
      await updateInspection(inspection.id, { status: 'completed', signature_data: signature })
      toast(t('inspections.completedToast'))
      setShowComplete(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setCompleting(false)
  }

  const handleDelete = async () => {
    try {
      await removeInspection(inspection.id)
      toast(t('toast.deleted'))
      navigate('/app/inspections')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const roomsOk = rooms.filter(r => r.status === 'ok').length
  const roomsIssue = rooms.filter(r => r.status === 'issue_found').length
  const knownIssues = reports.filter(r => r.is_known_issue).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/app/inspections')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight leading-tight">
              {inspection.property?.name ?? t('inspections.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {inspection.inspector_name} &middot; {new Date(inspection.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={inspection.status === 'completed' ? 'success' : 'warning'}>
            {inspection.status === 'completed' ? t('inspections.completed') : t('inspections.inProgress')}
          </Badge>
          <Badge variant="muted">{t(`inspections.types.${inspection.inspection_type}`)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {inspection.status !== 'completed' && (
            <Button variant="gold" size="sm" onClick={() => { setSignature(null); setShowComplete(true) }}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> {t('inspections.completeInspection')}
            </Button>
          )}
          {(actualRole === 'owner' || actualRole === 'agency') && (
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{rooms.length}</p>
          <p className="text-xs text-muted-foreground">{t('inspections.roomsChecked')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-success">{roomsOk}</p>
          <p className="text-xs text-muted-foreground">{t('inspections.roomStatus.ok')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-destructive">{roomsIssue}</p>
          <p className="text-xs text-muted-foreground">{t('inspections.issuesFound')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-warning">{knownIssues}</p>
          <p className="text-xs text-muted-foreground">{t('inspections.knownIssues')}</p>
        </Card>
      </div>

      {inspection.status === 'completed' && inspection.signature_data && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{t('inspections.signature')}</h3>
          <img src={inspection.signature_data} alt={t('inspections.signature')} className="h-24 border border-input rounded-sm bg-white" />
          {inspection.completed_at && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('inspections.completedAt')} {new Date(inspection.completed_at).toLocaleString()} · {inspection.inspector_name}
            </p>
          )}
        </Card>
      )}

      {/* Rooms section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{t('inspections.rooms')}</h3>
          <Button variant="secondary" size="sm" onClick={() => setShowAddRoom(true)}>
            <Plus className="w-4 h-4 mr-1" /> {t('inspections.addRoom')}
          </Button>
        </div>

        {loadingRooms ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t('inspections.noRooms')}</p>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                inspectionId={id!}
                expanded={expandedRoom === room.id}
                onToggle={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                onUpdate={updateRoom}
                onRemove={removeRoom}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Reports / Signalements section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{t('inspections.reports')}</h3>
          <Button variant="secondary" size="sm" onClick={() => setShowAddReport(true)}>
            <Plus className="w-4 h-4 mr-1" /> {t('inspections.addReport')}
          </Button>
        </div>

        {loadingReports ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t('inspections.noReports')}</p>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <ReportCard key={report.id} report={report} onUpdate={updateReport} onRemove={removeReport} />
            ))}
          </div>
        )}
      </Card>

      {/* Sign & Complete Modal */}
      <Modal open={showComplete} onClose={() => setShowComplete(false)} title={t('inspections.completeInspection')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('inspections.signatureHelp')}</p>
          <SignatureCanvas onSignatureChange={setSignature} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowComplete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="gold" disabled={!signature || completing} onClick={handleComplete}>
              {completing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {t('inspections.signAndComplete')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Room Modal */}
      <Modal open={showAddRoom} onClose={() => setShowAddRoom(false)} title={t('inspections.addRoom')}>
        <form onSubmit={handleAddRoom} className="space-y-4">
          <Input
            label={t('inspections.roomName')}
            required
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            placeholder={t('inspections.roomPlaceholder')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAddRoom(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={addingRoom}>
              {addingRoom ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Report Modal */}
      <Modal open={showAddReport} onClose={() => setShowAddReport(false)} title={t('inspections.addReport')}>
        <form onSubmit={handleAddReport} className="space-y-4">
          <Input
            label={t('inspections.reportTitle')}
            required
            value={reportForm.title}
            onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t('inspections.reportPlaceholder')}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">{t('inspections.reportDescription')}</label>
            <textarea
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
              value={reportForm.description}
              onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('inspections.severity')}
              value={reportForm.severity}
              onChange={e => setReportForm(f => ({ ...f, severity: e.target.value as InspectionReport['severity'] }))}
              options={[
                { value: 'minor', label: t('inspections.minor') },
                { value: 'moderate', label: t('inspections.moderate') },
                { value: 'major', label: t('inspections.major') },
              ]}
            />
            <Select
              label={t('inspections.rooms')}
              value={reportForm.room_name}
              onChange={e => setReportForm(f => ({ ...f, room_name: e.target.value }))}
              options={[
                { value: '', label: '—' },
                ...rooms.map(r => ({ value: r.room_name, label: r.room_name })),
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={reportForm.is_known_issue}
              onChange={e => setReportForm(f => ({ ...f, is_known_issue: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="font-medium">{t('inspections.knownIssue')}</span>
          </label>
          <p className="text-xs text-muted-foreground -mt-2">{t('inspections.knownIssueHelp')}</p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAddReport(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={addingReport}>
              {addingReport ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('inspections.deleteInspection')}
        message={t('inspections.confirmDelete')}
      />
    </div>
  )
}

/* ─── Room Card with photo overlay ─────────────────────────────────────────── */

function RoomCard({
  room,
  inspectionId,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  room: InspectionRoom
  inspectionId: string
  expanded: boolean
  onToggle: () => void
  onUpdate: (id: string, changes: Partial<InspectionRoom>) => Promise<InspectionRoom>
  onRemove: (id: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [uploading, setUploading] = useState<'reference' | 'current' | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState(0.4)
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false)
  const refInputRef = useRef<HTMLInputElement>(null)
  const curInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File, type: 'reference' | 'current') => {
    setUploading(type)
    try {
      const path = `inspections/${inspectionId}/${room.id}`
      const url = await uploadFile(path, file)
      const field = type === 'reference' ? 'reference_photo_url' : 'current_photo_url'
      await onUpdate(room.id, { [field]: url })
      toast(t('toast.saved'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setUploading(null)
  }

  const handleStatusChange = async (status: InspectionRoom['status']) => {
    try {
      await onUpdate(room.id, { status })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const statusVariant = room.status === 'ok' ? 'success' : room.status === 'issue_found' ? 'destructive' : 'muted'

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{room.room_name}</span>
          <Badge variant={statusVariant}>
            {t(`inspections.roomStatus.${room.status}`)}
          </Badge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Status selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('inspections.status')}:</span>
            {(['pending', 'ok', 'issue_found'] as const).map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${room.status === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {t(`inspections.roomStatus.${s}`)}
              </button>
            ))}
          </div>

          {/* Photo comparison with overlay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reference photo */}
            <div>
              <p className="text-xs font-medium mb-2">{t('inspections.referencePhoto')}</p>
              {room.reference_photo_url ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <img src={room.reference_photo_url} alt="Reference" className="w-full h-full object-cover" />
                  <button
                    onClick={() => refInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-foreground/30 transition-colors"
                  onClick={() => refInputRef.current?.click()}
                >
                  {uploading === 'reference' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground">{t('inspections.takePhoto')}</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={refInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'reference'); e.target.value = '' }}
              />
            </div>

            {/* Current photo with overlay */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">{t('inspections.currentPhoto')}</p>
                {room.reference_photo_url && room.current_photo_url && (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={overlayOpacity}
                      onChange={e => setOverlayOpacity(Number(e.target.value))}
                      className="w-16 h-1 accent-primary"
                    />
                  </div>
                )}
              </div>

              {room.current_photo_url ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <img src={room.current_photo_url} alt="Current" className="w-full h-full object-cover" />
                  {/* Overlay of reference photo */}
                  {room.reference_photo_url && (
                    <img
                      src={room.reference_photo_url}
                      alt="Reference overlay"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{ opacity: overlayOpacity }}
                    />
                  )}
                  <button
                    onClick={() => curInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  className="relative aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-foreground/30 transition-colors overflow-hidden"
                  onClick={() => curInputRef.current?.click()}
                >
                  {/* Semi-transparent reference overlay when capturing */}
                  {room.reference_photo_url && (
                    <img
                      src={room.reference_photo_url}
                      alt="Reference guide"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{ opacity: 0.25 }}
                    />
                  )}
                  {uploading === 'current' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground relative z-10" />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <Camera className="w-6 h-6 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground">{t('inspections.takePhoto')}</span>
                      {room.reference_photo_url && (
                        <span className="text-[10px] text-muted-foreground/60">{t('inspections.overlayHelp')}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <input
                ref={curInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'current'); e.target.value = '' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteRoom(true)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive mr-1" /> {t('common.delete')}
            </Button>
          </div>

          <ConfirmModal
            open={confirmDeleteRoom}
            onClose={() => setConfirmDeleteRoom(false)}
            onConfirm={async () => {
              try {
                await onRemove(room.id)
                toast(t('toast.deleted'))
              } catch (err) {
                toast((err as Error).message, 'error')
              } finally {
                setConfirmDeleteRoom(false)
              }
            }}
            title={t('common.delete')}
            message={t('inspections.confirmDelete')}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Report Card ──────────────────────────────────────────────────────────── */

function ReportCard({
  report,
  onUpdate,
  onRemove,
}: {
  report: InspectionReport
  onUpdate: (id: string, changes: Partial<InspectionReport>) => Promise<InspectionReport>
  onRemove: (id: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const severityVariant = report.severity === 'major' ? 'destructive' : report.severity === 'moderate' ? 'warning' : 'muted'
  const [confirmDeleteReport, setConfirmDeleteReport] = useState(false)

  const toggleResolved = async () => {
    try {
      await onUpdate(report.id, { resolved: !report.resolved })
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
      <div className="mt-0.5">
        {report.is_known_issue ? (
          <Shield className="w-4 h-4 text-info" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-warning" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{report.title}</span>
          <Badge variant={severityVariant}>{t(`inspections.${report.severity}`)}</Badge>
          {report.is_known_issue && <Badge variant="info">{t('inspections.knownIssue')}</Badge>}
          {report.resolved && <Badge variant="success">{t('inspections.resolved')}</Badge>}
        </div>
        {report.description && <p className="text-xs text-muted-foreground mt-1">{report.description}</p>}
        {report.room_name && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{report.room_name}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="secondary" size="sm" onClick={toggleResolved}>
          <CheckCircle2 className={`w-3.5 h-3.5 ${report.resolved ? 'text-success' : 'text-muted-foreground'}`} />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteReport(true)}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>

      <ConfirmModal
        open={confirmDeleteReport}
        onClose={() => setConfirmDeleteReport(false)}
        onConfirm={async () => {
          try {
            await onRemove(report.id)
            toast(t('toast.deleted'))
          } catch (err) {
            toast((err as Error).message, 'error')
          } finally {
            setConfirmDeleteReport(false)
          }
        }}
        title={t('common.delete')}
        message={t('inspections.confirmDelete')}
      />
    </div>
  )
}
