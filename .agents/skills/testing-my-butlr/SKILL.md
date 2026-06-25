---
name: testing-my-butlr-dashboard
description: Test the My Butlr SaaS dashboard end-to-end against live Supabase. Use when verifying CRUD, search, metrics, responsive layout, profile settings, PDF generators, auth flows, notifications, or SEO changes.
---

# Testing My Butlr — Dashboard E2E

## Prerequisites

- Dev server running: `cd /home/ubuntu/my-butlr && npx vite --port 5177`
- Supabase project accessible (project ID: `kpcahtliadmsaoespwpv`)
- Seed data loaded via `supabase/seed.sql`
- Chrome browser running with CDP at `http://localhost:29229`

## Devin Secrets Needed

- `SUPABASE_ACCESS_TOKEN` — Supabase Management API token (org-scoped, permanent)

## Test Account

- Email: `test@mybutlr.com`
- Password: `TestPass123!`

## How to Run Tests

1. Start dev server: `cd /home/ubuntu/my-butlr && npx vite --port 5177 &`
2. Open Chrome to `http://localhost:5177/login`
3. Log in with test credentials via computer tool or Playwright CDP
4. Navigate through dashboard pages via sidebar links

## Key Test Scenarios

### 1. Properties CRUD (Edit + Validation + Delete Confirmation)
- Navigate to `/app/properties`
- Verify 5 seed property cards (Villa French Way, French West Yacht, Villa Mauritius, Chalet Verbier, Penthouse Marais)
- Test edit: click pencil icon, verify modal pre-fills all fields
- Test validation: clear Name field, save — expect "Name is required" error
- Test delete: click trash icon, verify ConfirmModal with property name, Cancel preserves card
- Test create: "Add property" form modal

### 2. Global Search Filtering
- Search bar in Topbar filters items on the current page
- On Properties: type "yacht" — only "French West Yacht" visible
- On Payments: type "Anderson" — only Anderson rows visible
- Clear search restores all items

### 3. Payments Metrics + CSV Export
- Navigate to `/app/payments`
- Verify metrics: Total Revenue = €79,050, Pending = €32,100, Transactions = 10
- Click "Export CSV" — file download triggers

### 4. Reports KPIs from Supabase
- Navigate to `/app/reports`
- Total Revenue = €79,050
- Property Performance: Villa Mauritius = €53,000
- Partner Commissions: Spa Prestige, Chef Martin

### 5. Responsive Mobile — Sidebar Hamburger
- Set viewport to 375px via CDP `Emulation.setDeviceMetricsOverride`
- Sidebar should be off-screen (left: -240px), hamburger button visible
- Click hamburger: sidebar slides in with dark overlay
- Click nav item: sidebar closes, page navigates
- Restore to 1280px: sidebar visible, hamburger hidden

### 6. Settings Profile CRUD
- Navigate to `/app/settings`
- Account tab: Full Name, Email, Phone, Company fields
- Fill and save — expect "Profile updated" toast
- Refresh page — verify data persisted in Supabase

### 7. Tasks Kanban
- Navigate to `/app/tasks`
- Verify 4-column layout: To do, In progress, Waiting, Done
- Click move buttons to transfer tasks between columns
- Verify counts update and toast appears

### 8. Services + Availability Toggle
- Navigate to `/app/services`
- Verify 10 services with prices and commissions
- Toggle availability on a service, verify badge change + toast

### 9. Property Detail (Filtered Data)
- Click into a property from Properties page
- Verify Overview tab stats, Bookings tab (filtered reservations), Tasks tab (filtered tasks)

### 10. Property Amenities — View Mode
- Navigate to Villa French Way Property Detail → Amenities tab
- Verify tab badge shows "31" (total seeded amenities)
- Essentiels category expanded by default with count "7"
- Verify checkmarks on seeded items (Machine à laver, Air conditionné, etc.)
- Non-seeded items greyed out with strikethrough
- Piscine et spa category shows "5" (Piscine, Piscine à débordement, Jacuzzi, Sauna, Salle de sport)
- Chauffage et climatisation shows "0"

### 11. Property Amenities — Edit Mode
- Click "Edit amenities" — checkboxes appear on all items, Save/Cancel visible
- Toggle items (check/uncheck), verify category badge updates in real-time
- Save — toast "Amenities updated", tab badge updates
- Page reload preserves changes (Supabase persistence)
- Revert changes to restore original seed state

### 12. Rooms Tab — View + CRUD
- Rooms tab shows badge with room count, card grid layout
- Each card: room name, type (FR label), variant (Privé/Partagé), bedding list
- Add room: modal with room_type, access, name, dynamic bedding rows (add/remove)
- Edit room: modal pre-fills with existing data (room_type, variant, name, bedding)
- Delete room: ConfirmModal with room name in text, badge decrements after confirm

### 13. Overview Tab — Metrics
- Surface card shows "X m²" from property's surface_m2 field
- Amenities card shows count of selected amenities
- Units card only visible when units > 1

