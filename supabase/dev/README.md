# Nexus Pavilion Section 3 Development bootstrap package

This package is a reviewable, non-executed blueprint for the minimum Section 3 environment. It must never be run against Production. Do not copy Production data, identifiers, credentials, or secrets into this directory.

## Pre-execution gate

Before any base schema or migration is run, an authorized reviewer must confirm every item below for the target only:

- [ ] A separate Supabase project exists for this work.
- [ ] The target is positively classified as **Development**.
- [ ] Its project ID differs from the Production project ID.
- [ ] Production credentials are absent: no Production URL, connection string, credential, or service-role key is configured for the session.
- [ ] Managed Supabase `auth.users`, `auth.uid()`, and `auth.jwt()` are available.
- [ ] `gen_random_uuid()` is available.
- [ ] Required `pgcrypto` functionality, including `gen_random_bytes()`, is available.
- [ ] This bootstrap package has independent approval.
- [ ] The migration order has independent approval.
- [ ] The synthetic-only data and runtime-verification plans have independent approval.

Failure of any item stops execution. This package contains no command that should be redirected to another project.

## Required sequence

1. Pass the pre-execution gate for a dedicated Development project.
2. Review and apply `00_base_schema.sql` only after approval.
3. Apply the existing Section 3 migrations in `migration-order.md`.
4. Create only the synthetic data described in `synthetic-seed-plan.md`.
5. Run the controlled verification matrix in `section3-runtime-verification.md`.

Supabase supplies the Auth objects and helpers above. The package deliberately does not recreate Auth infrastructure, extensions, credentials, policies, or fake Auth tables/functions. The base schema omits objects, fields, indexes, policies, and RPCs created by Section 3 migrations.
