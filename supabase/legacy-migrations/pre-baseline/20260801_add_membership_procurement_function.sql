begin;

alter table public.organization_memberships
add column if not exists procurement_function text;

update public.organization_memberships om
set procurement_function =
  case
    when lower(coalesce(p.role, '')) = 'buyer'
      then 'buyer'

    when lower(coalesce(p.role, '')) = 'vendor'
      then 'supplier'

    else 'none'
  end
from public.profiles p
where p.id = om.user_id
  and om.procurement_function is null;

alter table public.organization_memberships
alter column procurement_function
set default 'none';

alter table public.organization_memberships
alter column procurement_function
set not null;

alter table public.organization_memberships
drop constraint if exists
  organization_memberships_procurement_function_check;

alter table public.organization_memberships
add constraint
  organization_memberships_procurement_function_check
check (
  procurement_function in (
    'buyer',
    'supplier',
    'consultant',
    'none'
  )
);

commit;