### 14. Negative Case — Property Without Amenities
- Navigate to a property with 0 amenities (e.g., French West Yacht)
- Amenities tab: no badge, all categories show "0", all items greyed
- Rooms tab: no badge, "No rooms configured yet." empty state

## Seed Data Reference

- 5 properties (Villa French Way, French West Yacht, Villa Mauritius, Chalet Verbier, Penthouse Marais)
- Villa French Way: 31 amenities across 12 categories, 7 rooms, surface_m2=450, units=1
- French West Yacht: 0 amenities, 0 rooms (negative test case)
- 6 reservations (guests: Laurent, Chen, Anderson, Dubois, Tanaka, Williams)
- 10 services, 8 tasks, 8 partners, 10 payments, 8 contracts, 12 calendar events
- Expected revenue: Total €79,050 (paid), Pending €32,100

## Important Learnings

### RLS Policies
- Properties table originally had `owner_id = auth.uid()` which blocked updates when seed data owner_id didn't match test user
- Fix: add permissive policy `FOR ALL TO authenticated USING (true)` for prototype stage
- Other tables (reservations, services, tasks, etc.) already had permissive policies
- **Always check RLS policies first** when CRUD operations fail with Supabase errors

### Mobile Viewport Testing via CDP
- Use Playwright CDP `Emulation.setDeviceMetricsOverride` to set mobile viewport
- Tailwind CSS 4 uses `translate` CSS property (NOT `transform`) for responsive positioning
- Verify sidebar position via `getBoundingClientRect()` — sidebar.left should be -240 at mobile
- The `lg:` breakpoint is 1024px — set width below this for mobile state
- The `computer` tool screenshot captures full desktop resolution, not page viewport — use Playwright `page.screenshot()` for accurate mobile screenshots

### Form Interaction via Playwright
- Use `input.fill('value')` for reliable form filling
- Use `input.click(click_count=3)` to select all text before replacing
- Find inputs by `page.query_selector_all('input')` and match by index or type attribute
- Execution context may be destroyed after viewport resize — reconnect Playwright before interacting

### Toast Notifications
- All mutating operations show a toast at bottom-right
- Toast auto-dismisses after a few seconds — take screenshot quickly after action
- Toast text confirms the operation (e.g., "Profile updated", "Property created")

### Search Context
- Search filtering is client-side via SearchProvider context
- Works across all pages with table/card views
- Filters by text content match (case-insensitive)

### Amenities Accordion UI
- Categories are collapsible — first category (Essentiels) expanded by default
- Category badge updates in real-time during edit mode (before save)
- Tab badge (total count) also updates live during edit
- Edit mode: custom checkboxes (not native), toggling fills/empties the checkbox visual
- View mode: green checkmarks for selected, greyed strikethrough for unselected

### Modal Pre-fill for Room Edit
- When editing a room, the modal must pre-fill room_type, variant, name, and all bedding rows
- Bedding is stored as JSONB array `[{ type: "king", count: 1 }]`
- Dynamic bedding rows: each row has a bed type dropdown + count input
- "Add bed" button adds a new row; trash icon removes a row

### Pagination Reset Bug Pattern
- All paginated pages must reset page to 0 when search query changes
- Without this, searching while on page 2+ shows empty results (items exist but are on page 1)
- Fix: `useEffect(() => { setPage(0) }, [query])` in every paginated component

### Supabase Error Handling Pattern
- Always destructure `{ error }` from Supabase operations and check it
- Supabase client does NOT throw on errors — it returns `{ data, error }` silently
- If you don't check `error`, the caller's try/catch never triggers and success toasts fire on failure

### 15. Contract Generator — Form + Validation + PDF
- Navigate to `/app/contracts/generate`
- Validation: clear tenant name, leave dates empty, click "Generate PDF" — expect toast "Please fill in tenant name and dates"
- Auto-fill: select reservation from dropdown — tenant name, dates, rent, property auto-populate
- Preview card shows "CONTRAT DE LOCATION SAISONNIERE", Bailleur SAS EBSCOPAL, Locataire name, Loyer amount
- Generate PDF: triggers download `contrat-*.pdf` + toast "Contract PDF generated"

### 16. Invoice Generator — Dynamic Lines + VAT + PDF
- Navigate to `/app/invoices/generate`
- Validation: leave client name empty, click "Generate PDF" — expect toast "Please fill in client name"
- Fill client name, add line item (description, unit price, qty, VAT 20%)
- Verify totals: Total HT = sum(price*qty), TVA = HT*0.20, Total TTC = HT + TVA
- Add second line: totals recalculate dynamically
- Remove line (trash icon): totals recalculate
- Generate PDF: download `facture-FC-YYYY-XXX.pdf` + toast "Invoice PDF generated"

### 17. Auth — Forgot Password + Signup Roles
- Navigate to `/login` — verify "Forgot your password?" link exists
- Click link → `/forgot-password` page: logo, "Reset your password", email input, "Send reset link", "Back to login"
- Navigate to `/signup` — verify Role dropdown with 5 options: Owner, House Manager, Concierge, Agency, Partner

