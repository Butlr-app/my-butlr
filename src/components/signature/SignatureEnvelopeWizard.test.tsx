import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignatureEnvelopeWizard } from './SignatureEnvelopeWizard'
import type { Contract } from '@/lib/types'

const mocks = vi.hoisted(() => ({
  createEnvelope: vi.fn(),
}))

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', email: 'owner@example.com' },
    profile: {
      id: 'owner-1',
      full_name: 'Marc Propriétaire',
      email: 'owner@example.com',
      date_format: 'DD/MM/YYYY',
    },
  }),
}))

vi.mock('@/lib/contractFiles', () => ({
  createContractFileSignedUrl: vi.fn().mockResolvedValue('https://example.com/source.pdf'),
}))

vi.mock('@/lib/signatureApi', () => ({
  createSignatureEnvelope: mocks.createEnvelope,
}))

vi.mock('./PdfFieldEditor', () => ({
  PdfFieldEditor: () => <div>Éditeur PDF prêt</div>,
}))

vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ label, onChange }: { label: string; onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange('data:image/png;base64,c2lnbmF0dXJl')}>
      Ajouter {label}
    </button>
  ),
}))

const contract: Contract = {
  id: 'contract-1',
  reservation_id: 'reservation-1',
  guest_name: 'Jeanne Martin',
  property_name: 'Villa Azur',
  type: 'rental',
  status: 'draft',
  date: '2040-01-01',
  reservations: {
    guest_name: 'Jeanne Martin',
    guest_email: 'guest@example.com',
    property_id: 'property-1',
  },
  contract_files: [{
    id: 'file-1',
    reservation_id: 'reservation-1',
    file_name: 'contrat.pdf',
    mime_type: 'application/pdf',
    storage_path: 'owner/reservation/contrat.pdf',
    source: 'generated',
    extraction_status: 'completed',
    extracted_data: {},
    extraction_error: null,
    created_at: '2040-01-01T00:00:00Z',
  }],
}

describe('SignatureEnvelopeWizard', () => {
  it('permet au propriétaire de signer sans envoyer d’e-mail', async () => {
    mocks.createEnvelope.mockResolvedValue({ envelopeId: 'envelope-1' })
    const user = userEvent.setup()
    render(
      <SignatureEnvelopeWizard
        open
        contract={contract}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(screen.getByText('Parties signataires')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(screen.getByText('Éditeur PDF prêt')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    await user.click(screen.getByRole('button', { name: 'Ajouter Signature du propriétaire' }))
    await user.click(screen.getByRole('button', { name: 'Ajouter Paraphe du propriétaire' }))
    await user.click(screen.getByText(/Je confirme avoir lu le document/))
    await user.click(screen.getByRole('button', { name: 'Signer sans envoyer' }))

    await waitFor(() => expect(mocks.createEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        sendNow: false,
        localSignature: expect.objectContaining({
          consent: true,
          signatureData: expect.stringContaining('data:image/png'),
          initialsData: expect.stringContaining('data:image/png'),
        }),
      }),
    ))
  })
})
