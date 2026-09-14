begin;

create or replace function public.list_pending_rfq_attachment_cleanups(
  p_rfq_id uuid
)
returns table (
  attachment_id uuid,
  addendum_id uuid,
  rfq_id uuid,
  company_id uuid,
  file_name text,
  file_path text,
  file_size bigint,
  attachment_type text,
  revision_label text,
  created_at text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on ((substring(evidence.key from 12))::uuid)
    (substring(evidence.key from 12))::uuid as attachment_id,
    addendum.id as addendum_id,
    r.id as rfq_id,
    r.company_id as company_id,
    evidence.value ->> 'file_name' as file_name,
    evidence.value ->> 'file_path' as file_path,
    case
      when jsonb_typeof(evidence.value -> 'file_size') = 'number'
        then (evidence.value ->> 'file_size')::bigint
      else null
    end as file_size,
    evidence.value ->> 'attachment_type' as attachment_type,
    evidence.value ->> 'revision_label' as revision_label,
    evidence.value ->> 'created_at' as created_at
  from public.rfq_addenda as addendum
  join public.rfqs as r
    on r.id = addendum.rfq_id
   and r.company_id = addendum.company_id
  cross join lateral jsonb_each(
    case
      when jsonb_typeof(addendum.amendment_before) = 'object'
        then addendum.amendment_before
      else '{}'::jsonb
    end
  ) as evidence(key, value)
  where auth.uid() is not null
    and p_rfq_id is not null
    and r.id = p_rfq_id
    and r.status <> 'draft'
    and exists (
      select 1
      from public.organization_memberships as om
      where om.company_id = r.company_id
        and om.user_id = auth.uid()
        and om.membership_status = 'active'
        and (
          om.workspace_role in ('owner', 'admin')
          or om.procurement_function = 'buyer'
        )
    )
    and jsonb_typeof(addendum.amendment_before) = 'object'
    and jsonb_typeof(addendum.amendment_after) = 'object'
    and evidence.key ~* '^attachment:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and evidence.key = any (addendum.affected_fields)
    and evidence.value ->> 'id' = substring(evidence.key from 12)
    and evidence.value ->> 'rfq_id' = r.id::text
    and evidence.value ->> 'company_id' = r.company_id::text
    and coalesce(evidence.value ->> 'file_name', '') <> ''
    and coalesce(evidence.value ->> 'file_path', '') <> ''
    and addendum.amendment_after ? evidence.key
    and jsonb_typeof(addendum.amendment_after -> evidence.key) = 'null'
    and not exists (
      select 1
      from public.rfq_attachments as attachment
      where attachment.id = (substring(evidence.key from 12))::uuid
        and attachment.rfq_id = r.id
    )
    and exists (
      select 1
      from storage.objects as stored_object
      where stored_object.bucket_id = 'rfq-attachments'
        and stored_object.name = evidence.value ->> 'file_path'
        and (storage.foldername(stored_object.name))[1] = r.company_id::text
        and (storage.foldername(stored_object.name))[2] = r.id::text
    )
  order by
    (substring(evidence.key from 12))::uuid,
    addendum.addendum_number desc;
$$;

revoke all
on function public.list_pending_rfq_attachment_cleanups(uuid)
from public;

revoke all
on function public.list_pending_rfq_attachment_cleanups(uuid)
from anon;

grant execute
on function public.list_pending_rfq_attachment_cleanups(uuid)
to authenticated;

comment on function public.list_pending_rfq_attachment_cleanups(uuid) is
  'Returns issuer-authorized governed RFQ attachment removals whose immutable Addendum evidence still points to an existing storage object, enabling cleanup recovery after refresh without widening normal Storage reads.';

commit;