-- Nexus Pavilion Section 3 development bootstrap base schema.
-- NON-EXECUTED ARTIFACT: review before use in a Supabase Development project.
-- Do not run against Production. This file intentionally contains only the
-- pre-Section-3 objects required by the Section 3 migration sequence.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  category text,
  location text,
  network_role text,
  status text,
  created_at timestamp with time zone default now(),
  user_id uuid,
  logo_url text
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  role text default 'buyer',
  company_id uuid references public.companies(id),
  created_at timestamp with time zone not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  type text,
  is_read boolean default false,
  created_at timestamp with time zone not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text,
  entity_type text,
  entity_id uuid,
  user_id uuid references public.profiles(id),
  company_id uuid references public.companies(id),
  metadata jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  email text not null,
  role text not null default 'vendor',
  status text not null default 'pending',
  token text not null default encode(gen_random_bytes(32), 'hex') unique,
  invited_by uuid references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone not null default (now() + interval '7 days'),
  created_at timestamp with time zone not null default now()
);

-- Intentionally excluded: companies.workspace_status (added by a later migration),
-- organization_memberships, ownership_transfer_requests, Section 3 indexes,
-- policies, and all membership or ownership-transfer RPCs.
