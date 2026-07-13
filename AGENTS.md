# Cloud Agents — My Butlr

Instructions for Cursor Cloud Agents and mobile. Repo: `butlr-app/my-butlr`.

## Quick start

```bash
npm ci
cp .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

Required env vars (build fails without them):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_VAPID_PUBLIC_KEY` — push notifications
- `SUPABASE_ACCESS_TOKEN` — Management API for test data injection
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — E2E login

## Test account (demo Supabase project)

- Email: `test@mybutlr.com`
- Password: `TestPass123!`
- Supabase project ID: `kpcahtliadmsaoespwpv`

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test -- --run` |
| E2E tests | `npx playwright install --with-deps chromium && npm run test:e2e` |

## App surfaces

| Surface | Base path | Roles |
|---------|-----------|-------|
| Staff dashboard | `/app` | owner, house_manager, concierge, agency |
| Guest mobile | `/guest` | guest, owner |
| Partner mobile | `/partner` | partner, owner |
| House Manager mobile | `/hm` | owner, house_manager, concierge, agency |

Public signup only allows **Partner**. Staff roles require admin invite.

## Database setup

Do **not** run only `schema.sql`. Apply migrations in order — see `supabase/MIGRATIONS.md` or:

```bash
bash supabase/apply-migrations.sh
```

Then optionally seed demo data with `supabase/seed.sql` (dev only).

For production, also apply strict RLS from the migration chain (especially `migration_phase1_2_rls.sql` and later security migrations).

## Cursor mobile

1. Install the Cursor GitHub App on org `butlr-app` with access to `my-butlr`
2. Use Privacy Mode (not Legacy) in [dashboard settings](https://cursor.com/dashboard?tab=settings)
3. Configure secrets in Cursor Dashboard → Secrets
4. If the repo picker omits this repo on mobile, type `repo=butlr-app/my-butlr` in the agent prompt

## Skills

Agent skills live in `.agents/skills/`:

- `testing-my-butlr` — dashboard E2E scenarios
- `testing-my-butlr-supabase` — Supabase integration tests

## Edge function (push notifications)

Deploy `supabase/functions/send-push` with secrets:

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
- `WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment

Build output: `dist/`. Set `VITE_SUPABASE_*` in hosting provider secrets. Security headers are in `vercel.json` and `public/_headers`.
