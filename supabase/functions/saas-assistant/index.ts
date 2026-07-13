// deno-lint-ignore-file no-explicit-any
import {
  corsHeaders,
  getAuthenticatedUser,
  getAdminClient,
  jsonResponse,
} from '../_shared/signing.ts'
import {
  dataKeywordFallback,
  fetchSaasSnapshot,
  formatSnapshotForPrompt,
  needsLiveData,
  type SaasSnapshot,
} from '../_shared/saasSnapshot.ts'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantAction {
  type: 'navigate'
  path: string
  label: string
}

interface AssistantResponse {
  reply: string
  quickReplies?: string[]
  actions?: AssistantAction[]
}

const VALID_PATHS = new Set([
  '/app',
  '/app/properties',
  '/app/properties/new',
  '/app/reservations',
  '/app/calendar',
  '/app/tasks',
  '/app/guest-portal',
  '/app/messages',
  '/app/stay-reserves',
  '/app/services',
  '/app/boutique',
  '/app/boutique/catalog',
  '/app/payments',
  '/app/contracts',
  '/app/contracts/generate',
  '/app/invoices/generate',
  '/app/reports',
  '/app/partners',
  '/app/settings',
])

const systemPrompt = `Tu es l'assistant My Butlr, intégré au back-office SaaS de gestion de villas de luxé.
Réponds TOUJOURS en français, de façon concise et actionnable (2-4 phrases max sauf si procédure détaillée demandée).

Tu aides les propriétaires, house managers et conciergeries à utiliser la plateforme ET à interpréter leurs données live (réservations, messages, devis, réserve séjour).

Quand des "Données live" sont fournies, appuie-toi UNIQUEMENT sur ces chiffres — ne les invente pas.
Cite les nombres pertinents dans ta réponse. Si une donnée vaut 0, dis-le clairement.

## Navigation (chemins internes autorisés)
- /app — Tableau de bord
- /app/properties — Propriétés
- /app/properties/new — Créer une propriété
- /app/reservations — Réservations
- /app/calendar — Calendrier
- /app/tasks — Tâches
- /app/guest-portal — Configuration portail voyageur
- /app/messages — Messages séjour
- /app/stay-reserves — Réserve séjour
- /app/services — Catalogue conciergerie
- /app/boutique — Boutique commandes
- /app/boutique/catalog — Catalogue boutique
- /app/payments — Paiements
- /app/contracts — Contrats
- /app/contracts/generate — Générer un contrat
- /app/invoices/generate — Factures
- /app/reports — Rapports
- /app/partners — Partenaires
- /app/settings — Paramètres

## Concepts clés
- **Portail voyageur** : app mobile invité (lien /guest/stay/:token)
- **Conciergerie** vs **Boutique** : prestations sur devis vs produits au panier
- **Réserve séjour** : wallet prépayé voyageur
- **Messages séjour** : chat voyageur ↔ équipe

Quand tu proposes une action de navigation, inclus-la dans "actions".
Propose 2-3 "quickReplies" pertinents.
Ne invente pas de fonctionnalités absentes.`

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    quickReplies: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 3,
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['navigate'] },
          path: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['type', 'path', 'label'],
      },
      maxItems: 3,
    },
  },
  required: ['reply', 'quickReplies', 'actions'],
}

function sanitizeResponse(raw: AssistantResponse, currentPath?: string): AssistantResponse {
  const actions = (raw.actions ?? [])
    .filter(a => a.type === 'navigate' && VALID_PATHS.has(a.path))
    .slice(0, 3)

  const quickReplies = (raw.quickReplies ?? [])
    .filter(q => typeof q === 'string' && q.trim().length > 0)
    .slice(0, 3)

  const reply = raw.reply?.trim() || 'Je suis là pour vous aider dans My Butlr.'
  return { reply, quickReplies, actions }
}

