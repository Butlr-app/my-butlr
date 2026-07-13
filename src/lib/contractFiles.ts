import { supabase } from './supabase'

export const CONTRACT_FILE_BUCKET = 'contract-files'
export const MAX_CONTRACT_FILE_SIZE = 15 * 1024 * 1024
export const MAX_CONTRACT_FILES = 10
export const ACCEPTED_CONTRACT_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export type ContractFileSource = 'owner_upload' | 'concierge_upload' | 'generated'

export interface ExtractedContractData {
  emails: string[]
  phones: string[]
  dates: string[]
  amounts: string[]
  parties: string[]
  addresses: string[]
}

export interface ContractPrefillData {
  guestName: string | null
  guestEmail: string | null
  guestPhone: string | null
  arrival: string | null
  departure: string | null
  totalAmount: number | null
}

export interface ContractAnalysisProgress {
  fileName: string
  phase: 'upload' | 'extract' | 'ocr' | 'save' | 'completed' | 'failed'
  progress: number
}

interface UploadContractFilesOptions {
  reservationId: string
  contractId: string
  userId: string
  source: Exclude<ContractFileSource, 'generated'>
  files: File[]
  preExtractedText?: Map<File, string>
  onProgress?: (progress: ContractAnalysisProgress) => void
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

export function extractStructuredContractData(text: string): ExtractedContractData {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return {
    emails: unique(text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? []),
    phones: unique(text.match(/(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/g) ?? []),
    dates: unique(text.match(/\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g) ?? []),
    amounts: unique(text.match(/\d{1,3}(?:[ .]\d{3})*(?:[,.]\d{2})?\s*(?:€|EUR|euros?)/gi) ?? []),
    parties: unique(lines.filter(line =>
      /\b(locataire|propriétaire|bailleur|mandataire|conciergerie)\b/i.test(line)
    ).slice(0, 12)),
    addresses: unique(lines.filter(line =>
      /\b(rue|avenue|boulevard|chemin|route|impasse|place|allée)\b/i.test(line)
      && /\d/.test(line)
    ).slice(0, 8)),
  }
}

export function extractContractPrefillData(text: string): ContractPrefillData {
  const normalizedText = normalizeAnalysisText(text)
  const structured = extractStructuredContractData(normalizedText)
  const lines = normalizedText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const guestSection = extractGuestSection(normalizedText)
  const guestStructured = extractStructuredContractData(guestSection)
  const guestName = findGuestName(guestSection, lines)
  const dates = structured.dates
    .map(normalizeExtractedDate)
    .filter((date): date is string => Boolean(date))
    .sort()
  const dateToken = '([0-9OIl]{1,4}[./-][0-9OIl]{1,2}[./-][0-9OIl]{2,4})'
  const stayPair = normalizedText.match(new RegExp(
    `(?:s[ée]jour|location|p[ée]riode)?[^\\n]{0,80}?\\bdu\\s+${dateToken}\\s+(?:au|jusqu['’]?au)\\s+${dateToken}`,
    'i',
  ))
  const arrivalMatch = stayPair?.[1] ?? normalizedText.match(new RegExp(
    `(?:arriv[ée]e?|check[ -]?in|entr[ée]e?|d[ée]but(?:\\s+du\\s+s[ée]jour)?)\\D{0,40}${dateToken}`,
    'i',
  ))?.[1]
  const departureMatch = stayPair?.[2] ?? normalizedText.match(new RegExp(
    `(?:d[ée]part|check[ -]?out|sortie|fin(?:\\s+du\\s+s[ée]jour)?)\\D{0,40}${dateToken}`,
    'i',
  ))?.[1]
  const amountPattern = '([0-9]{1,3}(?:[ .][0-9]{3})*(?:[,.][0-9]{1,2})?|[0-9]{4,7}(?:[,.][0-9]{1,2})?)'
  const totalMatch = normalizedText.match(new RegExp(
    `(?:montant\\s+(?:total|du\\s+s[ée]jour)|loyer\\s+(?:total|global)|prix\\s+(?:total|du\\s+s[ée]jour)|co[uû]t\\s+(?:total|de\\s+la\\s+location)|location\\s+est\\s+fix[ée]e?\\s+[àa])[^0-9]{0,80}${amountPattern}\\s*(?:€|EUR|euros?)`,
    'i',
  ))
  const amountSource = totalMatch?.[1]
    ?? structured.amounts.find(amount => !isDepositContext(normalizedText, amount))
      ?.replace(/\s*(?:€|EUR|euros?)\s*$/i, '')

  return {
    guestName,
    guestEmail: guestStructured.emails[0] ?? structured.emails[0] ?? null,
    guestPhone: guestStructured.phones[0] ?? structured.phones[0] ?? null,
    arrival: normalizeExtractedDate(arrivalMatch ?? '') ?? dates[0] ?? null,
    departure: normalizeExtractedDate(departureMatch ?? '') ?? dates[1] ?? null,
    totalAmount: amountSource ? parseExtractedAmount(amountSource) : null,
  }
}

function normalizeAnalysisText(text: string) {
  return text
    .normalize('NFC')
    .replace(/\r/g, '\n')
    .replace(/[|¦]/g, 'I')
    .replace(/[‐‑–—]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}

function extractGuestSection(text: string) {
  const role = /\b(?:locataire|preneur|client|voyageur|occupant)\b/i.exec(text)
  if (!role) return text.slice(0, 600)
  const afterRole = text.slice(role.index, role.index + 800)
  const stop = afterRole.slice(20).search(
    /\n\s*(?:BAILLEUR|PROPRI[ÉE]TAIRE|MANDATAIRE|CONCIERGERIE|ARTICLE\s+\d+|\d+\.\s+[A-ZÀ-Ÿ])/i,
  )
  return stop >= 0 ? afterRole.slice(0, stop + 20) : afterRole
}

function findGuestName(guestSection: string, allLines: string[]) {
  const labeledName = guestSection.match(
    /(?:nom(?:\s+et\s+pr[ée]nom)?\s+(?:du|de\s+la)\s+)?(?:locataire|preneur|client|voyageur|occupant)\s*(?:\(.*?\))?\s*:?\s*(?:M(?:me|lle|r)\.?\s+)?([A-ZÀ-Ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’ -]{2,79})(?=\n|,|;|\s{2,}|$)/i,
  )?.[1]
  if (labeledName && isProbablePersonName(labeledName)) return cleanPersonName(labeledName)

  const lines = guestSection.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const rolePattern = /\b(locataire|preneur|client|voyageur|occupant)\b/i
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!rolePattern.test(line)) continue
    const sameLine = line
      .replace(/^.*?\b(?:locataire|preneur|client|voyageur|occupant)\b\s*(?:\(.*?\))?\s*:?\s*/i, '')
      .trim()
    if (isProbablePersonName(sameLine)) return cleanPersonName(sameLine)
    const nextLine = lines[index + 1]
    if (nextLine && isProbablePersonName(nextLine)) return cleanPersonName(nextLine)
  }

  for (const line of allLines) {
    const name = line.match(/^(?:nom(?:\s+et\s+pr[ée]nom)?|signataire)\s*:\s*(.+)$/i)?.[1]
    if (name && isProbablePersonName(name)) return cleanPersonName(name)
  }
  return null
}

function isProbablePersonName(value: string) {
  return value.length >= 3
    && value.length <= 80
    && /^[A-Za-zÀ-ÖØ-öø-ÿ'’ -]+$/.test(value)
    && !/\b(adresse|email|téléphone|demeurant|représenté|contrat|location)\b/i.test(value)
}

function cleanPersonName(value: string) {
  return value
    .replace(/^(?:M(?:me|lle|r)\.?\s+)/i, '')
    .replace(/\b(?:adresse|email|téléphone)\b.*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function normalizeExtractedDate(value: string) {
  const cleaned = value.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  const match = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/)
  if (!match) return null
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]
  const iso = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  const date = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso
}

function isDepositContext(text: string, amount: string) {
  const index = text.toLocaleLowerCase('fr').indexOf(amount.toLocaleLowerCase('fr'))
  if (index < 0) return false
  const context = text.slice(Math.max(0, index - 80), index).toLocaleLowerCase('fr')
  return /\b(acompte|d[ée]p[ôo]t|garantie|caution|taxe|solde)\b/.test(context)
}

function parseExtractedAmount(value: string) {
  const compact = value.replace(/\s/g, '')
  const normalized = compact.includes(',')
    ? compact.replaceAll('.', '').replace(',', '.')
    : compact
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

async function recognizeImage(
  image: File | Blob,
  fileName: string,
  onProgress?: UploadContractFilesOptions['onProgress'],
) {
  const { recognize } = await import('tesseract.js')
  const result = await recognize(image, 'fra+eng', {
    logger: message => {
      if (message.status === 'recognizing text') {
        onProgress?.({
          fileName,
          phase: 'ocr',
          progress: Math.round((message.progress ?? 0) * 100),
        })
      }
    },
  })
  return result.data.text
}

async function extractPdfText(
  file: File,
  onProgress?: UploadContractFilesOptions['onProgress'],
) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const textParts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({
      fileName: file.name,
      phase: 'extract',
      progress: Math.round((pageNumber / pdf.numPages) * 100),
    })
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    textParts.push(rebuildPdfLines(content.items))
  }

  const extractedText = textParts.join('\n').trim()
  if (isUsableEmbeddedText(extractedText)) return extractedText

  const ocrParts: string[] = []
  const pagesToAnalyze = Math.min(pdf.numPages, 8)
  for (let pageNumber = 1; pageNumber <= pagesToAnalyze; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 2.2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')
    if (!context) continue

    await page.render({ canvas, canvasContext: context, viewport }).promise
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    )
    if (blob) {
      ocrParts.push(await recognizeImage(blob, file.name, progress => {
        onProgress?.({
          ...progress,
          progress: Math.round(((pageNumber - 1) * 100 + progress.progress) / pagesToAnalyze),
        })
      }))
    }
  }

