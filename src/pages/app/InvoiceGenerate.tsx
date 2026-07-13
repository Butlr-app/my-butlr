import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LineItem {
  description: string
  unitPrice: number
  quantity: number
  vatPercent: number
}

export function InvoiceGenerate() {
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientRef, setClientRef] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { description: '', unitPrice: 0, quantity: 1, vatPercent: 20 }
  ])
  const [generating, setGenerating] = useState(false)

  const addItem = () => {
    setItems([...items, { description: '', unitPrice: 0, quantity: 1, vatPercent: 20 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const subtotalHT = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const totalVAT = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity * item.vatPercent) / 100, 0)
  const totalTTC = subtotalHT + totalVAT

  const generatePDF = () => {
    setGenerating(true)
    const doc = new jsPDF()
    const invoiceNumber = `FC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
    const issueDate = new Date().toLocaleDateString('fr-FR')
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')

    // Header
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', 14, 25)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Numéro: ${invoiceNumber}`, 14, 35)
    doc.text(`Émise le: ${issueDate}`, 14, 41)
    doc.text(`Échéance: ${dueDate}`, 14, 47)

    // From
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('ÉMETTEUR', 120, 25)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('SAS EBSCOPAL', 120, 32)
    doc.text('65 rue de la Garriguette', 120, 37)
    doc.text('34130 Saint-Aunès, France', 120, 42)
    doc.text('SIRET: 901 449 405 00025', 120, 47)
    doc.text('TVA: FR61901449405', 120, 52)
    doc.text('Email: contact@frenchw.com', 120, 57)
    doc.text('Tél: +33 7 81 62 23 97', 120, 62)

    // To
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENT', 14, 65)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(clientName || '[Nom du client]', 14, 72)
    doc.text(clientAddress || '[Adresse]', 14, 77)
    if (clientRef) doc.text(`Réf: ${clientRef}`, 14, 82)

    // Table
    const tableData = items.map((item) => [
      item.description || '-',
      `${item.unitPrice.toFixed(2)} €`,
      `${item.vatPercent}%`,
      item.quantity.toString(),
      `${(item.unitPrice * item.quantity).toFixed(2)} €`
    ])

    autoTable(doc, {
      startY: 90,
      head: [['Description', 'Prix unitaire', '% TVA', 'Quantité', 'Total HT']],
      body: tableData,
      theme: 'plain',
      headStyles: { fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      }
    })

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text(`Sous-total HT: ${subtotalHT.toFixed(2)} €`, 130, finalY)
    doc.text(`TVA (20%): ${totalVAT.toFixed(2)} €`, 130, finalY + 7)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL TTC: ${totalTTC.toFixed(2)} €`, 130, finalY + 15)

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('La présente facture est payable comptant à réception.', 14, 270)
    doc.text('En cas de retard de paiement, des pénalités de retard pourront être appliquées.', 14, 275)

    doc.save(`${invoiceNumber}.pdf`)
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Billing</p>
        <h2 className="text-xl font-bold mt-1">Generate Invoice</h2>
        <p className="text-sm text-muted-foreground mt-1">Create complementary invoices for services, repairs, and purchases.</p>
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">Client Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Abigail Duffine" />
          <Input label="Client reference" value={clientRef} onChange={(e) => setClientRef(e.target.value)} placeholder="Optional reference" />
          <div className="md:col-span-2">
            <Input label="Client address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Full address" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Line Items</h3>
          <Button size="sm" variant="secondary" onClick={addItem}>+ Add item</Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end border border-border rounded-lg p-3">
              <div className="col-span-4">
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <input
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Service description"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Unit Price (€)</label>
                <input
                  type="number"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={item.unitPrice || ''}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                <input
                  type="number"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">VAT %</label>
                <input
                  type="number"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={item.vatPercent || ''}
                  onChange={(e) => updateItem(index, 'vatPercent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-sm font-mono">€{(item.unitPrice * item.quantity).toFixed(2)}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(index)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal HT</span>
              <span className="font-mono">€{subtotalHT.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (20%)</span>
              <span className="font-mono">€{totalVAT.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span>Total TTC</span>
              <span className="font-mono">€{totalTTC.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => {
          setClientName('')
          setClientAddress('')
          setClientRef('')
          setItems([{ description: '', unitPrice: 0, quantity: 1, vatPercent: 20 }])
        }}>Reset</Button>
        <Button onClick={generatePDF} disabled={generating || !clientName || items.every(i => !i.description)}>
          {generating ? 'Generating...' : 'Generate PDF'}
        </Button>
      </div>
    </div>
  )
}
