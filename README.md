# My Butlr — Luxury Property Management SaaS

My Butlr is a premium property management platform for luxury villas, yachts, and concierge services. Built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Property Management** — Full CRUD for luxury properties (villas, yachts, apartments, chalets)
- **Reservation Management** — Booking lifecycle with status tracking, payments, and contracts
- **Service Marketplace** — Curated catalog of premium services with commission-based revenue
- **Guest Portal** — Digital concierge for guests to browse services and make requests
- **Contract Generator** — Auto-generate French seasonal rental contracts (PDF)
- **Invoice Generator** — Create complementary invoices for services, repairs, and purchases
- **Multi-role Dashboards** — 6 roles: Owner, House Manager, Concierge, Agency, Partner, Guest
- **Task Management** — Kanban board with priority, assignment, and status tracking
- **Calendar** — Multi-property calendar with reservations, maintenance, and events
- **Partner Network** — CRM for service providers and partners
- **Payments & Contracts** — Digital contracts, deposits, and payment tracking
- **Notifications** — Real-time in-app notifications via Supabase Realtime

## Tech Stack

- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI**: shadcn/ui + Radix UI primitives
- **Routing**: React Router v7
- **PDF**: jsPDF + jspdf-autotable

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

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
# Fill in your Supabase URL and anon key
```

4. Run the dev server:
```bash
npm run dev
```

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
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `E2E_GUEST_TOKEN` | Optional guest portal token for Playwright boutique smoke |

### Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor to create the schema and enable RLS.

## Design System

My Butlr uses a monochrome design system (black/white/grey only) with:
- **Typography**: Inter + Geist Mono
- **No brand colors** — pure monochrome aesthetic
- **Premium minimalist** aesthetic for luxury market

## Deployment

```bash
npm run build
npm run preview  # local preview of production build
```

Deploy to Vercel, Netlify, or any static host.

## Contributing

1. Create a branch from `main`
2. Make your changes
3. Push and open a pull request

## License

MIT — Butlr-app © 2026
