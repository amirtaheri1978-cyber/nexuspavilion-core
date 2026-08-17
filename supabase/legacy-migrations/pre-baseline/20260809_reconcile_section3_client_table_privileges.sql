begin;

-- Reproduce the verified Development client privilege baseline for Section 3.
-- RLS continues to control rows; these grants establish table and column access.

-- Public company discovery and authenticated self-company creation are required
-- by the corresponding companies RLS policies.
grant select on table public.companies to anon, authenticated;
grant insert on table public.companies to authenticated;

-- Preserve the ownership-sensitive company update boundary.
revoke update on table public.companies from public;
revoke update on table public.companies from anon;
revoke update on table public.companies from authenticated;

grant update (
  name,
  category,
  location,
  network_role,
  logo_url
) on table public.companies to authenticated;

-- Company deletion remains available only to authenticated actors that pass
-- the active owner/admin company DELETE RLS policy.
revoke delete on table public.companies from public;
revoke delete on table public.companies from anon;
revoke delete on table public.companies from authenticated;
grant delete on table public.companies to authenticated;

-- Transfer requests are read-only to browser clients. Mutations are governed
-- by SECURITY DEFINER RPCs, while service_role retains operational table access.
revoke all on table public.ownership_transfer_requests from public;
revoke all on table public.ownership_transfer_requests from anon;
revoke all on table public.ownership_transfer_requests from authenticated;

grant select on table public.ownership_transfer_requests to authenticated;
grant all privileges on table public.ownership_transfer_requests to service_role;

commit;
