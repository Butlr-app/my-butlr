import { classifyGuestError } from './guestErrors';

describe('classifyGuestError', () => {
  it.each([
    ['not_found', 'unavailable'],
    ['portal_disabled', 'portalDisabled'],
    ['stay_finished', 'stayFinished'],
    ['no_reserve', 'reserveRequired'],
    ['invalid_signature', 'validation'],
    ['unexpected', 'network'],
  ] as const)('maps %s to %s', (code, expected) => {
    expect(classifyGuestError(code)).toBe(expected);
  });
});
