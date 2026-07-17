import { useEffect, useMemo, useState } from 'react'
import { FileDown, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerReservations } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  billableItemsToLineItems,
  buildInvoiceClientAddress,
  buildInvoiceClientRef,
  buildInvoicePrefillFromReservation,
  computeInvoiceTotals,
  DEFAULT_INVOICE_VAT_PERCENT,
  mergeStayLineItems,
  type InvoiceLineItem,
  type StayBillableItem,
} from '@/lib/invoices'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Reservation } from '@/lib/types'

const emptyLineItem = (): InvoiceLineItem => ({
  description: '',
  unitPrice: 0,
  quantity: 1,
  vatPercent: DEFAULT_INVOICE_VAT_PERCENT,
  sourceType: 'manual',
})

export function InvoiceGenerate() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const reservationFromUrl = searchParams.get('reservation')

  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientRef, setClientRef] = useState('')
  const [items, setItems] = useState<InvoiceLineItem[]>([emptyLineItem()])
  const [generating, setGenerating] = useState(false)

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedReservationId, setSelectedReservationId] = useState(reservationFromUrl ?? '')
  const [billableItems, setBillableItems] = useState<StayBillableItem[]>([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [loadingPrefill, setLoadingPrefill] = useState(Boolean(reservationFromUrl))
  const [prefillNotice, setPrefillNotice] = useState('')

  useEffect(() => {
    if (!user) return
    setLoadingReservations(true)
    fetchOwnerReservations(user.id).then(({ data }) => {
      const guestReservations = ((data as Reservation[]) ?? []).filter(
        reservation => reservation.booking_kind === 'guest' && reservation.status !== 'cancelled',
      )
      setReservations(guestReservations)
      setLoadingReservations(false)
    })
  }, [user?.id])

  useEffect(() => {
    if (!selectedReservationId) {
      setBillableItems([])
      setPrefillNotice('')
      return
    }

    let active = true
    setLoadingPrefill(true)
    setPrefillNotice('')

    buildInvoicePrefillFromReservation(selectedReservationId).then(({ reservation, billableItems: fetchedItems, lineItems, error }) => {
      if (!active) return

      if (error) {
        setPrefillNotice(error.message)
        setLoadingPrefill(false)
        return
      }

      if (reservation) {
        setClientName(reservation.guest_name ?? '')
        setClientAddress(buildInvoiceClientAddress(reservation))
        setClientRef(buildInvoiceClientRef(reservation))
      }

      setBillableItems(fetchedItems)
      setItems(current => mergeStayLineItems(current, lineItems))

      if (fetchedItems.length === 0) {
        setPrefillNotice('Aucun service facturable trouvé pour ce séjour.')
      } else {
        setPrefillNotice(`${fetchedItems.length} service${fetchedItems.length > 1 ? 's' : ''} importé${fetchedItems.length > 1 ? 's' : ''} depuis le séjour.`)
      }

      setLoadingPrefill(false)
    })

    return () => { active = false }
  }, [selectedReservationId])

  const reservationOptions = useMemo(
    () => reservations.map(reservation => ({
      value: reservation.id,
      label: `${reservation.guest_name} · ${reservation.properties?.name ?? 'Villa'} (${formatDateForDisplay(reservation.arrival, profile?.date_format)} → ${formatDateForDisplay(reservation.departure, profile?.date_format)})`,
    })),
    [reservations, profile?.date_format],
  )

  const totals = useMemo(() => computeInvoiceTotals(items), [items])

  const addItem = () => {
    setItems(current => [...current, emptyLineItem()])
  }

  const removeItem = (index: number) => {
    setItems(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setItems(current => {
      const updated = [...current]
      updated[index] = {
        ...updated[index],
        [field]: value,
        sourceType: updated[index].sourceType === 'manual' || field !== 'description'
          ? updated[index].sourceType
          : 'manual',
      }
      return updated
    })
  }

  const toggleBillableItem = (itemId: string) => {
    setBillableItems(current => current.map(item => (
      item.id === itemId ? { ...item, included: !item.included } : item
    )))
  }

  const applyBillableSelection = () => {
    const stayLines = billableItemsToLineItems(billableItems)
    setItems(current => mergeStayLineItems(current, stayLines))
    setPrefillNotice(`${stayLines.length} ligne${stayLines.length > 1 ? 's' : ''} ajoutée${stayLines.length > 1 ? 's' : ''} à la facture.`)
  }

  const generatePDF = () => {
    setGenerating(true)
    const doc = new jsPDF()
    const invoiceNumber = `FC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
    const issueDate = new Date().toLocaleDateString('fr-FR')
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', 14, 25)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Numéro: ${invoiceNumber}`, 14, 35)
    doc.text(`Émise le: ${issueDate}`, 14, 41)
    doc.text(`Échéance: ${dueDate}`, 14, 47)

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

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENT', 14, 65)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(clientName || '[Nom du client]', 14, 72)

    const addressLines = (clientAddress || '[Adresse]').split('\n')
    addressLines.forEach((line, index) => {
      doc.text(line, 14, 77 + index * 5)
    })

    const refY = 77 + addressLines.length * 5
    if (clientRef) doc.text(`Réf: ${clientRef}`, 14, refY)

    const tableData = items.map(item => [
      item.description || '-',
      `${item.unitPrice.toFixed(2)} €`,
      `${item.vatPercent}%`,
      item.quantity.toString(),
      `${(item.unitPrice * item.quantity).toFixed(2)} €`,
    ])

    autoTable(doc, {
      startY: refY + (clientRef ? 8 : 4),
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
        4: { cellWidth: 30, halign: 'right' },
      },
    })

    const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120
    doc.setFontSize(10)
    doc.text(`Sous-total HT: ${totals.subtotalHT.toFixed(2)} €`, 130, finalY + 10)
    doc.text(`TVA: ${totals.totalVAT.toFixed(2)} €`, 130, finalY + 17)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL TTC: ${totals.totalTTC.toFixed(2)} €`, 130, finalY + 25)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('La présente facture est payable comptant à réception.', 14, 270)
    doc.text('En cas de retard de paiement, des pénalités de retard pourront être appliquées.', 14, 275)

    doc.save(`${invoiceNumber}.pdf`)
    setGenerating(false)
  }

  const resetForm = () => {
    setClientName('')
    setClientAddress('')
    setClientRef('')
    setSelectedReservationId('')
    setBillableItems([])
    setPrefillNotice('')
    setItems([emptyLineItem()])
  }

  const hasValidLines = items.some(item => item.description.trim() && item.unitPrice > 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          Finance
        </p>
        <h2 className="mt-1 text-xl font-bold">Générer une facture</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pré-remplissez avec les services conciergerie et boutique demandés pendant le séjour.
        </p>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold">Séjour source</h3>
        {loadingReservations ? (
          <LoadingState label="Chargement des séjours…" />
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Select
              label="Réservation client"
              value={selectedReservationId}
              onChange={event => setSelectedReservationId(event.target.value)}
              options={[
                { value: '', label: 'Sélectionner un séjour…' },
                ...reservationOptions,
              ]}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedReservationId || loadingPrefill}
              onClick={applyBillableSelection}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Actualiser les lignes
            </Button>
          </div>
        )}

        {loadingPrefill && (
          <p className="mt-3 text-sm text-muted-foreground">Import des services du séjour…</p>
        )}

        {prefillNotice && !loadingPrefill && (
          <p className="mt-3 text-sm text-muted-foreground">{prefillNotice}</p>
        )}

        {billableItems.length > 0 && (
          <div className="mt-5 space-y-2 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Services demandés pendant le séjour</p>
              <span className="text-xs font-mono text-muted-foreground">
                {billableItems.filter(item => item.included).length}/{billableItems.length} sélectionné{billableItems.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-border rounded-md border border-border bg-card">
              {billableItems.map(item => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={() => toggleBillableItem(item.id)}
                    className="mt-1 rounded border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant={item.sourceType === 'concierge' ? 'info' : 'warning'}>
                        {item.sourceType === 'concierge' ? 'Conciergerie' : 'Boutique'}
                      </Badge>
                      <Badge variant="muted">{item.statusLabel}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity > 1
                        ? `${item.quantity} × ${item.unitPrice.toFixed(2)} €`
                        : `${item.amount.toFixed(2)} €`}
                      {' · '}
                      TVA {item.vatPercent}%
                      {item.category ? ` · ${item.category}` : ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-base font-semibold">Informations client</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nom du client"
            value={clientName}
            onChange={event => setClientName(event.target.value)}
            placeholder="Abigail Duffine"
          />
          <Input
            label="Référence"
            value={clientRef}
            onChange={event => setClientRef(event.target.value)}
            placeholder="Villa — dates de séjour"
          />
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Adresse / coordonnées</label>
            <textarea
              rows={3}
              value={clientAddress}
              onChange={event => setClientAddress(event.target.value)}
              placeholder="Adresse postale, e-mail, téléphone…"
              className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Lignes de facture</h3>
          <Button size="sm" variant="secondary" onClick={addItem}>
            + Ajouter une ligne
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.sourceId ?? 'manual'}-${index}`} className="grid grid-cols-12 items-end gap-3 rounded-lg border border-border p-3">
              <div className="col-span-4">
                <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                <input
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  value={item.description}
                  onChange={event => updateItem(index, 'description', event.target.value)}
                  placeholder="Description du service"
                />
                {item.sourceType && item.sourceType !== 'manual' && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Source : {item.sourceType === 'concierge' ? 'Conciergerie' : 'Boutique'}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Prix unitaire (€)</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  value={item.unitPrice || ''}
                  onChange={event => updateItem(index, 'unitPrice', parseFloat(event.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Quantité</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  value={item.quantity || ''}
                  onChange={event => updateItem(index, 'quantity', parseInt(event.target.value, 10) || 1)}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">TVA %</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  value={item.vatPercent || ''}
                  onChange={event => updateItem(index, 'vatPercent', parseFloat(event.target.value) || 0)}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="font-mono text-sm">€{(item.unitPrice * item.quantity).toFixed(2)}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-mono">€{totals.subtotalHT.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-mono">€{totals.totalVAT.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total TTC</span>
              <span className="font-mono">€{totals.totalTTC.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={resetForm}>
          Réinitialiser
        </Button>
        <Button onClick={generatePDF} disabled={generating || !clientName || !hasValidLines}>
          <FileDown className="mr-1.5 h-4 w-4" />
          {generating ? 'Génération…' : 'Générer le PDF'}
        </Button>
      </div>
    </div>
  )
}
