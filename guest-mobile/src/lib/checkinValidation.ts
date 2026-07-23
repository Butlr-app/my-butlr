import type { GuestCheckinInput } from '@/types/guest';

export type CheckinField =
  | 'guestName'
  | 'idDocNumber'
  | 'numGuests'
  | 'estimatedArrival'
  | 'signatureData'
  | 'rulesAccepted';

export type CheckinErrors = Partial<Record<CheckinField, 'required' | 'invalid'>>;

export function validateCheckin(input: GuestCheckinInput): CheckinErrors {
  const errors: CheckinErrors = {};
  if (!input.guestName.trim()) errors.guestName = 'required';
  if (!input.idDocNumber.trim()) errors.idDocNumber = 'required';
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.estimatedArrival)) {
    errors.estimatedArrival = input.estimatedArrival ? 'invalid' : 'required';
  }
  if (input.numGuests < 1 || input.numGuests > 100) errors.numGuests = 'invalid';
  if (!input.signatureData) errors.signatureData = 'required';
  if (!input.rulesAccepted) errors.rulesAccepted = 'required';
  return errors;
}
