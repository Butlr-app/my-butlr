import { extractContractText } from './contractFiles'
import { supabase } from './supabase'

export const CONTRACT_TEMPLATE_BUCKET = 'contract-template-files'
export const MAX_CONTRACT_TEMPLATE_FILE_SIZE = 15 * 1024 * 1024
export const ACCEPTED_CONTRACT_TEMPLATE_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export type ContractTemplateBlockType =
  | 'preamble'
  | 'article'
  | 'callout'
  | 'signatures'

export interface ContractTemplateBlock {
  id: string
  type: ContractTemplateBlockType
  title: string
  content: string
  required: boolean
}

export interface ContractTemplate {
  id: string
  user_id: string
  property_id: string | null
  name: string
  description: string | null
  blocks: ContractTemplateBlock[]
  source_file_path: string | null
  source_file_name: string | null
  source_mime_type: string | null
  import_status: 'not_imported' | 'processing' | 'completed' | 'failed'
  import_error: string | null
  is_default: boolean
  version: number
  created_by: string | null
  created_at: string
  updated_at: string
  properties?: { id: string; name: string } | null
}

export interface ContractTemplateValues {
  [variable: string]: string | number | null | undefined
}

export const CONTRACT_TEMPLATE_VARIABLES = [
  { token: '{{owner.company}}', label: 'Société du bailleur' },
  { token: '{{owner.name}}', label: 'Nom du bailleur' },
  { token: '{{owner.email}}', label: 'Email du bailleur' },
  { token: '{{owner.phone}}', label: 'Téléphone du bailleur' },
  { token: '{{tenant.name}}', label: 'Nom du locataire' },
  { token: '{{tenant.address}}', label: 'Adresse du locataire' },
  { token: '{{tenant.email}}', label: 'Email du locataire' },
  { token: '{{tenant.phone}}', label: 'Téléphone du locataire' },
  { token: '{{property.name}}', label: 'Nom de la villa' },
  { token: '{{property.address}}', label: 'Adresse de la villa' },
  { token: '{{property.max_guests}}', label: 'Capacité maximale' },
  { token: '{{property.bedrooms}}', label: 'Nombre de chambres' },
  { token: '{{property.bathrooms}}', label: 'Nombre de salles de bain' },
  { token: '{{stay.arrival}}', label: 'Date d’arrivée' },
  { token: '{{stay.departure}}', label: 'Date de départ' },
  { token: '{{stay.nights}}', label: 'Nombre de nuits' },
  { token: '{{stay.check_in_time}}', label: 'Heure d’arrivée' },
  { token: '{{stay.check_out_time}}', label: 'Heure de départ' },
  { token: '{{financial.rent}}', label: 'Montant de la location' },
  { token: '{{financial.deposit}}', label: 'Dépôt de garantie' },
  { token: '{{contract.date}}', label: 'Date du contrat' },
] as const

export const BLANK_CONTRACT_BLOCKS: ContractTemplateBlock[] = [
  {
    id: 'preamble',
    type: 'preamble',
    title: 'Parties au contrat',
    content: `Le présent contrat est conclu entre {{owner.company}}, représentée par {{owner.name}}, ci-après dénommée « le Bailleur », et {{tenant.name}}, demeurant {{tenant.address}}, ci-après dénommé « le Locataire ».`,
    required: true,
  },
  {
    id: 'stay',
    type: 'article',
    title: 'Article 1 — Le séjour',
    content: `Le Bailleur donne en location saisonnière la propriété « {{property.name}} », située {{property.address}}, du {{stay.arrival}} au {{stay.departure}}, soit {{stay.nights}} nuit(s), pour {{property.max_guests}} personne(s) maximum.`,
    required: true,
  },
  {
    id: 'payment',
    type: 'article',
    title: 'Article 2 — Montant et dépôt de garantie',
    content: `Le montant de la location est fixé à {{financial.rent}}. Le dépôt de garantie est fixé à {{financial.deposit}}.`,
    required: true,
  },
  {
    id: 'signatures',
    type: 'signatures',
    title: 'Signatures des parties',
    content: `Fait en deux exemplaires le {{contract.date}}. Mention manuscrite : « Lu et approuvé ».`,
    required: true,
  },
]

export async function fetchContractTemplates(propertyId?: string) {
  let query = supabase
    .from('contract_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  if (propertyId) {
    query = query.or(`property_id.is.null,property_id.eq.${propertyId}`)
  }

  const { data, error } = await query
  return {
    data: (data as ContractTemplate[] | null) ?? [],
    error,
  }
}

