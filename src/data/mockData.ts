export const properties = [
  {
    id: '1',
    name: 'Villa French Way',
    location: 'Saint-Tropez, France',
    status: 'occupied' as const,
    currentGuest: 'M. & Mme Laurent',
    nextArrival: '28 Jun 2026',
    revenueThisMonth: 24500,
    image: '',
    bedrooms: 6,
    bathrooms: 5,
    maxGuests: 12,
  },
  {
    id: '2',
    name: 'French West Yacht',
    location: 'Caribbean',
    status: 'available' as const,
    currentGuest: null,
    nextArrival: '5 Jul 2026',
    revenueThisMonth: 18200,
    image: '',
    bedrooms: 4,
    bathrooms: 4,
    maxGuests: 8,
  },
  {
    id: '3',
    name: 'Villa Mauritius',
    location: 'Mauritius',
    status: 'maintenance' as const,
    currentGuest: null,
    nextArrival: '12 Jul 2026',
    revenueThisMonth: 31000,
    image: '',
    bedrooms: 8,
    bathrooms: 7,
    maxGuests: 16,
  },
]

export const reservations = [
  {
    id: 'R-001',
    guestName: 'M. & Mme Laurent',
    property: 'Villa French Way',
    arrival: '2026-06-20',
    departure: '2026-06-28',
    guests: 4,
    status: 'confirmed' as const,
    paymentStatus: 'paid' as const,
    depositStatus: 'received' as const,
    contractStatus: 'signed' as const,
  },
  {
    id: 'R-002',
    guestName: 'Famille Dubois',
    property: 'French West Yacht',
    arrival: '2026-07-05',
    departure: '2026-07-12',
    guests: 6,
    status: 'pending' as const,
    paymentStatus: 'partial' as const,
    depositStatus: 'pending' as const,
    contractStatus: 'sent' as const,
  },
  {
    id: 'R-003',
    guestName: 'M. Anderson',
    property: 'Villa Mauritius',
    arrival: '2026-07-12',
    departure: '2026-07-22',
    guests: 8,
    status: 'confirmed' as const,
    paymentStatus: 'paid' as const,
    depositStatus: 'received' as const,
    contractStatus: 'signed' as const,
  },
  {
    id: 'R-004',
    guestName: 'Mme Chen',
    property: 'Villa French Way',
    arrival: '2026-07-01',
    departure: '2026-07-08',
    guests: 2,
    status: 'pending' as const,
    paymentStatus: 'pending' as const,
    depositStatus: 'pending' as const,
    contractStatus: 'draft' as const,
  },
]

export const services = [
  { id: '1', name: 'Private Chef', description: 'Exclusive dining experience prepared in your villa', startingPrice: 850, commission: 15, available: true, category: 'dining' },
  { id: '2', name: 'Airport Transfer', description: 'Luxury chauffeur service from airport to property', startingPrice: 250, commission: 10, available: true, category: 'transport' },
  { id: '3', name: 'Luxury Car Rental', description: 'Premium vehicles delivered to your door', startingPrice: 500, commission: 12, available: true, category: 'transport' },
  { id: '4', name: 'Boat Rental', description: 'Private yacht and boat excursions along the coast', startingPrice: 2000, commission: 15, available: true, category: 'leisure' },
  { id: '5', name: 'Wellness & Massage', description: 'In-villa spa treatments and wellness sessions', startingPrice: 200, commission: 20, available: true, category: 'wellness' },
  { id: '6', name: 'Private Shopping', description: 'Personal shopper and luxury boutique access', startingPrice: 300, commission: 18, available: true, category: 'lifestyle' },
  { id: '7', name: 'Security', description: 'Discreet personal security and property surveillance', startingPrice: 1500, commission: 10, available: true, category: 'security' },
  { id: '8', name: 'Event Planning', description: 'Bespoke events from intimate dinners to celebrations', startingPrice: 3000, commission: 15, available: false, category: 'events' },
  { id: '9', name: 'Pre-stocking', description: 'Groceries, beverages and amenities before arrival', startingPrice: 400, commission: 12, available: true, category: 'provisions' },
  { id: '10', name: 'Babysitting', description: 'Qualified childcare professionals available on request', startingPrice: 50, commission: 15, available: true, category: 'family' },
  { id: '11', name: 'Cleaning', description: 'Daily housekeeping and deep cleaning services', startingPrice: 150, commission: 10, available: true, category: 'housekeeping' },
  { id: '12', name: 'Laundry', description: 'Premium laundry and dry cleaning pickup and delivery', startingPrice: 80, commission: 10, available: true, category: 'housekeeping' },
]

