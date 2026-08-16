begin;

-- F16-04: Remove inherited TRUNCATE, TRIGGER, and REFERENCES from client-facing
-- roles on launch-sensitive public tables. RLS does not protect TRUNCATE.
-- Required CRUD table privileges are left unchanged.
-- This migration does not modify service_role.

revoke truncate, trigger, references
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

revoke truncate, trigger, references
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

revoke truncate, trigger, references
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

commit;
