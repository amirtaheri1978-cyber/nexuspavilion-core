begin;

/*
 * Company documents contract (7-06B).
 *
 * Company-owned, internal governance evidence files:
 * insurance | workers_compensation | safety | qualification | other
 *
 * This is not a second fact registry. Qualification and compliance facts stay
 * in their own tables. No foreign keys are created to those registries because
 * replace-all writes recycle their row IDs.
 *
 * Writes are atomic via create_company_document(), update_company_document(),
 * and delete_company_document(). Storage objects are private. There is no
 * public view and no anon grant.
 */

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_type text not null,
  title text not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  issued_on date,
  expires_on date,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_documents_type_check
    check (document_type in (
      'insurance',
      'workers_compensation',
      'safety',
      'qualification',
      'other'
    )),
  constraint company_documents_title_not_blank_check
    check (char_length(btrim(title)) > 0),
  constraint company_documents_title_length_check
    check (char_length(title) <= 160),
  constraint company_documents_file_name_not_blank_check
    check (char_length(btrim(file_name)) > 0),
  constraint company_documents_file_name_length_check
    check (char_length(file_name) <= 255),
  constraint company_documents_file_path_not_blank_check
    check (char_length(btrim(file_path)) > 0),
  constraint company_documents_file_path_unique unique (file_path),
  constraint company_documents_file_size_check
    check (file_size > 0 and file_size <= 10485760),
  constraint company_documents_file_type_check
    check (file_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    )),
  constraint company_documents_date_order_check
    check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create index if not exists company_documents_company_created_idx
  on public.company_documents (company_id, created_at desc, id);

alter table public.company_documents enable row level security;

create policy company_documents_select_active_member
  on public.company_documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = company_documents.company_id
        and om.membership_status = 'active'
    )
  );

revoke all on table public.company_documents from public;
revoke all on table public.company_documents from anon;
revoke insert, update, delete on table public.company_documents from authenticated;
grant select on table public.company_documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  10485760,
  array[
    'application/pdf'::text,
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf'::text,
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ];

drop policy if exists "Company members can read company-documents objects"
  on storage.objects;
drop policy if exists "Company owners and admins can read company-documents cleanup objects"
  on storage.objects;
drop policy if exists "Company owners and admins can upload company-documents objects"
  on storage.objects;
drop policy if exists "Company owners and admins can delete company-documents objects"
  on storage.objects;
drop policy if exists "Company members can update company-documents objects"
  on storage.objects;

create policy "Company members can read company-documents objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.company_documents as cd
    where cd.company_id::text = (storage.foldername(name))[1]
      and cd.file_path = name
  )
);