export const tasks = [
  { id: '1', title: 'Prepare welcome basket', status: 'todo' as const, property: 'Villa French Way', priority: 'high' as const },
  { id: '2', title: 'Verify pool temperature', status: 'in_progress' as const, property: 'Villa French Way', priority: 'medium' as const },
  { id: '3', title: 'Check villa access codes', status: 'done' as const, property: 'Villa French Way', priority: 'high' as const },
  { id: '4', title: 'Confirm private chef dinner', status: 'todo' as const, property: 'Villa French Way', priority: 'high' as const },
  { id: '5', title: 'Inspect exterior guardrails', status: 'waiting' as const, property: 'Villa Mauritius', priority: 'medium' as const },
  { id: '6', title: 'Prepare guest arrival briefing', status: 'in_progress' as const, property: 'French West Yacht', priority: 'high' as const },
  { id: '7', title: 'Confirm housekeeping schedule', status: 'todo' as const, property: 'Villa Mauritius', priority: 'low' as const },
  { id: '8', title: 'Check minibar and pre-stocking', status: 'waiting' as const, property: 'Villa French Way', priority: 'medium' as const },
]

export const partners = [
  { id: '1', name: 'Chef Martin', category: 'Private Chef', location: 'Saint-Tropez', contact: 'martin@chef.fr', commission: 15, status: 'active' as const, rating: 4.9, bookings: 32 },
  { id: '2', name: 'Riviera Cars', category: 'Car Rental', location: 'Nice', contact: 'contact@rivieracars.com', commission: 12, status: 'active' as const, rating: 4.7, bookings: 48 },
  { id: '3', name: 'Azure Boats', category: 'Boat Rental', location: 'Cannes', contact: 'booking@azureboats.com', commission: 15, status: 'active' as const, rating: 4.8, bookings: 21 },
  { id: '4', name: 'Spa Prestige', category: 'Wellness', location: 'Saint-Tropez', contact: 'info@spaprestige.fr', commission: 20, status: 'active' as const, rating: 5.0, bookings: 56 },
  { id: '5', name: 'Elite Security', category: 'Security', location: 'Monaco', contact: 'ops@elitesec.mc', commission: 10, status: 'inactive' as const, rating: 4.6, bookings: 12 },
  { id: '6', name: 'Maison Events', category: 'Event Planning', location: 'Paris', contact: 'hello@maisonevents.fr', commission: 15, status: 'active' as const, rating: 4.9, bookings: 8 },
]

export const payments = [
  { id: 'P-001', guest: 'M. & Mme Laurent', property: 'Villa French Way', amount: 18500, type: 'booking' as const, status: 'paid' as const, date: '2026-06-15' },
  { id: 'P-002', guest: 'M. & Mme Laurent', property: 'Villa French Way', amount: 5000, type: 'deposit' as const, status: 'paid' as const, date: '2026-06-10' },
  { id: 'P-003', guest: 'Famille Dubois', property: 'French West Yacht', amount: 12000, type: 'booking' as const, status: 'pending' as const, date: '2026-06-20' },
  { id: 'P-004', guest: 'M. Anderson', property: 'Villa Mauritius', amount: 850, type: 'service' as const, status: 'paid' as const, date: '2026-06-22' },
  { id: 'P-005', guest: 'Mme Chen', property: 'Villa French Way', amount: 3500, type: 'deposit' as const, status: 'pending' as const, date: '2026-06-23' },
]

export const contracts = [
  { id: 'C-001', guest: 'M. & Mme Laurent', property: 'Villa French Way', type: 'rental' as const, status: 'signed' as const, date: '2026-06-08' },
  { id: 'C-002', guest: 'Famille Dubois', property: 'French West Yacht', type: 'rental' as const, status: 'sent' as const, date: '2026-06-18' },
  { id: 'C-003', guest: 'M. Anderson', property: 'Villa Mauritius', type: 'rental' as const, status: 'signed' as const, date: '2026-06-05' },
  { id: 'C-004', guest: 'Mme Chen', property: 'Villa French Way', type: 'rental' as const, status: 'draft' as const, date: '2026-06-22' },
  { id: 'C-005', guest: 'Chef Martin', property: 'Villa French Way', type: 'partner' as const, status: 'signed' as const, date: '2026-01-15' },
]

export const kpiData = {
  activeStays: 1,
  upcomingArrivals: 3,
  guestRequests: 5,
  serviceRevenue: 4250,
  pendingTasks: 4,
  occupancyRate: 67,
}

export const calendarEvents = [
  { id: '1', title: 'Laurent - Villa French Way', type: 'reservation' as const, start: '2026-06-20', end: '2026-06-28' },
  { id: '2', title: 'Dubois - French West Yacht', type: 'reservation' as const, start: '2026-07-05', end: '2026-07-12' },
  { id: '3', title: 'Pool maintenance', type: 'maintenance' as const, start: '2026-06-25', end: '2026-06-25' },
  { id: '4', title: 'Deep cleaning - Villa Mauritius', type: 'cleaning' as const, start: '2026-07-10', end: '2026-07-11' },
  { id: '5', title: 'Private chef dinner', type: 'service' as const, start: '2026-06-24', end: '2026-06-24' },
  { id: '6', title: 'Owner stay - Villa French Way', type: 'owner' as const, start: '2026-08-01', end: '2026-08-15' },
]
