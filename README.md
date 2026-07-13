# My Butlr

The private operating system for luxury stays. Manage villas, yachts, and chalets from a single dashboard — reservations, services, guests, contracts, invoices, and more.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **PDF**: jsPDF for contract and invoice generation
- **Routing**: React Router 7 with protected routes
- **Icons**: Lucide React
- **Design**: Monochrome (black/white/grey), Inter + Geist Mono fonts

## Features

- **Dashboard** with KPIs, recent activity, and role-based views
- **Properties** management with amenities, rooms, and detail pages
- **Reservations** tracking with guest details and status management
- **Services** marketplace with pricing and commission tracking
- **Tasks** kanban board with drag-and-drop columns
- **Calendar** with monthly event view
- **Partners** CRM with commission tracking
- **Payments** with metrics, CSV export, and billing history
- **Contracts** management + French seasonal rental PDF generator
- **Invoices** management + French invoice PDF generator (FC-YYYY-XXX)
- **Notifications** with real-time updates via Supabase Realtime
- **Settings** with account, team, properties, payments, and services tabs
- **Authentication** with email/password, invite-only staff roles, password reset
- **Reports** with revenue analytics and property performance
- **Guest / Partner / House Manager** mobile apps + PWA

## Getting Started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm 9+
- A Supabase project (free tier works)

### Installation

```bash
git clone https://github.com/butlr-app/my-butlr.git
cd my-butlr
npm ci
```

### Environment Variables

```bash
cp .env.example .env
```

Required (build fails without them):

- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase anon/public key

Optional:

- `VITE_VAPID_PUBLIC_KEY` — Web Push (House Manager PWA)
- `SUPABASE_ACCESS_TOKEN` — Management API (Cloud Agents)
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — Playwright E2E

### Database Setup

**Do not run only `schema.sql`.** Apply the full migration chain:

```bash
bash supabase/apply-migrations.sh
```

Then paste each listed file into Supabase SQL Editor, or use `psql` with your connection string. See `supabase/MIGRATIONS.md` for the ordered list and descriptions.

Optionally seed demo data (development only):

```bash
# supabase/seed.sql in SQL Editor
```

### Development

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default.

### Build

```bash
npm run build
```

Output goes to `dist/`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Oxlint |
| `npm test -- --run` | Unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run generate:icons` | Regenerate PWA PNGs from SVG |

## Project Structure

```
src/
  components/        # UI, layout, ProtectedRoute
  lib/               # Auth, roles, Supabase hooks
  pages/
    app/             # Staff dashboard (/app)
    mobile/          # Guest, partner, HM apps
  i18n/              # FR/EN translations
supabase/
  schema.sql         # Baseline schema
  migration_*.sql    # Incremental migrations (apply in order)
  MIGRATIONS.md      # Migration order reference
  seed.sql           # Demo data (dev only)
.cursor/
  environment.json   # Cursor Cloud Agent setup
AGENTS.md            # Cloud Agent instructions
public/
  manifest.webmanifest
  sw.js
```

## Roles

| Role | Access |
|------|--------|
| **Owner** | Full dashboard + role preview |
| **House Manager** | Operations, HM mobile app |
| **Concierge** | Guest services |
| **Agency** | Bookings and partners |
| **Partner** | Partner mobile app (public signup) |
| **Guest** | Guest mobile app |

Staff roles (Owner, HM, Concierge, Agency) are **invite-only**. Public signup creates Partner accounts.

## Cursor Cloud Agents

See `AGENTS.md` for Cloud Agent and mobile setup. Repo: `butlr-app/my-butlr`.

## Deployment

Build `dist/` and deploy to Vercel, Netlify, or Cloudflare Pages. Set `VITE_SUPABASE_*` in hosting secrets. Security headers are configured in `vercel.json` and `public/_headers`.

GitHub Actions:

- **CI** — lint, typecheck, unit tests, build on every PR
- **Deploy** — build artifact on push to `main` (configure Vercel/Netlify secrets to enable live deploy)
- **E2E** — weekly/manual Playwright run when test secrets are set

## License

Proprietary. All rights reserved by SAS EBSCOPAL.