export async function createContractTemplate(options: {
  userId: string
  name: string
  propertyId?: string | null
  description?: string | null
  blocks?: ContractTemplateBlock[]
}) {
  const { data, error } = await supabase
    .from('contract_templates')
    .insert({
      user_id: options.userId,
      created_by: options.userId,
      name: options.name.trim(),
      property_id: options.propertyId ?? null,
      description: options.description?.trim() || null,
      blocks: sanitizeContractBlocks(options.blocks ?? BLANK_CONTRACT_BLOCKS),
      template_data: { schemaVersion: 1 },
    })
    .select('*')
    .single()

  if (error || !data) throw error ?? new Error('Impossible de créer le modèle.')
  return data as ContractTemplate
}

export async function duplicateContractTemplate(
  template: ContractTemplate,
  userId: string,
) {
  return createContractTemplate({
    userId,
    name: `Copie de ${template.name}`,
    propertyId: template.property_id,
    description: template.description,
    blocks: template.blocks.map(block => ({ ...block, id: crypto.randomUUID() })),
  })
}

export async function updateContractTemplate(
  templateId: string,
  updates: Pick<ContractTemplate, 'name' | 'description' | 'property_id' | 'blocks'>,
) {
  const { data, error } = await supabase
    .from('contract_templates')
    .update({
      name: updates.name.trim(),
      description: updates.description?.trim() || null,
      property_id: updates.property_id,
      blocks: sanitizeContractBlocks(updates.blocks),
      template_data: { schemaVersion: 1 },
    })
    .eq('id', templateId)
    .select('*')
    .single()

  if (error || !data) throw error ?? new Error('Impossible d’enregistrer le modèle.')
  return data as ContractTemplate
}

export async function deleteContractTemplate(template: ContractTemplate) {
  if (template.source_file_path) {
    await supabase.storage
      .from(CONTRACT_TEMPLATE_BUCKET)
      .remove([template.source_file_path])
  }
  const { error } = await supabase
    .from('contract_templates')
    .delete()
    .eq('id', template.id)
  if (error) throw error
}

export async function setDefaultContractTemplate(template: ContractTemplate) {
  let clearQuery = supabase
    .from('contract_templates')
    .update({ is_default: false })
    .eq('user_id', template.user_id)

  clearQuery = template.property_id
    ? clearQuery.eq('property_id', template.property_id)
    : clearQuery.is('property_id', null)

  const { error: clearError } = await clearQuery
  if (clearError) throw clearError

  const { data, error } = await supabase
    .from('contract_templates')
    .update({ is_default: true })
    .eq('id', template.id)
    .select('*')
    .single()
  if (error || !data) throw error ?? new Error('Impossible de définir le modèle par défaut.')
  return data as ContractTemplate
}

