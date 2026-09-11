begin;

/*
 * Company compliance contract (7-05B).
 *
 * Company-owned, self-declared governance facts:
 * insurance | workers_compensation | safety
 *
 * No counterparty exists in a record. Buyer-to-vendor supplier compliance and
 * approved vendor relationships are a separate, out-of-domain concern.
 *
 * Writes are atomic via replace_company_compliance().
 * Internal visibility only: there is no public view and no anon grant.
 * Document evidence (certificates, policy PDFs) is out of scope here.
 */

create table if not exists public.company_compliance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  compliance_type text not null,
  name text not null,
  provider text,
  effective_on date,
  expires_on date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_compliance_type_check
    check (compliance_type in ('insurance', 'workers_compensation', 'safety')),
  constraint company_compliance_name_not_blank_check
    check (char_length(btrim(name)) > 0),
  constraint company_compliance_name_length_check
    check (char_length(name) <= 160),
  constraint company_compliance_provider_length_check
    check (provider is null or char_length(provider) <= 160),
  constraint company_compliance_sort_order_check
    check (sort_order >= 0),
  constraint company_compliance_date_order_check
    check (expires_on is null or effective_on is null or expires_on >= effective_on)
);

create unique index if not exists company_compliance_company_type_dedupe_idx
  on public.company_compliance (
    company_id,
    compliance_type,
    lower(btrim(name)),
    coalesce(lower(btrim(provider)), '')
  );

create index if not exists company_compliance_company_type_sort_idx
  on public.company_compliance (company_id, compliance_type, sort_order, id);

alter table public.company_compliance enable row level security;

create policy company_compliance_select_active_member
  on public.company_compliance
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = company_compliance.company_id
        and om.membership_status = 'active'
    )
  );

revoke all on table public.company_compliance from public;
revoke all on table public.company_compliance from anon;
revoke insert, update, delete on table public.company_compliance from authenticated;
grant select on table public.company_compliance to authenticated;

