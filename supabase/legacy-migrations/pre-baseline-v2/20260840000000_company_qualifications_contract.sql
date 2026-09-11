begin;

/*
 * Company qualifications contract (7-04B).
 *
 * Company-owned credential registry:
 * license | certification | accreditation | registration
 *
 * Writes are atomic via replace_company_qualifications().
 * Public visibility uses company_qualifications_public only.
 */

create table if not exists public.company_qualifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  qualification_type text not null,
  name text not null,
  issuer text,
  credential_identifier text,
  issued_on date,
  expires_on date,
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_qualifications_type_check
    check (qualification_type in ('license', 'certification', 'accreditation', 'registration')),
  constraint company_qualifications_name_not_blank_check
    check (char_length(btrim(name)) > 0),
  constraint company_qualifications_name_length_check
    check (char_length(name) <= 160),
  constraint company_qualifications_issuer_length_check
    check (issuer is null or char_length(issuer) <= 160),
  constraint company_qualifications_credential_identifier_length_check
    check (credential_identifier is null or char_length(credential_identifier) <= 120),
  constraint company_qualifications_sort_order_check
    check (sort_order >= 0),
  constraint company_qualifications_date_order_check
    check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create unique index if not exists company_qualifications_company_type_dedupe_idx
  on public.company_qualifications (
    company_id,
    qualification_type,
    lower(btrim(name)),
    coalesce(lower(btrim(issuer)), ''),
    coalesce(lower(btrim(credential_identifier)), '')
  );

create index if not exists company_qualifications_company_type_sort_idx
  on public.company_qualifications (company_id, qualification_type, sort_order, id);

alter table public.company_qualifications enable row level security;

create policy company_qualifications_select_active_member
  on public.company_qualifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = company_qualifications.company_id
        and om.membership_status = 'active'
    )
  );

revoke all on table public.company_qualifications from public;
revoke insert, update, delete on table public.company_qualifications from authenticated;
grant select on table public.company_qualifications to authenticated;

create or replace view public.company_qualifications_public
with (security_invoker = false) as
select
  cq.id,
  cq.company_id,
  cq.qualification_type,
  cq.name,
  cq.issuer,
  cq.issued_on,
  cq.expires_on,
  cq.sort_order
from public.company_qualifications as cq
where cq.is_public = true
  and exists (
    select 1
    from public.company_directory as cd
    where cd.id = cq.company_id
      and lower(btrim(coalesce(cd.status, ''))) in ('approved', 'verified')
  );

comment on view public.company_qualifications_public is
  'Public-safe qualification projection. Excludes credential_identifier and private fields.';

revoke all on table public.company_qualifications_public from public;
grant select on table public.company_qualifications_public to anon, authenticated;

