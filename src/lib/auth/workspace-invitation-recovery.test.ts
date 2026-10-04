import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const activeMiddleware = readFileSync(
  resolve(process.cwd(), "middleware.ts"),
  "utf8",
);

const recoveryMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261004234000_recover_pending_workspace_invitation.sql",
  ),
  "utf8",
);

describe("workspace invitation onboarding recovery", () => {
  it("recovers a pending invite before rendering company onboarding", () => {
    expect(activeMiddleware).toContain(
      'supabase.rpc("get_current_user_pending_workspace_invitation")',
    );
    expect(activeMiddleware).toContain(
      "new URL(`/invite/${encodeURIComponent(pendingInvitationToken)}`, request.url)",
    );

    const recoveryLookup = activeMiddleware.indexOf(
      'supabase.rpc("get_current_user_pending_workspace_invitation")',
    );
    const onboardingReturn = activeMiddleware.indexOf(
      "return response;",
      recoveryLookup,
    );

    expect(recoveryLookup).toBeGreaterThan(-1);
    expect(onboardingReturn).toBeGreaterThan(recoveryLookup);
  });

  it("derives recovery only from the authenticated confirmed email", () => {
    expect(recoveryMigration).toContain("actor_user_id := auth.uid()");
    expect(recoveryMigration).toContain("auth.jwt() ->> \'email\'");
    expect(recoveryMigration).toContain("from auth.users as u");
    expect(recoveryMigration).toContain("u.email_confirmed_at is not null");
    expect(recoveryMigration).toContain("i.status = \'pending\'");
    expect(recoveryMigration).toContain(
      "(i.expires_at is null or i.expires_at >= now())",
    );
  });

  it("keeps the resolver read-only and least-privilege", () => {
    expect(recoveryMigration).toContain("security definer");
    expect(recoveryMigration).toContain("set search_path = public, pg_temp");
    expect(recoveryMigration).toContain("from anon");
    expect(recoveryMigration).toContain("to authenticated");
    expect(recoveryMigration).not.toMatch(/\binsert\s+into\b/i);
    expect(recoveryMigration).not.toMatch(/\bupdate\s+public\./i);
    expect(recoveryMigration).not.toMatch(/\bdelete\s+from\b/i);
  });
});
