begin;

create or replace function public.get_current_user_pending_workspace_invitation()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_email text;
  pending_invitation public.invitations%rowtype;
begin
  actor_user_id := auth.uid();
  actor_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  if actor_user_id is null or actor_email = '' then
    return null;
  end if;

  if not exists (
    select 1
    from auth.users as u
    where u.id = actor_user_id
      and u.email_confirmed_at is not null
      and lower(btrim(coalesce(u.email, ''))) = actor_email
  ) then
    return null;
  end if;

  select i.*
  into pending_invitation
  from public.invitations as i
  where lower(btrim(coalesce(i.email, ''))) = actor_email
    and i.status = 'pending'
    and (i.expires_at is null or i.expires_at >= now())
  order by i.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'token', pending_invitation.token,
    'company_id', pending_invitation.company_id,
    'status', pending_invitation.status,
    'expires_at', pending_invitation.expires_at
  );
end;
$$;

alter function public.get_current_user_pending_workspace_invitation()
  owner to postgres;

revoke all
on function public.get_current_user_pending_workspace_invitation()
from public;

revoke all
on function public.get_current_user_pending_workspace_invitation()
from anon;

grant execute
on function public.get_current_user_pending_workspace_invitation()
to authenticated;

comment on function public.get_current_user_pending_workspace_invitation() is
  'Returns the newest non-expired pending workspace invitation for the authenticated confirmed email, enabling safe onboarding recovery without exposing other recipients invitations.';

commit;