create or replace function public.replace_company_qualifications(
  p_company_id uuid,
  p_qualifications jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  qualification_key text;
  qualification_field text;
  qualification_items jsonb;
  qualification_item jsonb;
  normalized_name text;
  normalized_issuer text;
  normalized_identifier text;
  normalized_issued_on date;
  normalized_expires_on date;
  normalized_is_public boolean;
  dedupe_key text;
  seen_keys text[] := array[]::text[];
  insert_sort_order integer;
  inserted_count integer := 0;
  public_count integer := 0;
  counts_by_type jsonb := jsonb_build_object(
    'license', 0,
    'certification', 0,
    'accreditation', 0,
    'registration', 0
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
      'error_message', 'Only workspace owners and administrators can update company qualifications.'
    );
  end if;

  -- Payload validation begins only after owner/admin authority is established so
  -- that a direct RPC caller cannot probe payload shape without write authority.
  if p_qualifications is null or jsonb_typeof(p_qualifications) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'Qualifications payload must be an object.'
    );
  end if;

  for qualification_key in
    select jsonb_object_keys(p_qualifications)
  loop
    if qualification_key not in ('license', 'certification', 'accreditation', 'registration') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_QUALIFICATION_TYPE',
        'error_message', 'Qualification type must be license, certification, accreditation, or registration.'
      );
    end if;

    qualification_items := p_qualifications -> qualification_key;

    if jsonb_typeof(qualification_items) <> 'array' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_QUALIFICATION_GROUP',
        'error_message', format('Qualification group %s must be an array.', qualification_key)
      );
    end if;

    if jsonb_array_length(qualification_items) > 40 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'QUALIFICATION_LIMIT_EXCEEDED',
        'error_message', format('Qualification group %s exceeds the maximum of 40 entries.', qualification_key)
      );
    end if;

    seen_keys := array[]::text[];

    for qualification_item in
      select value
      from jsonb_array_elements(qualification_items) as entries(value)
    loop
      if jsonb_typeof(qualification_item) <> 'object' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_ITEM',
          'error_message', 'Each qualification must be an object.'
        );
      end if;

      for qualification_field in
        select jsonb_object_keys(qualification_item)
      loop
        if qualification_field not in (
          'name',
          'issuer',
          'credential_identifier',
          'issued_on',
          'expires_on',
          'is_public'
        ) then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_FIELD',
            'error_message', 'Qualification contains an unsupported field.'
          );
        end if;
      end loop;

      if not (qualification_item ? 'name')
        or jsonb_typeof(qualification_item -> 'name') is distinct from 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_NAME',
          'error_message', 'Qualification name must be a string.'
        );
      end if;

      normalized_name := btrim(
        regexp_replace(qualification_item ->> 'name', '\s+', ' ', 'g')
      );

      if normalized_name = '' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_NAME',
          'error_message', 'Qualification name must be non-empty.'
        );
      end if;

      if char_length(normalized_name) > 160 then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_NAME',
          'error_message', 'Qualification name must be 160 characters or fewer.'
        );
      end if;

      if qualification_item ? 'issuer' then
        if jsonb_typeof(qualification_item -> 'issuer') = 'null' then
          normalized_issuer := null;
        elsif jsonb_typeof(qualification_item -> 'issuer') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_ISSUER',
            'error_message', 'Qualification issuer must be a string or null.'
          );
        else
          normalized_issuer := btrim(
            regexp_replace(qualification_item ->> 'issuer', '\s+', ' ', 'g')
          );

          if normalized_issuer = '' then
            normalized_issuer := null;
          elsif char_length(normalized_issuer) > 160 then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_ISSUER',
              'error_message', 'Qualification issuer must be 160 characters or fewer.'
            );
          end if;
        end if;
      else
        normalized_issuer := null;
      end if;

      if qualification_item ? 'credential_identifier' then
        if jsonb_typeof(qualification_item -> 'credential_identifier') = 'null' then
          normalized_identifier := null;
        elsif jsonb_typeof(qualification_item -> 'credential_identifier') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_IDENTIFIER',
            'error_message', 'Credential identifier must be a string or null.'
          );
        else
          normalized_identifier := btrim(
            regexp_replace(
              qualification_item ->> 'credential_identifier',
              '\s+',
              ' ',
              'g'
            )
          );

          if normalized_identifier = '' then
            normalized_identifier := null;
          elsif char_length(normalized_identifier) > 120 then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_IDENTIFIER',
              'error_message', 'Credential identifier must be 120 characters or fewer.'
            );
          end if;
        end if;
      else
        normalized_identifier := null;
      end if;

      if qualification_item ? 'issued_on' then
        if jsonb_typeof(qualification_item -> 'issued_on') = 'null' then
          normalized_issued_on := null;
        elsif jsonb_typeof(qualification_item -> 'issued_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_DATE',
            'error_message', 'Issued date must be an ISO date string or null.'
          );
        else
          if (qualification_item ->> 'issued_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_DATE',
              'error_message', 'Issued date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_issued_on := (qualification_item ->> 'issued_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_QUALIFICATION_DATE',
                'error_message', 'Issued date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_issued_on := null;
      end if;

      if qualification_item ? 'expires_on' then
        if jsonb_typeof(qualification_item -> 'expires_on') = 'null' then
          normalized_expires_on := null;
        elsif jsonb_typeof(qualification_item -> 'expires_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_DATE',
            'error_message', 'Expiry date must be an ISO date string or null.'
          );
        else
          if (qualification_item ->> 'expires_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_DATE',
              'error_message', 'Expiry date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_expires_on := (qualification_item ->> 'expires_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_QUALIFICATION_DATE',
                'error_message', 'Expiry date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_expires_on := null;
      end if;

      if normalized_issued_on is not null
        and normalized_expires_on is not null
        and normalized_expires_on < normalized_issued_on then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_DATE',
          'error_message', 'Expiry date must be on or after the issued date.'
        );
      end if;

      if not (qualification_item ? 'is_public') then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_VISIBILITY',
          'error_message', 'Qualification visibility must be provided as a boolean.'
        );
      end if;

      if jsonb_typeof(qualification_item -> 'is_public') <> 'boolean' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_VISIBILITY',
          'error_message', 'Qualification visibility must be a boolean.'
        );
      end if;

      normalized_is_public := (qualification_item ->> 'is_public')::boolean;

      dedupe_key := jsonb_build_array(
        qualification_key,
        lower(normalized_name),
        lower(coalesce(normalized_issuer, '')),
        lower(coalesce(normalized_identifier, ''))
      )::text;

      if dedupe_key = any(seen_keys) then
        return jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_QUALIFICATION',
          'error_message', format('Duplicate qualification detected in %s.', qualification_key)
        );
      end if;

      seen_keys := array_append(seen_keys, dedupe_key);
    end loop;
  end loop;

  delete from public.company_qualifications
  where company_id = p_company_id;

  for qualification_key in
    select unnest(array['license', 'certification', 'accreditation', 'registration']::text[])
  loop
    qualification_items := coalesce(p_qualifications -> qualification_key, '[]'::jsonb);
    insert_sort_order := 0;
    seen_keys := array[]::text[];

    for qualification_item in
      select value
      from jsonb_array_elements(qualification_items) as entries(value)
    loop
      normalized_name := btrim(
        regexp_replace(qualification_item ->> 'name', '\s+', ' ', 'g')
      );

      if qualification_item ? 'issuer'
        and jsonb_typeof(qualification_item -> 'issuer') = 'string' then
        normalized_issuer := nullif(
          btrim(regexp_replace(qualification_item ->> 'issuer', '\s+', ' ', 'g')),
          ''
        );
      else
        normalized_issuer := null;
      end if;

      if qualification_item ? 'credential_identifier'
        and jsonb_typeof(qualification_item -> 'credential_identifier') = 'string' then
        normalized_identifier := nullif(
          btrim(
            regexp_replace(
              qualification_item ->> 'credential_identifier',
              '\s+',
              ' ',
              'g'
            )
          ),
          ''
        );
      else
        normalized_identifier := null;
      end if;

      if qualification_item ? 'issued_on'
        and jsonb_typeof(qualification_item -> 'issued_on') = 'string' then
        normalized_issued_on := (qualification_item ->> 'issued_on')::date;
      else
        normalized_issued_on := null;
      end if;

      if qualification_item ? 'expires_on'
        and jsonb_typeof(qualification_item -> 'expires_on') = 'string' then
        normalized_expires_on := (qualification_item ->> 'expires_on')::date;
      else
        normalized_expires_on := null;
      end if;

      normalized_is_public := coalesce((qualification_item ->> 'is_public')::boolean, false);

      insert into public.company_qualifications (
        company_id,
        qualification_type,
        name,
        issuer,
        credential_identifier,
        issued_on,
        expires_on,
        is_public,
        sort_order
      )
      values (
        p_company_id,
        qualification_key,
        normalized_name,
        normalized_issuer,
        normalized_identifier,
        normalized_issued_on,
        normalized_expires_on,
        normalized_is_public,
        insert_sort_order
      );

      insert_sort_order := insert_sort_order + 1;
      inserted_count := inserted_count + 1;

      if normalized_is_public then
        public_count := public_count + 1;
      end if;
    end loop;

    counts_by_type := jsonb_set(
      counts_by_type,
      array[qualification_key],
      to_jsonb(insert_sort_order)
    );
  end loop;

  -- Audit is emitted by the authoritative write primitive inside the same
  -- transaction, so a replacement cannot commit without its audit event.
  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_QUALIFICATIONS_UPDATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'qualification_count', inserted_count,
      'public_count', public_count,
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
    'qualification_count', inserted_count,
    'public_count', public_count,
    'counts_by_type', counts_by_type,
    'audited', true
  );
end;
$$;

comment on table public.company_qualifications is
  'Company-owned licenses, certifications, accreditations, and registrations.';

comment on function public.replace_company_qualifications(uuid, jsonb) is
  'Atomically replaces all qualification records for a company and emits the '
  'COMPANY_QUALIFICATIONS_UPDATED audit event in the same transaction. Owner/admin only.';

alter function public.replace_company_qualifications(uuid, jsonb)
  owner to postgres;

revoke all on function public.replace_company_qualifications(uuid, jsonb)
from public;

revoke all on function public.replace_company_qualifications(uuid, jsonb)
from anon;

grant execute on function public.replace_company_qualifications(uuid, jsonb)
to authenticated;

commit;
