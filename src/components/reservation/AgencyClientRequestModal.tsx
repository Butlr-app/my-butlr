import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { Select } from '@/components/ui/Select'
import { DateInput } from '@/components/ui/DateInput'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/authContext'
import type { Property, Reservation } from '@/lib/types'
import {
  buildAgencyClientRequestPayload,
  validateAgencyClientRequest,
} from '@/lib/reservationWorkflow'

interface AgencyClientRequestModalProps {
  open: boolean
  onClose: () => void
  properties: Property[]
  onCreated: (reservation: Reservation) => void
  defaultArrival?: string
  defaultDeparture?: string
  defaultPropertyId?: string
}

export function AgencyClientRequestModal({
  open,
  onClose,
  properties,
  onCreated,
  defaultArrival = '',
  defaultDeparture = '',
  defaultPropertyId = '',
}: AgencyClientRequestModalProps) {
  const { user } = useAuth()
  const [propertyId, setPropertyId] = useState('')
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestsCount, setGuestsCount] = useState(2)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPropertyId(defaultPropertyId || properties[0]?.id || '')
    setArrival(defaultArrival)
    setDeparture(defaultDeparture)
    setGuestName('')
    setGuestEmail('')
    setGuestPhone('')
    setGuestsCount(2)
    setNotes('')
    setError('')
  }, [open, properties, defaultArrival, defaultDeparture, defaultPropertyId])

  const selectedProperty = properties.find(property => property.id === propertyId)

  const close = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) {
      setError('Session invalide — reconnectez-vous.')
      return
    }

    const input = {
      propertyId,
      arrival,
      departure,
      guestName,
      guestEmail,
      guestPhone,
      guestsCount,
      notes,
      guestLanguage: 'fr',
      propertyMaxGuests: selectedProperty?.max_guests ?? null,
      requestedBy: user.id,
    }

    const validationError = validateAgencyClientRequest(input)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert(buildAgencyClientRequestPayload(input))
      .select('*, properties(name, max_guests)')
      .single()

    setSaving(false)

    if (insertError || !data) {
      const message = insertError?.message ?? 'Impossible d’envoyer la demande.'
      if (message.toLowerCase().includes('overlap')) {
        setError('Ces dates chevauchent déjà une réservation ou une autre demande.')
        return
      }
      setError(message)
      return
    }

    onCreated(data as Reservation)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Demande pour un client"
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          La demande est envoyée au propriétaire pour validation. Elle apparaît en attente
          sur le calendrier tant qu’elle n’est pas confirmée ou annulée.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Propriété"
            value={propertyId}
            onChange={event => setPropertyId(event.target.value)}
            options={properties.map(property => ({
              value: property.id,
              label: property.name,
            }))}
            required
          />
          <DateInput
            label="Arrivée"
            value={arrival}
            onChange={setArrival}
            required
          />
          <DateInput
            label="Départ"
            min={arrival || undefined}
            value={departure}
            onChange={setDeparture}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nom du client"
            value={guestName}
            onChange={event => setGuestName(event.target.value)}
            required
          />
          <NumberStepper
            label="Voyageurs"
            value={guestsCount}
            onChange={setGuestsCount}
            min={1}
            max={selectedProperty?.max_guests ?? 50}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email client"
            type="email"
            value={guestEmail}
            onChange={event => setGuestEmail(event.target.value)}
          />
          <Input
            label="Téléphone client"
            value={guestPhone}
            onChange={event => setGuestPhone(event.target.value)}
          />
        </div>

        <Input
          label="Message au propriétaire (optionnel)"
          value={notes}
          onChange={event => setNotes(event.target.value)}
        />

        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving || properties.length === 0}>
            {saving ? 'Envoi…' : 'Envoyer la demande'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
