import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { DateInput } from '@/components/ui/DateInput'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { formatDateForDisplay, localeForDateFormat } from '@/lib/dateFormat'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { uploadGeneratedContract } from '@/lib/contractFiles'
import {
  BLANK_CONTRACT_BLOCKS,
  fetchContractTemplates,
  replaceContractVariables,
  selectContractTemplate,
  type ContractTemplate,
} from '@/lib/contractTemplates'
import { jsPDF } from 'jspdf'
import { CalendarDays, FileDown, CheckCircle, Send } from 'lucide-react'
import { fetchOwnerProperties } from '@/lib/data'
import { fetchPropertyPricing } from '@/lib/propertyPricing'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import type { Property } from '@/lib/types'

interface FormData {
  tenantName: string
  tenantEmail: string
  tenantPhone: string
  tenantAddress: string
  propertyName: string
  propertyAddress: string
  rentAmount: number
  depositAmount: number
  checkIn: string
  checkOut: string
  maxGuests: number
  bedrooms: number
  bathrooms: number
  checkInTime: string
  checkOutTime: string
}

const initialForm: FormData = {
  tenantName: '',
  tenantEmail: '',
  tenantPhone: '',
  tenantAddress: '',
  propertyName: '',
  propertyAddress: '',
  rentAmount: 60000,
  depositAmount: 30000,
  checkIn: '',
  checkOut: '',
  maxGuests: 16,
  bedrooms: 8,
  bathrooms: 8,
  checkInTime: '16:00',
  checkOutTime: '10:00',
}

