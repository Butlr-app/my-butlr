import { supabase } from './supabase'
import type { Reservation } from './types'

export type PricingCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF'
export type SeasonColor = 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'violet'
export type RateAvailability = 'available' | 'blocked' | 'closed_to_arrival' | 'closed_to_departure'

export interface PropertyPricingSettings {
  property_id: string
  currency: PricingCurrency
  base_rate: number
  weekend_rate: number | null
  cleaning_fee: number
  security_deposit: number
  tourist_tax_per_person: number
  extra_guest_fee: number
  extra_guest_after: number
  minimum_stay: number
  maximum_stay: number | null
  check_in_time: string
  check_out_time: string
}

export interface PropertyRateSeason {
  id: string
  property_id: string
  name: string
  start_date: string
  end_date: string
  nightly_rate: number
  weekend_rate: number | null
  minimum_stay: number
  weekly_discount: number
  monthly_discount: number
  priority: number
  color: SeasonColor
  active: boolean
}

export interface PropertyRateOverride {
  id: string
  property_id: string
  date: string
  nightly_rate: number | null
  minimum_stay: number | null
  availability: RateAvailability
  note: string | null
}

export interface EffectiveNightRate {
  date: string
  rate: number
  minimumStay: number
  availability: RateAvailability | 'booked'
  source: 'override' | 'season' | 'base'
  season?: PropertyRateSeason
  override?: PropertyRateOverride
  reservation?: Reservation
}

export interface StayQuote {
  currency: PricingCurrency
  nights: number
  minimumStay: number
  accommodationSubtotal: number
  discountRate: number
  discountAmount: number
  cleaningFee: number
  extraGuestFee: number
  touristTax: number
  total: number
  unavailableDates: string[]
}

function numberOrNull(value: unknown): number | null {
  return value === null || value === undefined || value === '' ? null : Number(value)
}

function normalizeSettings(row: Record<string, unknown>): PropertyPricingSettings {
  return {
    property_id: String(row.property_id),
    currency: row.currency as PricingCurrency,
    base_rate: Number(row.base_rate),
    weekend_rate: numberOrNull(row.weekend_rate),
    cleaning_fee: Number(row.cleaning_fee),
    security_deposit: Number(row.security_deposit),
    tourist_tax_per_person: Number(row.tourist_tax_per_person),
    extra_guest_fee: Number(row.extra_guest_fee),
    extra_guest_after: Number(row.extra_guest_after),
    minimum_stay: Number(row.minimum_stay),
    maximum_stay: numberOrNull(row.maximum_stay),
    check_in_time: String(row.check_in_time).slice(0, 5),
    check_out_time: String(row.check_out_time).slice(0, 5),
  }
}

function normalizeSeason(row: Record<string, unknown>): PropertyRateSeason {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    name: String(row.name),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    nightly_rate: Number(row.nightly_rate),
    weekend_rate: numberOrNull(row.weekend_rate),
    minimum_stay: Number(row.minimum_stay),
    weekly_discount: Number(row.weekly_discount),
    monthly_discount: Number(row.monthly_discount),
    priority: Number(row.priority),
    color: row.color as SeasonColor,
    active: Boolean(row.active),
  }
}

function normalizeOverride(row: Record<string, unknown>): PropertyRateOverride {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    date: String(row.date),
    nightly_rate: numberOrNull(row.nightly_rate),
    minimum_stay: numberOrNull(row.minimum_stay),
    availability: row.availability as RateAvailability,
    note: row.note ? String(row.note) : null,
  }
}

export function isWeekendDate(isoDate: string) {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay()
  return day === 5 || day === 6
}

export function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = []
  const current = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

export function getEffectiveNightRate(options: {
  date: string
  settings: PropertyPricingSettings
  seasons: PropertyRateSeason[]
  overrides: PropertyRateOverride[]
  reservations?: Reservation[]
}): EffectiveNightRate {
  const { date, settings, seasons, overrides, reservations = [] } = options
  const override = overrides.find(item => item.date === date)
  const season = seasons
    .filter(item => item.active && item.start_date <= date && item.end_date >= date)
    .sort((a, b) => b.priority - a.priority)[0]
  const reservation = reservations.find(item =>
    item.status !== 'cancelled' && item.arrival <= date && item.departure > date
  )
  const weekend = isWeekendDate(date)
  const seasonRate = weekend
    ? season?.weekend_rate ?? season?.nightly_rate
    : season?.nightly_rate
  const baseRate = weekend ? settings.weekend_rate ?? settings.base_rate : settings.base_rate

  return {
    date,
    rate: override?.nightly_rate ?? seasonRate ?? baseRate,
    minimumStay: override?.minimum_stay ?? season?.minimum_stay ?? settings.minimum_stay,
    availability: reservation ? 'booked' : override?.availability ?? 'available',
    source: override?.nightly_rate !== null && override?.nightly_rate !== undefined
      ? 'override'
      : season ? 'season' : 'base',
    season,
    override,
    reservation,
  }
}

