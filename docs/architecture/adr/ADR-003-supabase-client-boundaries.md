# ADR-003: Supabase Client Boundaries

- **Status:** Accepted
- **Date:** 2026-07-23
- **Scope:** Supabase initialization and imports

## Context

The repository currently contains:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase.ts
```

The active codebase consistently imports the SSR-aware browser and server clients.

`src/lib/supabase.ts` directly creates a client with `@supabase/supabase-js` and does not participate in the established SSR cookie/session pattern.

## Decision

### Canonical browser client

```text
src/lib/supabase/client.ts
```

Used by:

- Client Components;
- interactive forms;
- client-side uploads;
- browser authentication actions;
- browser-side session-aware operations.

### Canonical server client

```text
src/lib/supabase/server.ts
```

Used by:

- Server Components;
- Route Handlers;
- Server Actions;
- repositories;
- server-side analytics loaders;
- authenticated server workflows.

### Deprecated legacy client

```text
src/lib/supabase.ts
```

Status:

```text
Deprecated
Do not import
Do not add new consumers
Remove only after a zero-consumer verification
```

## Required Annotation

Until removal, the legacy file should carry this notice:

```ts
/**
 * @deprecated
 * Use `@/lib/supabase/client` in Client Components and browser workflows.
 * Use `@/lib/supabase/server` in Server Components, Route Handlers,
 * Server Actions, and repositories.
 *
 * Do not add new consumers.
 */
```

This annotation is the only recommended production-code change resulting directly from this ADR.

## Migration and Removal Gate

`src/lib/supabase.ts` may be deleted only when:

- [ ] repository search shows zero imports;
- [ ] dynamic imports and non-aliased relative imports have been checked;
- [ ] lint passes;
- [ ] build passes;
- [ ] login, logout, signup, password reset, invite, RFQ submission, and upload flows are visually verified;
- [ ] no session or cookie regression is observed;
- [ ] Git diff contains no unrelated changes.

## Import Matrix

| Runtime | Required import |
|---|---|
| Client Component | `@/lib/supabase/client` |
| Browser form workflow | `@/lib/supabase/client` |
| Server Component | `@/lib/supabase/server` |
| Route Handler | `@/lib/supabase/server` |
| Server Action | `@/lib/supabase/server` |
| Repository | `@/lib/supabase/server` |
| Analytics server loader | `@/lib/supabase/server` |

## Prohibited Usage

- Do not create a second browser client helper.
- Do not create a second server client helper.
- Do not import the browser client from server repositories.
- Do not import the server client from Client Components.
- Do not instantiate `@supabase/supabase-js` directly in feature files.
- Do not use private service-role credentials in browser code.
- Do not delete the legacy file without a verified zero-consumer search.

## Consequences

- One browser initialization pattern.
- One server initialization pattern.
- Consistent session and cookie handling.
- Lower server/client leakage risk.
- Safer future Supabase upgrades.
