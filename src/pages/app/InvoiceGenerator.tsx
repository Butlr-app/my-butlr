import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { FileText, Download, Loader2, Plus, Trash2 } from 'lucide-react'
import { jsPDF } from 'jspdf'

const COMPANY = {
  name: 'SAS EBSCOPAL',
  address: '65 rue de la Garriguette',
  city: '34130 Saint-Aunes',
  siret: '901 449 405 00012',
  tva: 'FR 12 901 449 405',
  email: 'contact@frenchw.com',
}

interface LineItem {
  description: string
  unitPrice: string
  quantity: string
  vatRate: string
}

const emptyLine: LineItem = { description: '', unitPrice: '0', quantity: '1', vatRate: '20' }

function generateInvoiceNumber(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `FC-${yyyy}-${seq}`
}

export function InvoiceGenerator() {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)

  const [invoiceNumber] = useState(generateInvoiceNumber)

  const [form, setForm] = useState({
    invoiceNumber,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    clientName: '',
    clientAddress: '',
    clientCity: '',
    clientEmail: '',
    notes: '',
  })

  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }])

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const updateLine = (idx: number, key: keyof LineItem, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l))
  }

  const addLine = () => setLines(prev => [...prev, { ...emptyLine }])
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))

  const lineTotal = (l: LineItem) => Number(l.unitPrice) * Number(l.quantity)
  const subtotalHT = lines.reduce((s, l) => s + lineTotal(l), 0)
  const totalVAT = lines.reduce((s, l) => s + lineTotal(l) * (Number(l.vatRate) / 100), 0)
  const totalTTC = subtotalHT + totalVAT

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const generatePDF = () => {
    if (!form.clientName) {
      toast('Please fill in client name', 'error')
      return
    }
    if (lines.every(l => !l.description)) {
      toast('Add at least one line item', 'error')
      return
    }

    setGenerating(true)

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210
      const margin = 20
      let y = 20

      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('FACTURE', margin, y)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(form.invoiceNumber, W - margin, y, { align: 'right' })
      y += 12

      // From
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(COMPANY.name, margin, y)
      doc.setFont('helvetica', 'normal')
      y += 5
      doc.text(COMPANY.address, margin, y)
      y += 4
      doc.text(COMPANY.city, margin, y)
      y += 4
      doc.text(COMPANY.email, margin, y)

      // To
      let toY = y - 13
      doc.setFont('helvetica', 'bold')
      doc.text('FACTURER A :', W - margin - 60, toY)
      doc.setFont('helvetica', 'normal')
      toY += 5
      doc.text(form.clientName, W - margin - 60, toY)
      toY += 4
      if (form.clientAddress) doc.text(form.clientAddress, W - margin - 60, toY)
      toY += 4
      if (form.clientCity) doc.text(form.clientCity, W - margin - 60, toY)
      toY += 4
      if (form.clientEmail) doc.text(form.clientEmail, W - margin - 60, toY)
      y += 14

      // Dates
      doc.text(`Date : ${form.invoiceDate}`, margin, y)
      if (form.dueDate) doc.text(`Echeance : ${form.dueDate}`, W - margin - 60, y)
      y += 10

      // Table header
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y - 4, W - margin * 2, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Description', margin + 2, y)
      doc.text('P.U. HT', margin + 92, y, { align: 'right' })
      doc.text('Qte', margin + 110, y, { align: 'right' })
      doc.text('TVA%', margin + 130, y, { align: 'right' })
      doc.text('Total HT', W - margin - 2, y, { align: 'right' })
      y += 8

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      for (const l of lines) {
        if (!l.description) continue
        if (y > 260) { doc.addPage(); y = 20 }
        doc.text(l.description, margin + 2, y)
        doc.text(`${fmt(Number(l.unitPrice))} EUR`, margin + 92, y, { align: 'right' })
        doc.text(l.quantity, margin + 110, y, { align: 'right' })
        doc.text(`${l.vatRate}%`, margin + 130, y, { align: 'right' })
        doc.text(`${fmt(lineTotal(l))} EUR`, W - margin - 2, y, { align: 'right' })
        y += 6
      }
      y += 4
      doc.line(margin, y, W - margin, y)
      y += 8

      // Totals
      doc.setFontSize(10)
      const totX = W - margin - 2
      doc.text('Total HT :', totX - 50, y)
      doc.text(`${fmt(subtotalHT)} EUR`, totX, y, { align: 'right' })
      y += 6
      doc.text('TVA (20%) :', totX - 50, y)
      doc.text(`${fmt(totalVAT)} EUR`, totX, y, { align: 'right' })
      y += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Total TTC :', totX - 50, y)
      doc.text(`${fmt(totalTTC)} EUR`, totX, y, { align: 'right' })
      y += 14

      // Notes
      if (form.notes) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Notes :', margin, y)
        y += 5
        const noteLines = doc.splitTextToSize(form.notes, W - margin * 2)
        for (const nl of noteLines) {
          doc.text(nl, margin, y)
          y += 4
        }
      }

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(`${COMPANY.name} - SIRET ${COMPANY.siret} - TVA ${COMPANY.tva}`, W / 2, 286, { align: 'center' })
        doc.text(`${COMPANY.email} | Conditions de paiement : paiement a reception sauf accord prealable`, W / 2, 290, { align: 'center' })
        doc.text(`Page ${i}/${totalPages}`, W - margin, 286, { align: 'right' })
        doc.setTextColor(0, 0, 0)
      }

      const fileName = `facture-${form.invoiceNumber}.pdf`
      doc.save(fileName)
      toast('Invoice PDF generated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Invoice Generator</p>
        <Button size="sm" onClick={generatePDF} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
          Generate PDF
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5" />
            <h3 className="text-base font-semibold">Invoice Details</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Invoice number"
                value={form.invoiceNumber}
                onChange={e => update('invoiceNumber', e.target.value)}
              />
              <Input
                label="Invoice date"
                type="date"
                value={form.invoiceDate}
                onChange={e => update('invoiceDate', e.target.value)}
              />
            </div>
            <Input
              label="Due date"
              type="date"
              value={form.dueDate}
              onChange={e => update('dueDate', e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold mb-6">Client Information</h3>
          <div className="space-y-4">
            <Input
              label="Client name"
              value={form.clientName}
              onChange={e => update('clientName', e.target.value)}
              required
            />
            <Input
              label="Address"
              value={form.clientAddress}
              onChange={e => update('clientAddress', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City / Zip"
                value={form.clientCity}
                onChange={e => update('clientCity', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={form.clientEmail}
                onChange={e => update('clientEmail', e.target.value)}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Line Items</h3>
          <Button size="sm" variant="secondary" onClick={addLine}>
            <Plus className="w-4 h-4 mr-1" /> Add line
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_100px_70px_70px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Description</span>
            <span>Unit price</span>
            <span>Qty</span>
            <span>VAT %</span>
            <span />
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_70px_70px_32px] gap-2 items-end">
              <Input
                value={line.description}
                onChange={e => updateLine(idx, 'description', e.target.value)}
                placeholder="Service description"
              />
              <Input
                type="number"
                min="0"
                value={line.unitPrice}
                onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
              />
              <Input
                type="number"
                min="1"
                value={line.quantity}
                onChange={e => updateLine(idx, 'quantity', e.target.value)}
              />
              <Input
                type="number"
                min="0"
                value={line.vatRate}
                onChange={e => updateLine(idx, 'vatRate', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeLine(idx)}
                className="h-10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                disabled={lines.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-4 space-y-2 text-sm text-right">
          <p>Total HT : <strong>{fmt(subtotalHT)} EUR</strong></p>
          <p>TVA (20%) : <strong>{fmt(totalVAT)} EUR</strong></p>
          <p className="text-base font-semibold">Total TTC : {fmt(totalTTC)} EUR</p>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-3">Notes</h3>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 resize-none"
          placeholder="Payment terms, additional information..."
        />
      </Card>
    </div>
  )
}
