begin;
-- Development-only, idempotent demo seed drafted from the validated Core backup.
-- This file is not a migration and must not be executed without separate approval.
-- Excluded by design: auth users, profiles from Core, legacy RFQ invites/tokens,
-- four invalid self-quotes, audit logs, notifications, and governance history.

do $$
begin
  if to_regclass('public.rfqs') is null
    or to_regclass('public.quotes') is null
    or to_regclass('public.rfq_ai_reviews') is null
    or to_regclass('public.rfq_invites') is null
  then
    raise exception 'Procurement schema migration must be installed before this seed.';
  end if;

  if not exists (select 1 from public.profiles where id = '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid) then
    raise exception 'Confirmed Development owner profile is missing.';
  end if;
end;
$$;

-- Refuse to overwrite unrelated companies that happen to reuse a Core UUID.
do $$
begin
  if exists (
    select 1
    from public.companies c
    join (values
      ('79b0756f-260e-4d10-b501-9ffc2c1ae3f5'::uuid, $np$HRCM Group$np$),
      ('5772a821-6468-46fe-98f7-48f5a750ecb7'::uuid, $np$DQ Construction Inc.$np$),
      ('8231e064-f149-4398-8d05-b130608b2be1'::uuid, $np$Atlas Inc.$np$),
      ('7d394e05-153b-4201-9d72-4dcd26eb2655'::uuid, $np$Ottawa Interior Solutions Inc.$np$),
      ('30f734f3-26e9-4624-abd8-db654fdf1cec'::uuid, $np$Capital Build Systems$np$),
      ('293b1013-f488-48a5-ae63-e028569519ee'::uuid, $np$Northline Development Group$np$)
    ) as expected(id, name) on expected.id = c.id
    where lower(btrim(c.name)) <> lower(btrim(expected.name))
  ) then
    raise exception 'A target company UUID is already used by an unrelated Development company.';
  end if;
end;
$$;

insert into public.companies (
  id,
  name,
  slug,
  category,
  location,
  network_role,
  status,
  created_at,
  user_id,
  logo_url,
  workspace_status
)
values
  ('79b0756f-260e-4d10-b501-9ffc2c1ae3f5'::uuid, $np$HRCM Group$np$, $np$hrcm-group-ea80d949$np$, $np$General Contractor$np$, $np$Toronto, ON$np$, $np$Building Products Supplier$np$, $np$verified$np$, '2026-06-01 07:42:07.560749+00'::timestamptz, null, null, $np$active$np$),
  ('5772a821-6468-46fe-98f7-48f5a750ecb7'::uuid, $np$DQ Construction Inc.$np$, $np$dq-construction-inc-e0177e70$np$, $np$Construction Service Provider$np$, $np$Toronto, ON$np$, $np$Building Products Supplier$np$, $np$verified$np$, '2026-06-01 19:13:27.093638+00'::timestamptz, null, null, $np$active$np$),
  ('8231e064-f149-4398-8d05-b130608b2be1'::uuid, $np$Atlas Inc.$np$, $np$atlas-inc-9576ba9f$np$, $np$Building Products Supplier$np$, $np$Toronto, ON$np$, $np$Building Products Supplier$np$, $np$verified$np$, '2026-06-01 19:52:30.844783+00'::timestamptz, null, null, $np$active$np$),
  ('7d394e05-153b-4201-9d72-4dcd26eb2655'::uuid, $np$Ottawa Interior Solutions Inc.$np$, $np$ottawa-interior-solutions-inc-ab3a82f9$np$, $np$Architectural Products Supplier$np$, $np$Ottawa, ON$np$, $np$Building Products Supplier$np$, $np$verified$np$, '2026-06-08 21:25:56.228063+00'::timestamptz, null, null, $np$active$np$),
  ('30f734f3-26e9-4624-abd8-db654fdf1cec'::uuid, $np$Capital Build Systems$np$, $np$capital-build-systems-c4e1d24d$np$, $np$Architectural Products Supplier$np$, $np$Ottawa, ON$np$, $np$Building Products Supplier$np$, $np$verified$np$, '2026-06-08 21:38:14.860793+00'::timestamptz, null, null, $np$active$np$),
  ('293b1013-f488-48a5-ae63-e028569519ee'::uuid, $np$Northline Development Group$np$, $np$northline-development-group$np$, $np$Mixed-Use Development$np$, $np$Ottawa, ON$np$, $np$Project Owner$np$, $np$verified$np$, '2026-05-24 03:44:56.421312+00'::timestamptz, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, $np$active$np$)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  category = excluded.category,
  location = excluded.location,
  network_role = excluded.network_role,
  status = excluded.status,
  user_id = excluded.user_id,
  logo_url = excluded.logo_url,
  workspace_status = excluded.workspace_status;

-- Bind the confirmed Development owner to the canonical demo workspace.
update public.profiles
set role = 'owner',
    company_id = '293b1013-f488-48a5-ae63-e028569519ee'::uuid
where id = '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid;

insert into public.organization_memberships (
  user_id, company_id, workspace_role, membership_type,
  membership_status, joined_at, procurement_function
) values (
  '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, '293b1013-f488-48a5-ae63-e028569519ee'::uuid,
  'owner', 'founder', 'active', now(), 'buyer'
)
on conflict (user_id, company_id) do update set
  workspace_role = excluded.workspace_role,
  membership_type = excluded.membership_type,
  membership_status = excluded.membership_status,
  procurement_function = excluded.procurement_function;

-- Open RFQ deadlines are intentionally refreshed relative to seed execution so the demo remains usable.
insert into public.rfqs (
  id,
  created_at,
  title,
  slug,
  description,
  category,
  location,
  budget,
  deadline,
  status,
  company_id,
  user_id,
  awarded_quote_id,
  awarded_at,
  procurement_scope,
  sourcing_method,
  contract_framework,
  project_name,
  owner_client,
  internal_project_id,
  rfi_deadline,
  mobilization_date,
  substantial_completion_date,
  bid_model,
  nda_required,
  performance_bond_required,
  bid_bond_required,
  insurance_required,
  insurance_notes,
  safety_requirements,
  prequalification_notes,
  advanced_controls_enabled,
  deadline_timezone,
  rfi_deadline_timezone
)
values
  ('d9c173db-04c7-41ae-81b6-db842cdce6e7'::uuid, '2026-06-10 03:57:37.682321+00'::timestamptz, $np$Toronto Waterfront Office Tower - Interior Ceiling Package$np$, $np$toronto-waterfront-office-tower-interior-ceiling-package-1781063857635$np$, $np$Supplying and installation of acoustical ceiling systems  for a 25-story office tower in Toronto.
Scope includes ACT ceilings, speciality metal ceilings, seismic requirments, and coordination with MEP trades.$np$, $np$Interior Construction$np$, $np$Toronto, ON$np$, $np$450000$np$, to_char(current_date + 30, 'YYYY-MM-DD'), $np$open$np$, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, null, $np$subcontractor$np$, $np$invited$np$, $np$project_specific$np$, null, null, null, null, null, null, $np$lump_sum$np$, false, false, false, false, null, null, null, false, $np$America/Toronto$np$, $np$America/Toronto$np$),
  ('b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid, '2026-06-08 20:25:57.852966+00'::timestamptz, $np$Northline Development Group - Ottawa Innovation Campus Interior Fit-Out$np$, $np$northline-development-group-ottawa-innovation-campus-interior-fit-out-1780950357497$np$, $np$Northline Development Group is seeking qualified suppliers and subcontractors for the interior fit-out of a new Innovation Campus located in Ottawa, Ontario.

Scope includes:
• Acoustic ceiling systems
• Architectural wall panels
• Interior glazing and partitions
• Flooring and finish packages
• Meeting room AV infrastructure

Project Size:
120,000 sq.ft.

Expected Deliverables:
• Material supply
• Shop drawings
• Installation services
• Quality assurance documentation
• Warranty package

Suppliers must demonstrate experience on commercial projects exceeding $5M construction value.

Submission deadline and procurement milestones are outlined below.$np$, $np$Interior Construction$np$, $np$Ottawa, ON$np$, $np$2500000$np$, $np$2026-07-31$np$, $np$awarded$np$, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, null, $np$subcontractor$np$, $np$invited$np$, $np$project_specific$np$, null, null, null, null, null, null, $np$lump_sum$np$, false, false, false, false, null, null, null, false, $np$America/Toronto$np$, $np$America/Toronto$np$),
  ('067c6211-b40a-4ddc-9915-6d8d9474c7ed'::uuid, '2026-06-13 05:21:39.837384+00'::timestamptz, $np$North York Regional Hospital Redevelopment – Phase 2 Interior Construction$np$, $np$north-york-regional-hospital-redevelopment-phase-2-interior-construction-1781328099875$np$, $np$Interior renovation and corridor modernization program across active healthcare facilities.

Scope includes:

• Infection control barriers
• Drywall and framing
• ACT ceilings
• Healthcare doors and hardware
• Flooring replacement
• Nurse station millwork
• Firestopping systems
• Wayfinding integration
• Medical office fit-outs
• Phased construction in occupied areas

Project Duration:
18 Months$np$, $np$Healthcare Construction$np$, $np$North York, ON$np$, $np$7250000$np$, to_char(current_date + 45, 'YYYY-MM-DD'), $np$open$np$, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, null, $np$subcontractor$np$, $np$invited$np$, $np$project_specific$np$, null, null, null, null, null, null, $np$lump_sum$np$, false, false, false, false, null, null, null, false, $np$America/Toronto$np$, $np$America/Toronto$np$),
  ('2e4aee45-280b-46b9-8b38-fa6029f08df3'::uuid, '2026-06-30 04:35:38.824234+00'::timestamptz, $np$Mechanical HVAC Upgrade – Toronto General Hospital – Phase 2$np$, $np$mechanical-hvac-upgrade-toronto-general-hospital-phase-2-1782794138462$np$, $np$Toronto General Hospital is inviting qualified mechanical subcontractors to submit proposals for the HVAC Upgrade – Phase 2.

The project includes demolition of existing mechanical systems, installation of new air handling units, ductwork modifications, chilled water piping, hydronic balancing, controls integration, testing & commissioning, and closeout documentation.

The hospital will remain fully operational during construction. All work must be completed in occupied healthcare environments following infection prevention and control (IPAC) requirements.

The successful contractor must demonstrate experience in healthcare projects, phased construction, quality assurance procedures, and coordination with multiple trades.

Scope includes:

• Existing HVAC demolition
• New AHU installation
• Sheet metal ductwork
• Chilled & heating water piping
• BAS Controls integration
• TAB (Testing, Adjusting & Balancing)
• Commissioning
• As-built documentation
• O&M Manuals
• Warranty support

Mandatory Requirements

• WSIB Clearance
• COR Certification
• Commercial General Liability Insurance
• Performance Bond
• Labour & Material Bond
• Healthcare project experience
• Minimum 5 comparable completed projects

Substantial Completion Required:
October 30, 2026

Price Validity:
120 Days$np$, $np$Mechanical$np$, $np$Toronto, Ontario$np$, $np$2450000$np$, to_char(current_date + 60, 'YYYY-MM-DD'), $np$open$np$, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, null, $np$subcontractor$np$, $np$invited$np$, $np$project_specific$np$, $np$Toronto General Hospital$np$, null, null, null, null, null, $np$lump_sum$np$, false, false, false, false, null, null, null, false, $np$America/Toronto$np$, $np$America/Toronto$np$),
  ('4a0a1611-8c60-4ea4-8b38-5565630573b0'::uuid, '2026-07-05 07:03:24.952542+00'::timestamptz, $np$RFQ-2026-001 – Interior Acoustic Ceiling & Wall Systems$np$, $np$rfq-2026-001-interior-acoustic-ceiling-wall-systems-1783235004921$np$, $np$Northline Development Group is inviting qualified
specialty contractors to submit proposals for the supply, installation,
and commissioning of acoustic ceiling systems and specialty wall panel
assemblies for the Level 3 Interior Fit-Out at Toronto General Hospital.

The successful bidder will provide all labour, supervision, materials,
equipment, coordination, and quality control necessary to complete the
work in accordance with the contract documents.

The project includes suspended acoustic ceilings, specialty ceiling
features, seismic restraint, acoustic wall panels, coordination with
mechanical and electrical systems, closeout documentation, warranties,
and commissioning support.

All work shall comply with Ontario Building Code requirements, CSA
standards, infection prevention protocols, and hospital operational
requirements.$np$, $np$Interior$np$, $np$Toronto, Ontario, Canada$np$, $np$1850000$np$, to_char(current_date + 75, 'YYYY-MM-DD'), $np$open$np$, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, null, $np$subcontractor$np$, $np$invited$np$, $np$project_specific$np$, $np$Toronto General Hospital – Level 3 Interior Fit-Out$np$, $np$$np$, $np$$np$, null, '2026-09-08'::date, '2026-12-18'::date, $np$lump_sum$np$, false, false, false, false, $np$$np$, $np$$np$, $np$$np$, false, $np$America/Toronto$np$, $np$America/Toronto$np$),
  ('37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid, '2026-06-01 21:50:21.954163+00'::timestamptz, $np$North York Hospital Renovation - Level 2 Corridor Upgrade$np$, $np$north-york-hospital-renovation-level-2-corridor-upgrade-1780350621901$np$, $np$Northline Development Group is requesting supplier pricing for the renovation of Level 2 corridors at a healthcare facility in North York. Scope includes interior painting, wall protection preparation, acoustic ceiling coordination, minor drywall repairs, dust control, after-hours work planning, and final cleaning. Vendors must include labour, materials, supervision, site protection, schedule assumptions, and closeout documentation.$np$, $np$Interior Construction$np$, $np$North York, ON$np$, $np$320000$np$, $np$2026-07-30$np$, $np$awarded$np$, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, null, null, $np$subcontractor$np$, $np$invited$np$, $np$project_specific$np$, null, null, null, null, null, null, $np$lump_sum$np$, false, false, false, false, null, null, null, false, $np$America/Toronto$np$, $np$America/Toronto$np$)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  category = excluded.category,
  location = excluded.location,
  budget = excluded.budget,
  deadline = excluded.deadline,
  status = excluded.status,
  company_id = excluded.company_id,
  user_id = excluded.user_id,
  procurement_scope = excluded.procurement_scope,
  sourcing_method = excluded.sourcing_method,
  contract_framework = excluded.contract_framework,
  project_name = excluded.project_name,
  owner_client = excluded.owner_client,
  internal_project_id = excluded.internal_project_id,
  rfi_deadline = excluded.rfi_deadline,
  mobilization_date = excluded.mobilization_date,
  substantial_completion_date = excluded.substantial_completion_date,
  bid_model = excluded.bid_model,
  nda_required = excluded.nda_required,
  performance_bond_required = excluded.performance_bond_required,
  bid_bond_required = excluded.bid_bond_required,
  insurance_required = excluded.insurance_required,
  insurance_notes = excluded.insurance_notes,
  safety_requirements = excluded.safety_requirements,
  prequalification_notes = excluded.prequalification_notes,
  advanced_controls_enabled = excluded.advanced_controls_enabled,
  deadline_timezone = excluded.deadline_timezone,
  rfi_deadline_timezone = excluded.rfi_deadline_timezone;

insert into public.quotes (
  id,
  created_at,
  rfq_id,
  company_id,
  user_id,
  amount,
  timeline,
  message,
  status,
  score,
  decision,
  awarded_at,
  validity_days
)
values
  ('c18b2772-615c-4273-9600-6831011f7c24'::uuid, '2026-06-12 05:45:18.537936+00'::timestamptz, 'b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid, '7d394e05-153b-4201-9d72-4dcd26eb2655'::uuid, null, 2095000, $np$22 weeks$np$, $np$Complete supply and installation of acoustic ceilings, architectural wall panels, interior glazing systems, specialty finishes, project coordination, quality assurance, and closeout documentation.

Proposed delivery schedule: 22 weeks from contract award.

Key advantages:
• Dedicated project manager
• Commercial construction experience on projects exceeding $10M
• Accelerated procurement and installation schedule
• Full warranty and post-installation support

Quote valid for 60 days$np$, $np$submitted$np$, 96, $np$rejected$np$, null, 30),
  ('82b3f5aa-1cc6-4dbc-9256-fd6ad697551f'::uuid, '2026-06-12 06:30:36.741601+00'::timestamptz, 'b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid, '30f734f3-26e9-4624-abd8-db654fdf1cec'::uuid, null, 2094500, $np$21 weeks$np$, $np$Complete supply and installation of acoustic ceilings, architectural wall panels, interior glazing systems, specialty finishes, project coordination, quality assurance, and closeout documentation. Proposed delivery schedule: 21 weeks from contract award. Key advantages: • Dedicated project manager • Commercial construction experience on projects exceeding $10M • Accelerated procurement and installation schedule • Full warranty and post-installation support Quote valid for 60 day$np$, $np$submitted$np$, 96, $np$awarded$np$, '2026-06-13 02:55:56.005+00'::timestamptz, 30),
  ('75c4f02a-775b-498e-b834-c82616a5cf12'::uuid, '2026-06-13 05:29:30.717329+00'::timestamptz, '067c6211-b40a-4ddc-9915-6d8d9474c7ed'::uuid, '7d394e05-153b-4201-9d72-4dcd26eb2655'::uuid, null, 6895000, $np$16 Months$np$, $np$We are pleased to submit our proposal for the North York Regional Hospital Redevelopment – Phase 2 Interior Construction project.

Our team has extensive healthcare construction experience, including active hospital renovations, infection control barriers, phased occupancy work, nurse station millwork, firestopping systems, and medical office fit-outs.

We can deliver the project within 16 months while maintaining strict healthcare operational requirements and minimizing disruption to ongoing hospital activities.

Key Advantages:
• Dedicated healthcare construction team
• Proven infection control and phased renovation experience
• Competitive pricing structure
• Full project management and quality assurance program

We look forward to the opportunity to support this redevelopment initiative.$np$, $np$submitted$np$, 85, $np$pending$np$, null, 30),
  ('96b072ff-7ae4-43c0-ad12-194c1ec69a1a'::uuid, '2026-06-01 22:43:51.842882+00'::timestamptz, '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid, '5772a821-6468-46fe-98f7-48f5a750ecb7'::uuid, null, 312000, $np$8 weeks$np$, $np$DQ Construction proposes a complete corridor upgrade package including demolition, drywall repairs, painting, acoustic ceiling replacement, infection control protection, material supply, labour supervision, and project closeout documentation.$np$, $np$submitted$np$, 96, $np$rejected$np$, null, 30),
  ('b8dc2dfa-e78c-4554-85a6-c9529c576bdc'::uuid, '2026-06-01 22:55:33.870223+00'::timestamptz, '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid, '79b0756f-260e-4d10-b501-9ffc2c1ae3f5'::uuid, null, 326000, $np$5 weeks$np$, $np$HRCM Group offers accelerated corridor renovation services with dedicated project management,  rapid material procurement, healthcare safety compliance, and premium finishing standards.$np$, $np$submitted$np$, 96, $np$rejected$np$, null, 30),
  ('2d419499-d47a-4b6f-8456-a6086e194531'::uuid, '2026-06-01 21:57:27.687108+00'::timestamptz, '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid, '8231e064-f149-4398-8d05-b130608b2be1'::uuid, null, 298000, $np$6 weeks$np$, $np$Atlas Inc. propose a complete interior renovation package including labour, supervision, wall preparation, acoustic ceiling coordination , dust control measures, material procurement, and final project closeout documentation. pricing includes after hour scheduling and healthcare facility compliance requirements.$np$, $np$submitted$np$, 96, $np$awarded$np$, '2026-06-01 23:23:37.662+00'::timestamptz, 30)
on conflict (id) do update set
  rfq_id = excluded.rfq_id,
  company_id = excluded.company_id,
  user_id = excluded.user_id,
  amount = excluded.amount,
  timeline = excluded.timeline,
  message = excluded.message,
  status = excluded.status,
  score = excluded.score,
  decision = excluded.decision,
  awarded_at = excluded.awarded_at,
  validity_days = excluded.validity_days;

-- Restore the two internally consistent awards only after their quotes exist.
update public.rfqs
set awarded_quote_id = '82b3f5aa-1cc6-4dbc-9256-fd6ad697551f'::uuid,
    awarded_at = '2026-06-13 02:55:56.005+00'::timestamptz,
    status = 'awarded'
where id = 'b52222ba-a3ed-44d7-b92a-2cecda532664'::uuid;

update public.rfqs
set awarded_quote_id = '2d419499-d47a-4b6f-8456-a6086e194531'::uuid,
    awarded_at = '2026-06-01 23:23:37.662+00'::timestamptz,
    status = 'awarded'
where id = '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'::uuid;

insert into public.rfq_ai_reviews (
  id,
  rfq_id,
  company_id,
  created_by,
  readiness_score,
  risk_level,
  executive_summary,
  missing_items,
  recommendations,
  created_at
)
values
  ('9bbce6bf-d01a-4e20-8bee-97ca44c6ff13'::uuid, '2e4aee45-280b-46b9-8b38-fa6029f08df3'::uuid, '293b1013-f488-48a5-ae63-e028569519ee'::uuid, '081decc5-ab1e-4091-bf01-21122a1147d1'::uuid, 100, $np$low$np$, $np$This RFQ appears well structured for supplier pricing and executive procurement review.$np$, $np$No critical required items detected.$np$, $np$Upload drawings when available to reduce supplier assumptions.
Upload technical specifications for larger or regulated packages.
Upload a BOQ or pricing form to standardize supplier submissions.$np$, '2026-08-04 00:28:39.74617+00'::timestamptz)
on conflict (id) do update set
  rfq_id = excluded.rfq_id,
  company_id = excluded.company_id,
  created_by = excluded.created_by,
  readiness_score = excluded.readiness_score,
  risk_level = excluded.risk_level,
  executive_summary = excluded.executive_summary,
  missing_items = excluded.missing_items,
  recommendations = excluded.recommendations;

do $$
begin
  if (select count(*) from public.rfqs where id in (
    'd9c173db-04c7-41ae-81b6-db842cdce6e7',
    'b52222ba-a3ed-44d7-b92a-2cecda532664',
    '067c6211-b40a-4ddc-9915-6d8d9474c7ed',
    '2e4aee45-280b-46b9-8b38-fa6029f08df3',
    '4a0a1611-8c60-4ea4-8b38-5565630573b0',
    '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'
  )) <> 6 then
    raise exception 'Seed verification failed: expected 6 RFQs.';
  end if;

  if (select count(*) from public.quotes where id in (
    'c18b2772-615c-4273-9600-6831011f7c24',
    '82b3f5aa-1cc6-4dbc-9256-fd6ad697551f',
    '75c4f02a-775b-498e-b834-c82616a5cf12',
    '96b072ff-7ae4-43c0-ad12-194c1ec69a1a',
    'b8dc2dfa-e78c-4554-85a6-c9529c576bdc',
    '2d419499-d47a-4b6f-8456-a6086e194531'
  )) <> 6 then
    raise exception 'Seed verification failed: expected 6 valid quotes.';
  end if;

  if (select count(*) from public.rfqs where (
    id = 'b52222ba-a3ed-44d7-b92a-2cecda532664'
    and awarded_quote_id = '82b3f5aa-1cc6-4dbc-9256-fd6ad697551f'
    and status = 'awarded'
  ) or (
    id = '37d94e4c-0d86-4f2b-8a83-4aed833edb3d'
    and awarded_quote_id = '2d419499-d47a-4b6f-8456-a6086e194531'
    and status = 'awarded'
  )) <> 2 then
    raise exception 'Seed verification failed: expected 2 consistent awards.';
  end if;

  if not exists (
    select 1
    from public.rfq_ai_reviews
    where id = '9bbce6bf-d01a-4e20-8bee-97ca44c6ff13'
      and rfq_id = '2e4aee45-280b-46b9-8b38-fa6029f08df3'
  ) then
    raise exception 'Seed verification failed: expected the approved AI review.';
  end if;
end;
$$;

commit;
