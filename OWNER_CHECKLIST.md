# Owner checklist — actions outside the repo

Complete these steps in external dashboards after merging the audit fixes.

## 1. Supabase (security)

- [ ] Apply all migrations in order (`supabase/MIGRATIONS.md`)
- [ ] Verify RLS with 3 test users: owner, house manager, guest
- [ ] Disable email confirmation for dev, enable for prod (or use invite flow)
- [ ] Deploy `supabase/functions/send-push` with VAPID + webhook secrets
- [ ] Make `chat-attachments` storage bucket private (signed URLs)

## 2. Cursor mobile / Cloud Agents

- [ ] Install Cursor GitHub App on org `butlr-app` → grant `my-butlr`
- [ ] Switch to Privacy Mode (not Legacy) at [cursor.com/dashboard?tab=settings](https://cursor.com/dashboard?tab=settings)
- [ ] Create Cloud Agent environment + save snapshot from dashboard
- [ ] Add secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `SUPABASE_ACCESS_TOKEN`
- [ ] On mobile, use `repo=butlr-app/my-butlr` if repo picker omits the project

## 3. GitHub repository secrets

For deploy + E2E workflows:

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `TEST_USER_EMAIL` (e.g. `test@mybutlr.com`)
- [ ] `TEST_USER_PASSWORD`
- [ ] (Future) `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## 4. Hosting (production)

- [ ] Choose host (Vercel recommended)
- [ ] Connect `butlr-app/my-butlr` repo
- [ ] Set `VITE_SUPABASE_*` env vars
- [ ] Point domain `mybutlr.com` to host
- [ ] Uncomment deploy step in `.github/workflows/deploy.yml` once platform is chosen

## 5. Staff account creation

Public signup now creates **Partner** accounts only. To onboard staff:

- [ ] Create owner/HM/concierge/agency users via Supabase Auth admin or SQL
- [ ] Set `profiles.role` accordingly
- [ ] Or build an invite flow (future feature)
