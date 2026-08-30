begin;

/*
 * Company capabilities contract (7-03B).
 *
 * Normalized company-neutral capability tags:
 * trade | service | product | region
 *
 * Writes are atomic via replace_company_capabilities().
 */

create table if not exists public.company_capabilities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  capability_type text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_capabilities_type_check
    check (capability_type in ('trade', 'service', 'product', 'region')),
  constraint company_capabilities_label_not_blank_check
    check (char_length(btrim(label)) > 0),
  constraint company_capabilities_label_length_check
    check (char_length(label) <= 120),
  constraint company_capabilities_sort_order_check
    check (sort_order >= 0)
);

create unique index if not exists company_capabilities_company_type_label_unique_idx
  on public.company_capabilities (
    company_id,
    capability_type,
    lower(btrim(label))
  );

create index if not exists company_capabilities_company_type_sort_idx
  on public.company_capabilities (company_id, capability_type, sort_order, id);

alter table public.company_capabilities enable row level security;

create policy company_capabilities_select_active_member
  on public.company_capabilities
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = company_capabilities.company_id
        and om.membership_status = 'active'
    )
  );

create policy company_capabilities_select_public_company
  on public.company_capabilities
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.company_directory as cd
      where cd.id = company_capabilities.company_id
        and lower(btrim(coalesce(cd.status, ''))) in ('approved', 'verified')
    )
  );

revoke all on table public.company_capabilities from public;
revoke insert, update, delete on table public.company_capabilities from authenticated;
grant select on table public.company_capabilities to anon, authenticated;

create or replace function public.replace_company_capabilities(
  p_company_id uuid,
  p_capabilities jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  capability_key text;
  capability_labels jsonb;
  capability_element jsonb;
  capability_label text;
  normalized_label text;
  normalized_labels text[] := array[]::text[];
  seen_labels text[] := array[]::text[];
  insert_sort_order integer;
  inserted_count integer := 0;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'A company workspace is required.'
    );
  end if;

  if p_capabilities is null or jsonb_typeof(p_capabilities) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'Capabilities payload must be an object.'
    );
  end if;

  select om.workspace_role
  into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active'
  limit 1;

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only workspace owners and administrators can update company capabilities.'
    );
  end if;

  for capability_key in
    select jsonb_object_keys(p_capabilities)
  loop
    if capability_key not in ('trade', 'service', 'product', 'region') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_CAPABILITY_TYPE',
        'error_message', 'Capability type must be trade, service, product, or region.'
      );
    end if;

    capability_labels := p_capabilities -> capability_key;

    if jsonb_typeof(capability_labels) <> 'array' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_CAPABILITY_GROUP',
        'error_message', format('Capability group %s must be an array.', capability_key)
      );
    end if;

    if jsonb_array_length(capability_labels) > 40 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'CAPABILITY_LIMIT_EXCEEDED',
        'error_message', format('Capability group %s exceeds the maximum of 40 entries.', capability_key)
      );
    end if;

    normalized_labels := array[]::text[];
    seen_labels := array[]::text[];

    for capability_element in
      select value
      from jsonb_array_elements(capability_labels) as entries(value)
    loop
      if jsonb_typeof(capability_element) <> 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be strings.'
        );
      end if;

      capability_label := capability_element #>> '{}';
      normalized_label := regexp_replace(btrim(coalesce(capability_label, '')), '\s+', ' ', 'g');

      if normalized_label = '' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be non-empty.'
        );
      end if;

      if char_length(normalized_label) > 120 then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be 120 characters or fewer.'
        );
      end if;

      if lower(normalized_label) = any(seen_labels) then
        return jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_CAPABILITY_LABEL',
          'error_message', format('Duplicate capability label detected in %s.', capability_key)
        );
      end if;

      seen_labels := array_append(seen_labels, lower(normalized_label));
      normalized_labels := array_append(normalized_labels, normalized_label);
    end loop;
  end loop;

  delete from public.company_capabilities
  where company_id = p_company_id;

  for capability_key in
    select unnest(array['trade', 'service', 'product', 'region']::text[])
  loop
    capability_labels := coalesce(p_capabilities -> capability_key, '[]'::jsonb);
    insert_sort_order := 0;

    for capability_element in
      select value
      from jsonb_array_elements(capability_labels) as entries(value)
    loop
      if jsonb_typeof(capability_element) <> 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be strings.'
        );
      end if;

      capability_label := capability_element #>> '{}';
      normalized_label := regexp_replace(btrim(coalesce(capability_label, '')), '\s+', ' ', 'g');

      insert into public.company_capabilities (
        company_id,
        capability_type,
        label,
        sort_order
      )
      values (
        p_company_id,
        capability_key,
        normalized_label,
        insert_sort_order
      );

      insert_sort_order := insert_sort_order + 1;
      inserted_count := inserted_count + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'capability_count', inserted_count
  );
end;
$$;

comment on table public.company_capabilities is
  'Company-neutral capability tags grouped by trade, service, product, and region.';

comment on function public.replace_company_capabilities(uuid, jsonb) is
  'Atomically replaces all capability tags for a company. Owner/admin only.';

alter function public.replace_company_capabilities(uuid, jsonb)
  owner to postgres;

revoke all on function public.replace_company_capabilities(uuid, jsonb)
from public;

revoke all on function public.replace_company_capabilities(uuid, jsonb)
from anon;

grant execute on function public.replace_company_capabilities(uuid, jsonb)
to authenticated;

commit;
