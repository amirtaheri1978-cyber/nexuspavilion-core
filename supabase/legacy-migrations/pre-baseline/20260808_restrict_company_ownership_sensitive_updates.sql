begin;

-- Ownership-safe company update boundary.
-- Authenticated clients may update only ordinary company profile fields.
-- Ownership projection changes remain controlled by SECURITY DEFINER commands.

-- Remove generic UPDATE from every repository-controlled client-facing role.
-- A PUBLIC grant is inherited by all roles, so revoking authenticated alone
-- would leave an ownership-sensitive update path if PUBLIC were granted it.
revoke update
on table public.companies
from public;

revoke update
on table public.companies
from anon;

revoke update
on table public.companies
from authenticated;

grant update (
  name,
  category,
  location,
  network_role,
  logo_url
)
on table public.companies
to authenticated;

commit;