create policy "Company owners and admins can read company-documents cleanup objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy "Company owners and admins can upload company-documents objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy "Company owners and admins can delete company-documents objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create or replace function public.create_company_document(
  p_company_id uuid,
  p_document_id uuid,
  p_document_type text,
  p_title text,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_file_size bigint,
  p_issued_on date,
  p_expires_on date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  normalized_title text;
  normalized_file_name text;
  document_count integer;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null
    or not exists (
      select 1
      from public.companies as c
      where c.id = p_company_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'Company not found.'
    );
  end if;

  select om.workspace_role
    into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active';

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
      'error_message', 'Only owners and administrators can manage company documents.'
    );
  end if;

  if p_document_id is null
    or p_document_type is null
    or p_title is null
    or p_file_name is null
    or p_file_path is null
    or p_file_type is null
    or p_file_size is null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'A complete document payload is required.'
    );
  end if;

  if p_document_type not in (
    'insurance',
    'workers_compensation',
    'safety',
    'qualification',
    'other'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_TYPE',
      'error_message', 'Document type is not supported.'
    );
  end if;

  normalized_title := btrim(regexp_replace(p_title, '\s+', ' ', 'g'));

  if normalized_title = '' or char_length(normalized_title) > 160 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TITLE',
      'error_message', 'Document title must be non-empty and 160 characters or fewer.'
    );
  end if;

  normalized_file_name := btrim(regexp_replace(p_file_name, '\s+', ' ', 'g'));

  if normalized_file_name = '' or char_length(normalized_file_name) > 255 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_NAME',
      'error_message', 'File name must be non-empty and 255 characters or fewer.'
    );
  end if;

  if p_file_path <> btrim(p_file_path)
    or position('..' in p_file_path) > 0
    or position('\' in p_file_path) > 0
    or position('//' in p_file_path) > 0
    or p_file_path !~ (
      '^' || p_company_id::text || '/' || p_document_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$'
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_PATH',
      'error_message', 'File path is invalid.'
    );
  end if;

  if p_file_type not in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_TYPE',
      'error_message', 'File type is not allowed.'
    );
  end if;

  if (
    (p_file_type = 'application/pdf' and lower(normalized_file_name) !~ '\.pdf$')
    or (p_file_type = 'image/jpeg' and lower(normalized_file_name) !~ '\.(jpg|jpeg)$')
    or (p_file_type = 'image/png' and lower(normalized_file_name) !~ '\.png$')
    or (p_file_type = 'image/webp' and lower(normalized_file_name) !~ '\.webp$')
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_TYPE',
      'error_message', 'File type and extension do not match.'
    );
  end if;

  if (
    (p_file_type = 'application/pdf' and p_file_path !~ '\.pdf$')
    or (p_file_type = 'image/jpeg' and p_file_path !~ '\.(jpg|jpeg)$')
    or (p_file_type = 'image/png' and p_file_path !~ '\.png$')
    or (p_file_type = 'image/webp' and p_file_path !~ '\.webp$')
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_TYPE',
      'error_message', 'File type and extension do not match.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 10485760 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_SIZE',
      'error_message', 'File size must be greater than 0 and at most 10 MB.'
    );
  end if;

  if p_issued_on is not null
    and p_expires_on is not null
    and p_expires_on < p_issued_on
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_DATE',
      'error_message', 'Expiry date must be on or after the issued date.'
    );
  end if;

  if exists (
    select 1
    from public.company_documents as existing
    where existing.id = p_document_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DOCUMENT_EXISTS',
      'error_message', 'Document already exists.'
    );
  end if;

  if not exists (
    select 1
    from storage.objects as so
    where so.bucket_id = 'company-documents'
      and so.name = p_file_path
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OBJECT_NOT_FOUND',
      'error_message', 'Storage object was not found.'
    );
  end if;

  if not exists (
    select 1
    from storage.objects as so
    where so.bucket_id = 'company-documents'
      and so.name = p_file_path
      and so.metadata ? 'mimetype'
      and nullif(btrim(so.metadata->>'mimetype'), '') is not null
      and so.metadata->>'mimetype' = p_file_type
      and so.metadata ? 'size'
      and nullif(btrim(so.metadata->>'size'), '') is not null
      and so.metadata->>'size' ~ '^[0-9]+$'
      and (so.metadata->>'size')::bigint = p_file_size
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STORAGE_OBJECT',
      'error_message', 'Storage object metadata does not match the document.'
    );
  end if;

  insert into public.company_documents (
    id,
    company_id,
    document_type,
    title,
    file_name,
    file_path,
    file_type,
    file_size,
    issued_on,
    expires_on,
    uploaded_by
  )
  values (
    p_document_id,
    p_company_id,
    p_document_type,
    normalized_title,
    normalized_file_name,
    p_file_path,
    p_file_type,
    p_file_size,
    p_issued_on,
    p_expires_on,
    actor_user_id
  );

  select count(*)
    into document_count
  from public.company_documents
  where company_id = p_company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_DOCUMENT_UPLOADED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', p_document_type,
      'file_type', p_file_type,
      'file_size', p_file_size,
      'document_count', document_count,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'document_id', p_document_id,
    'document_count', document_count,
    'audited', true
  );
end;
$$;

