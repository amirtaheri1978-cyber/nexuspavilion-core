begin;

-- @supabase/storage-js remove([path]) uses the batch object-delete endpoint,
-- whose Storage operation is storage.object.delete_many. This SELECT policy
-- exists only so that operation can authorize an object after the governed
-- amendment transaction has removed the live rfq_attachments row. Ordinary
-- object listing, signed reads, previews, and downloads are not widened.
drop policy if exists "Issuer delete retries can select governed attachment objects"
on storage.objects;

create policy "Issuer delete retries can select governed attachment objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and storage.allow_only_operation('storage.object.delete_many')
  and exists (
    select 1
    from public.rfqs as r
    join public.organization_memberships as om
      on om.company_id = r.company_id
    join public.rfq_addenda as addendum
      on addendum.rfq_id = r.id
     and addendum.company_id = r.company_id
    cross join lateral jsonb_each(
      case
        when jsonb_typeof(addendum.amendment_before) = 'object'
          then addendum.amendment_before
        else '{}'::jsonb
      end
    ) as evidence(key, value)
    where r.id::text = (storage.foldername(storage.objects.name))[2]
      and r.company_id::text = (storage.foldername(storage.objects.name))[1]
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
      and jsonb_typeof(addendum.amendment_before) = 'object'
      and jsonb_typeof(addendum.amendment_after) = 'object'
      and evidence.key ~* '^attachment:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and evidence.key = any (addendum.affected_fields)
      and evidence.value ->> 'id' = substring(evidence.key from 12)
      and evidence.value ->> 'rfq_id' = r.id::text
      and evidence.value ->> 'company_id' = r.company_id::text
      and evidence.value ->> 'file_path' = storage.objects.name
      and addendum.amendment_after ? evidence.key
      and jsonb_typeof(addendum.amendment_after -> evidence.key) = 'null'
  )
);

comment on policy "Issuer delete retries can select governed attachment objects"
on storage.objects is
  'Allows only storage.object.delete_many to select an RFQ attachment object proven removed by immutable structured Addendum evidence for an authenticated active issuer owner, admin, or buyer.';

commit;
