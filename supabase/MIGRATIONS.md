# Supabase migration order

Apply these files **in order** on a fresh Supabase project (SQL Editor or `apply-migrations.sh`).

> `schema.sql` is the baseline. Each `migration_*.sql` adds tables, columns, or policies. Skipping files will break the app.

## Order

| # | File | Purpose |
|---|------|---------|
| 1 | `schema.sql` | Core tables, triggers, baseline RLS |
| 2 | `migration_phase1.sql` | Role assignments, property images |
| 3 | `migration_phase1_2_rls.sql` | **Strict RLS** for core tables |
| 4 | `migration_phase1_3_task_notifications.sql` | Task notification triggers |
| 5 | `migration_phase2_1_task_assignment_comments.sql` | Task comments |
| 6 | `migration_phase2_2_auto_recurring_tasks.sql` | Recurring tasks |
| 7 | `migration_phase2_3_checklists.sql` | Checklists |
| 8 | `migration_checkin.sql` | Online check-in |
| 9 | `migration_enhanced_messaging.sql` | Messages table |
| 10 | `migration_messages_rls.sql` | Messages RLS |
| 11 | `migration_partners_phase1.sql` | Partner marketplace |
| 12 | `migration_marketplace_constraint.sql` | Marketplace constraints |
| 13 | `migration_phase3_1_incidents.sql` | Incidents |
| 14 | `migration_phase3_2_work_orders.sql` | Work orders |
| 15 | `migration_phase3_3_inspections.sql` | Inspections |
| 16 | `migration_phase4_1_inventory.sql` | Inventory |
| 17 | `migration_phase4_2_expenses.sql` | Expenses |
| 18 | `migration_phase6_2_shifts.sql` | Team planning / shifts |
| 19 | `migration_phase7_1_contract_token_security.sql` | Contract signing RPCs |
| 20 | `migration_phase7_2_activity_log.sql` | Activity log |
| 21 | `migration_phase8_1_push.sql` | Push subscriptions |
| 22 | `migration_phase9_1_maintenance.sql` | Maintenance |
| 23 | `migration_phase9_2_budgets.sql` | Budgets |
| 24 | `migration_phase9_3_timeclock.sql` | Time clock |
| 25 | `migration_phase9_4_provider_ratings.sql` | Provider ratings |
| 26 | `migration_phase10_1_documents.sql` | Documents |
| 27 | `migration_phase10_2_incident_escalation.sql` | Incident escalation |

## Optional (development only)

| File | Purpose |
|------|---------|
| `seed.sql` | Demo properties, reservations, payments |

## Production hardening

After migrations, review `rls-audit.md` and verify policies with test users (owner, house manager, guest). The commented templates in `rls-production-policies.sql` document the target state.

## Apply script

```bash
bash supabase/apply-migrations.sh
```

Requires the Supabase CLI or manual paste into SQL Editor.
