begin;

-- F16-05: Remove residual MAINTAIN from client-facing roles on launch-sensitive
-- public tables. F16-04 already removed TRUNCATE, TRIGGER, and REFERENCES on
-- these tables; this migration removes only MAINTAIN.
-- Required CRUD table privileges are left unchanged.
-- This migration does not modify service_role, including service_role default
-- table privileges.
--
-- postgres-owned future tables: ALTER DEFAULT PRIVILEGES FOR ROLE postgres
-- IN SCHEMA public removes TRUNCATE, REFERENCES, TRIGGER, and MAINTAIN from
-- PUBLIC, anon, and authenticated. SELECT / INSERT / UPDATE / DELETE
-- defaults are not changed.
--
-- supabase_admin default table ACL remains a separate platform-owned follow-up.
-- Confirmed Dev execution context: current_user = postgres, session_user =
-- postgres, pg_has_role(postgres, supabase_admin, MEMBER) = false, and
-- pg_has_role(postgres, supabase_admin, SET) = false. This migration therefore
-- does not attempt to change default privileges owned by supabase_admin.

revoke maintain
on table
  public.audit_logs,
  public.companies,
  public.invitations,
  public.notifications,
  public.profiles,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.internal_reviewer_assignments,
  public.representative_verification_cases,
  public.rfqs,
  public.quotes,
  public.rfq_ai_reviews,
  public.rfq_invites
from public;

revoke maintain
on table
  public.audit_logs,
  public.companies,
  public.invitations,
  public.notifications,
  public.profiles,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.internal_reviewer_assignments,
  public.representative_verification_cases,
  public.rfqs,
  public.quotes,
  public.rfq_ai_reviews,
  public.rfq_invites
from anon;

revoke maintain
on table
  public.audit_logs,
  public.companies,
  public.invitations,
  public.notifications,
  public.profiles,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.internal_reviewer_assignments,
  public.representative_verification_cases,
  public.rfqs,
  public.quotes,
  public.rfq_ai_reviews,
  public.rfq_invites
from authenticated;

alter default privileges for role postgres in schema public
revoke truncate, references, trigger, maintain
on tables
from public;

alter default privileges for role postgres in schema public
revoke truncate, references, trigger, maintain
on tables
from anon;

alter default privileges for role postgres in schema public
revoke truncate, references, trigger, maintain
on tables
from authenticated;

commit;
