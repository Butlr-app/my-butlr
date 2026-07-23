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
import {
  parseAssistantTaskDraft,
  sanitizeAssistantTaskDraft,
  taskCreatePath,
  type AssistantTaskDraft,
} from '../_shared/assistantDraft.ts'

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
  draft?: AssistantTaskDraft | null
}

const VALID_PATHS = new Set([
  '/app',
  '/app/properties',
  '/app/properties/new',
  '/app/reservations',
  '/app/calendar',
  '/app/tasks',
  '/app/operations',
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

function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

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
- /app/tasks — Tâches générales
- /app/operations — Entretien & travaux (intervenants : ménage, piscine, jardin, élec, menuiserie…)
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
- /app/partners — Prestataires de services (chef, spa bien-être, transport, activités)
- /app/settings — Paramètres

## Concepts clés
- **Portail voyageur** : app mobile invité (lien /guest/stay/:token)
- **Conciergerie** vs **Boutique** : prestations sur devis vs produits au panier
- **Réserve séjour** : wallet prépayé voyageur
- **Messages séjour** : chat voyageur ↔ équipe
- **Intervenants** (Entretien & travaux) : ménage, pisciniste, jardinier, électricien, menuisier, maintenance — /app/operations
- **Prestataires de services** : chef, spa & bien-être, massage, transport, yacht, activités — /app/partners
- Ne confonds pas **Piscine & spa technique** (intervenant) avec **Spa & bien-être** (service voyageur).

## Création de tâche (préremplissage)
Quand l’utilisateur demande d’ajouter / créer / planifier une tâche ou une intervention :
1. Remplis l’objet "draft" (kind: "task") avec titre, description, dueDate (YYYY-MM-DD), dueTime (HH:MM si mentionné), linkType, priority, categoryHint.
2. categoryHint : "cleaning" (ménage), "pool" (pisciniste / spa technique), "garden" (jardinage), "works" (élec / menuiserie / maintenance), sinon null.
3. linkType : "partner" pour intervenants techniques, "client" pour séjour voyageur, sinon "property".
4. dueDate : convertis aujourd’hui / demain / après-demain à partir de la date du jour fournie dans le contexte.
5. Navigue vers /app/operations?tab=tasks&create=task (intervenant) ou /app/tasks?create=task (tâche générique).
6. Dans "reply", confirme brièvement le titre et la date/heure détectés.
Si ce n’est pas une création de tâche, mets "draft" à null.

## Routage recommandé
- Intervention / facture / suivi **ménage, pisciniste, jardinage, électricité, menuiserie, travaux** → /app/operations?tab=tasks&create=task
- Chef / spa bien-être / massage / transport / activités → /app/partners
- Tâche générique (rappel client, admin) → /app/tasks?create=task

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
    draft: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string', enum: ['task'] },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            dueDate: { type: ['string', 'null'] },
            dueTime: { type: ['string', 'null'] },
            linkType: { type: ['string', 'null'], enum: ['client', 'property', 'partner', null] },
            priority: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
            categoryHint: { type: ['string', 'null'], enum: ['pool', 'garden', 'works', 'cleaning', null] },
          },
          required: [
            'kind',
            'title',
            'description',
            'dueDate',
            'dueTime',
            'linkType',
            'priority',
            'categoryHint',
          ],
        },
      ],
    },
  },
  required: ['reply', 'quickReplies', 'actions', 'draft'],
}

function isAllowedNavigatePath(path: string): boolean {
  try {
    const url = new URL(path, 'https://local.invalid')
    return VALID_PATHS.has(url.pathname)
  } catch {
    return VALID_PATHS.has(path)
  }
}

function withDraftNavigation(response: AssistantResponse): AssistantResponse {
  const draft = response.draft
  if (!draft) return response

  const createPath = taskCreatePath(draft)
  const actions = [...(response.actions ?? [])]
  const hasCreate = actions.some(action => {
    try {
      const url = new URL(action.path, 'https://local.invalid')
      return url.searchParams.get('create') === 'task'
    } catch {
      return false
    }
  })

  if (!hasCreate) {
    actions.unshift({
      type: 'navigate',
      path: createPath,
      label: draft.categoryHint ? 'Finaliser l’intervention' : 'Finaliser la tâche',
    })
  }

  return { ...response, actions: actions.slice(0, 3) }
}

function sanitizeResponse(raw: AssistantResponse, _currentPath?: string): AssistantResponse {
  const actions = (raw.actions ?? [])
    .filter(a => a.type === 'navigate' && isAllowedNavigatePath(a.path))
    .slice(0, 3)

  const quickReplies = (raw.quickReplies ?? [])
    .filter(q => typeof q === 'string' && q.trim().length > 0)
    .slice(0, 3)

  const draft = sanitizeAssistantTaskDraft(raw.draft)
  const reply = raw.reply?.trim() || 'Je suis là pour vous aider dans My Butlr.'
  return withDraftNavigation({ reply, quickReplies, actions, draft })
}

