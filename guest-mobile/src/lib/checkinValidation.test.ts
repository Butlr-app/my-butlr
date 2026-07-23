import { validateCheckin } from './checkinValidation';
import type { GuestCheckinInput } from '@/types/guest';

const validInput: GuestCheckinInput = {
  guestName: 'Camille Martin',
  guestEmail: 'camille@example.com',
  guestPhone: '+33 6 00 00 00 00',
  idDocType: 'passport',
  idDocNumber: '12AB34567',
  numGuests: 2,
  estimatedArrival: '15:30',
  signatureData: 'data:image/png;base64,abc',
  rulesAccepted: true,
};

describe('validateCheckin', () => {
  it('accepts a complete check-in', () => {
    expect(validateCheckin(validInput)).toEqual({});
  });

  it('returns field-level errors for required consent and identity data', () => {
    expect(
      validateCheckin({
        ...validInput,
        guestName: '',
        idDocNumber: '',
        estimatedArrival: '',
        signatureData: '',
        rulesAccepted: false,
      }),
    ).toEqual({
      guestName: 'required',
      idDocNumber: 'required',
      estimatedArrival: 'required',
      signatureData: 'required',
      rulesAccepted: 'required',
    });
  });

  it('rejects an invalid arrival time and guest count', () => {
    expect(
      validateCheckin({
        ...validInput,
        estimatedArrival: '25:90',
        numGuests: 0,
      }),
    ).toMatchObject({
      estimatedArrival: 'invalid',
      numGuests: 'invalid',
    });
  });
});
