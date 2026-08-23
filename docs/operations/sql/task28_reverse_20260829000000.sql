-- EMERGENCY REVERSE ONLY
-- docs/operations/sql/task28_reverse_20260829000000.sql
--
-- OPERATOR ARTIFACT. This is NOT a forward Supabase migration.
-- Do NOT place this file under supabase/migrations/.
-- Do NOT execute this script casually in Production.
--
-- SECURITY WARNING
-- Executing this reverse intentionally restores the known pre-290
-- confidentiality/integrity weakness:
--   - issuers can SELECT locked invited/sealed/framework quote rows
--   - owner/admin can UPDATE quote decision before commercial unlock
--   - authenticated recovers table-level UPDATE on public.quotes
--     (supplier-authored columns become UPDATE-able if RLS matches)
--   - award_rfq_quote can award before the RFQ deadline
--
-- Normal rollback should prefer APPLICATION ROLLBACK to a SHA that does
-- not require 280/290, or a FORWARD-FIX that keeps 290 protections.
-- Product Owner and security approval are required before execution.
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
-- 20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql
-- to re-run unexpectedly.
--
-- Authoritative historical sources:
--   supabase/migrations/20260826000000_enforce_atomic_rfq_award_integrity.sql
--   supabase/migrations/20260822000000_dev_public_baseline.sql
--
-- This reverse does not alter:
--   supplier INSERT policy
--   260 award unique index
--   260 integrity triggers
--   quote/RFQ business rows

begin;

-- A. Restore pre-290 award_rfq_quote from 20260826000000 (verbatim).
create or replace function public.award_rfq_quote(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_company_id uuid;
  membership_role text;
  company_status text;
  company_workspace_status text;
  selected_quote public.quotes%rowtype;
  rfq_row public.rfqs%rowtype;
  v_awarded_at timestamptz := now();
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED',
      'error_message', 'Unauthorized.'
    );
  end if;

  if p_quote_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_ID_REQUIRED',
      'error_message', 'Quote ID is required.'
    );
  end if;

  select p.company_id
  into actor_company_id
  from public.profiles p
  where p.id = actor_user_id;

  if actor_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_PROFILE_REQUIRED',
      'error_message', 'Company profile is required to award contracts.'
    );
  end if;

  -- Tenant-bounded: missing quotes and foreign-company quotes are indistinguishable.
  select q.*
  into selected_quote
  from public.quotes q
  join public.rfqs r
    on r.id = q.rfq_id
  where q.id = p_quote_id
    and r.company_id = actor_company_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_NOT_FOUND',
      'error_message', 'Quote not found.'
    );
  end if;

  select r.*
  into rfq_row
  from public.rfqs r
  where r.id = selected_quote.rfq_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_FOUND',
      'error_message', 'RFQ not found.'
    );
  end if;

  perform 1
  from public.quotes q
  where q.rfq_id = rfq_row.id
  order by q.id
  for update;

  select q.*
  into selected_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.rfq_id = rfq_row.id;

  if rfq_row.company_id is distinct from actor_company_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_RFQ_COMPANY',
      'error_message', 'You can only award RFQs owned by your company.'
    );
  end if;

  select om.workspace_role
  into membership_role
  from public.organization_memberships om
  where om.user_id = actor_user_id
    and om.company_id = rfq_row.company_id
    and om.membership_status = 'active'
    and om.workspace_role in ('owner', 'admin');

  select c.status, c.workspace_status
  into company_status, company_workspace_status
  from public.companies c
  where c.id = rfq_row.company_id;

  if membership_role is null
     or company_workspace_status is distinct from 'active'
     or company_status is distinct from 'verified'
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Your organization is not permitted to award contracts.'
    );
  end if;

  if rfq_row.status = 'awarded'
     or rfq_row.awarded_quote_id is not null
     or rfq_row.awarded_at is not null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_AWARDED',
      'error_message', 'This RFQ has already been awarded.'
    );
  end if;

  if selected_quote.decision = 'awarded' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_ALREADY_AWARDED',
      'error_message', 'This quote has already been awarded.'
    );
  end if;

  if selected_quote.decision = 'rejected' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_INELIGIBLE',
      'error_message', 'Rejected quotes cannot be awarded.'
    );
  end if;

  if selected_quote.company_id is not null
     and selected_quote.company_id = rfq_row.company_id
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'SELF_AWARD_NOT_ALLOWED',
      'error_message', 'Your company cannot award its own quote.'
    );
  end if;

  update public.rfqs
  set
    status = 'awarded',
    awarded_quote_id = selected_quote.id,
    awarded_at = v_awarded_at
  where id = rfq_row.id
    and awarded_quote_id is null
    and awarded_at is null
    and status is distinct from 'awarded'
  returning * into rfq_row;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_AWARDED',
      'error_message', 'This RFQ has already been awarded.'
    );
  end if;

  update public.quotes
  set decision = 'rejected'
  where rfq_id = rfq_row.id
    and id is distinct from selected_quote.id
    and decision is distinct from 'awarded';

  update public.quotes
  set
    decision = 'awarded',
    awarded_at = v_awarded_at
  where id = selected_quote.id
    and decision is distinct from 'awarded'
  returning * into selected_quote;

  if not found then
    raise exception
      using
        errcode = '23514',
        message = 'Failed to award the selected quote.';
  end if;

  return jsonb_build_object(
    'success', true,
    'awarded_quote', to_jsonb(selected_quote),
    'rfq', to_jsonb(rfq_row)
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_AWARDED',
      'error_message', 'This RFQ has already been awarded.'
    );
end;
$$;

comment on function public.award_rfq_quote(uuid) is
  'Atomically awards one quote on its RFQ. Actor is auth.uid(); caller cannot supply company_id. Locks the RFQ row, rejects competing quotes, and writes RFQ and quote terminal state in one transaction.';

alter function public.award_rfq_quote(uuid) owner to postgres;

revoke all
on function public.award_rfq_quote(uuid)
from public;

revoke all
on function public.award_rfq_quote(uuid)
from anon;

grant execute
on function public.award_rfq_quote(uuid)
to authenticated, service_role;

-- B. Remove 290 helper RPCs only after award_rfq_quote no longer references them.
drop function if exists public.count_rfq_quote_submissions(uuid);
drop function if exists public.parse_rfq_deadline_timestamptz(text);

-- C. Restore pre-290 SELECT policy from 20260822000000 (verbatim CREATE POLICY).
drop policy if exists "Company members can read own company quotes"
  on public.quotes;
drop policy if exists "Issuing buyers can read quotes after commercial unlock"
  on public.quotes;
drop policy if exists "Company members can read permitted quotes"
  on public.quotes;

CREATE POLICY "Company members can read permitted quotes" ON "public"."quotes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "quotes"."company_id") AND ("om"."membership_status" = 'active'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));

-- D. Restore pre-290 UPDATE policy from 20260822000000 (verbatim CREATE POLICY).
drop policy if exists "Workspace administrators can update RFQ quote decisions"
  on public.quotes;

CREATE POLICY "Workspace administrators can update RFQ quote decisions" ON "public"."quotes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));

-- E. Restore pre-290 table-level authenticated UPDATE. Do not touch SELECT/INSERT.
revoke update (decision)
on table public.quotes
from authenticated;

grant update
on table public.quotes
to authenticated;

commit;
