-- NP-MASTER-22-B04-1 local authorization proof.
-- LOCAL disposable fixtures only. Do not run against linked Dev or Production.

begin;

do $$
declare
  actor_a uuid := '11111111-1111-4111-8111-111111111111';
  actor_b uuid := '22222222-2222-4222-8222-222222222222';
  company_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  company_foreign uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  invite_token text := 'b04-1-local-invitation-token-value-32ch';
  claims_a text;
  claims_b text;
  mismatch_claims text;
  result jsonb;
  stored_first text;
  stored_last text;
  title_text text;
  role_text text;
  function_text text;
  member_count integer;
begin
  claims_a := json_build_object(
    'sub', actor_a,
    'email', 'owner-a@example.test',
    'role', 'authenticated'
  )::text;
  claims_b := json_build_object(
    'sub', actor_b,
    'email', 'invitee-b@example.test',
    'role', 'authenticated'
  )::text;
  mismatch_claims := json_build_object(
    'sub', actor_b,
    'email', 'wrong@example.test',
    'role', 'authenticated'
  )::text;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      actor_a,
      'authenticated',
      'authenticated',
      'owner-a@example.test',
      crypt('proof-pass', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      actor_b,
      'authenticated',
      'authenticated',
      'invitee-b@example.test',
      crypt('proof-pass', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into public.profiles (id, email, role, company_id)
  values
    (actor_a, 'owner-a@example.test', 'buyer', null),
    (actor_b, 'invitee-b@example.test', 'buyer', null);

  insert into public.companies (
    id, name, slug, category, location, network_role, status, user_id
  )
  values
    (
      company_a,
      'Local Proof Company A',
      'local-proof-a',
      'Project Owner',
      'Toronto',
      'Project Owner',
      'verified',
      actor_a
    ),
    (
      company_foreign,
      'Local Proof Foreign',
      'local-proof-foreign',
      'Project Owner',
      'Toronto',
      'Project Owner',
      'verified',
      actor_b
    );

  insert into public.invitations (
    company_id,
    email,
    role,
    status,
    token,
    expires_at
  )
  values (
    company_a,
    'invitee-b@example.test',
    'buyer',
    'pending',
    invite_token,
    now() + interval '7 days'
  );

  perform set_config('request.jwt.claim.sub', actor_a::text, true);
  perform set_config('request.jwt.claim.email', 'owner-a@example.test', true);
  perform set_config('request.jwt.claims', claims_a, true);
  execute 'set local role authenticated';

  update public.profiles
  set first_name = 'Ada', last_name = 'Owner'
  where id = actor_a;

  update public.profiles
  set first_name = 'Hijack'
  where id = actor_b;

  begin
    update public.profiles
    set company_id = company_a
    where id = actor_a;
    raise exception 'C FAIL: company_id update was allowed';
  exception
    when insufficient_privilege then
      null;
  end;

  execute 'reset role';

  select first_name, last_name
  into stored_first, stored_last
  from public.profiles
  where id = actor_a;

  if stored_first is distinct from 'Ada' or stored_last is distinct from 'Owner' then
    raise exception 'A FAIL: own name update did not persist';
  end if;

  select first_name
  into stored_first
  from public.profiles
  where id = actor_b;

  if stored_first is not null then
    raise exception 'B FAIL: updated another profile';
  end if;

  perform set_config('request.jwt.claim.sub', actor_a::text, true);
  perform set_config('request.jwt.claim.email', 'owner-a@example.test', true);
  perform set_config('request.jwt.claims', claims_a, true);

  result := public.bootstrap_owned_company_workspace(
    company_a,
    'owner',
    'Founder Procurement Lead'
  );

  if coalesce(result ->> 'success', 'false') <> 'true' then
    raise exception 'D FAIL: bootstrap unsuccessful %', result;
  end if;

  select om.job_title, p.first_name, p.last_name
  into title_text, stored_first, stored_last
  from public.organization_memberships om
  join public.profiles p on p.id = om.user_id
  where om.user_id = actor_a
    and om.company_id = company_a;

  if title_text is distinct from 'Founder Procurement Lead' then
    raise exception 'D FAIL: founder job_title %', title_text;
  end if;

  if stored_first is distinct from 'Ada' or stored_last is distinct from 'Owner' then
    raise exception 'D FAIL: bootstrap overwrote names % %', stored_first, stored_last;
  end if;

  result := public.bootstrap_owned_company_workspace(
    company_foreign,
    'owner',
    'Should Not Attach'
  );

  if result ->> 'error_code' is distinct from 'COMPANY_NOT_OWNED' then
    raise exception 'D FAIL: foreign company not rejected %', result;
  end if;

  perform set_config('request.jwt.claim.sub', actor_b::text, true);
  perform set_config('request.jwt.claim.email', 'wrong@example.test', true);
  perform set_config('request.jwt.claims', mismatch_claims, true);

  result := public.accept_organization_invitation(
    invite_token,
    'Invited Buyer'
  );

  if result ->> 'error_code' is distinct from 'RECIPIENT_MISMATCH' then
    raise exception 'E FAIL: recipient mismatch not rejected %', result;
  end if;

  perform set_config('request.jwt.claim.email', 'invitee-b@example.test', true);
  perform set_config('request.jwt.claims', claims_b, true);

  result := public.accept_organization_invitation(
    invite_token,
    'Invited Buyer'
  );

  if coalesce(result ->> 'success', 'false') <> 'true' then
    raise exception 'E FAIL: matching accept unsuccessful %', result;
  end if;

  select om.job_title
  into title_text
  from public.organization_memberships om
  where om.user_id = actor_b
    and om.company_id = company_a;

  if title_text is distinct from 'Invited Buyer' then
    raise exception 'E FAIL: accepted job_title %', title_text;
  end if;

  perform set_config('request.jwt.claim.sub', actor_b::text, true);
  perform set_config('request.jwt.claims', claims_b, true);
  execute 'set local role authenticated';

  begin
    update public.organization_memberships
    set job_title = 'Direct Write'
    where user_id = actor_b;
    raise exception 'F FAIL: direct membership update was allowed';
  exception
    when insufficient_privilege then
      null;
  end;

  execute 'reset role';

  perform set_config('request.jwt.claim.sub', actor_a::text, true);
  perform set_config('request.jwt.claim.email', 'owner-a@example.test', true);
  perform set_config('request.jwt.claims', claims_a, true);

  result := public.update_own_workspace_job_title('Chief Buyer');

  if coalesce(result ->> 'success', 'false') <> 'true' then
    raise exception 'G FAIL: own job title update unsuccessful %', result;
  end if;

  select om.job_title, om.workspace_role, om.procurement_function
  into title_text, role_text, function_text
  from public.organization_memberships om
  where om.user_id = actor_a
    and om.company_id = company_a;

  if title_text is distinct from 'Chief Buyer' then
    raise exception 'G FAIL: job_title %', title_text;
  end if;

  if role_text is distinct from 'owner' or function_text is distinct from 'none' then
    raise exception 'G FAIL: role/function mutated % %', role_text, function_text;
  end if;

  select count(*)
  into member_count
  from public.get_organization_members();

  if member_count < 1 then
    raise exception 'G FAIL: member list empty';
  end if;

  raise notice 'B04-1 LOCAL AUTHORIZATION PROOF PASS';
end;
$$;

rollback;