create or replace function public.update_company_document(
  p_company_id uuid,
  p_document_id uuid,
  p_document_type text,
  p_title text,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_file_size bigint,
  p_issued_on date,
  p_expires_on date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  current_document public.company_documents%rowtype;
  normalized_title text;
  normalized_file_name text;
  next_file_name text;
  next_file_path text;
  next_file_type text;
  next_file_size bigint;
  old_file_path text;
  document_count integer;
  is_replacement boolean;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null
    or not exists (
      select 1
      from public.companies as c
      where c.id = p_company_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'Company not found.'
    );
  end if;

  select om.workspace_role
    into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active';

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
      'error_message', 'Only owners and administrators can manage company documents.'
    );
  end if;

  select *
    into current_document
  from public.company_documents
  where id = p_document_id
    and company_id = p_company_id;

  if current_document.id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DOCUMENT_NOT_FOUND',
      'error_message', 'Document not found.'
    );
  end if;

  if p_document_type is null or p_title is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'A complete document payload is required.'
    );
  end if;

  if p_document_type not in (
    'insurance',
    'workers_compensation',
    'safety',
    'qualification',
    'other'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_TYPE',
      'error_message', 'Document type is not supported.'
    );
  end if;

  normalized_title := btrim(regexp_replace(p_title, '\s+', ' ', 'g'));

  if normalized_title = '' or char_length(normalized_title) > 160 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TITLE',
      'error_message', 'Document title must be non-empty and 160 characters or fewer.'
    );
  end if;

  if p_issued_on is not null
    and p_expires_on is not null
    and p_expires_on < p_issued_on
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_DATE',
      'error_message', 'Expiry date must be on or after the issued date.'
    );
  end if;

  is_replacement := p_file_path is not null and p_file_path is distinct from current_document.file_path;

  if is_replacement then
    normalized_file_name := btrim(regexp_replace(coalesce(p_file_name, ''), '\s+', ' ', 'g'));

    if normalized_file_name = '' or char_length(normalized_file_name) > 255 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_NAME',
        'error_message', 'File name must be non-empty and 255 characters or fewer.'
      );
    end if;

    if p_file_path <> btrim(p_file_path)
      or position('..' in p_file_path) > 0
      or position('\' in p_file_path) > 0
      or position('//' in p_file_path) > 0
      or p_file_path !~ (
        '^' || p_company_id::text || '/' || p_document_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$'
      )
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_PATH',
        'error_message', 'File path is invalid.'
      );
    end if;

    if p_file_type not in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_TYPE',
        'error_message', 'File type is not allowed.'
      );
    end if;

    if (
      (p_file_type = 'application/pdf' and lower(normalized_file_name) !~ '\.pdf$')
      or (p_file_type = 'image/jpeg' and lower(normalized_file_name) !~ '\.(jpg|jpeg)$')
      or (p_file_type = 'image/png' and lower(normalized_file_name) !~ '\.png$')
      or (p_file_type = 'image/webp' and lower(normalized_file_name) !~ '\.webp$')
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_TYPE',
        'error_message', 'File type and extension do not match.'
      );
    end if;

    if (
      (p_file_type = 'application/pdf' and p_file_path !~ '\.pdf$')
      or (p_file_type = 'image/jpeg' and p_file_path !~ '\.(jpg|jpeg)$')
      or (p_file_type = 'image/png' and p_file_path !~ '\.png$')
      or (p_file_type = 'image/webp' and p_file_path !~ '\.webp$')
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_TYPE',
        'error_message', 'File type and extension do not match.'
      );
    end if;

    if p_file_size is null or p_file_size <= 0 or p_file_size > 10485760 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_SIZE',
        'error_message', 'File size must be greater than 0 and at most 10 MB.'
      );
    end if;

    if not exists (
      select 1
      from storage.objects as so
      where so.bucket_id = 'company-documents'
        and so.name = p_file_path
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'OBJECT_NOT_FOUND',
        'error_message', 'Storage object was not found.'
      );
    end if;

    if not exists (
      select 1
      from storage.objects as so
      where so.bucket_id = 'company-documents'
        and so.name = p_file_path
        and so.metadata ? 'mimetype'
        and nullif(btrim(so.metadata->>'mimetype'), '') is not null
        and so.metadata->>'mimetype' = p_file_type
        and so.metadata ? 'size'
        and nullif(btrim(so.metadata->>'size'), '') is not null
        and so.metadata->>'size' ~ '^[0-9]+$'
        and (so.metadata->>'size')::bigint = p_file_size
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_STORAGE_OBJECT',
        'error_message', 'Storage object metadata does not match the document.'
      );
    end if;

    next_file_name := normalized_file_name;
    next_file_path := p_file_path;
    next_file_type := p_file_type;
    next_file_size := p_file_size;
    old_file_path := current_document.file_path;
  else
    next_file_name := current_document.file_name;
    next_file_path := current_document.file_path;
    next_file_type := current_document.file_type;
    next_file_size := current_document.file_size;
    old_file_path := null;
  end if;

  update public.company_documents
  set
    document_type = p_document_type,
    title = normalized_title,
    file_name = next_file_name,
    file_path = next_file_path,
    file_type = next_file_type,
    file_size = next_file_size,
    issued_on = p_issued_on,
    expires_on = p_expires_on,
    updated_at = now()
  where id = p_document_id
    and company_id = p_company_id;

  select count(*)
    into document_count
  from public.company_documents
  where company_id = p_company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_DOCUMENT_UPDATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', p_document_type,
      'file_type', next_file_type,
      'file_size', next_file_size,
      'document_count', document_count,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'document_id', p_document_id,
    'old_file_path', old_file_path,
    'document_count', document_count,
    'audited', true
  );
