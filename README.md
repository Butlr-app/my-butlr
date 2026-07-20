# My Butlr — Luxury Property Management SaaS

My Butlr is the private operating system for luxury stays — a premium property management platform for villas, yachts, chalets, and concierge services. Manage reservations, services, guests, contracts, invoices, and more from a single dashboard. Built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Dashboard** with KPIs, recent activity, and role-based views
- **Property Management** — Full CRUD for luxury properties (villas, yachts, apartments, chalets) with amenities, rooms, and detail pages
- **Reservation Management** — Booking lifecycle with status tracking, payments, and contracts
- **Service Marketplace** — Curated catalog of premium services with pricing and commission-based revenue
- **Guest Portal** — Digital concierge for guests to browse services, message the team, and make requests
- **Contract Generator** — Auto-generate French seasonal rental contracts (PDF) with electronic signature
- **Invoice Generator** — Create complementary invoices for services, repairs, and purchases (FC-YYYY-XXX)
- **Multi-role Dashboards** — 6 roles: Owner, House Manager, Concierge, Agency, Partner, Guest
- **Task Management** — Kanban board with priority, assignment, and status tracking
- **Calendar** — Multi-property calendar with reservations, maintenance, and events
- **Partner Network** — CRM for service providers and partners with commission tracking
- **Payments & Contracts** — Digital contracts, deposits, and payment tracking, with CSV export and billing history
- **Notifications** — Real-time in-app notifications via Supabase Realtime
- **Settings** — Account, team, properties, payments, and services tabs
- **Authentication** — Email/password, role selection, password reset
- **Reports** — Revenue analytics and property performance

## Tech Stack

- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI**: shadcn/ui + Radix UI primitives, Lucide React icons
- **Routing**: React Router v7 with protected routes
- **PDF**: jsPDF + jspdf-autotable for contract and invoice generation
- **Design**: Monochrome (black/white/grey), Inter + Geist Mono fonts

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ (or pnpm)
- A Supabase project (free tier works)

### Installation

1. Clone the repo:
```bash
git clone https://github.com/Butlr-app/my-butlr.git
cd my-butlr
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Fill in your Supabase URL and anon key (see table below)
```

4. Run the dev server:
```bash
npm run dev
```
The app runs on `http://localhost:5173` by default.

5. (Optional) E2E tests — install Chromium once, then run Playwright:
```bash
npx playwright install chromium
npm run test:e2e
```
Guest portal smoke uses `E2E_GUEST_TOKEN` for the live boutique check (`e2e/guest-portal.spec.ts`).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `E2E_GUEST_TOKEN` | Optional guest portal token for Playwright boutique smoke |

Additional secrets used by Supabase Edge Functions (never expose with a `VITE_` prefix) are documented directly in `.env.example`.

### Database Setup

Schema changes are managed with the Supabase CLI as timestamped SQL files in `supabase/migrations/`. To set up a local or new Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

`supabase/schema.sql` is kept as a consolidated reference snapshot of the schema (useful for reading in one place), but the migrations in `supabase/migrations/` are the source of truth — apply them in order rather than running `schema.sql` directly on an existing project.

Optionally seed with demo data:
```bash
psql "$DATABASE_URL" -f supabase/seed.sql
# or paste the contents of supabase/seed.sql into the Supabase SQL Editor
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

Output goes to `dist/`.

### Type Check

```bash
npx tsc --noEmit
```

## Design System

My Butlr uses a monochrome design system (black/white/grey only) with:
- **Typography**: Inter + Geist Mono
- **No brand colors** — pure monochrome aesthetic
- **Premium minimalist** aesthetic for luxury market

## Project Structure

```
src/
  components/
    layout/          # AppLayout, Sidebar, Topbar
    ui/              # Button, Card, Input, Modal, Badge, etc.
    ErrorBoundary.tsx
    ProtectedRoute.tsx
  data/
    amenities.ts     # Amenity definitions by category
    mockData.ts      # Legacy mock data (unused in production)
  lib/
    authContext.tsx   # Auth provider with Supabase Auth
    roleContext.tsx   # Role-based access control
    searchContext.tsx # Global search state
    supabase.ts      # Supabase client initialization
    useSupabase.ts   # All hooks: useTable, useProperties, useReservations, etc.
    utils.ts         # Utility functions
  pages/
    app/             # All authenticated SaaS pages
    Landing.tsx      # Public landing page
    Login.tsx        # Auth pages
    Signup.tsx
    ForgotPassword.tsx
    ResetPassword.tsx
    NotFound.tsx     # 404 page
supabase/
  migrations/        # Source-of-truth, timestamped schema migrations (Supabase CLI)
  schema.sql         # Consolidated schema reference with RLS policies
  seed.sql           # Demo data for development
public/
  sitemap.xml
  robots.txt
  favicon.svg
```

## Roles

The platform supports multiple roles via the role selector:
- **Owner** — Full access to all features
- **House Manager** — Property and operations management
- **Concierge** — Guest services and task management
- **Agency** — Booking and partner management
- **Partner** — Service provider view
- **Guest** — Guest portal access

## Deployment

```bash
npm run build
npm run preview  # local preview of production build
```

Build the project and deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.). Ensure your Supabase project URL and anon key are set as environment variables in your hosting provider.

## Contributing

1. Create a branch from `main`
2. Make your changes
3. Push and open a pull request

See `CONTRIBUTING.md` for more details.

## License

Proprietary. All rights reserved by SAS EBSCOPAL.
