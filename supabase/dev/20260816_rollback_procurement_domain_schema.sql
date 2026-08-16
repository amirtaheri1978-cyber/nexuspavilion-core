begin;

-- Full Development schema rollback for
-- 20260816_create_procurement_domain_schema.sql.
-- Run the demo-data rollback first. This script intentionally refuses to drop
-- the procurement schema while any procurement-domain rows remain.
-- The invitation consumer must also be reverted before this rollback is used.
-- Do not execute without separate approval.

do $$
begin
  if to_regclass('public.rfqs') is null
    or to_regclass('public.quotes') is null
    or to_regclass('public.rfq_ai_reviews') is null
    or to_regclass('public.rfq_invites') is null
  then
    raise exception 'Procurement schema is incomplete or already absent.';
  end if;

  if exists (select 1 from public.rfqs)
    or exists (select 1 from public.quotes)
    or exists (select 1 from public.rfq_ai_reviews)
    or exists (select 1 from public.rfq_invites)
  then
    raise exception 'Procurement tables are not empty; refusing destructive schema rollback.';
  end if;
end;
$$;

drop function if exists public.get_rfq_invitation_context(text);

-- The table drop removes the table-owned award trigger and RLS policies.
drop table
  public.rfq_ai_reviews,
  public.rfq_invites,
  public.quotes,
  public.rfqs;

drop function if exists public.enforce_rfq_award_authorization();

do $$
begin
  if to_regclass('public.rfqs') is not null
    or to_regclass('public.quotes') is not null
    or to_regclass('public.rfq_ai_reviews') is not null
    or to_regclass('public.rfq_invites') is not null
  then
    raise exception 'Schema rollback verification failed.';
  end if;
end;
$$;

commit;
