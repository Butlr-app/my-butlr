import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { formatDateForDisplay, localeForDateFormat } from '@/lib/dateFormat'
import {
  deleteRateOverride,
  deleteRateSeason,
  fetchPropertyPricing,
  formatPrice,
  getDateRange,
  getEffectiveNightRate,
  savePricingSettings,
  saveRateOverrides,
  saveRateSeason,
  type PropertyPricingSettings,
  type PropertyRateOverride,
  type PropertyRateSeason,
  type RateAvailability,
  type SeasonColor,
} from '@/lib/propertyPricing'
import type { Reservation } from '@/lib/types'
import { useReservationDetail } from '@/lib/reservationDetailContext'

interface PropertyPricingPanelProps {
  propertyId: string
  reservations: Reservation[]
}

const seasonColors: SeasonColor[] = ['blue', 'green', 'amber', 'rose', 'violet', 'slate']

const seasonColorClasses: Record<SeasonColor, string> = {
  slate: 'bg-muted text-muted-foreground',
  blue: 'bg-info-soft text-info',
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning-foreground',
  rose: 'bg-destructive/10 text-destructive',
  violet: 'bg-primary/10 text-primary',
}

const availabilityLabels: Record<RateAvailability, string> = {
  available: 'Disponible',
  blocked: 'Bloqué',
  closed_to_arrival: 'Arrivée interdite',
  closed_to_departure: 'Départ interdit',
}

function defaultSettings(propertyId: string): PropertyPricingSettings {
  return {
    property_id: propertyId,
    currency: 'EUR',
    base_rate: 0,
    weekend_rate: null,
    cleaning_fee: 0,
    security_deposit: 0,
    tourist_tax_per_person: 0,
    extra_guest_fee: 0,
    extra_guest_after: 1,
    minimum_stay: 1,
    maximum_stay: null,
    check_in_time: '16:00',
    check_out_time: '10:00',
  }
}

