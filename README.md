# My Butlr

The private operating system for luxury stays. Manage villas, yachts, and chalets from a single dashboard — reservations, services, guests, contracts, invoices, and more.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **PDF**: jsPDF for contract and invoice generation
- **Routing**: React Router 7 with protected routes
- **Icons**: Lucide React
- **Design**: Staff shell uses navy / violet / gold tokens; mobile guest/HM uses a light amber field UI

## Features

- **Dashboard** with KPIs, recent activity, and role-based views
- **Properties** management with amenities, rooms, and detail pages
- **Reservations** tracking with guest details and status management
- **Services** marketplace with pricing and commission tracking
- **Tasks** kanban board with drag-and-drop columns
- **Calendar** with monthly event view
- **Partners** CRM with commission tracking
- **Payments** with metrics, CSV export, and billing history
- **Contracts** management + French seasonal rental PDF generator + e-sign
- **Invoices** management + French invoice PDF generator (FC-YYYY-XXX)
- **Notifications** with real-time updates via Supabase Realtime
- **Settings** with account, team, properties, payments, and services tabs
- **Authentication** with email/password and password reset (public signup = Owner)
- **Mobile shells**: Guest (`/guest`), Partner (`/partner`), House Manager field app (`/hm`)
- **Reports** with revenue analytics and property performance

## Audits

- [`docs/audit-produit.md`](docs/audit-produit.md) — platform security / ops / feature maturity
- [`docs/audit-contrats.md`](docs/audit-contrats.md) — contract PDF + e-sign loop
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — **required** SQL apply order

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)

### Installation

```bash
git clone https://github.com/Butlr-app/my-butlr.git
cd my-butlr
npm install
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

> There are **no hardcoded fallbacks** in the client. Missing env vars throw at boot.

### Database Setup

1. Run `supabase/schema.sql` (baseline tables).
2. Apply **all** migrations in order — see [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md).
   Skipping this leaves permissive `USING (true)` RLS from the baseline.
3. Optionally run `supabase/seed.sql` for demo data.

### Development

```bash
npm run dev
```

App: `http://localhost:5173`

### Build / typecheck / tests

```bash
npm run build
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run test:e2e
```

## Roles

| Role | Lands on | Notes |
|---|---|---|
| Owner / Agency | `/app` | Full staff dashboard |
| House Manager / Concierge | `/hm` | Field mobile app (+ `/app` via profile) |
| Partner | `/partner` | Partner portal |
| Guest | `/guest` | Guest mobile app |

Public signup always creates an **Owner**. Other roles are invited / linked.

## Deployment

Build `dist/` and host statically (Vercel, Netlify, Cloudflare Pages…). Set the Vite env vars on the host. Deploy Edge Functions + secrets separately (`send-contract-email`, `send-push`).

## License

Proprietary. All rights reserved by SAS EBSCOPAL.
