# Playbook migrations Supabase — My Butlr

> **Ne jamais se contenter de `schema.sql` en production.**  
> `schema.sql` = baseline permissive. Les migrations `migration_*.sql` durcissent RLS et ajoutent les modules.

## Ordre recommandé

Exécuter dans le SQL Editor Supabase (ou CLI) **dans cet ordre** :

### Baseline
1. `schema.sql`
2. `seed.sql` *(dev uniquement)*

### Phase 1 — Core RLS & data
3. `migration_phase1.sql`
4. `migration_phase1_2_rls.sql` ⚡ *critique*
5. `migration_phase1_3_task_notifications.sql`

### Phase 2 — Tasks
6. `migration_phase2_1_task_assignment_comments.sql`
7. `migration_phase2_2_auto_recurring_tasks.sql`
8. `migration_phase2_3_checklists.sql`

### Phase 3 — Ops field
9. `migration_phase3_1_incidents.sql`
10. `migration_phase3_2_work_orders.sql`
11. `migration_phase3_3_inspections.sql`

### Phase 4 — Finance ops
12. `migration_phase4_1_inventory.sql`
13. `migration_phase4_2_expenses.sql`

### Messaging / partners / check-in
14. `migration_checkin.sql`
15. `migration_enhanced_messaging.sql`
16. `migration_messages_rls.sql`
17. `migration_marketplace_constraint.sql`
18. `migration_partners_phase1.sql`

### Phase 6–11
19. `migration_phase6_2_shifts.sql`
20. `migration_phase7_1_contract_token_security.sql` ⚡
21. `migration_phase7_2_activity_log.sql`
22. `migration_phase7_3_contract_schema_alignment.sql`
23. `migration_phase7_4_contract_legal_loop.sql`
24. `migration_phase8_1_push.sql`
25. `migration_phase9_1_maintenance.sql`
26. `migration_phase9_2_budgets.sql`
27. `migration_phase9_3_timeclock.sql`
28. `migration_phase9_4_provider_ratings.sql`
29. `migration_phase10_1_documents.sql`
30. `migration_phase10_2_incident_escalation.sql`
31. `migration_phase11_1_auth_hardening.sql` ⚡ *signup role + residual RLS*

### Ne pas appliquer tel quel
- `rls-production-policies.sql` — **commenté / obsolète** (remplacé par phase 1.2 + migrations ciblées)

## Vérifications post-deploy

```sql
-- Policies encore USING (true) ?
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public' AND qual = 'true';

-- Helpers RLS présents ?
SELECT proname FROM pg_proc
WHERE proname IN ('is_app_owner', 'can_access_property', 'can_access_reservation');
```

## Secrets Edge (hors Vite)

```bash
supabase secrets set RESEND_API_KEY=... CONTRACT_FROM_EMAIL=... APP_ORIGIN=...
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... WEBHOOK_SECRET=...
```