function monthDays(cursor: Date) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ day: number; iso: string } | null> = Array(mondayOffset).fill(null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function PropertyPricingPanel({
  propertyId,
  reservations,
}: PropertyPricingPanelProps) {
  const { profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [settings, setSettings] = useState<PropertyPricingSettings>(() => defaultSettings(propertyId))
  const [seasons, setSeasons] = useState<PropertyRateSeason[]>([])
  const [overrides, setOverrides] = useState<PropertyRateOverride[]>([])
  const [editingSettings, setEditingSettings] = useState(false)
  const [seasonModalOpen, setSeasonModalOpen] = useState(false)
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null)
  const [calendarCursor, setCalendarCursor] = useState(() => new Date())
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [overrideRate, setOverrideRate] = useState('')
  const [overrideMinimumStay, setOverrideMinimumStay] = useState('')
  const [overrideAvailability, setOverrideAvailability] = useState<RateAvailability>('available')
  const [overrideNote, setOverrideNote] = useState('')
  const [selectedOverrideId, setSelectedOverrideId] = useState<string | null>(null)
  const [bookingReservationId, setBookingReservationId] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const [seasonForm, setSeasonForm] = useState({
    name: '',
    startDate: `${currentYear}-06-01`,
    endDate: `${currentYear}-08-31`,
    nightlyRate: '',
    weekendRate: '',
    minimumStay: '1',
    weeklyDiscount: '0',
    monthlyDiscount: '0',
    priority: '0',
    color: 'blue' as SeasonColor,
    active: true,
  })

  useEffect(() => {
    let active = true

    fetchPropertyPricing(propertyId).then(result => {
      if (!active) return
      if (result.settings) setSettings(result.settings)
      setSeasons(result.seasons)
      setOverrides(result.overrides)
      setError(result.error?.message ?? '')
      setLoading(false)
    })

    return () => { active = false }
  }, [propertyId])

  const calendarCells = useMemo(() => monthDays(calendarCursor), [calendarCursor])
  const nextThirtyDays = useMemo(() => {
    const start = new Date().toISOString().slice(0, 10)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 29)
    return getDateRange(start, endDate.toISOString().slice(0, 10)).map(date =>
      getEffectiveNightRate({ date, settings, seasons, overrides, reservations })
    )
  }, [settings, seasons, overrides, reservations])
  const availableNextThirtyDays = nextThirtyDays.filter(day =>
    day.availability === 'available'
  )
  const averageRate = availableNextThirtyDays.length > 0
    ? availableNextThirtyDays.reduce((sum, day) => sum + day.rate, 0)
      / availableNextThirtyDays.length
    : 0

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const handleSettingsSave = async () => {
    setSaving(true)
    setError('')
    const result = await savePricingSettings(settings)
    setSaving(false)

    if (result.error || !result.settings) {
      setError(result.error?.message ?? 'Impossible d’enregistrer les paramètres tarifaires.')
      return
    }

    setSettings(result.settings)
    setEditingSettings(false)
    flash('Paramètres tarifaires enregistrés.')
  }

  const openNewSeason = () => {
    const nextColor = seasonColors[seasons.length % seasonColors.length]
    setEditingSeasonId(null)
    setSeasonForm({
      name: '',
      startDate: `${currentYear}-06-01`,
      endDate: `${currentYear}-08-31`,
      nightlyRate: '',
      weekendRate: '',
      minimumStay: String(settings.minimum_stay),
      weeklyDiscount: '0',
      monthlyDiscount: '0',
      priority: '0',
      color: nextColor,
      active: true,
    })
    setSeasonModalOpen(true)
  }

  const openSeason = (season: PropertyRateSeason) => {
    setEditingSeasonId(season.id)
    setSeasonForm({
      name: season.name,
      startDate: season.start_date,
      endDate: season.end_date,
      nightlyRate: String(season.nightly_rate),
      weekendRate: season.weekend_rate === null ? '' : String(season.weekend_rate),
      minimumStay: String(season.minimum_stay),
      weeklyDiscount: String(season.weekly_discount),
      monthlyDiscount: String(season.monthly_discount),
      priority: String(season.priority),
      color: season.color,
      active: season.active,
    })
    setSeasonModalOpen(true)
  }

  const handleSeasonSave = async () => {
    if (!seasonForm.name.trim() || !seasonForm.startDate || !seasonForm.endDate || !seasonForm.nightlyRate) {
      setError('Nom, dates et tarif par nuit sont obligatoires.')
      return
    }
    if (seasonForm.endDate < seasonForm.startDate) {
      setError('La fin de saison doit être postérieure au début.')
      return
    }

    setSaving(true)
    setError('')
    const result = await saveRateSeason({
      id: editingSeasonId ?? undefined,
      property_id: propertyId,
      name: seasonForm.name.trim(),
      start_date: seasonForm.startDate,
      end_date: seasonForm.endDate,
      nightly_rate: Number(seasonForm.nightlyRate),
      weekend_rate: seasonForm.weekendRate ? Number(seasonForm.weekendRate) : null,
      minimum_stay: Number(seasonForm.minimumStay) || 1,
      weekly_discount: Number(seasonForm.weeklyDiscount) || 0,
      monthly_discount: Number(seasonForm.monthlyDiscount) || 0,
      priority: Number(seasonForm.priority) || 0,
      color: seasonForm.color,
      active: seasonForm.active,
    })
    setSaving(false)

    if (result.error || !result.season) {
      setError(result.error?.message ?? 'Impossible d’enregistrer cette saison.')
      return
    }

    setSeasons(current => {
      const withoutSaved = current.filter(item => item.id !== result.season!.id)
      return [...withoutSaved, result.season!].sort((a, b) => a.start_date.localeCompare(b.start_date))
    })
    setSeasonModalOpen(false)
    flash(editingSeasonId ? 'Saison mise à jour.' : 'Saison ajoutée.')
  }

  const handleSeasonDelete = async (season: PropertyRateSeason) => {
    if (!window.confirm(`Supprimer la saison « ${season.name} » ?`)) return
    const { error: deleteError } = await deleteRateSeason(season.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setSeasons(current => current.filter(item => item.id !== season.id))
    flash('Saison supprimée.')
  }

  const openDayEditor = (date: string) => {
    const override = overrides.find(item => item.date === date)
    const effective = getEffectiveNightRate({ date, settings, seasons, overrides, reservations })
    setRangeStart(date)
    setRangeEnd(date)
    setOverrideRate(String(override?.nightly_rate ?? effective.rate))
    setOverrideMinimumStay(String(override?.minimum_stay ?? effective.minimumStay))
    setOverrideAvailability(override?.availability ?? 'available')
    setOverrideNote(override?.note ?? '')
    setSelectedOverrideId(override?.id ?? null)
    setBookingReservationId(effective.reservation?.id ?? null)
    setOverrideModalOpen(true)
  }

  const openBulkEditor = () => {
    const today = new Date().toISOString().slice(0, 10)
    setRangeStart(today)
    setRangeEnd(today)
    setOverrideRate('')
    setOverrideMinimumStay('')
    setOverrideAvailability('available')
    setOverrideNote('')
    setSelectedOverrideId(null)
    setBookingReservationId(null)
    setOverrideModalOpen(true)
  }

  const handleOverrideSave = async () => {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) {
      setError('Sélectionnez une période valide.')
      return
    }

    setSaving(true)
    setError('')
    const result = await saveRateOverrides({
      propertyId,
      startDate: rangeStart,
      endDate: rangeEnd,
      nightlyRate: overrideRate ? Number(overrideRate) : null,
      minimumStay: overrideMinimumStay ? Number(overrideMinimumStay) : null,
      availability: overrideAvailability,
      note: overrideNote.trim() || null,
    })
    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    const savedDates = new Set(result.overrides.map(item => item.date))
    setOverrides(current => [
      ...current.filter(item => !savedDates.has(item.date)),
      ...result.overrides,
    ].sort((a, b) => a.date.localeCompare(b.date)))
    setOverrideModalOpen(false)
    flash(`${result.overrides.length} jour${result.overrides.length > 1 ? 's' : ''} mis à jour.`)
  }

  const handleOverrideDelete = async () => {
    if (!selectedOverrideId) return
    const { error: deleteError } = await deleteRateOverride(selectedOverrideId)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setOverrides(current => current.filter(item => item.id !== selectedOverrideId))
    setOverrideModalOpen(false)
    flash('Exception supprimée : le tarif de saison s’applique de nouveau.')
  }

  if (loading) {
    return <Card className="p-8 text-sm text-muted-foreground">Chargement de la tarification…</Card>
  }

  return (
    <div className="space-y-6">
      {(error || notice) && (
        <p
          role={error ? 'alert' : 'status'}
          className={error
            ? 'rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'
            : 'rounded-md border border-success/30 bg-success-soft p-3 text-sm text-success'}
        >
          {error || notice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Tarif de base</p>
          <p className="mt-2 text-2xl font-mono font-semibold">{formatPrice(settings.base_rate, settings.currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">par nuit</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Moyenne 30 jours</p>
          <p className="mt-2 text-2xl font-mono font-semibold">{formatPrice(averageRate, settings.currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{availableNextThirtyDays.length} nuits disponibles</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Séjour minimum</p>
          <p className="mt-2 text-2xl font-mono font-semibold">{settings.minimum_stay}</p>
          <p className="mt-1 text-xs text-muted-foreground">nuit{settings.minimum_stay > 1 ? 's' : ''}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Frais de ménage</p>
          <p className="mt-2 text-2xl font-mono font-semibold">{formatPrice(settings.cleaning_fee, settings.currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">par séjour</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Paramètres généraux</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Prix standard, frais, taxes, durée du séjour et horaires.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setEditingSettings(value => !value)}>
            <Settings2 className="mr-2 h-4 w-4" />
            {editingSettings ? 'Fermer' : 'Configurer'}
          </Button>
        </div>

        {editingSettings && (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Devise"
                value={settings.currency}
                onChange={event => setSettings({ ...settings, currency: event.target.value as PropertyPricingSettings['currency'] })}
                options={['EUR', 'USD', 'GBP', 'CHF'].map(currency => ({ value: currency, label: currency }))}
              />
              <Input label="Tarif de base" type="number" min="0" value={settings.base_rate} onChange={event => setSettings({ ...settings, base_rate: Number(event.target.value) })} />
              <Input label="Tarif week-end" type="number" min="0" value={settings.weekend_rate ?? ''} onChange={event => setSettings({ ...settings, weekend_rate: event.target.value ? Number(event.target.value) : null })} />
              <Input label="Frais de ménage" type="number" min="0" value={settings.cleaning_fee} onChange={event => setSettings({ ...settings, cleaning_fee: Number(event.target.value) })} />
              <Input label="Dépôt de garantie" type="number" min="0" value={settings.security_deposit} onChange={event => setSettings({ ...settings, security_deposit: Number(event.target.value) })} />
              <Input label="Taxe / personne / nuit" type="number" min="0" step="0.01" value={settings.tourist_tax_per_person} onChange={event => setSettings({ ...settings, tourist_tax_per_person: Number(event.target.value) })} />
              <Input label="Supplément voyageur" type="number" min="0" value={settings.extra_guest_fee} onChange={event => setSettings({ ...settings, extra_guest_fee: Number(event.target.value) })} />
              <Input label="Après combien de voyageurs" type="number" min="1" value={settings.extra_guest_after} onChange={event => setSettings({ ...settings, extra_guest_after: Number(event.target.value) })} />
              <Input label="Séjour minimum" type="number" min="1" value={settings.minimum_stay} onChange={event => setSettings({ ...settings, minimum_stay: Number(event.target.value) })} />
              <Input label="Séjour maximum" type="number" min={settings.minimum_stay} value={settings.maximum_stay ?? ''} onChange={event => setSettings({ ...settings, maximum_stay: event.target.value ? Number(event.target.value) : null })} />
              <Input label="Heure d’arrivée" type="time" value={settings.check_in_time} onChange={event => setSettings({ ...settings, check_in_time: event.target.value })} />
              <Input label="Heure de départ" type="time" value={settings.check_out_time} onChange={event => setSettings({ ...settings, check_out_time: event.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSettingsSave} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Grille tarifaire par saison</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Définissez vos périodes, tarifs week-end et remises longue durée.
            </p>
          </div>
          <Button onClick={openNewSeason}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une saison
          </Button>
        </div>

        {seasons.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium">Aucune saison configurée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Le tarif de base s’applique pour le moment à toutes les dates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-border text-left text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Saison</th>
                  <th className="px-4 py-3">Période</th>
                  <th className="px-4 py-3 text-right">Semaine</th>
                  <th className="px-4 py-3 text-right">Week-end</th>
                  <th className="px-4 py-3 text-center">Min.</th>
                  <th className="px-4 py-3 text-center">7+ nuits</th>
                  <th className="px-4 py-3 text-center">30+ nuits</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map(season => (
                  <tr key={season.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${seasonColorClasses[season.color].split(' ')[0]}`} />
                        <span className="text-sm font-medium">{season.name}</span>
                        {!season.active && <Badge variant="muted">inactive</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateForDisplay(season.start_date, profile?.date_format)}
                      {' → '}
                      {formatDateForDisplay(season.end_date, profile?.date_format)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatPrice(season.nightly_rate, settings.currency)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatPrice(season.weekend_rate ?? season.nightly_rate, settings.currency)}</td>
                    <td className="px-4 py-3 text-center text-sm">{season.minimum_stay} n.</td>
                    <td className="px-4 py-3 text-center text-sm">{season.weekly_discount}%</td>
                    <td className="px-4 py-3 text-center text-sm">{season.monthly_discount}%</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openSeason(season)} aria-label={`Modifier ${season.name}`} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleSeasonDelete(season)} aria-label={`Supprimer ${season.name}`} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold">Calendrier des prix et disponibilités</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cliquez sur une date ou modifiez une période complète.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={openBulkEditor}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Modifier une période
            </Button>
            <button type="button" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))} aria-label="Mois précédent" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-border hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-36 text-center text-sm font-semibold capitalize">
              {calendarCursor.toLocaleDateString(localeForDateFormat(profile?.date_format), {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <button type="button" onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))} aria-label="Mois suivant" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-border hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="border-r border-border px-2 py-3 text-center text-xs font-mono uppercase tracking-wider text-muted-foreground last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="min-h-24 border-b border-r border-border bg-muted/10" />
            }

            const effective = getEffectiveNightRate({
              date: cell.iso,
              settings,
              seasons,
              overrides,
              reservations,
            })
            const unavailable = effective.availability === 'booked' || effective.availability === 'blocked'

            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => openDayEditor(cell.iso)}
                className={`min-h-24 cursor-pointer border-b border-r border-border p-2 text-left transition-colors hover:bg-muted/50 ${
                  unavailable ? 'bg-muted/40' : 'bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-mono text-muted-foreground">{cell.day}</span>
                  {effective.source === 'override' && <span className="h-1.5 w-1.5 rounded-full bg-info" title="Prix personnalisé" />}
                </div>
                <p className={`mt-2 text-sm font-mono font-semibold ${unavailable ? 'text-muted-foreground line-through' : ''}`}>
                  {formatPrice(effective.rate, settings.currency)}
                </p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  {effective.availability === 'booked'
                    ? effective.reservation?.guest_name ?? 'Réservé'
                    : effective.availability === 'blocked'
                      ? 'Bloqué'
                      : effective.season?.name ?? `${effective.minimumStay} nuit${effective.minimumStay > 1 ? 's' : ''} min.`}
                </p>
              </button>
            )
          })}
        </div>
      </Card>

      <Modal
        open={seasonModalOpen}
        onClose={() => setSeasonModalOpen(false)}
        title={editingSeasonId ? 'Modifier la saison' : 'Nouvelle saison tarifaire'}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nom de la saison" value={seasonForm.name} onChange={event => setSeasonForm({ ...seasonForm, name: event.target.value })} placeholder="Haute saison" />
            <Select label="Couleur" value={seasonForm.color} onChange={event => setSeasonForm({ ...seasonForm, color: event.target.value as SeasonColor })} options={seasonColors.map(color => ({ value: color, label: color.charAt(0).toUpperCase() + color.slice(1) }))} />
            <DateInput label="Du" value={seasonForm.startDate} onChange={value => setSeasonForm({ ...seasonForm, startDate: value })} required />
            <DateInput label="Au" min={seasonForm.startDate} value={seasonForm.endDate} onChange={value => setSeasonForm({ ...seasonForm, endDate: value })} required />
            <Input label="Prix par nuit" type="number" min="0" value={seasonForm.nightlyRate} onChange={event => setSeasonForm({ ...seasonForm, nightlyRate: event.target.value })} />
            <Input label="Prix week-end" type="number" min="0" value={seasonForm.weekendRate} onChange={event => setSeasonForm({ ...seasonForm, weekendRate: event.target.value })} placeholder="Même prix si vide" />
            <Input label="Séjour minimum" type="number" min="1" value={seasonForm.minimumStay} onChange={event => setSeasonForm({ ...seasonForm, minimumStay: event.target.value })} />
            <Input label="Priorité" type="number" value={seasonForm.priority} onChange={event => setSeasonForm({ ...seasonForm, priority: event.target.value })} />
            <Input label="Remise 7+ nuits (%)" type="number" min="0" max="100" value={seasonForm.weeklyDiscount} onChange={event => setSeasonForm({ ...seasonForm, weeklyDiscount: event.target.value })} />
            <Input label="Remise 30+ nuits (%)" type="number" min="0" max="100" value={seasonForm.monthlyDiscount} onChange={event => setSeasonForm({ ...seasonForm, monthlyDiscount: event.target.value })} />
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={seasonForm.active} onChange={event => setSeasonForm({ ...seasonForm, active: event.target.checked })} className="h-4 w-4" />
            Saison active
          </label>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setSeasonModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSeasonSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la saison'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Modifier les prix et disponibilités"
        className="max-w-2xl"
      >
        <div className="space-y-5">
          {bookingReservationId && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-sm text-muted-foreground">Cette date est couverte par une réservation.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => openReservation(bookingReservationId)}
              >
                <CalendarDays className="mr-1.5 h-4 w-4" />
                Ouvrir la réservation
              </Button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <DateInput label="Du" value={rangeStart} onChange={setRangeStart} required />
            <DateInput label="Au" min={rangeStart} value={rangeEnd} onChange={setRangeEnd} required />
            <Input label="Prix par nuit" type="number" min="0" value={overrideRate} onChange={event => setOverrideRate(event.target.value)} placeholder="Laisser vide pour le tarif de saison" />
            <Input label="Séjour minimum" type="number" min="1" value={overrideMinimumStay} onChange={event => setOverrideMinimumStay(event.target.value)} placeholder="Règle de saison" />
            <Select label="Disponibilité" value={overrideAvailability} onChange={event => setOverrideAvailability(event.target.value as RateAvailability)} options={Object.entries(availabilityLabels).map(([value, label]) => ({ value, label }))} />
            <Input label="Note interne" value={overrideNote} onChange={event => setOverrideNote(event.target.value)} placeholder="Pont, événement local…" />
          </div>
          <p className="text-xs text-muted-foreground">
            Les modifications seront appliquées à chaque journée de la période sélectionnée.
          </p>
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
            <div>
              {selectedOverrideId && rangeStart === rangeEnd && (
                <Button variant="secondary" onClick={handleOverrideDelete}>Revenir au tarif automatique</Button>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOverrideModalOpen(false)}>Annuler</Button>
              <Button onClick={handleOverrideSave} disabled={saving}>{saving ? 'Application…' : 'Appliquer'}</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
