begin;

create or replace function public.get_organization_invitation_context(
  p_token text
)
returns table (
  invite_email text,
  invite_role text,
  invite_status text,
  invite_expires_at timestamp with time zone,
  company_name text,
  company_category text,
  company_location text,
  company_logo_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.email,
    i.role,
    i.status,
    i.expires_at,
    c.name,
    c.category,
    c.location,
    c.logo_url
  from public.invitations as i
  join public.companies as c
    on c.id = i.company_id
  where p_token is not null
    and length(btrim(p_token)) >= 32
    and i.token = btrim(p_token)
    and i.status = 'pending'
    and i.expires_at >= now()
  limit 1;
$$;

revoke all
on function public.get_organization_invitation_context(text)
from public;

grant execute
on function public.get_organization_invitation_context(text)
to anon, authenticated, service_role;

commit;
