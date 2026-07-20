import { jsPDF } from 'jspdf'
import { resolveArticleKind, type ContractTemplate } from '@/data/defaultContractTemplate'

// ─── Form types ────────────────────────────────────────────────────────────

export interface TenantForm {
  name: string
  address: string
  phone: string
  email: string
  birthDate: string
  birthPlace: string
  nationality: string
  idType: string
  idNumber: string
  idIssued: string
  idExpiry: string
}

export interface IntermediaryForm {
  enabled: boolean
  name: string
  description: string
}

export interface StayForm {
  propertyId: string
  propertyName: string
  propertyAddress: string
  arrivalDate: string
  departureDate: string
  arrivalTime: string
  departureTime: string
  guestsCount: string
  maxGuests: string
  rentAmount: string
  depositAmount: string
  taxesIncluded: boolean
  reservationId: string
}

// ─── PDF Generator ─────────────────────────────────────────────────────────

export function generateContractPDF(
  template: ContractTemplate,
  tenant: TenantForm,
  intermediary: IntermediaryForm,
  stay: StayForm,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const margin = 20
  const cw = W - margin * 2
  let y = 0

  const headerText = `Contrat de location saisonniere — ${stay.propertyName}`
  const footerHeight = 16

  const checkPage = (needed = 6) => {
    if (y > H - margin - footerHeight - needed) {
      doc.addPage()
      y = margin
    }
  }

  const addLine = (text: string, fontSize = 9, bold = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, cw)
    for (const line of lines) {
      checkPage(fontSize * 0.42)
      const x = align === 'center' ? W / 2 : align === 'right' ? W - margin : margin
      doc.text(line, x, y, { align })
      y += fontSize * 0.42
    }
    y += 1.5
  }

  const addSpace = (h = 3) => { y += h }

  const addSeparator = () => {
    checkPage(4)
    doc.setDrawColor(200)
    doc.setLineWidth(0.3)
    doc.line(margin, y, W - margin, y)
    y += 4
  }

  // Replace template variables
  const replaceVars = (text: string): string => {
    return text
      .replace(/\{bailleur_company\}/g, template.bailleur.company)
      .replace(/\{bailleur_representative\}/g, template.bailleur.representative)
      .replace(/\{tenant_name\}/g, tenant.name)
      .replace(/\{property_name\}/g, stay.propertyName)
      .replace(/\{property_address\}/g, stay.propertyAddress)
      .replace(/\{rent\}/g, Number(stay.rentAmount).toLocaleString('fr-FR'))
      .replace(/\{deposit\}/g, Number(stay.depositAmount).toLocaleString('fr-FR'))
      .replace(/\{max_guests\}/g, stay.maxGuests || stay.guestsCount)
      .replace(/\{surface\}/g, String(template.propertyDefaults.surface))
      .replace(/\{bedrooms\}/g, String(template.propertyDefaults.bedrooms))
      .replace(/\{checkin_time\}/g, stay.arrivalTime || template.propertyDefaults.checkinTime)
      .replace(/\{checkout_time\}/g, stay.departureTime || template.propertyDefaults.checkoutTime)
  }

  // Calculate nights
  const calcNights = () => {
    if (!stay.arrivalDate || !stay.departureDate) return 0
    const a = new Date(stay.arrivalDate)
    const d = new Date(stay.departureDate)
    return Math.max(0, Math.round((d.getTime() - a.getTime()) / 86400000))
  }

  // ─── PAGE 1: Cover ───────────────────────────────────────────────────

  y = 40
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('C O N T R A T   D E   L O C A T I O N   S A I S O N N I E R E', W / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(9)
  doc.text('T H E   F R E N C H   W A Y', W / 2, y, { align: 'center' })
  doc.setTextColor(0)

  y += 14
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(stay.propertyName, W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Location saisonniere de prestige · ${stay.propertyAddress.split(',').pop()?.trim() || ''}`, W / 2, y, { align: 'center' })
  doc.setTextColor(0)

  y += 20
  addSeparator()

  // Bailleur block
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('L E   B A I L L E U R', margin, y)
  doc.setTextColor(0)
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(template.bailleur.company, margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.text(`Representee par ${template.bailleur.representative}`, margin, y)
  y += 4
  doc.text(`RCS Montpellier ${template.bailleur.rcs}`, margin, y)
  y += 4
  doc.text(template.bailleur.address, margin, y)

  y += 12
  addSeparator()

  // Locataire block
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('L E   L O C A T A I R E', margin, y)
  doc.setTextColor(0)
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(tenant.name || '[Nom du locataire]', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  if (tenant.address) { doc.text(tenant.address, margin, y); y += 4 }
  if (tenant.nationality) { doc.text(`Nationalite : ${tenant.nationality}`, margin, y); y += 4 }
  if (tenant.birthDate) {
    const bd = `Date de naissance : ${tenant.birthDate}${tenant.birthPlace ? ` a ${tenant.birthPlace}` : ''}`
    doc.text(bd, margin, y)
    y += 4
  }
  if (tenant.idType && tenant.idNumber) {
    let idLine = `Piece d'identite : ${tenant.idType} n° ${tenant.idNumber}`
    if (tenant.idIssued) idLine += ` (delivre le ${tenant.idIssued}`
    if (tenant.idExpiry) idLine += `, valable jusqu'au ${tenant.idExpiry}`
    if (tenant.idIssued) idLine += ')'
    const idLines = doc.splitTextToSize(idLine, cw)
    for (const l of idLines) { doc.text(l, margin, y); y += 4 }
  }

  if (intermediary.enabled && intermediary.name) {
    y += 6
    addSeparator()
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('I N T E R M E D I A I R E', margin, y)
    doc.setTextColor(0)
    y += 5
    doc.setFontSize(9)
    const intText = intermediary.description || `La presente reservation est realisee par l'intermediaire de ${intermediary.name}, agissant pour le compte du Locataire.`
    const intLines = doc.splitTextToSize(intText, cw)
    for (const l of intLines) { doc.text(l, margin, y); y += 4 }
  }

  y += 8
  doc.setFontSize(8)
  doc.setTextColor(100)
  const stayLine = `Sejour du ${stay.arrivalDate || '[date]'} au ${stay.departureDate || '[date]'} · ${stay.propertyName}, ${stay.propertyAddress}`
  const stayLines = doc.splitTextToSize(stayLine, cw)
  for (const l of stayLines) { doc.text(l, margin, y); y += 3.5 }
  doc.setTextColor(0)

  // ─── PAGE 2: Sommaire ────────────────────────────────────────────────

  doc.addPage()
  y = margin

  const activeArticles = template.articles.filter(a => a.enabled)

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('S O M M A I R E', margin, y)
  doc.setTextColor(0)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('C O N T R A T   D E   L O C A T I O N', margin, y)
  y += 6

  for (const art of activeArticles) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Art. ${art.number}`, margin + 4, y)
    doc.setFont('helvetica', 'normal')
    doc.text(art.title, margin + 20, y)
    y += 5
  }

  // Highlighted articles summary
  const highlighted = activeArticles.filter(a => a.isHighlighted)
  if (highlighted.length > 0) {
    y += 6
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('E N C A D R E S   C L E S', margin, y)
    doc.setTextColor(0)
    y += 6
    doc.setFontSize(9)
    highlighted.forEach((h, idx) => {
      const circleNum = String.fromCharCode(9312 + idx) // unicode circled numbers
      doc.setFont('helvetica', 'bold')
      doc.text(`${circleNum}`, margin + 4, y)
      doc.setFont('helvetica', 'normal')
      doc.text(`${h.highlightLabel || h.title} — Art. ${h.number}`, margin + 12, y)
      y += 5
    })
  }

  // ─── PAGE 3+: Preamble + Articles ────────────────────────────────────

  doc.addPage()
  y = margin

  // Preamble
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text(`C O N T R A T   D E   L O C A T I O N   S A I S O N N I E R E   —   ${stay.propertyName.toUpperCase().split('').join(' ')}`, margin, y)
  doc.setTextColor(0)
  y += 6

  addLine('Le present contrat de location saisonniere est conclu entre les soussignes :', 9)
  addSpace(4)

  // Bailleur in-text
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('L E   B A I L L E U R', margin, y)
  doc.setTextColor(0)
  y += 5
  const bailleurText = `${template.bailleur.company}, representee par ${template.bailleur.representative}, dont le siege social est situe ${template.bailleur.address}, immatriculee au RCS de Montpellier sous le numero ${template.bailleur.rcs} (SIRET ${template.bailleur.siret}). Telephone : ${template.bailleur.phone} — Email : ${template.bailleur.email}. Ci-apres denommee "le Bailleur" ou "le Proprietaire".`
  addLine(bailleurText, 9)
  addSpace(4)

  // Locataire in-text
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('L E   L O C A T A I R E', margin, y)
  doc.setTextColor(0)
  y += 5
  let locText = `Nom et prenom : ${tenant.name || '[...]'}`
  if (tenant.address) locText += ` — Adresse : ${tenant.address}`
  if (tenant.phone) locText += ` — Telephone : ${tenant.phone}`
  if (tenant.email) locText += ` — Email : ${tenant.email}`
  locText += '.'
  if (tenant.birthDate) locText += ` Date de naissance : ${tenant.birthDate}${tenant.birthPlace ? ` a ${tenant.birthPlace}` : ''}.`
  if (tenant.nationality) locText += ` Nationalite : ${tenant.nationality}.`
  if (tenant.idType && tenant.idNumber) {
    locText += ` Piece d'identite : ${tenant.idType} n° ${tenant.idNumber}`
    if (tenant.idIssued) locText += ` (delivre le ${tenant.idIssued}`
    if (tenant.idExpiry) locText += `, valable jusqu'au ${tenant.idExpiry}`
    if (tenant.idIssued) locText += ')'
    locText += '.'
  }
  locText += ' Ci-apres denomme "le Locataire".'
  addLine(locText, 9)
  addSpace(4)

  // Intermediary if applicable
  if (intermediary.enabled && intermediary.name) {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('I N T E R M E D I A I R E', margin, y)
    doc.setTextColor(0)
    y += 5
    addLine(intermediary.description || `La presente reservation est realisee par l'intermediaire de ${intermediary.name}, agissant pour le compte du Locataire.`, 9)
    addSpace(4)
  }

  addLine('Le Locataire certifie l\'exactitude des informations fournies et s\'engage a prevenir le Bailleur de toute modification eventuelle.', 9)
  addSpace(2)
  addLine('Ceci etant expose, il a ete convenu et arrete ce qui suit.', 9, true)
  addSpace(6)

  // ─── Articles ────────────────────────────────────────────────────────

  let highlightIdx = 0

  for (const art of activeArticles) {
    addSeparator()

    // Article header
    doc.setFontSize(8)
    doc.setTextColor(120)
    checkPage(8)
    doc.text(`Article ${art.number}`, margin, y)
    doc.setTextColor(0)
    y += 5
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    checkPage(6)
    doc.text(art.title, margin, y)
    doc.setFont('helvetica', 'normal')
    y += 6

    const kind = resolveArticleKind(art)

    // Special content for stay details box
    if (kind === 'stay') {
      doc.setFontSize(9)
      addLine(replaceVars(art.content.split('\n')[0] || art.content), 9)
      addSpace(2)

      // Property info box
      const boxY = y
      doc.setFillColor(248, 248, 248)
      doc.roundedRect(margin, boxY, cw, 32, 2, 2, 'F')

      doc.setFontSize(7)
      doc.setTextColor(120)
      const col1 = margin + 4
      const col2 = margin + cw / 2 + 4

      y = boxY + 6
      doc.text('V I L L A', col1, y); doc.text('A D R E S S E', col2, y)
      y += 4
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(stay.propertyName, col1, y)
      doc.setFont('helvetica', 'normal')
      const addrLines = doc.splitTextToSize(stay.propertyAddress, cw / 2 - 8)
      for (const l of addrLines) { doc.text(l, col2, y); y += 4 }

      y = boxY + 18
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text("D A T E   D ' A R R I V E E", col1, y)
      doc.text('D A T E   D E   D E P A R T', col2, y)
      y += 4
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.text(`${stay.arrivalDate || '[...]'} — ${stay.arrivalTime || '14h00'}`, col1, y)
      doc.text(`${stay.departureDate || '[...]'} — ${stay.departureTime || '11h00'}`, col2, y)

      y = boxY + 36
      const nights = calcNights()
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text('N O M B R E   D E   N U I T E E S', col1, y)
      doc.text('N O M B R E   D E   P E R S O N N E S', col2, y)
      y += 4
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.text(`${nights} nuit${nights > 1 ? 's' : ''}`, col1, y)
      doc.text(`${stay.guestsCount || '[...]'} (${stay.maxGuests || '16'} maximum)`, col2, y)

      y = boxY + 46
      addSpace(4)

      // Remaining paragraph
      const restLines = art.content.split('\n').slice(1)
      if (restLines.length > 0) {
        addLine(replaceVars(restLines.join('\n').trim()), 9)
      }
      continue
    }

    // Special content for payment box
    if (kind === 'payment') {
      const boxY = y
      doc.setFillColor(248, 248, 248)
      doc.roundedRect(margin, boxY, cw, 20, 2, 2, 'F')

      doc.setFontSize(7)
      doc.setTextColor(120)
      const col1 = margin + 4
      const col2 = margin + cw / 3 + 4
      const col3 = margin + (cw * 2) / 3 + 4

      y = boxY + 6
      doc.text('M O N T A N T   N E T', col1, y)
      doc.text('A   R E G L E R', col2, y)
      doc.text('T A X E S', col3, y)
      y += 4
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${Number(stay.rentAmount).toLocaleString('fr-FR')} EUR`, col1, y)
      doc.setFont('helvetica', 'normal')
      doc.text('A la signature', col2, y)
      doc.text(stay.taxesIncluded ? 'Incluses' : 'Non incluses', col3, y)

      y += 4
      doc.setFontSize(7)
      doc.setTextColor(120)
      doc.text('D E P O T   D E   G A R A N T I E', col1, y)
      y += 4
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.text(`${Number(stay.depositAmount).toLocaleString('fr-FR')} EUR (voir Article 4)`, col1, y)

      y = boxY + 24
      addSpace(2)
      addLine(replaceVars(art.content), 9)
      continue
    }

    // Special content for check-in/out box
    if (kind === 'checkinout') {
      // Highlighted box
      if (art.isHighlighted) {
        highlightIdx++
        checkPage(16)
        doc.setFillColor(245, 245, 245)
        doc.roundedRect(margin, y, cw, 14, 2, 2, 'F')
        doc.setFontSize(7)
        doc.setTextColor(120)
        const col1 = margin + 4
        const col2 = margin + cw / 2 + 4
        y += 5
        doc.text("H E U R E   D ' A R R I V E E   ( C H E C K - I N )", col1, y)
        doc.text('H E U R E   D E   D E P A R T   ( C H E C K - O U T )', col2, y)
        y += 4
        doc.setTextColor(0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(stay.arrivalTime || template.propertyDefaults.checkinTime, col1, y)
        doc.text(stay.departureTime || template.propertyDefaults.checkoutTime, col2, y)
        doc.setFont('helvetica', 'normal')
        y += 8
      }
      addLine(replaceVars(art.content), 9)
      continue
    }

    // Highlighted box for deposit article
    if (kind === 'deposit' && art.isHighlighted) {
      highlightIdx++
      checkPage(10)
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(margin, y, cw, 10, 2, 2, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      y += 6
      doc.text(`Depot de garantie : ${Number(stay.depositAmount).toLocaleString('fr-FR')} EUR — encaisse par la societe ${template.bailleur.company}.`, margin + 4, y)
      doc.setFont('helvetica', 'normal')
      y += 8
    }

    // Regular content
    addLine(replaceVars(art.content), 9)
  }

  // ─── LAST PAGE: Signatures ───────────────────────────────────────────

  addSpace(10)
  addSeparator()

  doc.setFontSize(8)
  doc.setTextColor(120)
  checkPage(40)
  doc.text('S I G N A T U R E S   D E S   P A R T I E S', margin, y)
  doc.setTextColor(0)
  y += 6

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  addLine(`Fait en deux (2) exemplaires originaux, dont un remis a chaque partie, a Saint-Aunes, le ${today}. Les parties declarent avoir pris connaissance du contrat et en accepter tous les termes, clauses et conditions, sans reserve ni restriction.`, 9)
  addSpace(8)

  // Two columns for signatures
  const sigLeftX = margin
  const sigRightX = W / 2 + 8

  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('L E   B A I L L E U R', sigLeftX, y)
  doc.text('L E   L O C A T A I R E', sigRightX, y)
  doc.setTextColor(0)
  y += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(template.bailleur.company, sigLeftX, y)
  doc.text(tenant.name || '[Nom du locataire]', sigRightX, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.text(template.bailleur.representative, sigLeftX, y)
  y += 8

  doc.setFont('helvetica', 'italic')
  doc.text('Mention manuscrite : "Lu et approuve"', sigLeftX, y)
  doc.text('Mention manuscrite : "Lu et approuve"', sigRightX, y)
  y += 5
  doc.text('Nom, qualite et signature', sigLeftX, y)
  doc.text('Nom, prenom et signature', sigRightX, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text('Paraphes : a apposer en pied de chaque page du present contrat par chacune des parties.', margin, y)
  doc.setTextColor(0)

  // ─── Headers & Footers on every page ─────────────────────────────────

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Header (except page 1)
    if (i > 1) {
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(`${i} / ${totalPages}`, margin, 10)
      doc.text(headerText, W - margin, 10, { align: 'right' })
      doc.setTextColor(0)
    }

    // Footer
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`${template.bailleur.company} — ${template.bailleur.address} — ${template.bailleur.email}`, W / 2, H - 8, { align: 'center' })
    doc.setTextColor(0)
  }

  return doc
}
