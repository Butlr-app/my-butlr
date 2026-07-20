-- Seed data for My Butlr demo
-- Run via Supabase SQL Editor or supabase db seed

-- Properties
INSERT INTO properties (id, name, location, type, status, bedrooms, bathrooms, max_guests, description, image_url) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Villa French Way', 'Saint-Tropez, France', 'villa', 'active', 5, 4, 10, 'Stunning Mediterranean villa with infinity pool overlooking the bay of Saint-Tropez. Private garden, staff quarters, and direct beach access.', '/images/property-villa-french-way.jpg'),
  ('a1000000-0000-0000-0000-000000000002', 'French West Yacht', 'Caribbean', 'yacht', 'active', 4, 3, 8, 'Luxury 42m motor yacht with crew of 6. Sun deck, jacuzzi, water toys, and gourmet galley kitchen.', '/images/property-french-west-yacht.jpg'),
  ('a1000000-0000-0000-0000-000000000003', 'Villa Mauritius', 'Grand Baie, Mauritius', 'villa', 'active', 6, 5, 12, 'Tropical beachfront villa with private lagoon access. Lush gardens, outdoor dining pavilion, and dedicated spa room.', '/images/property-villa-mauritius.jpg'),
  ('a1000000-0000-0000-0000-000000000004', 'Chalet Verbier', 'Verbier, Switzerland', 'chalet', 'maintenance', 4, 3, 8, 'Premium ski-in/ski-out chalet in the heart of Verbier. Sauna, cinema room, and panoramic Alpine views.', '/images/property-chalet-verbier.jpg'),
  ('a1000000-0000-0000-0000-000000000005', 'Penthouse Marais', 'Paris, France', 'apartment', 'active', 3, 2, 6, 'Elegant top-floor apartment in Le Marais with private rooftop terrace and Eiffel Tower views.', '/images/property-penthouse-marais.jpg')
ON CONFLICT (id) DO NOTHING;

-- Reservations
INSERT INTO reservations (property_id, guest_name, guest_email, guest_phone, arrival, departure, guests_count, status, payment_status, total_amount, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'M. & Mme Laurent', 'laurent@email.com', '+33 6 12 34 56 78', '2026-06-20', '2026-06-28', 4, 'confirmed', 'paid', 18500, 'Returning guests. VIP treatment.'),
  ('a1000000-0000-0000-0000-000000000001', 'Mme Chen', 'chen.li@email.com', '+86 138 0000 1234', '2026-07-01', '2026-07-08', 2, 'pending', 'pending', 14000, 'First visit. Needs airport transfer.'),
  ('a1000000-0000-0000-0000-000000000002', 'M. Anderson', 'anderson@email.com', '+1 212 555 0100', '2026-07-10', '2026-07-17', 6, 'confirmed', 'partial', 42000, 'Charter cruise. Full crew required.'),
  ('a1000000-0000-0000-0000-000000000003', 'Famille Dubois', 'dubois.p@email.com', '+33 6 98 76 54 32', '2026-08-01', '2026-08-15', 8, 'confirmed', 'paid', 31000, 'Family vacation. Need extra beds for children.'),
  ('a1000000-0000-0000-0000-000000000005', 'M. & Mme Smith', 'smith@email.com', '+44 7700 900000', '2026-06-25', '2026-06-30', 2, 'in_progress', 'paid', 7500, 'Anniversary trip. Champagne on arrival.'),
  ('a1000000-0000-0000-0000-000000000003', 'Mme Tanaka', 'tanaka.y@email.com', '+81 90 1234 5678', '2026-09-01', '2026-09-10', 3, 'pending', 'pending', 22000, 'Wants private diving excursion.')
ON CONFLICT DO NOTHING;

