import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { jsPDF } from 'jspdf'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const ownerEmail = process.env.E2E_OWNER_EMAIL
const ownerPassword = process.env.E2E_OWNER_PASSWORD
const canRun = Boolean(supabaseUrl && supabaseAnonKey && ownerEmail && ownerPassword)

test.describe('parcours de réservation authentifiés', () => {
  test.skip(!canRun, 'Variables E2E Supabase manquantes')

  let client: SupabaseClient
  let propertyId: string
  let ownerId: string
  let originalDateFormat = 'DD/MM/YYYY'
  const propertyName = `Villa E2E ${Date.now()}`

  test.beforeAll(async () => {
    client = createClient(supabaseUrl!, supabaseAnonKey!)
    const { data: auth, error: authError } = await client.auth.signInWithPassword({
      email: ownerEmail!,
      password: ownerPassword!,
    })
    expect(authError).toBeNull()
    ownerId = auth.user!.id

    const { data: profile } = await client
      .from('profiles')
      .select('date_format')
      .eq('id', ownerId)
      .single()
    originalDateFormat = profile?.date_format ?? 'DD/MM/YYYY'
    await client
      .from('profiles')
      .update({ date_format: 'DD/MM/YYYY' })
      .eq('id', ownerId)

    const { data, error } = await client
      .from('properties')
      .insert({
        owner_id: ownerId,
        name: propertyName,
        location: 'Nice',
        type: 'villa',
        status: 'active',
        bedrooms: 3,
        bathrooms: 2,
        max_guests: 6,
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    propertyId = data!.id
  })

  test.afterAll(async () => {
    if (!client || !propertyId) return
    const { data: reservations } = await client
      .from('reservations')
      .select('id')
      .eq('property_id', propertyId)
    const reservationIds = (reservations ?? []).map(reservation => reservation.id)

    if (reservationIds.length > 0) {
      const { data: files } = await client
        .from('contract_files')
        .select('storage_path')
        .in('reservation_id', reservationIds)
      const storagePaths = (files ?? []).map(file => file.storage_path)
      if (storagePaths.length > 0) {
        await client.storage.from('contract-files').remove(storagePaths)
      }
      await client.from('payments').delete().in('reservation_id', reservationIds)
      await client.from('contracts').delete().in('reservation_id', reservationIds)
      await client.from('reservations').delete().in('id', reservationIds)
    }
    await client.from('calendar_events').delete().eq('property_id', propertyId)
    await client.from('properties').delete().eq('id', propertyId)
    await client
      .from('profiles')
      .update({ date_format: originalDateFormat })
      .eq('id', ownerId)
    await client.auth.signOut()
  })

  async function login(page: Page) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ownerEmail!)
    await page.getByLabel('Password').fill(ownerPassword!)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL(/\/app$/)
  }

  async function openReservation(page: Page, arrival: string, departure: string) {
    await page.goto('/app/reservations')
    await page.getByRole('button', { name: 'Nouvelle réservation' }).click()
    await page.getByLabel('Propriété').selectOption(propertyId)
    const toFrenchDate = (isoDate: string) => {
      const [year, month, day] = isoDate.split('-')
      return `${day}/${month}/${year}`
    }
    await page.getByLabel('Arrivée').fill(toFrenchDate(arrival))
    await page.getByLabel('Départ').fill(toFrenchDate(departure))
  }

  test('crée les quatre modes et synchronise calendrier, contrats et paiements', async ({ page }) => {
    test.setTimeout(180_000)
    await login(page)

    const guestFlows = [
      { title: 'Contrat à préparer', name: 'Client préparation', arrival: '2040-01-01', departure: '2040-01-03', upload: false },
      { title: 'Contrat déjà fait', name: 'Client signé', arrival: '2040-01-03', departure: '2040-01-05', upload: true },
      { title: 'Contrat par la conciergerie', name: 'Client conciergerie', arrival: '2040-01-05', departure: '2040-01-07', upload: true },
    ]

    for (const flow of guestFlows) {
      await openReservation(page, flow.arrival, flow.departure)
      await page.getByRole('radio', { name: new RegExp(flow.title) }).click()
      await page.getByLabel('Nom du client').fill(flow.name)
      await page.getByLabel(/Montant total/).fill('500')
      if (flow.upload) {
        const pdf = new jsPDF()
        pdf.text(
          `CONTRAT DE LOCATION SAISONNIERE ${flow.name} jeanne@example.com du 03/01/2040 au 05/01/2040 montant 500 EUR`,
          10,
          10,
        )
        await page.locator('input[type="file"]').setInputFiles({
          name: `${flow.name}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from(pdf.output('arraybuffer')),
        })
      }
      await page.getByRole('button', {
        name: flow.upload ? 'Créer et analyser le contrat' : 'Créer et préparer le contrat',
      }).click()

      if (!flow.upload) {
        await expect(page).toHaveURL(/\/app\/contracts\/generate\?reservation=/)
        const downloadPromise = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Générer le PDF' }).click()
        await downloadPromise
        await expect(page.getByText(/enregistré dans le dossier/)).toBeVisible()
        await page.goto('/app/reservations')
      }
      await expect(page.getByText(flow.name)).toBeVisible()
    }

    await openReservation(page, '2040-01-07', '2040-01-09')
    await page.getByRole('radio', { name: /Aucun contrat/ }).click()
    await page.getByLabel('Motif du blocage').selectOption('marketing_event')
    await page.getByLabel('Libellé').fill('Shooting E2E')
    await page.getByRole('button', { name: 'Bloquer les dates' }).click()
    await expect(page.getByText('Shooting E2E')).toBeVisible()

    const { data: reservations } = await client
      .from('reservations')
      .select('id, contract_mode, booking_kind')
      .eq('property_id', propertyId)
    const reservationIds = (reservations ?? []).map(reservation => reservation.id)
    const [{ data: events }, { data: contracts }, { data: payments }] = await Promise.all([
      client.from('calendar_events').select('id').eq('property_id', propertyId),
      client.from('contracts').select('id').in('reservation_id', reservationIds),
      client.from('payments').select('id').in('reservation_id', reservationIds),
    ])

    expect(reservations).toHaveLength(4)
    expect(events).toHaveLength(4)
    expect(contracts).toHaveLength(3)
    expect(payments).toHaveLength(3)

    const { data: files } = await client
      .from('contract_files')
      .select('source, extraction_status')
      .in('reservation_id', reservationIds)
    expect(files).toHaveLength(3)
  })
})
