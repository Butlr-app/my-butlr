import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useNotifications, getNextInvoiceNumber } from '@/lib/useSupabase'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Loader2, Plus, Trash2, Save } from 'lucide-react'
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

export function InvoiceGenerator() {
  const { toast } = useToast()
  const { insertNotification } = useNotifications()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [loadingNumber, setLoadingNumber] = useState(true)

  useEffect(() => {
    getNextInvoiceNumber().then(num => {
      setInvoiceNumber(num)
      setLoadingNumber(false)
    })
  }, [])

  const [form, setForm] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    clientName: '',
    clientAddress: '',
    clientCity: '',
    clientEmail: '',
    notes: '',
    isRecurring: false,
    recurringInterval: '' as '' | 'monthly' | 'quarterly' | 'yearly',
  })

  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine }])

  const update = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }))

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

  const saveToDatabase = async () => {
    if (!form.clientName) {
      toast('Please fill in client name', 'error')
      return
    }
    if (lines.every(l => !l.description)) {
      toast('Add at least one line item', 'error')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('invoices').insert({
        user_id: user?.id ?? null,
        invoice_number: invoiceNumber,
        client_name: form.clientName,
        client_address: form.clientAddress || null,
        client_city: form.clientCity || null,
        client_email: form.clientEmail || null,
        items: lines.filter(l => l.description).map(l => ({
          description: l.description,
          unitPrice: Number(l.unitPrice),
          quantity: Number(l.quantity),
          vatRate: Number(l.vatRate),
        })),
        total_ht: subtotalHT,
        total_ttc: totalTTC,
        vat_rate: 20,
        status: 'draft',
        is_recurring: form.isRecurring,
        recurring_interval: form.isRecurring && form.recurringInterval ? form.recurringInterval : null,
        due_date: form.dueDate || null,
        notes: form.notes || null,
      })
      if (error) throw new Error(error.message)

      await insertNotification({
        user_id: user?.id ?? null,
        type: 'payment',
        title: `Invoice ${invoiceNumber} created`,
        message: `New invoice for ${form.clientName} — ${fmt(totalTTC)} EUR`,
        data: { invoice_number: invoiceNumber },
        related_id: null,
      })

      toast('Invoice saved to database')
      navigate('/app/invoices')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

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
      doc.text(invoiceNumber, W - margin, y, { align: 'right' })
      y += 12

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

      doc.text(`Date : ${form.invoiceDate}`, margin, y)
      if (form.dueDate) doc.text(`Echeance : ${form.dueDate}`, W - margin - 60, y)
      y += 10

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

      const fileName = `facture-${invoiceNumber}.pdf`
      doc.save(fileName)
      toast('Invoice PDF generated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setGenerating(false)
  }

  if (loadingNumber) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">Invoice Generator</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={generatePDF} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Generate PDF
          </Button>
          <Button size="sm" onClick={saveToDatabase} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save & Create
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5" />
            <h3 className="text-base font-semibold">Invoice Details</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Invoice number"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
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
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={e => update('isRecurring', e.target.checked)}
                  className="rounded border-border"
                />
                Recurring invoice
              </label>
            </div>
            {form.isRecurring && (
              <Select
                label="Recurring interval"
                value={form.recurringInterval}
                onChange={e => update('recurringInterval', e.target.value)}
                options={[
                  { value: '', label: 'Select interval' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
