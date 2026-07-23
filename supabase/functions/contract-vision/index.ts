// deno-lint-ignore-file no-explicit-any
import {
  corsHeaders,
  getAuthenticatedUser,
  jsonResponse,
  requiredEnv,
} from '../_shared/signing.ts'

const acceptedTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const maxPayloadSize = 18 * 1024 * 1024

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Méthode non autorisée.' }, 405)

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return jsonResponse({ error: 'Authentification requise.' }, 401)

    const form = await req.formData()
    const files = form.getAll('files').filter((value): value is File => value instanceof File)
    if (files.length === 0) return jsonResponse({ error: 'Aucun contrat reçu.' }, 400)
    if (files.some(file => !acceptedTypes.has(file.type))) {
      return jsonResponse({ error: 'Un format de fichier n’est pas accepté.' }, 400)
    }
    const totalSize = files.reduce((size, file) => size + file.size, 0)
    if (totalSize > maxPayloadSize) {
      return jsonResponse({ error: 'Le document dépasse 18 Mo.' }, 413)
    }

    const model = Deno.env.get('OPENAI_VISION_MODEL') ?? 'gpt-4.1-mini'
    const content: any[] = [{
      type: 'input_text',
      text: contractAnalysisPrompt,
    }]
    for (const file of files) {
      const fileData = `data:${file.type};base64,${toBase64(new Uint8Array(await file.arrayBuffer()))}`
      content.push(file.type === 'application/pdf'
        ? { type: 'input_file', filename: file.name, file_data: fileData }
        : { type: 'input_image', image_url: fileData, detail: 'high' })
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [{ role: 'user', content }],
        temperature: 0,
        text: {
          format: {
            type: 'json_schema',
            name: 'contract_prefill',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                guestName: { type: ['string', 'null'] },
                guestEmail: { type: ['string', 'null'] },
                guestPhone: { type: ['string', 'null'] },
                arrival: { type: ['string', 'null'] },
                departure: { type: ['string', 'null'] },
                totalAmount: { type: ['number', 'null'] },
              },
              required: [
                'guestName',
                'guestEmail',
                'guestPhone',
                'arrival',
                'departure',
                'totalAmount',
              ],
            },
          },
        },
      }),
    })

    const result = await openAiResponse.json()
    if (!openAiResponse.ok) {
      console.error('OpenAI contract analysis failed', result)
      return jsonResponse({ error: 'Le service Vision n’a pas pu analyser ce contrat.' }, 502)
    }
    const outputText = result.output
      ?.flatMap((item: any) => item.content ?? [])
      .find((item: any) => item.type === 'output_text')
      ?.text
    if (!outputText) return jsonResponse({ error: 'Réponse Vision vide.' }, 502)

    const prefill = JSON.parse(outputText)
    return jsonResponse({ prefill, model })
  } catch (error) {
    console.error('Contract Vision error', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Analyse Vision impossible.',
    }, 500)
  }
})

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768))
  }
  return btoa(binary)
}

const contractAnalysisPrompt = `
Tu analyses un contrat de location saisonnière français à partir de son PDF ou de ses photos.
Lis visuellement tout le document, y compris les tableaux, scans, annotations et pages inclinées.

Extrais uniquement :
- guestName : nom complet du LOCATAIRE, PRENEUR, CLIENT ou VOYAGEUR. Ne prends jamais le bailleur,
  propriétaire, mandataire ou la conciergerie.
- guestEmail et guestPhone : coordonnées du même locataire. Ne prends pas celles du bailleur.
- arrival et departure : dates du séjour, au format ISO YYYY-MM-DD. Ignore la date de signature,
  la date d'édition, les échéances de paiement et les dates d'état des lieux si elles diffèrent.
- totalAmount : prix ou loyer TOTAL du séjour, nombre sans symbole monétaire. Ne prends jamais
  l'acompte, le solde, la caution, le dépôt de garantie, les taxes ni les frais isolés.

Si une donnée n'est pas explicitement lisible ou reste ambiguë, renvoie null. N'invente rien.
`
