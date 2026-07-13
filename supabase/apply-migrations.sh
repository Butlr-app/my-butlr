#!/usr/bin/env bash
# Apply all My Butlr SQL migrations in order.
# Usage: bash supabase/apply-migrations.sh
# Paste each file into Supabase SQL Editor if you don't use psql.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/supabase"

FILES=(
  schema.sql
  migration_phase1.sql
  migration_phase1_2_rls.sql
  migration_phase1_3_task_notifications.sql
  migration_phase2_1_task_assignment_comments.sql
  migration_phase2_2_auto_recurring_tasks.sql
  migration_phase2_3_checklists.sql
  migration_checkin.sql
  migration_enhanced_messaging.sql
  migration_messages_rls.sql
  migration_partners_phase1.sql
  migration_marketplace_constraint.sql
  migration_phase3_1_incidents.sql
  migration_phase3_2_work_orders.sql
  migration_phase3_3_inspections.sql
  migration_phase4_1_inventory.sql
  migration_phase4_2_expenses.sql
  migration_phase6_2_shifts.sql
  migration_phase7_1_contract_token_security.sql
  migration_phase7_2_activity_log.sql
  migration_phase8_1_push.sql
  migration_phase9_1_maintenance.sql
  migration_phase9_2_budgets.sql
  migration_phase9_3_timeclock.sql
  migration_phase9_4_provider_ratings.sql
  migration_phase10_1_documents.sql
  migration_phase10_2_incident_escalation.sql
)

echo "My Butlr — migration files to apply in order:"
echo ""
for i in "${!FILES[@]}"; do
  n=$((i + 1))
  f="$DIR/${FILES[$i]}"
  if [[ ! -f "$f" ]]; then
    echo "ERROR: missing $f" >&2
    exit 1
  fi
  echo "  $n. ${FILES[$i]}"
done

echo ""
echo "To apply with psql (replace connection string):"
echo "  export DATABASE_URL='postgresql://...'"
for f in "${FILES[@]}"; do
  echo "  psql \"\$DATABASE_URL\" -f \"$DIR/$f\""
done

echo ""
echo "Or paste each file into Supabase Dashboard → SQL Editor."
echo "See supabase/MIGRATIONS.md for details."