export function ContractGenerate() {
  const { profile, user } = useAuth()
  const { openReservation } = useReservationDetail()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation')
  const [form, setForm] = useState<FormData>(initialForm)
  const [toast, setToast] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [contractId, setContractId] = useState<string | null>(null)
  const [prefillLoading, setPrefillLoading] = useState(Boolean(reservationId))
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templatesLoading, setTemplatesLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    fetchOwnerProperties(user.id).then(({ data, error }) => {
      if (!active) return
      setProperties((data as Property[] | null) ?? [])
      if (error) showToast(error.message)
      setPropertiesLoading(false)
    })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    setTemplatesLoading(true)
    fetchContractTemplates().then(({ data, error }) => {
      if (!active) return
      setTemplates(data)
      if (error) showToast(error.message)
      setTemplatesLoading(false)
    })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    const selected = selectContractTemplate(templates, selectedPropertyId)
    setSelectedTemplateId(selected?.id ?? '')
  }, [selectedPropertyId, templates])

  useEffect(() => {
    if (!selectedPropertyId) return
    const property = properties.find(item => item.id === selectedPropertyId)
    if (!property) return
    let active = true

    setForm(current => ({
      ...current,
      propertyName: property.name,
      propertyAddress: property.address ?? property.location ?? '',
      maxGuests: property.max_guests ?? 1,
      bedrooms: property.bedrooms ?? 0,
      bathrooms: property.bathrooms ?? 0,
    }))

    fetchPropertyPricing(property.id).then(result => {
      if (!active || !result.settings) return
      const settings = result.settings
      setForm(current => ({
        ...current,
        depositAmount: settings.security_deposit,
        checkInTime: settings.check_in_time,
        checkOutTime: settings.check_out_time,
      }))
    })

    return () => { active = false }
  }, [selectedPropertyId, properties])

  useEffect(() => {
    if (!reservationId) return

    const prefillFromReservation = async () => {
      setPrefillLoading(true)
      const [{ data: reservation, error: reservationError }, { data: contract }] = await Promise.all([
        supabase
          .from('reservations')
          .select('*, properties(*)')
          .eq('id', reservationId)
          .single(),
        supabase
          .from('contracts')
          .select('id')
          .eq('reservation_id', reservationId)
          .eq('type', 'rental')
          .single(),
      ])

      if (reservationError || !reservation) {
        showToast(reservationError?.message ?? 'Réservation introuvable.')
        setPrefillLoading(false)
        return
      }

      const property = reservation.properties
      setSelectedPropertyId(reservation.property_id)
      setForm(current => ({
        ...current,
        tenantName: reservation.guest_name ?? '',
        tenantEmail: reservation.guest_email ?? '',
        tenantPhone: reservation.guest_phone ?? '',
        propertyName: property?.name ?? '',
        propertyAddress: property?.address ?? property?.location ?? '',
        rentAmount: Number(reservation.total_amount) || 0,
        depositAmount: Math.round((Number(reservation.total_amount) || 0) * 0.3),
        checkIn: reservation.arrival,
        checkOut: reservation.departure,
        maxGuests: property?.max_guests ?? reservation.guests_count ?? 1,
        bedrooms: property?.bedrooms ?? 0,
        bathrooms: property?.bathrooms ?? 0,
      }))
      setContractId(contract?.id ?? null)
      setPrefillLoading(false)
    }

    prefillFromReservation()
  }, [reservationId])

  const handleChange = (field: keyof FormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const generatePDF = async (mode: 'download' | 'signature' = 'download') => {
    if (!form.tenantName || !form.propertyName || !form.checkIn || !form.checkOut) {
      showToast('Veuillez remplir tous les champs obligatoires (nom locataire, propriété, dates)')
      return
    }

    setGenerating(true)

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      // Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('CONTRAT DE LOCATION SAISONNIERE', pageWidth / 2, y, { align: 'center' })
      y += 8
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(form.propertyName, pageWidth / 2, y, { align: 'center' })
      y += 6
      doc.setDrawColor(200)
      doc.line(20, y, pageWidth - 20, y)
      y += 10

      const selectedTemplate = templates.find(template => template.id === selectedTemplateId)
      const activeBlocks = selectedTemplate?.blocks?.length
        ? selectedTemplate.blocks
        : BLANK_CONTRACT_BLOCKS
      const nights = Math.max(0, Math.round(
        (new Date(`${form.checkOut}T12:00:00`).getTime() - new Date(`${form.checkIn}T12:00:00`).getTime())
        / 86_400_000,
      ))
      const money = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      })
      const today = new Date().toLocaleDateString(localeForDateFormat(profile?.date_format), {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      const templateValues = {
        'owner.company': profile?.company,
        'owner.name': profile?.full_name,
        'owner.email': profile?.email ?? user?.email,
        'owner.phone': profile?.phone,
        'tenant.name': form.tenantName,
        'tenant.address': form.tenantAddress,
        'tenant.email': form.tenantEmail,
        'tenant.phone': form.tenantPhone,
        'property.name': form.propertyName,
        'property.address': form.propertyAddress,
        'property.max_guests': form.maxGuests,
        'property.bedrooms': form.bedrooms,
        'property.bathrooms': form.bathrooms,
        'stay.arrival': formatDateForDisplay(form.checkIn, profile?.date_format),
        'stay.departure': formatDateForDisplay(form.checkOut, profile?.date_format),
        'stay.nights': nights,
        'stay.check_in_time': form.checkInTime.replace(':', 'h'),
        'stay.check_out_time': form.checkOutTime.replace(':', 'h'),
        'financial.rent': money.format(form.rentAmount),
        'financial.deposit': money.format(form.depositAmount),
        'contract.date': today,
      }

      if (activeBlocks.length > 0) {
        const contentWidth = pageWidth - 40
        const ensureRoom = (height: number) => {
          if (y + height > 278) {
            doc.addPage()
            y = 20
          }
        }
        const writeContent = (content: string) => {
          const paragraphs = content.split(/\n{2,}/)
          for (const paragraph of paragraphs) {
            const lines = doc.splitTextToSize(paragraph.replace(/\n/g, ' '), contentWidth)
            for (const line of lines) {
              ensureRoom(5)
              doc.text(line, 20, y)
              y += 4.7
            }
            y += 2.5
          }
        }

        for (const block of activeBlocks) {
          ensureRoom(block.type === 'signatures' ? 56 : 24)
          doc.setTextColor(30)
          doc.setFontSize(block.type === 'preamble' ? 13 : 11)
          doc.setFont('helvetica', 'bold')
          doc.text(block.title.toUpperCase(), 20, y)
          y += 7

          if (block.type === 'callout') {
            doc.setDrawColor(70, 110, 145)
            doc.setLineWidth(0.8)
            doc.line(20, y - 5, 20, Math.min(278, y + 12))
          }

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          writeContent(replaceContractVariables(block.content, templateValues))
          y += 3

          if (block.type === 'signatures') {
            ensureRoom(36)
            const signatureCol2X = pageWidth / 2 + 10
            doc.setFont('helvetica', 'bold')
            doc.text('LE BAILLEUR', 20, y)
            doc.text('LE LOCATAIRE', signatureCol2X, y)
            y += 6
            doc.setFont('helvetica', 'normal')
            doc.text(profile?.company || profile?.full_name || '[Bailleur]', 20, y)
            doc.text(form.tenantName, signatureCol2X, y)
            y += 22
            doc.text('Signature : ______________________', 20, y)
            doc.text('Signature : ______________________', signatureCol2X, y)
            y += 10
          }
        }
      } else {
      // Parties section
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('PARTIES', 20, y)
      y += 8

      // Bailleur column
      const col1X = 20
      const col2X = pageWidth / 2 + 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('BAILLEUR :', col1X, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      const bailleurLines = [
        'SAS EBSCOPAL',
        '65 rue de la Garriguette',
        '34130 Saint-Aunès',
        'RCS Montpellier 901 449 405',
        'contact@frenchw.com',
        '+33 7 81 62 23 97',
      ]
      bailleurLines.forEach(line => {
        doc.text(line, col1X, y)
        y += 4.5
      })

      // Locataire column
      let y2 = y - bailleurLines.length * 4.5 - 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('LOCATAIRE :', col2X, y2)
      y2 += 5
      doc.setFont('helvetica', 'normal')
      const locataireLines = [
        form.tenantName,
        form.tenantAddress,
        form.tenantEmail,
        form.tenantPhone,
      ]
      locataireLines.forEach(line => {
        if (line) {
          doc.text(line, col2X, y2)
          y2 += 4.5
        }
      })

      y = Math.max(y, y2) + 10
      doc.setDrawColor(200)
      doc.line(20, y, pageWidth - 20, y)
      y += 8

      // Articles
      const articles = [
        {
          title: '1. OBJET',
          content: `Le présent contrat a pour objet la location saisonnière du bien immobilier dénommé "${form.propertyName}", situé à ${form.propertyAddress || '[adresse du bien]'}, pour une durée déterminée conformément à l'article 2.`
        },
        {
          title: '2. SÉJOUR',
          content: `Le séjour se déroulera du ${formatDateForDisplay(form.checkIn, profile?.date_format)} au ${formatDateForDisplay(form.checkOut, profile?.date_format)}. Le nombre maximum d'occupants est limité à ${form.maxGuests} personnes. Le locataire déclare avoir pris connaissance de l'état des lieux à son arrivée.`
        },
        {
          title: '3. MONTANT ET PAIEMENT',
          content: `Le montant total de la location est fixé à ${form.rentAmount.toLocaleString('fr-FR')} euros. Un acompte de 30% est exigible à la réservation, soit ${(form.rentAmount * 0.3).toLocaleString('fr-FR')} euros. Le solde est dû au plus tard 30 jours avant la date de check-in. Le paiement s'effectue par virement bancaire ou tout autre moyen convenu entre les parties.`
        },
        {
          title: '4. DÉPÔT DE GARANTIE',
          content: `Un dépôt de garantie de ${form.depositAmount.toLocaleString('fr-FR')} euros est demandé à la remise des clés. Il sera restitué dans un délai maximum de 14 jours après le check-out, déduction faite, le cas échéant, des sommes dues pour dommages, dégradations ou nettoyage excessif constatés lors de l'état des lieux de sortie.`
        },
        {
          title: '5. DÉTAILS DE LA PROPRIÉTÉ',
          content: `Le bien comprend ${form.bedrooms} chambre(s) et ${form.bathrooms} salle(s) de bain. Le locataire s'engage à utiliser les lieux en bon père de famille et à maintenir le bon état du mobilier et des équipements mis à disposition. Toute dégradation sera à la charge du locataire.`
        },
        {
          title: '6. SERVICES INCLUS',
          content: `Sont inclus dans la location : l'eau, l'électricité, le Wi-Fi, le linge de maison (draps et serviettes), et le ménage de fin de séjour (hors cuisine). Les services supplémentaires (conciergerie, chef privé, etc.) peuvent être réservés moyennant un supplément.`
        },
        {
          title: '7. RÈGLES DE VIE',
          content: `Le locataire s'engage à respecter le voisinage et à ne pas troubler la paix publique. Les fêtes et événements bruyants sont strictement interdits sans autorisation écrite préalable du bailleur. Le non-respect de cette règle peut entraîner la résiliation du contrat sans remboursement. Toute consommation de stupéfiants ou de substances illicites dans les lieux est formellement interdite et constitue un motif d'expulsion immédiate.`
        },
        {
          title: '8. SÉCURITÉ',
          content: `Le locataire s'engage à respecter les règles de sécurité, notamment concernant l'utilisation de la piscine : surveillance constante des enfants, interdiction de plonger, respect des horaires de baignade (22h - 8h interdite). Le bailleur décline toute responsabilité en cas d'accident lié au non-respect de ces règles. Le locataire est responsable de la sécurité des personnes séjournant sous sa responsabilité.`
        },
        {
          title: '9. ANNULATION',
          content: `En cas d'annulation par le locataire plus de 60 jours avant le check-in, l'acompte est intégralement remboursé. Entre 30 et 60 jours, l'acompte est conservé à titre d'indemnité. Moins de 30 jours, l'intégralité du séjour est due. En cas d'annulation par le bailleur, l'intégralité des sommes versées est immédiatement remboursée au locataire.`
        },
        {
          title: '10. CHECK-IN ET CHECK-OUT',
          content: `Le check-in s'effectue à partir de ${form.checkInTime.replace(':', 'h')} le jour d'arrivée. Le check-out est fixé à ${form.checkOutTime.replace(':', 'h')} le jour du départ. Tout retard doit être convenu au préalable avec le bailleur. Les clés doivent être remises au bailleur ou à son représentant désigné.`
        },
        {
          title: '11. SOUS-LOCATION',
          content: `La sous-location, même partielle, est strictement interdite sans l'accord écrit préalable du bailleur. Le locataire ne peut en aucun cas céder ses droits au présent contrat à un tiers. Toute infraction entraînera la résiliation immédiate du contrat.`
        },
        {
          title: '12. FORCE MAJEURE',
          content: `Aucune des parties ne sera tenue responsable de l'inexécution de ses obligations en cas de force majeure (catastrophe naturelle, pandémie, restrictions gouvernementales, etc.). En tel cas, les parties s'efforceront de trouver une solution amiable, incluant le report du séjour ou le remboursement.`
        },
        {
          title: '13. CONFIDENTIALITÉ',
          content: `Les parties s'engagent à garder confidentielles toutes les informations échangées dans le cadre du présent contrat, notamment les conditions financières et les données personnelles. Cette obligation de confidentialité survivra à l'expiration du contrat.`
        },
        {
          title: '14. PRISES DE VUE',
          content: `Le locataire autorise le bailleur à effectuer des prises de vue du bien avant et après le séjour, exclusivement à des fins d'état des lieux. Toute utilisation commerciale ou publicitaire des images nécessite l'accord écrit du locataire.`
        },
        {
          title: '15. DROIT APPLICABLE',
          content: `Le présent contrat est soumis au droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, le tribunal compétent sera celui du lieu de situation du bien loué, soit le tribunal de Montpellier.`
        },
      ]

      articles.forEach(article => {
        // Check if we need a new page
        if (y > 260) {
          doc.addPage()
          y = 20
        }

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(article.title, 20, y)
        y += 6

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const splitContent = doc.splitTextToSize(article.content, pageWidth - 40)
        doc.text(splitContent, 20, y)
        y += splitContent.length * 4.5 + 6
      })

      // Signatures block
      if (y > 240) {
        doc.addPage()
        y = 20
      }

      y += 5
      doc.setDrawColor(200)
      doc.line(20, y, pageWidth - 20, y)
      y += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('SIGNATURES', 20, y)
      y += 5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Lu et approuvé, précédé de la mention "Lu et approuvé"', 20, y)
      y += 10

      const today = new Date().toLocaleDateString(localeForDateFormat(profile?.date_format), {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      doc.text(`Date : ${today}`, 20, y)
      y += 12

      doc.text('BAILLEUR :', 20, y)
      doc.text('LOCATAIRE :', col2X, y)
      y += 4
      doc.setFont('helvetica', 'italic')
      doc.text('SAS EBSCOPAL', 20, y)
      doc.text(form.tenantName, col2X, y)
      y += 20
      doc.setFont('helvetica', 'normal')
      doc.text('Signature : ________________________', 20, y)
      doc.text('Signature : ________________________', col2X, y)
      }

      // Footer
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(`Contrat de location saisonnière - ${form.propertyName} - Page ${i}/${totalPages}`, pageWidth / 2, 290, { align: 'center' })
      }

      const fileName = `contrat-${form.propertyName.replace(/\s+/g, '-')}-${form.checkIn}.pdf`

      let archived = false
      if (reservationId && contractId && user) {
        const { error: snapshotError } = await supabase
          .from('contracts')
          .update({
            contract_template_id: selectedTemplate?.id ?? null,
            template_snapshot: {
              name: selectedTemplate?.name ?? 'Modèle standard',
              version: selectedTemplate?.version ?? 1,
              blocks: activeBlocks,
              generated_at: new Date().toISOString(),
            },
          })
          .eq('id', contractId)
        if (snapshotError) throw snapshotError

        await uploadGeneratedContract({
          reservationId,
          contractId,
          userId: user.id,
          fileName,
          blob: doc.output('blob'),
        })
        archived = true
      }

      if (mode === 'download') {
        doc.save(fileName)
        showToast(archived
          ? 'Contrat généré et enregistré dans le dossier.'
          : 'Contrat généré avec succès !')
      } else if (contractId) {
        navigate(`/app/contracts/${contractId}?signature=1`)
      }
    } catch (err) {
      console.error(err)
      showToast('Erreur lors de la génération du contrat.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Générateur de Contrat</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {reservationId
                ? 'Les données de la réservation ont prérempli le modèle. Vérifiez-les avant de générer le PDF.'
                : 'Générez un contrat de location saisonnière professionnel au format PDF.'}
            </p>
            {prefillLoading && (
              <p className="mt-2 text-xs text-muted-foreground">Chargement de la réservation…</p>
            )}
          </div>
          {reservationId && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openReservation(reservationId)}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Voir la réservation
            </Button>
          )}
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Informations du Contrat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
                  Modèle
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/app/contracts/templates')}
                >
                  Gérer les modèles
                </Button>
              </div>
              <Select
                label="Modèle de contrat"
                value={selectedTemplateId}
                onChange={event => setSelectedTemplateId(event.target.value)}
                disabled={templatesLoading}
                options={[
                  {
                    value: '',
                    label: templatesLoading
                      ? 'Chargement des modèles…'
                      : templates.length === 0
                        ? 'Modèle standard'
                        : 'Sélectionner un modèle',
                  },
                  ...templates
                    .filter(template =>
                      !template.property_id || template.property_id === selectedPropertyId
                    )
                    .map(template => ({
                      value: template.id,
                      label: `${template.name}${template.is_default ? ' — Par défaut' : ''}`,
                    })),
                ]}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Le PDF conserve un instantané du modèle et de sa version au moment de la génération.
              </p>
            </div>

            {/* Tenant Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-wide">Locataire</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom complet"
                  placeholder="Jean Dupont"
                  value={form.tenantName}
                  onChange={e => handleChange('tenantName', e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="jean@example.com"
                  value={form.tenantEmail}
                  onChange={e => handleChange('tenantEmail', e.target.value)}
                />
                <PhoneInput
                  label="Téléphone"
                  value={form.tenantPhone}
                  onChange={value => handleChange('tenantPhone', value)}
                />
                <Input
                  label="Adresse"
                  placeholder="123 rue de la Paix, 75001 Paris"
                  value={form.tenantAddress}
                  onChange={e => handleChange('tenantAddress', e.target.value)}
                />
              </div>
            </div>

            {/* Property Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-wide">Propriété</h3>
              <div className="mb-4">
                <Select
                  label="Résidence My Butlr"
                  value={selectedPropertyId}
                  onChange={event => setSelectedPropertyId(event.target.value)}
                  disabled={propertiesLoading || Boolean(reservationId)}
                  options={[
                    {
                      value: '',
                      label: propertiesLoading
                        ? 'Chargement des résidences…'
                        : 'Sélectionner une résidence',
                    },
                    ...properties.map(property => ({
                      value: property.id,
                      label: `${property.name}${property.location ? ` — ${property.location}` : ''}`,
                    })),
                  ]}
                />
                {reservationId && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    La résidence est verrouillée car ce contrat est rattaché à une réservation.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom de la propriété"
                  placeholder="Villa Méditerranée"
                  value={form.propertyName}
                  onChange={e => handleChange('propertyName', e.target.value)}
                />
                <Input
                  label="Adresse de la propriété"
                  placeholder="15 avenue de la Plage, 34280 La Grande-Motte"
                  value={form.propertyAddress}
                  onChange={e => handleChange('propertyAddress', e.target.value)}
                />
              </div>
            </div>

            {/* Financial Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-wide">Montants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Loyer total (€)"
                  type="number"
                  value={form.rentAmount}
                  onChange={e => handleChange('rentAmount', Number(e.target.value))}
                />
                <Input
                  label="Dépôt de garantie (€)"
                  type="number"
                  value={form.depositAmount}
                  onChange={e => handleChange('depositAmount', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-wide">Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateInput
                  label="Check-in"
                  value={form.checkIn}
                  onChange={value => handleChange('checkIn', value)}
                />
                <DateInput
                  label="Check-out"
                  min={form.checkIn || undefined}
                  value={form.checkOut}
                  onChange={value => handleChange('checkOut', value)}
                />
                <Input
                  label="Heure d’arrivée"
                  type="time"
                  value={form.checkInTime}
                  onChange={event => handleChange('checkInTime', event.target.value)}
                />
                <Input
                  label="Heure de départ"
                  type="time"
                  value={form.checkOutTime}
                  onChange={event => handleChange('checkOutTime', event.target.value)}
                />
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-wide">Détails</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Nombre maximum d'occupants"
                  type="number"
                  value={form.maxGuests}
                  onChange={e => handleChange('maxGuests', Number(e.target.value))}
                />
                <Input
                  label="Chambres"
                  type="number"
                  value={form.bedrooms}
                  onChange={e => handleChange('bedrooms', Number(e.target.value))}
                />
                <Input
                  label="Salles de bain"
                  type="number"
                  value={form.bathrooms}
                  onChange={e => handleChange('bathrooms', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Generate actions */}
            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => generatePDF('download')}
                disabled={generating}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {generating ? 'Génération en cours...' : 'Enregistrer le brouillon PDF'}
              </Button>
              <Button
                size="lg"
                onClick={() => generatePDF('signature')}
                disabled={generating || !reservationId || !contractId}
              >
                <Send className="w-4 h-4 mr-2" />
                Générer et envoyer en signature
              </Button>
              {(!reservationId || !contractId) && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  L’envoi en signature nécessite un contrat créé depuis une réservation.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