function keywordFallback(message: string, currentPath?: string): AssistantResponse {
  const q = message.toLowerCase()
  const taskDraft = parseAssistantTaskDraft(message)

  if (taskDraft) {
    const path = taskCreatePath(taskDraft)
    const when = [
      taskDraft.dueDate ? `pour le ${taskDraft.dueDate}` : null,
      taskDraft.dueTime ? `à ${taskDraft.dueTime}` : null,
    ].filter(Boolean).join(' ')

    return sanitizeResponse({
      reply: `J’ai préparé « ${taskDraft.title} »${when ? ` ${when}` : ''}. Ouvrez le formulaire pour finaliser (villa / prestataire).`,
      quickReplies: ['Créer une autre tâche', 'Voir mes tâches', 'Retour au tableau de bord'],
      actions: [{ type: 'navigate', path, label: 'Finaliser la tâche' }],
      draft: taskDraft,
    }, currentPath)
  }

  if (/portail|voyageur|invité|guest/.test(q)) {
    return sanitizeResponse({
      reply: 'Le portail voyageur se configure par propriété : contenus d’accueil, Wi-Fi, guides, toggles conciergerie/boutique/messagerie.',
      quickReplies: ['Activer la messagerie', 'Différence boutique / conciergerie', 'Résumé de ma situation'],
      actions: [{ type: 'navigate', path: '/app/guest-portal', label: 'Ouvrir le portail voyageur' }],
      draft: null,
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
      draft: null,
    }, currentPath)
  }

  if (/conciergerie|prestation|chef|service/.test(q)) {
    return sanitizeResponse({
      reply: 'Le catalogue conciergerie regroupe les prestations proposées aux voyageurs (devis, coordination).',
      quickReplies: ['Devis en attente', 'Créer un service', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/services', label: 'Ouvrir la conciergerie' }],
      draft: null,
    }, currentPath)
  }

  if (/paramètre|settings|équipe|team/.test(q)) {
    return sanitizeResponse({
      reply: 'Les paramètres couvrent le compte, l’équipe, les rôles et les notifications.',
      quickReplies: ['Propriétés', 'Partenaires', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/settings', label: 'Paramètres' }],
      draft: null,
    }, currentPath)
  }

  if (/entretien|piscin|jardin|travaux|maintenance|spa technique|m[eé]nage|[eé]lectric|menuis|facture.?prestataire|artisan|intervenant/.test(q)) {
    return sanitizeResponse({
      reply: 'Entretien & travaux regroupe les intervenants techniques (ménage, piscine, jardin, électricité, menuiserie) : tâches et factures. Les chefs / spa bien-être sont dans Prestataires de services.',
      quickReplies: ['Planifier une intervention', 'Voir les factures', 'Ajouter un intervenant'],
      actions: [{ type: 'navigate', path: '/app/operations', label: 'Entretien & travaux' }],
      draft: null,
    }, currentPath)
  }

  if (/chef|massage|spa bien|prestataire.?de.?service|activit[eé]|transport|yacht/.test(q) && !/piscin|spa technique|m[eé]nage/.test(q)) {
    return sanitizeResponse({
      reply: 'Les prestataires de services voyageur (chef, spa & bien-être, transport, activités) se gèrent dans Prestataires de services.',
      quickReplies: ['Ajouter un chef', 'Résumé', 'Entretien & travaux'],
      actions: [{ type: 'navigate', path: '/app/partners', label: 'Prestataires de services' }],
      draft: null,
    }, currentPath)
  }

  if (/tâche|tache|task/.test(q)) {
    return sanitizeResponse({
      reply: 'Les tâches générales se gèrent dans Tâches. Pour les intervenants villa (ménage, piscine, jardin, travaux), préférez Entretien & travaux.',
      quickReplies: ['Entretien & travaux', 'Résumé', 'Calendrier'],
      actions: [
        { type: 'navigate', path: '/app/tasks', label: 'Voir les tâches' },
        { type: 'navigate', path: '/app/operations', label: 'Entretien & travaux' },
      ],
      draft: null,
    }, currentPath)
  }

  return sanitizeResponse({
    reply: currentPath
      ? `Vous êtes sur ${currentPath}. Demandez-moi un résumé de votre activité, vos réservations ou la messagerie.`
      : 'Bonjour ! Demandez un résumé de votre activité, vos réservations cette semaine, ou comment configurer le portail voyageur.',
    quickReplies: ['Résumé de ma situation', 'Réservations cette semaine', 'Messages non lus'],
    actions: [{ type: 'navigate', path: '/app', label: 'Tableau de bord' }],
    draft: null,
  }, currentPath)
}

function ensureDraftFromMessage(response: AssistantResponse, message: string): AssistantResponse {
  if (response.draft) return withDraftNavigation(response)
  const parsed = parseAssistantTaskDraft(message)
  if (!parsed) return response
  return withDraftNavigation({
    ...response,
    draft: parsed,
    reply: response.reply.includes(parsed.title)
      ? response.reply
      : `J’ai préparé « ${parsed.title} ». ${response.reply}`,
  })
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
    `Date du jour (Europe/Paris locale serveur) : ${todayIso()}`,
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
      response = ensureDraftFromMessage(aiReply, lastUser.content)
      source = 'ai'
    } else if (snapshot) {
      const dataReply = dataKeywordFallback(lastUser.content, snapshot, context.currentPath)
      response = ensureDraftFromMessage(
        sanitizeResponse(dataReply ?? keywordFallback(lastUser.content, context.currentPath), context.currentPath),
        lastUser.content,
      )
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