  return ocrParts.join('\n').trim()
}

function rebuildPdfLines(items: readonly unknown[]) {
  const lines: string[] = []
  let currentLine = ''
  let previousY: number | null = null

  for (const item of items) {
    if (
      typeof item !== 'object'
      || item === null
      || !('str' in item)
      || typeof item.str !== 'string'
      || !item.str.trim()
    ) continue
    const transform = 'transform' in item ? item.transform : null
    const y: number | null = Array.isArray(transform) ? Number(transform[5]) : previousY
    const changedLine = previousY !== null && y !== null && Math.abs(y - previousY) > 2
    if (changedLine && currentLine.trim()) {
      lines.push(currentLine.trim())
      currentLine = ''
    }
    currentLine += `${currentLine ? ' ' : ''}${item.str}`
    if ('hasEOL' in item && item.hasEOL) {
      lines.push(currentLine.trim())
      currentLine = ''
      previousY = null
    } else {
      previousY = y
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim())
  return lines.join('\n')
}

function isUsableEmbeddedText(text: string) {
  if (text.length < 80) return false
  const letters = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g)?.length ?? 0
  const replacements = text.match(/�/g)?.length ?? 0
  return letters / text.length > 0.45 && replacements / text.length < 0.02
}

export async function extractContractText(
  file: File,
  onProgress?: UploadContractFilesOptions['onProgress'],
) {
  if (file.type === 'application/pdf') {
    return extractPdfText(file, onProgress)
  }
  return recognizeImage(file, file.name, onProgress)
}

