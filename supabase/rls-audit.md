# RLS (Row Level Security) Audit — My Butlr

**Date:** 2024-06-24
**Auditor:** Automated Phase 4 review

---

## Current State

All tables have RLS **enabled**. However, most operational tables use permissive `USING (true)` policies for authenticated users, which means any logged-in user can read/write all rows. This is acceptable for a single-tenant prototype but **must be tightened before production**.

### Table-by-Table Review

| Table | RLS Enabled | Current Policy | Risk Level |
|---|---|---|---|
| `profiles` | Yes | SELECT/UPDATE/INSERT restricted to `auth.uid() = id` | Low |
| `properties` | Yes | `FOR ALL ... USING (true)` for authenticated | **High** — any user can modify any property |
| `reservations` | Yes | SELECT/INSERT/UPDATE with `USING (true)` | **High** — no ownership check |
| `services` | Yes | `FOR ALL ... USING (true)` | Medium — shared catalog, but write should be restricted |
| `tasks` | Yes | `FOR ALL ... USING (true)` | **High** — any user can modify any task |
| `partners` | Yes | `FOR ALL ... USING (true)` | Medium — admin-level data |
| `payments` | Yes | `FOR ALL ... USING (true)` | **Critical** — financial data exposed |
| `contracts` | Yes | `FOR ALL ... USING (true)` | **High** — legal documents exposed |
| `calendar_events` | Yes | `FOR ALL ... USING (true)` | Medium |
| `property_amenities` | Yes | `FOR ALL ... USING (true)` | Low — tied to properties |
| `property_rooms` | Yes | `FOR ALL ... USING (true)` | Low — tied to properties |
| `contract_templates` | Yes | `FOR ALL ... USING (true)` | Medium — user templates |
| `notifications` | Yes | Scoped to `user_id = auth.uid() OR user_id IS NULL` | Good |

### Key Issues

1. **No ownership enforcement** — Properties, reservations, payments, and contracts have no owner/tenant scoping
2. **No role-based access** — All authenticated users have identical permissions regardless of role (owner, manager, concierge, guest)
3. **Financial data exposure** — Payments table is fully accessible to all authenticated users
4. **Cross-tenant risk** — In a multi-tenant scenario, User A could read/modify User B's data

---

## Recommended Production Policies

See `supabase/rls-production-policies.sql` for ready-to-apply strict policies covering:

- **Properties**: Only owner or assigned managers can read/write
- **Reservations**: Access scoped via property ownership chain
- **Payments**: Access via reservation → property ownership chain
- **Tasks**: Visible to assignee or property owner
- **Services**: Read for all authenticated, write for owners/managers only
- **Partners**: Read for all authenticated, write for owners only
- **Contracts**: Access via reservation → property ownership
- **Calendar Events**: Scoped via property ownership
- **Contract Templates**: Scoped to creator (`user_id = auth.uid()`)

---

## Migration Plan

1. Add `owner_id` column to tables that lack it (reservations, payments already have it via property chain)
2. Create helper functions: `is_property_owner(property_id)`, `is_property_manager(property_id)`
3. Drop permissive `USING (true)` policies
4. Apply strict policies from `rls-production-policies.sql`
5. Test thoroughly with multiple user accounts
6. Monitor Supabase logs for permission denials during rollout
