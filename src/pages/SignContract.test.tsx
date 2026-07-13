import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SignContract } from './SignContract'

const mocks = vi.hoisted(() => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  load: vi.fn(),
  submit: vi.fn(),
  decline: vi.fn(),
}))

vi.mock('@/lib/signatureApi', () => ({
  requestSignatureOtp: mocks.requestOtp,
  verifySignatureOtp: mocks.verifyOtp,
  loadSigningCeremony: mocks.load,
  submitSignature: mocks.submit,
  declineSignature: mocks.decline,
}))

vi.mock('@/components/signature/SignaturePad', () => ({
  SignaturePad: ({ label, onChange }: { label: string; onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange('data:image/png;base64,c2lnbmF0dXJl')}>
      Ajouter {label}
    </button>
  ),
}))

describe('SignContract', () => {
  beforeEach(() => {
    mocks.requestOtp.mockResolvedValue({ maskedEmail: 'je****@example.com' })
    mocks.verifyOtp.mockResolvedValue({ ceremonyToken: 'ceremony-jwt' })
    mocks.load.mockResolvedValue({
      envelope: {
        id: 'envelope-1',
        title: 'Contrat Villa Azur',
        message: 'Merci de signer.',
        expiresAt: '2040-01-15T23:59:59Z',
        status: 'sent',
      },
      recipient: {
        id: 'recipient-1',
        name: 'Jeanne Martin',
        email: 'je****@example.com',
        role: 'guest',
        status: 'otp_verified',
      },
      fields: [
        {
          id: 'signature-field',
          field_type: 'signature',
          page_number: 1,
          x: 0.1,
          y: 0.7,
          width: 0.3,
          height: 0.08,
          required: true,
          label: null,
        },
        {
          id: 'name-field',
          field_type: 'name',
          page_number: 1,
          x: 0.1,
          y: 0.8,
          width: 0.2,
          height: 0.05,
          required: true,
          label: null,
        },
      ],
      documentUrl: 'https://example.com/contract.pdf',
      completed: false,
    })
    mocks.submit.mockResolvedValue({ completed: true, envelopeCompleted: true })
  })

  it('vérifie l’OTP et enregistre le consentement et la signature', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/sign/raw-token']}>
        <Routes>
          <Route path="/sign/:token" element={<SignContract />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Recevoir mon code' }))
    expect(mocks.requestOtp).toHaveBeenCalledWith('raw-token')
    await user.type(screen.getByLabelText('Code à 6 chiffres'), '123456')
    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    await screen.findByText('Contrat Villa Azur')
    await user.click(screen.getByRole('button', { name: 'Ajouter Signature' }))
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    await user.click(screen.getByRole('button', { name: 'Signer le document' }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({
      token: 'raw-token',
      ceremonyToken: 'ceremony-jwt',
      consent: true,
      values: expect.arrayContaining([
        expect.objectContaining({ fieldId: 'signature-field' }),
        expect.objectContaining({ fieldId: 'name-field', valueText: 'Jeanne Martin' }),
      ]),
    })))
    expect(await screen.findByText('Signature enregistrée')).toBeInTheDocument()
  })
})