create or replace function public.replace_company_compliance(
  p_company_id uuid,
  p_compliance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  compliance_key text;
  compliance_field text;
  compliance_items jsonb;
  compliance_item jsonb;
  normalized_name text;
  normalized_provider text;
  normalized_effective_on date;
  normalized_expires_on date;
  dedupe_key text;
  seen_keys text[] := array[]::text[];
  insert_sort_order integer;
  inserted_count integer := 0;
  counts_by_type jsonb := jsonb_build_object(
    'insurance', 0,
    'workers_compensation', 0,
    'safety', 0
  );
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
      'error_message', 'Only workspace owners and administrators can update company compliance.'
    );
  end if;

  -- Payload validation begins only after owner/admin authority is established so
  -- that a direct RPC caller cannot probe payload shape without write authority.
  if p_compliance is null or jsonb_typeof(p_compliance) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'Compliance payload must be an object.'
    );
  end if;

  for compliance_key in
    select jsonb_object_keys(p_compliance)
  loop
    if compliance_key not in ('insurance', 'workers_compensation', 'safety') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_COMPLIANCE_TYPE',
        'error_message', 'Compliance type must be insurance, workers_compensation, or safety.'
      );
    end if;

    compliance_items := p_compliance -> compliance_key;

    if jsonb_typeof(compliance_items) <> 'array' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_COMPLIANCE_GROUP',
        'error_message', format('Compliance group %s must be an array.', compliance_key)
      );
    end if;

    if jsonb_array_length(compliance_items) > 40 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'COMPLIANCE_LIMIT_EXCEEDED',
        'error_message', format('Compliance group %s exceeds the maximum of 40 entries.', compliance_key)
      );
    end if;

    seen_keys := array[]::text[];

    for compliance_item in
      select value
      from jsonb_array_elements(compliance_items) as entries(value)
    loop
      if jsonb_typeof(compliance_item) <> 'object' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_ITEM',
          'error_message', 'Each compliance record must be an object.'
        );
      end if;

      for compliance_field in
        select jsonb_object_keys(compliance_item)
      loop
        if compliance_field not in (
          'name',
          'provider',
          'effective_on',
          'expires_on'
        ) then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_FIELD',
            'error_message', 'Compliance record contains an unsupported field.'
          );
        end if;
      end loop;

      if not (compliance_item ? 'name')
        or jsonb_typeof(compliance_item -> 'name') is distinct from 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_NAME',
          'error_message', 'Compliance name must be a string.'
        );
      end if;

      normalized_name := btrim(
        regexp_replace(compliance_item ->> 'name', '\s+', ' ', 'g')
      );

      if normalized_name = '' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_NAME',
          'error_message', 'Compliance name must be non-empty.'
        );
      end if;

      if char_length(normalized_name) > 160 then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_NAME',
          'error_message', 'Compliance name must be 160 characters or fewer.'
        );
      end if;

      if compliance_item ? 'provider' then
        if jsonb_typeof(compliance_item -> 'provider') = 'null' then
          normalized_provider := null;
        elsif jsonb_typeof(compliance_item -> 'provider') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_PROVIDER',
            'error_message', 'Compliance provider must be a string or null.'
          );
        else
          normalized_provider := btrim(
            regexp_replace(compliance_item ->> 'provider', '\s+', ' ', 'g')
          );

          if normalized_provider = '' then
            normalized_provider := null;
          elsif char_length(normalized_provider) > 160 then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_COMPLIANCE_PROVIDER',
              'error_message', 'Compliance provider must be 160 characters or fewer.'
            );
          end if;
        end if;
      else
        normalized_provider := null;
      end if;

      if compliance_item ? 'effective_on' then
        if jsonb_typeof(compliance_item -> 'effective_on') = 'null' then
          normalized_effective_on := null;
        elsif jsonb_typeof(compliance_item -> 'effective_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_DATE',
            'error_message', 'Effective date must be an ISO date string or null.'
          );
        else
          if (compliance_item ->> 'effective_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_COMPLIANCE_DATE',
              'error_message', 'Effective date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_effective_on := (compliance_item ->> 'effective_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_COMPLIANCE_DATE',
                'error_message', 'Effective date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_effective_on := null;
      end if;

      if compliance_item ? 'expires_on' then
        if jsonb_typeof(compliance_item -> 'expires_on') = 'null' then
          normalized_expires_on := null;
        elsif jsonb_typeof(compliance_item -> 'expires_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_DATE',
            'error_message', 'Expiry date must be an ISO date string or null.'
          );
        else
          if (compliance_item ->> 'expires_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_COMPLIANCE_DATE',
              'error_message', 'Expiry date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_expires_on := (compliance_item ->> 'expires_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_COMPLIANCE_DATE',
                'error_message', 'Expiry date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_expires_on := null;
      end if;

      if normalized_effective_on is not null
        and normalized_expires_on is not null
        and normalized_expires_on < normalized_effective_on then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_DATE',
          'error_message', 'Expiry date must be on or after the effective date.'
        );
      end if;

      dedupe_key := jsonb_build_array(
        compliance_key,
        lower(normalized_name),
        lower(coalesce(normalized_provider, ''))
      )::text;

      if dedupe_key = any(seen_keys) then
        return jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_COMPLIANCE',
          'error_message', format('Duplicate compliance record detected in %s.', compliance_key)
        );
      end if;

      seen_keys := array_append(seen_keys, dedupe_key);
    end loop;
  end loop;

  delete from public.company_compliance
  where company_id = p_company_id;

  for compliance_key in
    select unnest(array['insurance', 'workers_compensation', 'safety']::text[])
  loop
    compliance_items := coalesce(p_compliance -> compliance_key, '[]'::jsonb);
    insert_sort_order := 0;

    for compliance_item in
      select value
      from jsonb_array_elements(compliance_items) as entries(value)
    loop
      normalized_name := btrim(
        regexp_replace(compliance_item ->> 'name', '\s+', ' ', 'g')
      );

      if compliance_item ? 'provider'
        and jsonb_typeof(compliance_item -> 'provider') = 'string' then
        normalized_provider := nullif(
          btrim(regexp_replace(compliance_item ->> 'provider', '\s+', ' ', 'g')),
          ''
        );
      else
        normalized_provider := null;
      end if;

      if compliance_item ? 'effective_on'
        and jsonb_typeof(compliance_item -> 'effective_on') = 'string' then
        normalized_effective_on := (compliance_item ->> 'effective_on')::date;
      else
        normalized_effective_on := null;
      end if;

      if compliance_item ? 'expires_on'
        and jsonb_typeof(compliance_item -> 'expires_on') = 'string' then
        normalized_expires_on := (compliance_item ->> 'expires_on')::date;
      else
        normalized_expires_on := null;
      end if;

      insert into public.company_compliance (
        company_id,
        compliance_type,
        name,
        provider,
        effective_on,
        expires_on,
        sort_order
      )
      values (
        p_company_id,
        compliance_key,
        normalized_name,
        normalized_provider,
        normalized_effective_on,
        normalized_expires_on,
        insert_sort_order
      );

      insert_sort_order := insert_sort_order + 1;
      inserted_count := inserted_count + 1;
    end loop;

    counts_by_type := jsonb_set(
      counts_by_type,
      array[compliance_key],
      to_jsonb(insert_sort_order)
    );
  end loop;

  -- Audit is emitted by the authoritative write primitive inside the same
  -- transaction, so a replacement cannot commit without its audit event.
  -- Metadata stays aggregate-only: no record names, providers, or dates.
  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_COMPLIANCE_UPDATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'compliance_count', inserted_count,
      'counts_by_type', counts_by_type,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', to_char(
        now() at time zone 'utc',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'compliance_count', inserted_count,
    'counts_by_type', counts_by_type,
    'audited', true
  );
end;
$$;

comment on table public.company_compliance is
  'Company-owned, self-declared insurance, workers compensation, and safety standing. '
  'Internal only: no public projection and no anon access.';

comment on function public.replace_company_compliance(uuid, jsonb) is
  'Atomically replaces all compliance records for a company and emits the '
  'COMPANY_COMPLIANCE_UPDATED audit event in the same transaction. Owner/admin only.';

alter function public.replace_company_compliance(uuid, jsonb)
  owner to postgres;

revoke all on function public.replace_company_compliance(uuid, jsonb)
from public;

revoke all on function public.replace_company_compliance(uuid, jsonb)
from anon;

grant execute on function public.replace_company_compliance(uuid, jsonb)
to authenticated;

commit;
