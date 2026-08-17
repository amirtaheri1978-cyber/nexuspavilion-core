begin;

create or replace function public.get_organization_members()
returns table (
  membership_id uuid,
  user_id uuid,
  company_id uuid,

  email text,
  legacy_role text,
  profile_created_at timestamp with time zone,

  workspace_role text,
  procurement_function text,
  membership_type text,
  membership_status text,

  joined_at timestamp with time zone,
  role_changed_at timestamp with time zone,
  membership_created_at timestamp with time zone,
  membership_updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_company_id uuid;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  /*
   * Resolve the authenticated user's active workspace.
   *
   * The current application supports one active company context
   * per user. When workspace switching is introduced, company_id
   * should become an explicit and validated function argument.
   */
  select om.company_id
  into actor_company_id
  from public.organization_memberships om
  where om.user_id = actor_user_id
    and om.membership_status = 'active'
  order by
    case om.workspace_role
      when 'owner' then 1
      when 'admin' then 2
      when 'member' then 3
      when 'viewer' then 4
      else 5
    end,
    om.created_at
  limit 1;

  if actor_company_id is null then
    raise exception
      'An active workspace membership is required.'
      using errcode = '42501';
  end if;

  /*
   * Return only the internal member information required by the
   * company workspace UI. Membership authority remains read-only;
   * mutations continue through dedicated protected RPC commands.
   */
  return query
  select
    om.id as membership_id,
    om.user_id,
    om.company_id,

    p.email,
    p.role as legacy_role,
    p.created_at as profile_created_at,

    om.workspace_role,
    om.procurement_function,
    om.membership_type,
    om.membership_status,

    om.joined_at,
    om.role_changed_at,
    om.created_at as membership_created_at,
    om.updated_at as membership_updated_at

  from public.organization_memberships om

  join public.profiles p
    on p.id = om.user_id

  where om.company_id = actor_company_id
    and om.membership_status = 'active'

  order by
    case om.workspace_role
      when 'owner' then 1
      when 'admin' then 2
      when 'member' then 3
      when 'viewer' then 4
      else 5
    end,
    lower(coalesce(p.email, '')),
    om.created_at;
end;
$$;

revoke all
on function public.get_organization_members()
from public;

grant execute
on function public.get_organization_members()
to authenticated;

commit;