export async function importContractTemplateFile(options: {
  template: ContractTemplate
  userId: string
  file: File
  onProgress?: (label: string) => void
}) {
  validateTemplateFile(options.file)
  await supabase
    .from('contract_templates')
    .update({ import_status: 'processing', import_error: null })
    .eq('id', options.template.id)

  let storagePath = ''
  try {
    options.onProgress?.('Lecture du document…')
    const text = await extractTemplateFileText(options.file)
    const blocks = parseContractTemplateBlocks(text)
    if (blocks.length === 0) {
      throw new Error('Aucune section éditable n’a pu être extraite du document.')
    }

    options.onProgress?.('Enregistrement du document source…')
    storagePath = `${options.userId}/${options.template.id}/${crypto.randomUUID()}-${safeFileName(options.file.name)}`
    const { error: uploadError } = await supabase.storage
      .from(CONTRACT_TEMPLATE_BUCKET)
      .upload(storagePath, options.file, {
        contentType: options.file.type,
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('contract_templates')
      .update({
        blocks,
        source_file_path: storagePath,
        source_file_name: options.file.name,
        source_mime_type: options.file.type,
        import_status: 'completed',
        import_error: null,
        template_data: { schemaVersion: 1, source: 'owner_import' },
      })
      .eq('id', options.template.id)
      .select('*')
      .single()

    if (error || !data) throw error ?? new Error('Impossible d’enregistrer le modèle importé.')
    if (options.template.source_file_path) {
      await supabase.storage
        .from(CONTRACT_TEMPLATE_BUCKET)
        .remove([options.template.source_file_path])
    }
    options.onProgress?.('Import terminé')
    return data as ContractTemplate
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from(CONTRACT_TEMPLATE_BUCKET).remove([storagePath])
    }
    const message = error instanceof Error ? error.message : 'Import impossible.'
    await supabase
      .from('contract_templates')
      .update({ import_status: 'failed', import_error: message })
      .eq('id', options.template.id)
    throw error
  }
}

export async function createContractTemplateFileSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(CONTRACT_TEMPLATE_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

export function selectContractTemplate(
  templates: ContractTemplate[],
  propertyId?: string,
) {
  return templates.find(template =>
    template.property_id === propertyId && template.is_default
  )
    ?? templates.find(template =>
      template.property_id === propertyId
    )
    ?? templates.find(template =>
      template.property_id === null && template.is_default
    )
    ?? templates.find(template => template.property_id === null)
    ?? templates[0]
    ?? null
}

export function replaceContractVariables(
  text: string,
  values: ContractTemplateValues,
) {
  return text.replace(/\{\{([a-z0-9_.]+)\}\}/gi, (token, key: string) => {
    const value = values[key]
    return value === null || value === undefined || value === ''
      ? `[${token.slice(2, -2)}]`
      : String(value)
  })
}

export function sanitizeContractBlocks(
  blocks: ContractTemplateBlock[],
): ContractTemplateBlock[] {
  return blocks
    .map(block => ({
      id: block.id || crypto.randomUUID(),
      type: isBlockType(block.type) ? block.type : 'article',
      title: String(block.title ?? '').trim(),
      content: String(block.content ?? '').trim(),
      required: Boolean(block.required),
    }))
    .filter(block => block.title || block.content)
}

export function parseContractTemplateBlocks(text: string) {
  const lines = text
    .replace(/\r/g, '\n')
    .replace(/[‐‑–—]/g, '—')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line =>
      line
      && !/^Docusign Envelope ID:/i.test(line)
      && !/^-- \d+ of \d+ --$/.test(line)
      && !/^\d+\s*\/\s*\d+\s+Contrat de location/i.test(line)
    )

  const firstArticleIndex = lines.findIndex(line => /^Article\s+\d+\b/i.test(line))
  if (firstArticleIndex < 0) {
    const content = lines.join('\n\n').trim()
    return content
      ? [{
          id: crypto.randomUUID(),
          type: 'preamble' as const,
          title: 'Document importé',
          content,
          required: true,
        }]
      : []
  }

  const blocks: ContractTemplateBlock[] = []
  const preambleLines = lines.slice(0, firstArticleIndex)
  const preambleStart = preambleLines.findIndex(line =>
    /Le présent contrat|entre les soussignés/i.test(line)
  )
  const preamble = preambleLines
    .slice(preambleStart >= 0 ? preambleStart : Math.max(0, preambleLines.length - 12))
    .join('\n\n')
    .trim()
  if (preamble) {
    blocks.push({
      id: crypto.randomUUID(),
      type: 'preamble',
      title: 'Préambule et parties',
      content: preamble,
      required: true,
    })
  }

  let current: ContractTemplateBlock | null = null
  const flush = () => {
    if (current && (current.title || current.content)) {
      current.content = current.content.trim()
      blocks.push(current)
    }
  }

  for (const line of lines.slice(firstArticleIndex)) {
    const article = line.match(/^Article\s+(\d+)\s*(.*)$/i)
    if (article) {
      flush()
      current = {
        id: crypto.randomUUID(),
        type: ['4', '7', '9', '10'].includes(article[1]) ? 'callout' : 'article',
        title: `Article ${article[1]}${article[2] ? ` — ${article[2].replace(/^[-—:]\s*/, '')}` : ''}`,
        content: '',
        required: true,
      }
      continue
    }

    if (/^SIGNATURES?(?:\s+DES\s+PARTIES)?$/i.test(line)) {
      flush()
      current = {
        id: crypto.randomUUID(),
        type: 'signatures',
        title: 'Signatures des parties',
        content: '',
        required: true,
      }
      continue
    }

    if (current) current.content += `${current.content ? '\n\n' : ''}${line}`
  }
  flush()
  return sanitizeContractBlocks(blocks)
}

async function extractTemplateFileText(file: File) {
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value.trim()
  }
  return extractContractText(file)
}

function validateTemplateFile(file: File) {
  if (!ACCEPTED_CONTRACT_TEMPLATE_FILE_TYPES.includes(file.type)) {
    throw new Error('Format non accepté. Utilisez un PDF, DOCX, JPG, PNG ou WebP.')
  }
  if (file.size > MAX_CONTRACT_TEMPLATE_FILE_SIZE) {
    throw new Error('Le document dépasse la limite de 15 Mo.')
  }
}

function safeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

function isBlockType(value: string): value is ContractTemplateBlockType {
  return ['preamble', 'article', 'callout', 'signatures'].includes(value)
}
