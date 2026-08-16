begin;

-- Development-only rollback for 20260816_seed_core_demo_procurement_data.sql.
-- Do not execute without separate approval and a fresh Development preflight.
-- This script removes only the approved Core demo fixture IDs and restores the
-- confirmed Development owner profile to its recorded pre-seed state.

do $$
begin
  if to_regclass('public.rfqs') is null
    or to_regclass('public.quotes') is null
    or to_regclass('public.rfq_ai_reviews') is null
  then
    raise exception 'Procurement schema is not installed; data rollback is not applicable.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid
  ) then
    raise exception 'Confirmed Development owner profile is missing.';
  end if;

  if not exists (
    select 1
    from public.companies
    where id = '95c1ab3d-d513-4da7-8461-386ae17a1186'::uuid
      and name = 'S3 Ownership Transfer Synthetic Fixture 01'
  ) then
    raise exception 'Recorded pre-seed owner company is missing or has changed.';
  end if;
end;
$$;

delete from public.rfq_ai_reviews
where id = '9bbce6bf-d01a-4e20-8bee-97ca44c6ff13'::uuid;

-- Break the intentional RFQ-to-awarded-quote references before quote removal.
update public.rfqs
set awarded_quote_id = null,
    awarded_at = null,
    status = 'open'
where id in (
  'b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid,
  '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid
);

delete from public.quotes
where id in (
  'c18b2772-615c-4273-9600-6831011f7c24'::uuid,
  '82b3f5aa-1cc6-4dbc-9256-fd6ad697551f'::uuid,
  '75c4f02a-775b-498e-b834-c82616a5cf12'::uuid,
  '96b072ff-7ae4-43c0-ad12-194c1ec69a1a'::uuid,
  'b8dc2dfa-e78c-4554-85a6-c9529c576bdc'::uuid,
  '2d419499-d47a-4b6f-8456-a6086e194531'::uuid
);

delete from public.rfqs
where id in (
  'd9c173db-04c7-41ae-81b6-db842cdce6e7'::uuid,
  'b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid,
  '067c6211-b40a-4ddc-9915-6d8d9474c7ed'::uuid,
  '2e4aee45-280b-46b9-8b38-fa6029f08df3'::uuid,
  '4a0a1611-8c60-4ea4-8b38-5565630573b0'::uuid,
  '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid
);

delete from public.organization_memberships
where user_id = '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid
  and company_id = '293b1013-f488-48a5-ae63-e028569519ee'::uuid;

update public.profiles
set role = 'buyer',
    company_id = '95c1ab3d-d513-4da7-8461-386ae17a1186'::uuid
where id = '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid;

delete from public.companies
where id in (
  '79b0756f-260e-4d10-b501-9ffc2c1ae3f5'::uuid,
  '5772a821-6468-46fe-98f7-48f5a750ecb7'::uuid,
  '8231e064-f149-4398-8d05-b130608b2be1'::uuid,
  '7d394e05-153b-4201-9d72-4dcd26eb2655'::uuid,
  '30f734f3-26e9-4624-abd8-db654fdf1cec'::uuid,
  '293b1013-f488-48a5-ae63-e028569519ee'::uuid
);

do $$
begin
  if exists (
    select 1
    from public.rfqs
    where id in (
      'd9c173db-04c7-41ae-81b6-db842cdce6e7'::uuid,
      'b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid,
      '067c6211-b40a-4ddc-9915-6d8d9474c7ed'::uuid,
      '2e4aee45-280b-46b9-8b38-fa6029f08df3'::uuid,
      '4a0a1611-8c60-4ea4-8b38-5565630573b0'::uuid,
      '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid
    )
  ) then
    raise exception 'Rollback verification failed: demo RFQs remain.';
  end if;

  if exists (
    select 1
    from public.quotes
    where id in (
      'c18b2772-615c-4273-9600-6831011f7c24'::uuid,
      '82b3f5aa-1cc6-4dbc-9256-fd6ad697551f'::uuid,
      '75c4f02a-775b-498e-b834-c82616a5cf12'::uuid,
      '96b072ff-7ae4-43c0-ad12-194c1ec69a1a'::uuid,
      'b8dc2dfa-e78c-4554-85a6-c9529c576bdc'::uuid,
      '2d419499-d47a-4b6f-8456-a6086e194531'::uuid
    )
  ) then
    raise exception 'Rollback verification failed: demo quotes remain.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid
      and role = 'buyer'
      and company_id = '95c1ab3d-d513-4da7-8461-386ae17a1186'::uuid
  ) then
    raise exception 'Rollback verification failed: owner profile was not restored.';
  end if;
end;
$$;

commit;