export function validateContractFiles(files: File[]): string | null {
  if (files.length === 0) return 'Ajoutez au moins un PDF ou une image du contrat.'
  if (files.length > MAX_CONTRACT_FILES) {
    return `Vous pouvez ajouter jusqu’à ${MAX_CONTRACT_FILES} fichiers.`
  }

  const unsupported = files.find(file => !ACCEPTED_CONTRACT_FILE_TYPES.includes(file.type))
  if (unsupported) return `Le format de « ${unsupported.name} » n’est pas accepté.`

  const tooLarge = files.find(file => file.size > MAX_CONTRACT_FILE_SIZE)
  if (tooLarge) return `« ${tooLarge.name} » dépasse la limite de 15 Mo.`

  return null
}

function safeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

function mergeExtractedData(items: ExtractedContractData[]): ExtractedContractData {
  return {
    emails: unique(items.flatMap(item => item.emails)),
    phones: unique(items.flatMap(item => item.phones)),
    dates: unique(items.flatMap(item => item.dates)),
    amounts: unique(items.flatMap(item => item.amounts)),
    parties: unique(items.flatMap(item => item.parties)),
    addresses: unique(items.flatMap(item => item.addresses)),
  }
}

export async function uploadAndAnalyzeContractFiles({
  reservationId,
  contractId,
  userId,
  source,
  files,
  preExtractedText,
  onProgress,
}: UploadContractFilesOptions) {
  const validationError = validateContractFiles(files)
  if (validationError) throw new Error(validationError)

  await supabase
    .from('contracts')
    .update({ analysis_status: 'processing' })
    .eq('id', contractId)

  const analyses: ExtractedContractData[] = []
  let failedFiles = 0
  let firstPath = ''

  for (const file of files) {
    const storagePath = `${userId}/${reservationId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
    if (!firstPath) firstPath = storagePath

    onProgress?.({ fileName: file.name, phase: 'upload', progress: 0 })
    const { error: uploadError } = await supabase.storage
      .from(CONTRACT_FILE_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { data: fileRecord, error: metadataError } = await supabase
      .from('contract_files')
      .insert({
        contract_id: contractId,
        reservation_id: reservationId,
        uploaded_by: userId,
        source,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        extraction_status: 'processing',
      })
      .select('id')
      .single()

    if (metadataError || !fileRecord) {
      await supabase.storage.from(CONTRACT_FILE_BUCKET).remove([storagePath])
      throw metadataError ?? new Error('Impossible d’enregistrer le fichier du contrat.')
    }

    try {
      const text = preExtractedText?.get(file) ?? await extractContractText(file, onProgress)
      const extractedData = extractStructuredContractData(text)
      analyses.push(extractedData)
      await supabase
        .from('contract_files')
        .update({
          extraction_status: 'completed',
          ocr_text: text,
          extracted_data: extractedData,
          extraction_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileRecord.id)
      onProgress?.({ fileName: file.name, phase: 'completed', progress: 100 })
    } catch (error) {
      failedFiles += 1
      await supabase
        .from('contract_files')
        .update({
          extraction_status: 'failed',
          extraction_error: error instanceof Error ? error.message : 'Analyse impossible',
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileRecord.id)
      onProgress?.({ fileName: file.name, phase: 'failed', progress: 100 })
    }
  }

  const analysisStatus = failedFiles === 0
    ? 'completed'
    : failedFiles === files.length
      ? 'failed'
      : 'partial'
  const extractedData = mergeExtractedData(analyses)

  const { error: contractError } = await supabase
    .from('contracts')
    .update({
      document_url: firstPath,
      analysis_status: analysisStatus,
      extracted_data: extractedData,
    })
    .eq('id', contractId)

  if (contractError) throw contractError
  return { analysisStatus, extractedData }
}

export async function uploadGeneratedContract(options: {
  reservationId: string
  contractId: string
  userId: string
  fileName: string
  blob: Blob
}) {
  const storagePath = `${options.userId}/${options.reservationId}/${crypto.randomUUID()}-${safeFileName(options.fileName)}`
  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_FILE_BUCKET)
    .upload(storagePath, options.blob, { contentType: 'application/pdf', upsert: false })
  if (uploadError) throw uploadError

  const { data: metadata, error: metadataError } = await supabase
    .from('contract_files')
    .insert({
      contract_id: options.contractId,
      reservation_id: options.reservationId,
      uploaded_by: options.userId,
      source: 'generated',
      storage_path: storagePath,
      file_name: options.fileName,
      mime_type: 'application/pdf',
      size_bytes: options.blob.size,
      extraction_status: 'completed',
    })
    .select('id')
    .single()

  if (metadataError || !metadata) {
    await supabase.storage.from(CONTRACT_FILE_BUCKET).remove([storagePath])
    throw metadataError ?? new Error('Impossible d’archiver le document généré.')
  }

  const { error: contractError } = await supabase
    .from('contracts')
    .update({
      document_url: storagePath,
      analysis_status: 'not_required',
    })
    .eq('id', options.contractId)
  if (contractError) {
    await Promise.all([
      supabase.from('contract_files').delete().eq('id', metadata.id),
      supabase.storage.from(CONTRACT_FILE_BUCKET).remove([storagePath]),
    ])
    throw contractError
  }

  return storagePath
}

export async function createContractFileSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(CONTRACT_FILE_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)
  if (error) throw error
  return data.signedUrl
}
