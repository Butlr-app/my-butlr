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
- **Authentication** with email/password, role selection, password reset
- **Reports** with revenue analytics and property performance
- **Guest Portal** preview

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
```

### Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase anon/public key

### Database Setup

Run the SQL schema on your Supabase project:

1. Go to your Supabase dashboard > SQL Editor
2. Copy the contents of `supabase/schema.sql`
3. Run the query to create all tables, policies, and triggers

Optionally seed with demo data:

1. Copy the contents of `supabase/seed.sql`
2. Run in the SQL Editor

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

### Type Check

```bash
npx tsc --noEmit
```

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
  schema.sql         # Full database schema with RLS policies
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

Build the project and deploy the `dist/` folder to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.).

Ensure your Supabase project URL and anon key are set as environment variables in your hosting provider.

## License

Proprietary. All rights reserved by SAS EBSCOPAL.
