import type { GuestLanguage } from '@/types/guest';

export type StayPhase = 'before' | 'during' | 'departure' | 'after';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStayPhase(
  arrival: string,
  departure: string,
  today = localDateKey(),
): StayPhase {
  if (today < arrival) return 'before';
  if (today > departure) return 'after';
  if (today === departure) return 'departure';
  return 'during';
}

export function formatStayDate(date: string, language: GuestLanguage): string {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function phaseLabel(phase: StayPhase, language: GuestLanguage): string {
  const labels: Record<GuestLanguage, Record<StayPhase, string>> = {
    fr: {
      before: 'Votre arrivée approche',
      during: 'Séjour en cours',
      departure: 'Jour du départ',
      after: 'Séjour terminé',
    },
    en: {
      before: 'Your stay is coming up',
      during: 'Stay in progress',
      departure: 'Departure day',
      after: 'Stay completed',
    },
  };
  return labels[language][phase];
}
