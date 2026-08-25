begin;

-- Phase 2: expose rfqs.deadline_timezone on invitation token context.
-- public.rfqs.deadline remains text. This does not rewrite the historical
-- baseline or commercial-unlock deadline parsing.
-- RETURNS TABLE changes require drop/recreate.

drop function if exists public.get_rfq_invitation_context(text);

create function public.get_rfq_invitation_context(p_token text)
returns table (
  invite_id uuid,
  invite_email text,
  invite_status text,
  rfq_id uuid,
  rfq_title text,
  rfq_slug text,
  rfq_description text,
  rfq_category text,
  rfq_location text,
  rfq_budget text,
  rfq_deadline text,
  rfq_deadline_timezone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.email,
    i.status,
    r.id,
    r.title,
    r.slug,
    r.description,
    r.category,
    r.location,
    r.budget,
    r.deadline,
    r.deadline_timezone
  from public.rfq_invites i
  join public.rfqs r
    on r.id = i.rfq_id
  where p_token is not null
    and length(p_token) >= 32
    and i.token = p_token
    and i.status in ('sent', 'invited')
    and r.status = 'open'
  limit 1;
$$;

alter function public.get_rfq_invitation_context(text)
  owner to postgres;

revoke all
on function public.get_rfq_invitation_context(text)
from public;

grant all
on function public.get_rfq_invitation_context(text)
to anon;

grant all
on function public.get_rfq_invitation_context(text)
to authenticated;

grant all
on function public.get_rfq_invitation_context(text)
to service_role;

commit;