function keywordFallback(message: string, currentPath?: string): AssistantResponse {
  const q = message.toLowerCase()

  if (/portail|voyageur|invité|guest/.test(q)) {
    return sanitizeResponse({
      reply: 'Le portail voyageur se configure par propriété : contenus d’accueil, Wi-Fi, guides, toggles conciergerie/boutique/messagerie.',
      quickReplies: ['Activer la messagerie', 'Différence boutique / conciergerie', 'Résumé de ma situation'],
      actions: [{ type: 'navigate', path: '/app/guest-portal', label: 'Ouvrir le portail voyageur' }],
    }, currentPath)
  }

  if (/boutique|produit|catalogue|commande/.test(q)) {
    return sanitizeResponse({
      reply: 'La Boutique gère les produits et packs. La Conciergerie couvre les prestations sur devis.',
      quickReplies: ['Combien de commandes actives ?', 'Catalogue boutique', 'Catalogue conciergerie'],
      actions: [
        { type: 'navigate', path: '/app/boutique/catalog', label: 'Catalogue boutique' },
        { type: 'navigate', path: '/app/boutique', label: 'Commandes boutique' },
      ],
    }, currentPath)
  }

  if (/conciergerie|prestation|chef|service/.test(q)) {
    return sanitizeResponse({
      reply: 'Le catalogue conciergerie regroupe les prestations proposées aux voyageurs (devis, coordination).',
      quickReplies: ['Devis en attente', 'Créer un service', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/services', label: 'Ouvrir la conciergerie' }],
    }, currentPath)
  }

  if (/paramètre|settings|équipe|team/.test(q)) {
    return sanitizeResponse({
      reply: 'Les paramètres couvrent le compte, l’équipe, les rôles et les notifications.',
      quickReplies: ['Propriétés', 'Partenaires', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/settings', label: 'Paramètres' }],
    }, currentPath)
  }

  return sanitizeResponse({
    reply: currentPath
      ? `Vous êtes sur ${currentPath}. Demandez-moi un résumé de votre activité, vos réservations ou la messagerie.`
      : 'Bonjour ! Demandez un résumé de votre activité, vos réservations cette semaine, ou comment configurer le portail voyageur.',
    quickReplies: ['Résumé de ma situation', 'Réservations cette semaine', 'Messages non lus'],
    actions: [{ type: 'navigate', path: '/app', label: 'Tableau de bord' }],
  }, currentPath)
}

async function askOpenAi(
  messages: ChatMessage[],
  context: {
    currentPath?: string
    userName?: string
    userRole?: string
    snapshot?: SaasSnapshot
  },
): Promise<AssistantResponse | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return null

  const model = Deno.env.get('OPENAI_CHAT_MODEL') ?? Deno.env.get('OPENAI_VISION_MODEL') ?? 'gpt-4.1-mini'

  const contextLine = [
    context.userName ? `Utilisateur : ${context.userName}` : null,
    context.userRole ? `Rôle : ${context.userRole}` : null,
    context.currentPath ? `Page actuelle : ${context.currentPath}` : null,
  ].filter(Boolean).join(' · ')

  const snapshotBlock = context.snapshot
    ? `\n\n${formatSnapshotForPrompt(context.snapshot)}`
    : ''

  const openAiMessages = [
    {
      role: 'system',
      content: systemPrompt + (contextLine ? `\n\nContexte session : ${contextLine}` : '') + snapshotBlock,
    },
    ...messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
  ]

  const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: openAiMessages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'saas_assistant_reply',
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  })

  const result = await openAiResponse.json()
  if (!openAiResponse.ok) {
    console.error('OpenAI saas-assistant failed', result)
    return null
  }

  const text = result.choices?.[0]?.message?.content
  if (!text) return null

  try {
    return sanitizeResponse(JSON.parse(text) as AssistantResponse, context.currentPath)
  } catch {
    return null
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Méthode non autorisée.' }, 405)

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return jsonResponse({ error: 'Authentification requise.' }, 401)

    const body = await req.json()
    const messages = (body.messages ?? []) as ChatMessage[]
    const lastUser = [...messages].reverse().find(m => m.role === 'user')

    if (!lastUser?.content?.trim()) {
      return jsonResponse({ error: 'Message requis.' }, 400)
    }

    const context = {
      currentPath: typeof body.currentPath === 'string' ? body.currentPath : undefined,
      userName: typeof body.userName === 'string' ? body.userName : undefined,
      userRole: typeof body.userRole === 'string' ? body.userRole : undefined,
    }

    const admin = getAdminClient()
    const wantsData = needsLiveData(lastUser.content)
    const snapshot = wantsData ? await fetchSaasSnapshot(admin, user.id) : undefined

    const aiReply = await askOpenAi(messages, { ...context, snapshot })
    let response: AssistantResponse
    let source: 'ai' | 'data' | 'fallback'

    if (aiReply) {
      response = aiReply
      source = 'ai'
    } else if (snapshot) {
      const dataReply = dataKeywordFallback(lastUser.content, snapshot, context.currentPath)
      response = sanitizeResponse(dataReply ?? keywordFallback(lastUser.content, context.currentPath), context.currentPath)
      source = dataReply ? 'data' : 'fallback'
    } else {
      response = keywordFallback(lastUser.content, context.currentPath)
      source = 'fallback'
    }

    return jsonResponse({ ...response, source, snapshot: snapshot ?? null })
  } catch (error) {
    console.error('saas-assistant error', error)
    return jsonResponse({ error: 'Assistant indisponible.' }, 500)
  }
})
