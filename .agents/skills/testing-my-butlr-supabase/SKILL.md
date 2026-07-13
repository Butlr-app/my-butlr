---
name: testing-my-butlr-supabase
description: Test the My Butlr SaaS dashboard pages end-to-end against a live Supabase backend. Use when verifying CRUD operations, data display, or Supabase integration changes.
---

# Testing My Butlr — Supabase Integration

## Prerequisites

- Dev server running: `cd /workspace && npm run dev`
- Supabase project must be accessible (project ID: `kpcahtliadmsaoespwpv`)
- Seed data loaded via `supabase/seed.sql` (apply migrations first — see `supabase/MIGRATIONS.md`)

## Cursor Secrets

- `SUPABASE_ACCESS_TOKEN` — Supabase Management API token (org-scoped, permanent)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — required for build and runtime

## Test Account

- Email: `test@mybutlr.com`
- Password: `TestPass123!`
- User ID: `b5bd4a31-be6c-4f8c-afeb-cbbb1e20ff3d`

## How to Run Tests

1. Start the dev server: `cd /workspace && npm run dev`
2. Open browser to `http://localhost:5173/login`
3. Log in with test account credentials
4. Navigate through dashboard pages via sidebar links

## Key Test Scenarios

### 1. Login + Dashboard KPIs
- Login at `/login` with test credentials
- Verify redirect to `/app`
- Check 6 KPI metric cards load with non-zero values from seed data
- Verify "Recent Reservations" and "Recent Payments" sections show seed names (e.g., Laurent, Chen, Anderson)

### 2. Properties CRUD
- Navigate to `/app/properties`
- Verify 5 seed property cards (Villa French Way, French West Yacht, Villa Mauritius, Chalet Verbier, Penthouse Marais)
- Test "Add property" form modal: fill name, location, type, bedrooms, etc.
- Verify toast "Property created" and new card appears
- Test delete via trash icon, verify toast "Property deleted" and card removed

### 3. Tasks Kanban
- Navigate to `/app/tasks`
- Verify 4-column layout: To do, In progress, Waiting, Done
- Verify seed task distribution across columns
- Click move buttons (e.g., "-> In progress") on a task card
- Verify task moves to new column, counts update, toast confirms

### 4. Services + Availability Toggle
- Navigate to `/app/services`
- Verify 10 seed services with prices and commissions
- Find "Helicopter Tour" (seed: unavailable) and click availability toggle
- Verify badge changes and toast "Service enabled" appears

### 5. Property Detail (Filtered Data)
- From Properties page, click "Open property" on a specific property
- Verify Overview tab: stats (bedrooms, bathrooms, max guests, type, reservations count, open tasks count)
- Click "Bookings" tab: verify only reservations for THIS property appear
- Click "Tasks" tab: verify only tasks for THIS property appear
- This tests property_id filtering/joins

## Common Patterns

- **Toast notifications**: All mutating operations (create, update, delete, toggle) should show a toast notification. Look for the toast element at the bottom-right of the screen.
- **Real-time updates**: After a CRUD operation, the UI should update immediately without page refresh.
- **Loading states**: Pages show a Loader2 spinner while fetching data from Supabase. If spinner persists, check Supabase connectivity.
- **Empty states**: If "No items yet" appears where seed data is expected, the seed SQL may not have been run or RLS policies might be blocking access.

## Seed Data Reference

The seed creates:
- 5 properties (Villa French Way in Saint-Tropez, French West Yacht in Caribbean, Villa Mauritius, Chalet Verbier, Penthouse Marais)
- 6 reservations (guests: Laurent, Chen, Anderson, Dubois, Tanaka, Williams)
- 10 services (Private Chef, Airport Transfer, Wellness & Spa, Boat Rental, Personal Shopper, Wine Tasting, Childcare, Fitness Coach, Helicopter Tour, Event Planning)
- 8 tasks distributed across todo/in_progress/waiting/done
- 8 partners, 10 payments, 8 contracts, 12 calendar events

## Troubleshooting

- **Login fails**: Check that the test account exists in Supabase Auth. Email confirmation should be disabled on the Supabase project.
- **Data not loading**: Verify RLS policies are correctly set (all tables use `auth.uid() = owner_id` or `user_id`). Check browser console for Supabase errors.
- **Vite dev server won't start**: Ensure `npm install` has been run. Check that port 5176 is not already in use.
- **Type errors on build**: Run `npx tsc --noEmit` to check. The `useTable<T>` generic hook pattern requires exact type matches for insert/update payloads.
