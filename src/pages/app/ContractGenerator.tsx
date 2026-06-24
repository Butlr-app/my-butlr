import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useProperties, useReservations } from '@/lib/useSupabase'
import { FileText, Download, Loader2 } from 'lucide-react'
import { jsPDF } from 'jspdf'

const BAILLEUR = {
  name: 'SAS EBSCOPAL',
  address: '65 rue de la Garriguette, 34130 Saint-Aunes',
  rcs: '901 449 405',
}

const DEFAULT_PROPERTY = {
  name: 'Villa The French Way',
  address: '3 corniche de Bartole, 83310 Grimaud',
  rent: 60000,
  deposit: 30000,
}

export function ContractGenerator() {
  const { toast } = useToast()
  const { data: properties } = useProperties()
  const { data: reservations } = useReservations()
  const [generating, setGenerating] = useState(false)

  const [form, setForm] = useState({
    propertyId: '',
    reservationId: '',
    tenantName: '',
    tenantAddress: '',
    tenantEmail: '',
    tenantPhone: '',
    arrivalDate: '',
    departureDate: '',
    guestsCount: '1',
    rentAmount: DEFAULT_PROPERTY.rent.toString(),
    depositAmount: DEFAULT_PROPERTY.deposit.toString(),
    propertyName: DEFAULT_PROPERTY.name,
    propertyAddress: DEFAULT_PROPERTY.address,
  })

  const handlePropertyChange = (id: string) => {
    const prop = properties.find(p => p.id === id)
    setForm(f => ({
      ...f,
      propertyId: id,
      propertyName: prop?.name ?? DEFAULT_PROPERTY.name,
      propertyAddress: prop?.location ?? DEFAULT_PROPERTY.address,
    }))
  }

  const handleReservationChange = (id: string) => {
    const res = reservations.find(r => r.id === id)
    if (res) {
      setForm(f => ({
        ...f,
        reservationId: id,
        tenantName: res.guest_name,
        tenantEmail: res.guest_email ?? '',
        tenantPhone: res.guest_phone ?? '',
        arrivalDate: res.arrival,
        departureDate: res.departure,
        guestsCount: res.guests_count.toString(),
        rentAmount: res.total_amount.toString(),
      }))
      if (res.property_id) handlePropertyChange(res.property_id)
    }
  }

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const generatePDF = () => {
    if (!form.tenantName || !form.arrivalDate || !form.departureDate) {
      toast('Please fill in tenant name and dates', 'error')
      return
    }

    setGenerating(true)

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210
      const margin = 20
      const cw = W - margin * 2
      let y = 20

      const addLine = (text: string, fontSize = 10, bold = false, align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const x = align === 'center' ? W / 2 : align === 'right' ? W - margin : margin
        const lines = doc.splitTextToSize(text, cw)
        for (const line of lines) {
          if (y > 275) { doc.addPage(); y = 20 }
          doc.text(line, x, y, { align })
          y += fontSize * 0.45
        }
        y += 2
      }

      const addSpace = (h = 4) => { y += h }

      // Header
      addLine('CONTRAT DE LOCATION SAISONNIERE', 16, true, 'center')
      addLine(form.propertyName, 12, false, 'center')
      addSpace(6)

      // Bailleur
      doc.setDrawColor(0)
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 1 - LES PARTIES', 12, true)
      addSpace(2)
      addLine('LE BAILLEUR :', 10, true)
      addLine(`${BAILLEUR.name}`)
      addLine(`Siege social : ${BAILLEUR.address}`)
      addLine(`RCS Montpellier : ${BAILLEUR.rcs}`)
      addSpace(4)

      // Tenant
      addLine('LE LOCATAIRE :', 10, true)
      addLine(`Nom : ${form.tenantName}`)
      if (form.tenantAddress) addLine(`Adresse : ${form.tenantAddress}`)
      if (form.tenantEmail) addLine(`Email : ${form.tenantEmail}`)
      if (form.tenantPhone) addLine(`Telephone : ${form.tenantPhone}`)
      addSpace(6)

      // Article 2 - Stay
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 2 - OBJET ET DUREE DU SEJOUR', 12, true)
      addSpace(2)
      addLine(`Le bailleur met a disposition du locataire le bien situe a :`)
      addLine(`${form.propertyAddress}`, 10, true)
      addSpace(2)
      addLine(`Date d'arrivee : ${form.arrivalDate}`)
      addLine(`Date de depart : ${form.departureDate}`)
      addLine(`Nombre d'occupants : ${form.guestsCount}`)
      addSpace(6)

      // Article 3 - Payment
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 3 - LOYER', 12, true)
      addSpace(2)
      addLine(`Le loyer pour la duree totale du sejour est fixe a ${Number(form.rentAmount).toLocaleString('fr-FR')} EUR TTC.`)
      addLine(`Le paiement s'effectue selon les modalites suivantes :`)
      addLine(`- 30% a la reservation`)
      addLine(`- 70% restant 30 jours avant l'arrivee`)
      addSpace(6)

      // Article 4 - Deposit
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 4 - DEPOT DE GARANTIE', 12, true)
      addSpace(2)
      addLine(`Un depot de garantie de ${Number(form.depositAmount).toLocaleString('fr-FR')} EUR est exige a l'arrivee.`)
      addLine(`Il sera restitue dans un delai de 15 jours apres le depart, deduction faite des eventuels frais de remise en etat.`)
      addSpace(6)

      // Article 5 - Property
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 5 - DESCRIPTION DU BIEN', 12, true)
      addSpace(2)
      addLine(`Propriete : ${form.propertyName}`)
      addLine(`Adresse : ${form.propertyAddress}`)
      addLine(`Le bien est loue meuble et equipe conformement a l'inventaire joint en annexe.`)
      addSpace(6)

      // Article 6 - Services
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 6 - SERVICES INCLUS', 12, true)
      addSpace(2)
      addLine(`Les services suivants sont inclus dans la location :`)
      addLine(`- Menage d'arrivee et de depart`)
      addLine(`- Linge de maison (draps, serviettes)`)
      addLine(`- Acces Wi-Fi haut debit`)
      addLine(`- Entretien des espaces exterieurs`)
      addLine(`Des services complementaires peuvent etre commandes via la plateforme Butlr.`)
      addSpace(6)

      // Article 7 - Rules
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 7 - REGLEMENT INTERIEUR', 12, true)
      addSpace(2)
      addLine(`Le locataire s'engage a :`)
      addLine(`- Respecter le voisinage (pas de nuisances sonores apres 22h)`)
      addLine(`- Ne pas fumer a l'interieur du bien`)
      addLine(`- Signaler tout dommage dans les 24 heures`)
      addLine(`- Laisser le bien dans un etat de proprete raisonnable`)
      addSpace(6)

      // Article 8 - Security
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 8 - ASSURANCE ET RESPONSABILITE', 12, true)
      addSpace(2)
      addLine(`Le locataire est tenu de souscrire une assurance villegiature couvrant sa responsabilite civile.`)
      addLine(`Le bailleur decline toute responsabilite en cas de vol ou de dommages aux biens personnels du locataire.`)
      addSpace(6)

      // Article 9 - Cancellation
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 9 - CONDITIONS D\'ANNULATION', 12, true)
      addSpace(2)
      addLine(`- Plus de 60 jours avant l'arrivee : remboursement integral`)
      addLine(`- Entre 30 et 60 jours : remboursement de 50%`)
      addLine(`- Moins de 30 jours : aucun remboursement`)
      addSpace(6)

      // Article 10 - Check-in/out
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 10 - ARRIVEE ET DEPART', 12, true)
      addSpace(2)
      addLine(`Check-in : a partir de 16h00`)
      addLine(`Check-out : avant 10h00`)
      addLine(`Un etat des lieux contradictoire sera realise a l'arrivee et au depart.`)
      addSpace(6)

      // Article 11 - Subletting
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 11 - SOUS-LOCATION', 12, true)
      addSpace(2)
      addLine(`Toute sous-location, meme partielle, est strictement interdite.`)
      addSpace(6)

      // Article 12 - Force majeure
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 12 - FORCE MAJEURE', 12, true)
      addSpace(2)
      addLine(`En cas de force majeure rendant impossible l'execution du contrat, les parties seront liberees de leurs obligations respectives. Un remboursement integral sera effectue au locataire.`)
      addSpace(6)

      // Article 13 - Confidentiality
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 13 - CONFIDENTIALITE', 12, true)
      addSpace(2)
      addLine(`Les parties s'engagent a respecter la confidentialite des informations echangees dans le cadre de ce contrat.`)
      addSpace(6)

      // Article 14 - Photo rights
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 14 - DROIT A L\'IMAGE', 12, true)
      addSpace(2)
      addLine(`Le locataire autorise le bailleur a utiliser des photographies du bien a des fins promotionnelles, sans que le locataire ne soit identifiable.`)
      addSpace(6)

      // Article 15 - Law
      doc.line(margin, y, W - margin, y)
      y += 4
      addLine('ARTICLE 15 - LOI APPLICABLE', 12, true)
      addSpace(2)
      addLine(`Le present contrat est regi par le droit francais. Tout litige sera soumis aux juridictions competentes du ressort du lieu de situation de l'immeuble.`)
      addSpace(10)

      // Signatures
      doc.line(margin, y, W - margin, y)
      y += 6
      addLine('SIGNATURES', 12, true, 'center')
      addSpace(4)

      const sigY = y
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Le Bailleur', margin, sigY)
      doc.text('Le Locataire', W - margin, sigY, { align: 'right' })
      y = sigY + 6
      doc.text(BAILLEUR.name, margin, y)
      doc.text(form.tenantName, W - margin, y, { align: 'right' })
      y += 10
      doc.text('"Lu et approuve"', margin, y)
      doc.text('"Lu et approuve"', W - margin, y, { align: 'right' })
      y += 6
      doc.text('Signature :', margin, y)
      doc.text('Signature :', W - margin - 40, y)

      // Footer on each page
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(`${BAILLEUR.name} - ${BAILLEUR.address} - RCS ${BAILLEUR.rcs}`, W / 2, 290, { align: 'center' })
        doc.text(`Page ${i}/${totalPages}`, W - margin, 290, { align: 'right' })
        doc.setTextColor(0, 0, 0)
      }

      const fileName = `contrat-${form.propertyName.replace(/\s+/g, '-').toLowerCase()}-${form.tenantName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      doc.save(fileName)
      toast('Contract PDF generated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Contract Generator</p>
        <Button size="sm" onClick={generatePDF} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
          Generate PDF
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5" />
            <h3 className="text-base font-semibold">Contract Details</h3>
          </div>

          <div className="space-y-4">
            <Select
              label="Link to reservation"
              value={form.reservationId}
              onChange={e => handleReservationChange(e.target.value)}
              options={[
                { value: '', label: 'Select a reservation (optional)' },
                ...reservations.map(r => ({ value: r.id, label: `${r.guest_name} - ${r.property?.name ?? 'N/A'}` })),
              ]}
            />

            <Select
              label="Property"
              value={form.propertyId}
              onChange={e => handlePropertyChange(e.target.value)}
              options={[
                { value: '', label: 'Select a property' },
                ...properties.map(p => ({ value: p.id, label: p.name })),
              ]}
            />

            <Input
              label="Property name"
              value={form.propertyName}
              onChange={e => update('propertyName', e.target.value)}
            />
            <Input
              label="Property address"
              value={form.propertyAddress}
              onChange={e => update('propertyAddress', e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-6">Tenant Information</h3>
          <div className="space-y-4">
            <Input
              label="Full name"
              value={form.tenantName}
              onChange={e => update('tenantName', e.target.value)}
              required
            />
            <Input
              label="Address"
              value={form.tenantAddress}
              onChange={e => update('tenantAddress', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={form.tenantEmail}
                onChange={e => update('tenantEmail', e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                value={form.tenantPhone}
                onChange={e => update('tenantPhone', e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-6">Stay Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Arrival date"
                type="date"
                value={form.arrivalDate}
                onChange={e => update('arrivalDate', e.target.value)}
                required
              />
              <Input
                label="Departure date"
                type="date"
                value={form.departureDate}
                onChange={e => update('departureDate', e.target.value)}
                required
              />
            </div>
            <Input
              label="Number of guests"
              type="number"
              min="1"
              value={form.guestsCount}
              onChange={e => update('guestsCount', e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-6">Financial Terms</h3>
          <div className="space-y-4">
            <Input
              label="Total rent (EUR)"
              type="number"
              min="0"
              value={form.rentAmount}
              onChange={e => update('rentAmount', e.target.value)}
            />
            <Input
              label="Security deposit (EUR)"
              type="number"
              min="0"
              value={form.depositAmount}
              onChange={e => update('depositAmount', e.target.value)}
            />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-3">Preview</h3>
        <div className="bg-muted/50 border border-border rounded-md p-6 text-xs font-mono space-y-2 max-h-64 overflow-y-auto">
          <p className="text-center font-bold text-sm">CONTRAT DE LOCATION SAISONNIERE</p>
          <p className="text-center">{form.propertyName}</p>
          <hr className="border-border my-3" />
          <p><strong>Bailleur :</strong> {BAILLEUR.name}, {BAILLEUR.address}</p>
          <p><strong>Locataire :</strong> {form.tenantName || '...'}</p>
          <p><strong>Bien :</strong> {form.propertyAddress}</p>
          <p><strong>Sejour :</strong> {form.arrivalDate || '...'} au {form.departureDate || '...'} ({form.guestsCount} occupant(s))</p>
          <p><strong>Loyer :</strong> {Number(form.rentAmount).toLocaleString('fr-FR')} EUR</p>
          <p><strong>Depot de garantie :</strong> {Number(form.depositAmount).toLocaleString('fr-FR')} EUR</p>
          <p className="text-muted-foreground mt-2">15 articles couvrant le sejour, les conditions financieres, le reglement, la securite, les annulations, la confidentialite et les signatures.</p>
        </div>
      </Card>
    </div>
  )
}