end;
$$;

create or replace function public.delete_company_document(
  p_company_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  current_document public.company_documents%rowtype;
  document_count integer;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null
    or not exists (
      select 1
      from public.companies as c
      where c.id = p_company_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'Company not found.'
    );
  end if;

  select om.workspace_role
    into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active';

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
      'error_message', 'Only owners and administrators can manage company documents.'
    );
  end if;

  select *
    into current_document
  from public.company_documents
  where id = p_document_id
    and company_id = p_company_id;

  if current_document.id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DOCUMENT_NOT_FOUND',
      'error_message', 'Document not found.'
    );
  end if;

  delete from public.company_documents
  where id = p_document_id
    and company_id = p_company_id;

  select count(*)
    into document_count
  from public.company_documents
  where company_id = p_company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_DOCUMENT_DELETED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', current_document.document_type,
      'file_type', current_document.file_type,
      'file_size', current_document.file_size,
      'document_count', document_count,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'document_id', p_document_id,
    'old_file_path', current_document.file_path,
    'document_count', document_count,
    'audited', true
  );
end;
$$;

comment on table public.company_documents is
  'Company-owned internal governance evidence files. Facts remain in qualifications and compliance.';

comment on function public.create_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date) is
  'Finalizes a previously uploaded company document object and emits COMPANY_DOCUMENT_UPLOADED. Owner/admin only.';

comment on function public.update_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date) is
  'Updates company document metadata or replacement file metadata and emits COMPANY_DOCUMENT_UPDATED. Owner/admin only.';

comment on function public.delete_company_document(uuid, uuid) is
  'Deletes company document metadata and emits COMPANY_DOCUMENT_DELETED. Owner/admin only.';

alter function public.create_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
  owner to postgres;

alter function public.update_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
  owner to postgres;

alter function public.delete_company_document(uuid, uuid)
  owner to postgres;

revoke all on function public.create_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
from public;

revoke all on function public.create_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
from anon;

grant execute on function public.create_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
to authenticated;

revoke all on function public.update_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
from public;

revoke all on function public.update_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
from anon;

grant execute on function public.update_company_document(uuid, uuid, text, text, text, text, text, bigint, date, date)
to authenticated;

revoke all on function public.delete_company_document(uuid, uuid)
from public;

revoke all on function public.delete_company_document(uuid, uuid)
from anon;

grant execute on function public.delete_company_document(uuid, uuid)
to authenticated;

commit;
