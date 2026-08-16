begin;

-- Restore the minimum authenticated profile read required by middleware and
-- protected server-rendered routes without exposing profiles to anonymous
-- clients or allowing authenticated users to read another user's profile.

alter table public.profiles
enable row level security;

drop policy if exists "Authenticated users can read own profile"
on public.profiles;

create policy "Authenticated users can read own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

revoke select on table public.profiles from public;
revoke select on table public.profiles from anon;
revoke select on table public.profiles from authenticated;

grant select on table public.profiles to authenticated;

commit;