### 18. Notifications Bell + 404 Page
- While logged in, verify bell icon in topbar
- Click bell → dropdown with "Notifications" header and close (X) button
- Empty state shows "No notifications"
- Navigate to `/nonexistent-page` — shows "404", "Page not found", Home + Go to dashboard buttons

### 19. SEO Static Files
- Navigate to `/robots.txt` — should contain `Disallow: /app/` and `Sitemap: https://mybutlr.com/sitemap.xml`
- Navigate to `/sitemap.xml` — valid XML with `<url>` entries for /, /early-access, /login, /signup

### 20. Settings — Account + Password Validation
- Navigate to `/app/settings`
- Account tab: profile pre-filled (name, email)
- Clear name → save → toast "Name is required"
- Password < 6 chars → toast "Password must be at least 6 characters"
- Passwords don't match → toast "Passwords do not match"
- Properties tab: seed properties visible; Services tab: seed services visible

## Important Learnings (continued)

### PDF Generator Testing
- PDF "Generate" buttons trigger jsPDF `doc.save()` which downloads a file — verify by checking the download bar or filesystem
- Contract filenames are slugified: `contrat-{property}-{tenant}.pdf`
- Invoice filenames include year and random number: `facture-FC-YYYY-XXX.pdf`
- Validation prevents generation — no file should download on validation failure

### Notification Bell UI
- The bell icon uses Lucide's `Bell` component inside a `<button>` in the Topbar
- Click toggles `notifOpen` state to show/hide dropdown
- Dropdown closes on outside click (mousedown event listener)
- When no notifications exist, shows "No notifications" text
- Unread count badge only appears when `unreadCount > 0`

### Auth Page Testing
- Must sign out first to access login/signup/forgot-password pages (ProtectedRoute redirects logged-in users)
- Forgot password page sends Supabase `resetPasswordForEmail` — actual email delivery depends on Supabase config
- Signup role dropdown uses native `<select>` element with 5 options

### Transient Toast Capture
- Toast messages appear and auto-dismiss quickly (3-5 seconds)
- For reliable verification, use Playwright DOM queries immediately after the action: `page.locator('text=Expected message').count() > 0`
- Screenshots may miss transient toasts — always supplement with Playwright DOM verification
- The toast component renders at the bottom-right of the viewport

### 21. Real-time Messaging — Guest ↔ Manager (Supabase Realtime)
- Two windows on the SAME reservation: Guest `/app/guest-portal` → Messages tab, Manager `/app/messages` → select the conversation.
- Bootstrap: Guest Portal binds to `guestReservations[0]` (`GuestPortal.tsx`). Send one message from the Guest window to create the conversation, then reload the Manager window so the conversation row appears and select it. Both windows are then subscribed to the same `messages-${reservationId}` channel.
- Guest → Manager: type a unique token (e.g. `GUEST-RT-<ts>`), Send — within ~2s the bubble appears in the Manager window WITHOUT refresh, and the conversation row preview updates with a "now" timestamp.
- Manager → Guest: type `MGR-RT-<ts>`, Send — appears live in the Guest window WITHOUT refresh.
- Scoping: both windows show ONLY messages for that reservation.
- Adversarial check: a broken (non-realtime) implementation would show the message only in the sender window until manual reload — so the "no refresh" observation is the real proof.

### Important Learnings — Realtime Messaging
- **Unread badge is NOT testable in the single-user prototype**: `useUnreadMessages` (`useSupabase.ts`) counts rows where `sender_id != currentUserId AND read = false`. Both guest and manager sides log in as the same `test@mybutlr.com` user, so every message is "own-sent" and excluded — the badge stays at 0. Report this as **untested** (don't fake it). To actually test it you'd need two distinct Supabase user accounts (one guest, one manager). The Topbar message icon (chat bubble) is separate from the notifications bell (which may show its own count) — don't confuse the two.
- **DB-level RLS isolation is also untestable in proto**: policies are permissive `USING(true)`; strict policies are only commented in `supabase/rls-production-policies.sql`. UI-level per-reservation scoping CAN be shown; DB-level isolation cannot.
- Realtime requires the `messages` table to be added to the `supabase_realtime` publication. If live delivery fails, verify the publication includes `messages` before assuming the code is broken.
- Both windows can be the same browser profile/login — Realtime delivery still works because each ChatThread subscribes its own channel on mount.

## Troubleshooting

- **Login fails**: Check test account exists in Supabase Auth. Email confirmation should be disabled.
- **Data not loading**: Check RLS policies. Look for Supabase errors in browser console.
- **CRUD operation fails**: Most common cause is RLS policy. Check if the policy allows the operation for the current user.
- **Mobile layout not responding**: Ensure viewport was set via CDP Emulation, not just window resize. Page may need reload after viewport change.
- **Vite dev server won't start**: Run `npm install` first. Check port availability.
- **Type errors**: Run `npx tsc --noEmit`. The `useTable<T>` generic hook requires exact type matches.