-- Services
INSERT INTO services (name, description, category, starting_price, commission, available) VALUES
  ('Private Chef', 'Michelin-trained chef for in-villa dining experiences. Custom menus, wine pairing available.', 'dining', 850, 15, true),
  ('Airport Transfer', 'Luxury vehicle pickup and drop-off. Mercedes S-Class or equivalent.', 'transport', 250, 10, true),
  ('Wellness & Spa', 'In-villa massage, facial, and wellness treatments by certified therapists.', 'wellness', 200, 12, true),
  ('Boat Rental', 'Day charter or multi-day rental. Skippered yachts from 12m to 24m.', 'activities', 2000, 15, true),
  ('Personal Shopper', 'Luxury shopping experience with personal stylist in local boutiques.', 'lifestyle', 500, 10, true),
  ('Wine Tasting', 'Private wine tasting at local vineyards with sommelier guide.', 'dining', 350, 12, true),
  ('Childcare', 'Certified nanny and activity coordinator for children ages 2-12.', 'family', 180, 8, true),
  ('Fitness Coach', 'Personal training sessions in-villa or outdoors. Yoga, pilates, HIIT.', 'wellness', 150, 10, true),
  ('Helicopter Tour', 'Scenic helicopter flights over coastline and landmarks. 30-60 min.', 'activities', 1500, 15, false),
  ('Event Planning', 'Birthday, anniversary, or special occasion planning with full coordination.', 'lifestyle', 3000, 20, true)
ON CONFLICT DO NOTHING;

-- Tasks
INSERT INTO tasks (property_id, title, description, status, priority, due_date) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Prepare villa for Laurent arrival', 'Full cleaning, fresh flowers, wine selection, welcome basket', 'in_progress', 'high', '2026-06-19'),
  ('a1000000-0000-0000-0000-000000000001', 'Pool maintenance check', 'Monthly filter change and pH balance test', 'todo', 'medium', '2026-06-18'),
  ('a1000000-0000-0000-0000-000000000002', 'Stock yacht provisions', 'Food, beverages, and supplies for Anderson charter', 'todo', 'high', '2026-07-09'),
  ('a1000000-0000-0000-0000-000000000003', 'Garden landscaping', 'Trim hedges and replant tropical flowers in entrance', 'waiting', 'low', '2026-07-20'),
  ('a1000000-0000-0000-0000-000000000004', 'Heating system repair', 'Radiator in master bedroom not working. Technician scheduled.', 'in_progress', 'high', '2026-06-25'),
  ('a1000000-0000-0000-0000-000000000005', 'Replace living room curtains', 'Guest feedback: curtains don''t block enough light', 'todo', 'low', '2026-07-01'),
  ('a1000000-0000-0000-0000-000000000001', 'Update guest welcome book', 'Add new restaurant recommendations for summer 2026', 'done', 'medium', '2026-06-15'),
  ('a1000000-0000-0000-0000-000000000003', 'Install new outdoor shower', 'Beach-side outdoor shower requested by owner', 'waiting', 'medium', '2026-07-30')
ON CONFLICT DO NOTHING;

-- Partners
INSERT INTO partners (name, category, location, contact, email, phone, commission, status, rating, bookings_count) VALUES
  ('Chef Martin', 'Private Chef', 'Saint-Tropez', 'Martin Dupont', 'chef.martin@email.com', '+33 6 11 22 33 44', 15, 'active', 4.9, 28),
  ('Spa Prestige', 'Wellness', 'Saint-Tropez', 'Claire Moreau', 'contact@spaprestige.com', '+33 6 55 66 77 88', 12, 'active', 4.7, 42),
  ('Azure Boats', 'Boat Rental', 'Cannes', 'Jean-Pierre Blanc', 'jp@azureboats.com', '+33 6 22 33 44 55', 15, 'active', 4.8, 15),
  ('Riviera Cars', 'Transport', 'Nice', 'Lucas Petit', 'lucas@rivieracars.com', '+33 6 99 88 77 66', 10, 'active', 4.5, 67),
  ('Vignobles du Var', 'Wine Experience', 'Gassin', 'Sophie Laurent', 'sophie@vignoblesduvar.com', '+33 6 44 55 66 77', 12, 'active', 4.6, 12),
  ('Maurice Diving', 'Activities', 'Grand Baie', 'Raj Patel', 'raj@mauricediving.com', '+230 5 123 4567', 10, 'active', 4.8, 8),
  ('Verbier Ski School', 'Activities', 'Verbier', 'Thomas Mueller', 'thomas@verbierski.ch', '+41 79 123 45 67', 8, 'inactive', 4.4, 22),
  ('Paris Concierge Elite', 'Concierge', 'Paris', 'Camille Leroy', 'camille@parisconcierge.com', '+33 6 33 44 55 66', 10, 'active', 4.9, 35)
ON CONFLICT DO NOTHING;

