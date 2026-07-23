export type GuestErrorKind =
  | 'unavailable'
  | 'portalDisabled'
  | 'stayFinished'
  | 'reserveRequired'
  | 'validation'
  | 'network';

export function classifyGuestError(code?: string | null): GuestErrorKind {
  if (['not_found', 'invalid_portal', 'invalid_token'].includes(code ?? '')) {
    return 'unavailable';
  }
  if (['portal_disabled', 'checkin_disabled'].includes(code ?? '')) {
    return 'portalDisabled';
  }
  if (['stay_finished', 'already_completed'].includes(code ?? '')) {
    return 'stayFinished';
  }
  if (['no_reserve', 'reserve_closed', 'insufficient_balance'].includes(code ?? '')) {
    return 'reserveRequired';
  }
  if (
    [
      'invalid_guest_name',
      'invalid_email',
      'invalid_document_type',
      'invalid_document_number',
      'invalid_guest_count',
      'invalid_arrival_time',
      'rules_not_accepted',
      'invalid_signature',
      'field_too_long',
    ].includes(code ?? '')
  ) {
    return 'validation';
  }
  return 'network';
}
