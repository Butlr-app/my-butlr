import { useReservationDetail } from '@/lib/reservationDetailContext'
import type { Reservation } from '@/lib/types'

interface ReservationOpenButtonProps {
  reservation: Reservation | string
  className?: string
  children: React.ReactNode
  onUpdated?: (reservation: Reservation) => void
}

export function ReservationOpenButton({
  reservation,
  className = '',
  children,
  onUpdated,
}: ReservationOpenButtonProps) {
  const { openReservation } = useReservationDetail()

  return (
    <button
      type="button"
      className={className}
      onClick={event => {
        event.stopPropagation()
        openReservation(reservation, { onUpdated })
      }}
    >
      {children}
    </button>
  )
}
