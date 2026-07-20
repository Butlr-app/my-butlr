import { jsPDF } from 'jspdf'

export interface SignatureCertificateInput {
  guestName: string
  propertyName: string
  contractType: string
  contractDate: string
  signerName: string
  signerRole: string
  signedAt: string
  documentHash: string | null
  signatureHash: string
  signatureDataUrl: string
  bailleurCompany?: string
}

/** Create a one-page proof-of-signature PDF to attach after e-sign. */
export function generateSignatureCertificate(input: SignatureCertificateInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 20
  let y = 28

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('PREUVE DE SIGNATURE ELECTRONIQUE', W / 2, y, { align: 'center' })
  doc.setTextColor(0)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Certificat de signature', W / 2, y, { align: 'center' })
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const lines = [
    `Contrat : ${input.contractType.replace(/_/g, ' ')}`,
    `Locataire / invite : ${input.guestName}`,
    `Bien : ${input.propertyName || '—'}`,
    `Date du contrat : ${input.contractDate}`,
    `Signe par : ${input.signerName} (${input.signerRole})`,
    `Signe le : ${input.signedAt}`,
    input.bailleurCompany ? `Bailleur : ${input.bailleurCompany}` : null,
    `Empreinte signature (SHA-256) : ${input.signatureHash}`,
    input.documentHash ? `Empreinte document (SHA-256) : ${input.documentHash}` : 'Empreinte document : non disponible',
  ].filter(Boolean) as string[]

  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, W - margin * 2)
    for (const w of wrapped) {
      doc.text(w, margin, y)
      y += 6
    }
  }

  y += 6
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('Image de signature', margin, y)
  doc.setTextColor(0)
  y += 4

  try {
    doc.addImage(input.signatureDataUrl, 'PNG', margin, y, 80, 32)
    y += 40
  } catch {
    doc.text('[Signature image unavailable]', margin, y)
    y += 10
  }

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    'Ce certificat atteste de la capture electronique de la signature. Conservez-le avec le contrat original.',
    margin,
    y,
    { maxWidth: W - margin * 2 },
  )

  return doc
}
