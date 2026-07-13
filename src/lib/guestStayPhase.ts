export type StayPhase = 'before' | 'arrival' | 'during' | 'departure' | 'after'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getStayPhase(arrival: string, departure: string, today = todayIso()): StayPhase {
  if (today < arrival) return 'before'
  if (today === arrival) return 'arrival'
  if (today === departure) return 'departure'
  if (today > departure) return 'after'
  return 'during'
}

export function daysUntil(isoDate: string, today = todayIso()): number {
  const start = new Date(`${today}T12:00:00`)
  const end = new Date(`${isoDate}T12:00:00`)
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

export interface StayPhaseContext {
  phase: StayPhase
  daysUntilArrival: number
  daysUntilDeparture: number
  headline: string
  subtitle: string
  primaryAction?: {
    label: string
    target: 'villa' | 'concierge' | 'requests' | 'reserve' | 'messages'
  }
}

export function buildStayPhaseContext(
  arrival: string,
  departure: string,
  options?: { showConcierge?: boolean; showVilla?: boolean; pendingCount?: number },
): StayPhaseContext {
  const phase = getStayPhase(arrival, departure)
  const untilArrival = daysUntil(arrival)
  const untilDeparture = daysUntil(departure)

  if (options?.pendingCount && options.pendingCount > 0) {
    return {
      phase,
      daysUntilArrival: untilArrival,
      daysUntilDeparture: untilDeparture,
      headline: `${options.pendingCount} devis à valider`,
      subtitle: 'Votre équipe attend votre confirmation pour avancer.',
      primaryAction: { label: 'Voir le suivi', target: 'requests' },
    }
  }

  switch (phase) {
    case 'before':
      return {
        phase,
        daysUntilArrival: untilArrival,
        daysUntilDeparture: untilDeparture,
        headline: untilArrival === 1 ? 'Arrivée demain' : `Arrivée dans ${untilArrival} jours`,
        subtitle: 'Préparez votre séjour : accès villa, Wi-Fi et services.',
        primaryAction: options?.showVilla
          ? { label: 'Infos villa', target: 'villa' }
          : undefined,
      }
    case 'arrival':
      return {
        phase,
        daysUntilArrival: 0,
        daysUntilDeparture: untilDeparture,
        headline: 'Bienvenue — jour d’arrivée',
        subtitle: 'Consultez les consignes d’accès et contactez votre équipe si besoin.',
        primaryAction: options?.showVilla
          ? { label: 'Accès & Wi-Fi', target: 'villa' }
          : undefined,
      }
    case 'during':
      return {
        phase,
        daysUntilArrival: untilArrival,
        daysUntilDeparture: untilDeparture,
        headline: 'Profitez de votre séjour',
        subtitle: untilDeparture <= 2
          ? `Départ dans ${untilDeparture} jour${untilDeparture > 1 ? 's' : ''} — pensez au check-out.`
          : 'Conciergerie, boutique et messages disponibles à tout moment.',
        primaryAction: options?.showConcierge
          ? { label: 'Demander un service', target: 'concierge' }
          : undefined,
      }
    case 'departure':
      return {
        phase,
        daysUntilArrival: untilArrival,
        daysUntilDeparture: 0,
        headline: 'Jour de départ',
        subtitle: 'Consignes de check-out et dernières demandes avant votre départ.',
        primaryAction: options?.showVilla
          ? { label: 'Consignes départ', target: 'villa' }
          : undefined,
      }
    case 'after':
      return {
        phase,
        daysUntilArrival: untilArrival,
        daysUntilDeparture: untilDeparture,
        headline: 'Merci pour votre séjour',
        subtitle: 'Consultez l’historique de vos demandes et commandes.',
        primaryAction: { label: 'Voir le suivi', target: 'requests' },
      }
  }
}
