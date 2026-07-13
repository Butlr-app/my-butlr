import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { ReservationDetailModal } from '@/components/reservation/ReservationDetailModal'
import { useAuth } from '@/lib/authContext'
import { fetchReservationById } from '@/lib/data'
import type { Reservation } from '@/lib/types'

interface OpenReservationOptions {
  onUpdated?: (reservation: Reservation) => void
}

interface ReservationDetailContextValue {
  openReservation: (target: Reservation | string, options?: OpenReservationOptions) => void
  closeReservation: () => void
}

const ReservationDetailContext = createContext<ReservationDetailContextValue | null>(null)

export function ReservationDetailProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const onUpdatedRef = useRef<OpenReservationOptions['onUpdated']>(undefined)

  const openReservation = useCallback(async (
    target: Reservation | string,
    options?: OpenReservationOptions,
  ) => {
    onUpdatedRef.current = options?.onUpdated
    setOpen(true)

    if (typeof target === 'string') {
      setLoading(true)
      setReservation(null)
      const { data, error } = await fetchReservationById(target)
      setLoading(false)
      if (error || !data) {
        setReservation(null)
        return
      }
      setReservation(data as Reservation)
      return
    }

    setReservation(target)
    setLoading(false)
  }, [])

  const closeReservation = useCallback(() => {
    setOpen(false)
    setReservation(null)
    setLoading(false)
    onUpdatedRef.current = undefined
  }, [])

  const handleUpdated = useCallback((updated: Reservation) => {
    setReservation(updated)
    onUpdatedRef.current?.(updated)
  }, [])

  return (
    <ReservationDetailContext.Provider value={{ openReservation, closeReservation }}>
      {children}
      <ReservationDetailModal
        open={open}
        loading={loading}
        reservation={reservation}
        dateFormat={profile?.date_format}
        onClose={closeReservation}
        onUpdated={handleUpdated}
      />
    </ReservationDetailContext.Provider>
  )
}

export function useReservationDetail() {
  const context = useContext(ReservationDetailContext)
  if (!context) {
    throw new Error('useReservationDetail must be used within ReservationDetailProvider')
  }
  return context
}
