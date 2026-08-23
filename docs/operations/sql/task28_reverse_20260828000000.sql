-- OPERATOR ARTIFACT. This is NOT a forward Supabase migration.
-- docs/operations/sql/task28_reverse_20260828000000.sql
-- Do NOT place this file under supabase/migrations/.
-- Do NOT execute this script casually in Production.
--
-- Default reverse is NON-DESTRUCTIVE to audit_logs and notifications rows.
-- Product Owner approval is required before execution.
--
-- FULL ROLLBACK ORDER (do not automate application rollback in SQL)
--   1. freeze/stop writes as appropriate
--   2. roll the application back first to a SHA that does not require 280/290
--   3. execute 290 reverse if explicitly authorized
--   4. execute 280 reverse if explicitly authorized
--   5. validate policies/functions/grants
--   6. separately decide migration-history reconciliation
--
-- MIGRATION HISTORY
-- This script changes database objects only.
-- It does NOT DELETE rows from supabase_migrations.schema_migrations.
-- Migration history is a separate operator decision. Blindly deleting
-- history rows may cause a future forward apply of
-- 20260828000000_enable_company_scoped_audit_and_notification_access.sql
-- to re-run unexpectedly.
--
-- RETAINED SCHEMA (intentionally retained; slightly richer than pre-280)
--   notifications.company_id
--   notifications_company_id_fkey
--   notifications_company_id_idx
-- Removing company_id would destroy post-280 notification scoping data.
-- Authorization/function rollback does not require dropping that column.
--
-- CRITICAL ORDERING
-- Never DISABLE ROW LEVEL SECURITY while authenticated still has SELECT.
-- That transient state would expose all audit_logs and notifications rows.

begin;

-- 1. Stop the 280 trusted writer.
drop function if exists public.record_procurement_activity(text, uuid);

-- 2. Drop 280 SELECT policy on notifications.
drop policy if exists "Company members can read company notifications"
  on public.notifications;

-- 3. Drop 280 SELECT policy on audit_logs.
drop policy if exists "Company members can read company audit logs"
  on public.audit_logs;

-- 4-5. Revoke authenticated SELECT before touching RLS.
revoke select
on table public.notifications
from authenticated;

revoke select
on table public.audit_logs
from authenticated;

-- 6. ONLY AFTER both SELECT grants are revoked: restore baseline RLS-off state.
alter table public.notifications
  disable row level security;

alter table public.audit_logs
  disable row level security;

commit;

-- DESTRUCTIVE — DO NOT EXECUTE AS NORMAL ROLLBACK
-- Exact-schema alternative (commented out). Drops post-280 company_id values.
--
-- alter table public.notifications
--   drop constraint if exists notifications_company_id_fkey;
-- drop index if exists public.notifications_company_id_idx;
-- alter table public.notifications
--   drop column if exists company_id;