export function formatPrice(value: number, currency: PricingCurrency) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export function calculateStayQuote(options: {
  arrival: string
  departure: string
  guests: number
  settings: PropertyPricingSettings
  seasons: PropertyRateSeason[]
  overrides: PropertyRateOverride[]
  reservations?: Reservation[]
}): StayQuote {
  const departureDate = new Date(`${options.departure}T12:00:00Z`)
  departureDate.setUTCDate(departureDate.getUTCDate() - 1)
  const lastNight = departureDate.toISOString().slice(0, 10)
  const dates = options.departure > options.arrival
    ? getDateRange(options.arrival, lastNight)
    : []
  const nights = dates.map(date => getEffectiveNightRate({
    date,
    settings: options.settings,
    seasons: options.seasons,
    overrides: options.overrides,
    reservations: options.reservations,
  }))
  const accommodationSubtotal = nights.reduce((sum, night) => sum + night.rate, 0)
  const firstNight = nights[0]
  const discountRate = nights.length >= 30
    ? firstNight?.season?.monthly_discount ?? 0
    : nights.length >= 7
      ? firstNight?.season?.weekly_discount ?? 0
      : 0
  const discountAmount = accommodationSubtotal * discountRate / 100
  const extraGuests = Math.max(0, options.guests - options.settings.extra_guest_after)
  const extraGuestFee = extraGuests * options.settings.extra_guest_fee * nights.length
  const touristTax = options.guests * options.settings.tourist_tax_per_person * nights.length

  return {
    currency: options.settings.currency,
    nights: nights.length,
    minimumStay: firstNight?.minimumStay ?? options.settings.minimum_stay,
    accommodationSubtotal,
    discountRate,
    discountAmount,
    cleaningFee: options.settings.cleaning_fee,
    extraGuestFee,
    touristTax,
    total: accommodationSubtotal
      - discountAmount
      + options.settings.cleaning_fee
      + extraGuestFee
      + touristTax,
    unavailableDates: nights
      .filter(night => night.availability !== 'available')
      .map(night => night.date),
  }
}

export async function fetchPropertyPricing(propertyId: string) {
  const [settingsResult, seasonsResult, overridesResult] = await Promise.all([
    supabase.from('property_pricing_settings').select('*').eq('property_id', propertyId).single(),
    supabase.from('property_rate_seasons').select('*').eq('property_id', propertyId).order('start_date'),
    supabase.from('property_rate_overrides').select('*').eq('property_id', propertyId).order('date'),
  ])

  return {
    settings: settingsResult.data
      ? normalizeSettings(settingsResult.data as Record<string, unknown>)
      : null,
    seasons: ((seasonsResult.data ?? []) as Record<string, unknown>[]).map(normalizeSeason),
    overrides: ((overridesResult.data ?? []) as Record<string, unknown>[]).map(normalizeOverride),
    error: settingsResult.error ?? seasonsResult.error ?? overridesResult.error,
  }
}

export async function savePricingSettings(settings: PropertyPricingSettings) {
  const { data, error } = await supabase
    .from('property_pricing_settings')
    .upsert({
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'property_id' })
    .select('*')
    .single()

  return {
    settings: data ? normalizeSettings(data as Record<string, unknown>) : null,
    error,
  }
}

export async function saveRateSeason(
  season: Omit<PropertyRateSeason, 'id'> & { id?: string },
) {
  const payload = {
    ...season,
    updated_at: new Date().toISOString(),
  }
  const query = season.id
    ? supabase.from('property_rate_seasons').update(payload).eq('id', season.id)
    : supabase.from('property_rate_seasons').insert(payload)
  const { data, error } = await query.select('*').single()

  return {
    season: data ? normalizeSeason(data as Record<string, unknown>) : null,
    error,
  }
}

export async function deleteRateSeason(seasonId: string) {
  return supabase.from('property_rate_seasons').delete().eq('id', seasonId)
}

export async function saveRateOverrides(options: {
  propertyId: string
  startDate: string
  endDate: string
  nightlyRate: number | null
  minimumStay: number | null
  availability: RateAvailability
  note: string | null
}) {
  const rows = getDateRange(options.startDate, options.endDate).map(date => ({
    property_id: options.propertyId,
    date,
    nightly_rate: options.nightlyRate,
    minimum_stay: options.minimumStay,
    availability: options.availability,
    note: options.note,
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('property_rate_overrides')
    .upsert(rows, { onConflict: 'property_id,date' })
    .select('*')

  return {
    overrides: ((data ?? []) as Record<string, unknown>[]).map(normalizeOverride),
    error,
  }
}

export async function deleteRateOverride(overrideId: string) {
  return supabase.from('property_rate_overrides').delete().eq('id', overrideId)
}