-- Payments
INSERT INTO payments (guest_name, property_name, type, amount, status, date) VALUES
  ('M. & Mme Laurent', 'Villa French Way', 'booking', 18500, 'paid', '2026-06-01'),
  ('Mme Chen', 'Villa French Way', 'deposit', 4200, 'pending', '2026-06-15'),
  ('M. Anderson', 'French West Yacht', 'booking', 21000, 'paid', '2026-05-20'),
  ('M. Anderson', 'French West Yacht', 'deposit', 21000, 'pending', '2026-06-20'),
  ('Famille Dubois', 'Villa Mauritius', 'booking', 31000, 'paid', '2026-06-10'),
  ('M. & Mme Smith', 'Penthouse Marais', 'booking', 7500, 'paid', '2026-06-20'),
  ('Chef Martin', 'Villa French Way', 'commission', 450, 'paid', '2026-06-22'),
  ('Spa Prestige', 'Villa Mauritius', 'service', 600, 'paid', '2026-06-18'),
  ('Azure Boats', 'French West Yacht', 'commission', 300, 'pending', '2026-06-25'),
  ('Mme Tanaka', 'Villa Mauritius', 'deposit', 6600, 'pending', '2026-07-01')
ON CONFLICT DO NOTHING;

-- Contracts
INSERT INTO contracts (guest_name, property_name, type, status, date) VALUES
  ('M. & Mme Laurent', 'Villa French Way', 'rental', 'signed', '2026-05-15'),
  ('Mme Chen', 'Villa French Way', 'rental', 'sent', '2026-06-10'),
  ('M. Anderson', 'French West Yacht', 'rental', 'signed', '2026-05-01'),
  ('Famille Dubois', 'Villa Mauritius', 'rental', 'signed', '2026-06-05'),
  ('M. & Mme Smith', 'Penthouse Marais', 'rental', 'signed', '2026-06-18'),
  ('Mme Tanaka', 'Villa Mauritius', 'rental', 'draft', '2026-07-01'),
  ('Chef Martin', 'Villa French Way', 'partnership', 'signed', '2026-01-15'),
  ('Spa Prestige', 'Villa Mauritius', 'service', 'signed', '2026-03-01')
ON CONFLICT DO NOTHING;

-- Calendar Events
INSERT INTO calendar_events (property_id, title, type, start_date, end_date, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Laurent Stay', 'reservation', '2026-06-20', '2026-06-28', 'VIP guests'),
  ('a1000000-0000-0000-0000-000000000001', 'Chen Stay', 'reservation', '2026-07-01', '2026-07-08', 'First-time guest'),
  ('a1000000-0000-0000-0000-000000000001', 'Pool Maintenance', 'maintenance', '2026-06-18', '2026-06-18', 'Monthly check'),
  ('a1000000-0000-0000-0000-000000000001', 'Deep Clean', 'cleaning', '2026-06-29', '2026-06-30', 'Between Laurent and Chen stays'),
  ('a1000000-0000-0000-0000-000000000002', 'Anderson Charter', 'reservation', '2026-07-10', '2026-07-17', 'Full crew'),
  ('a1000000-0000-0000-0000-000000000003', 'Dubois Family', 'reservation', '2026-08-01', '2026-08-15', 'Extra beds needed'),
  ('a1000000-0000-0000-0000-000000000003', 'Garden Work', 'maintenance', '2026-07-20', '2026-07-22', 'Landscaping'),
  ('a1000000-0000-0000-0000-000000000004', 'Heating Repair', 'maintenance', '2026-06-23', '2026-06-25', 'Technician visit'),
  ('a1000000-0000-0000-0000-000000000005', 'Smith Anniversary', 'reservation', '2026-06-25', '2026-06-30', 'Champagne on arrival'),
  ('a1000000-0000-0000-0000-000000000001', 'Chef Martin Dinner', 'service', '2026-06-22', '2026-06-22', 'Private dinner for Laurent'),
  ('a1000000-0000-0000-0000-000000000003', 'Tanaka Stay', 'reservation', '2026-09-01', '2026-09-10', 'Diving excursion'),
  ('a1000000-0000-0000-0000-000000000001', 'Owner Visit', 'owner', '2026-07-15', '2026-07-20', 'Annual inspection')
ON CONFLICT DO NOTHING;
