import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260823000000_create_get_organization_invitation_context.sql";
const acceptMigrationPath =
  "supabase/legacy-migrations/pre-baseline/20260801_create_accept_organization_invitation_rpc.sql";
const baselinePath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8");
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const acceptSql = readFileSync(
  resolve(process.cwd(), acceptMigrationPath),
  "utf8",
);
const baseline = readFileSync(resolve(process.cwd(), baselinePath), "utf8");
const landing = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/page.tsx"),
  "utf8",
);
const signup = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/signup/page.tsx"),
  "utf8",
);
const accessState = readFileSync(
  resolve(
    process.cwd(),
    "src/components/executive/invitation/executive-access-state.tsx",
  ),
  "utf8",
);
const acceptRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/company-invitations/accept/route.ts"),
  "utf8",
);
const professionalIdentityPath =
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql";
const professionalIdentitySql = readFileSync(
  resolve(process.cwd(), professionalIdentityPath),
  "utf8",
).replace(/\r\n/g, "\n");

describe("organization invitation token context RPC", () => {
  it("is a read-only SECURITY DEFINER token context command", () => {
    expect(normalized).toContain(
      "create or replace function public.get_organization_invitation_context(",
    );
    expect(normalized).toContain("p_token text");
    expect(normalized).toContain("security definer");
    expect(normalized).toContain("set search_path = ''");
    expect(normalized).toContain("language sql");
    expect(normalized).toContain("stable");
    expect(normalized).toContain("from public.invitations as i");
    expect(normalized).toContain("join public.companies as c");
    expect(normalized).toContain("length(btrim(p_token)) >= 32");
    expect(normalized).toContain("i.token = btrim(p_token)");
    expect(normalized).toContain("i.status = 'pending'");
    expect(normalized).toContain("i.expires_at >= now()");
    expect(normalized).not.toMatch(/\b(insert|update|delete)\s+/);
  });

  it("revokes public execute and grants only bounded client execute", () => {
    expect(normalized).toContain(
      "revoke all on function public.get_organization_invitation_context(text) from public",
    );
    expect(normalized).toContain(
      "grant execute on function public.get_organization_invitation_context(text) to anon, authenticated, service_role",
    );
    expect(normalized).not.toMatch(
      /grant\s+execute\s+on function public\.get_organization_invitation_context\(text\)\s+to public/,
    );
  });

  it("does not grant invitation-table SELECT to anon or authenticated", () => {
    expect(normalized).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.invitations/,
    );
    expect(normalized).not.toMatch(
      /grant\s+.+\s+on\s+table\s+public\.invitations/,
    );
    expect(baseline).not.toMatch(
      /GRANT\s+SELECT[\s\S]*ON TABLE\s+"public"\."invitations"\s+TO\s+"(anon|authenticated)"/,
    );
  });

  it("returns only landing fields and never the invitation token", () => {
    const returnsBlock = normalized.slice(
      normalized.indexOf("returns table"),
      normalized.indexOf("language sql"),
    );

    for (const column of [
      "invite_email",
      "invite_role",
      "invite_status",
      "invite_expires_at",
      "company_name",
      "company_category",
      "company_location",
      "company_logo_url",
    ]) {
      expect(returnsBlock).toContain(column);
    }

    expect(returnsBlock).not.toContain("token");
    expect(returnsBlock).not.toContain("invited_by");
    expect(returnsBlock).not.toContain("accepted_by");
    expect(returnsBlock).not.toContain("accepted_at");
    expect(returnsBlock).not.toContain("company_id");
    expect(returnsBlock).not.toContain("invite_id");
  });

  it("treats unusable tokens as an empty context", () => {
    expect(normalized).toContain("limit 1");
    expect(normalized).toContain("i.status = 'pending'");
    expect(normalized).toContain("i.expires_at >= now()");
    expect(normalized).not.toContain("error_code");
    expect(normalized).not.toContain("invitation_expired");
    expect(normalized).not.toContain("invitation_not_found");
  });
});

describe("workspace invitation landing and signup lookup", () => {
  it("uses the token-context RPC instead of selecting public.invitations", () => {
    for (const source of [landing, signup]) {
      expect(source).toContain('rpc("get_organization_invitation_context"');
      expect(source).toContain("p_token:");
      expect(source).not.toMatch(/\.from\(\s*["']invitations["']\s*\)/);
    }
  });

  it("preserves Sign In continuation through the invitation path", () => {
    expect(landing).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(accessState).toContain("href={loginHref}");
    expect(accessState).not.toContain('href="/login"');
    expect(signup).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
  });
});

describe("accept_organization_invitation authenticated boundary", () => {
  it("remains an authenticated-only SECURITY DEFINER command", () => {
    const normalizedAccept = acceptSql.replace(/\s+/g, " ").trim().toLowerCase();

    expect(normalizedAccept).toContain("security definer");
    expect(normalizedAccept).toContain("actor_user_id := auth.uid()");
    expect(normalizedAccept).toContain("'error_code', 'unauthenticated'");
    expect(normalizedAccept).toContain(
      "grant execute on function public.accept_organization_invitation(text) to authenticated",
    );
    expect(normalizedAccept).not.toContain(
      "grant execute on function public.accept_organization_invitation(text) to anon",
    );

    expect(acceptRoute).toContain("await supabase.auth.getUser()");
    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).toContain("`/login?next=${encodeURIComponent(");
  });

  it("keeps Task 17 accept bounds after the optional job-title parameter is added", () => {
    const acceptBody = professionalIdentitySql.slice(
      professionalIdentitySql.indexOf(
        "create or replace function public.accept_organization_invitation(",
      ),
      professionalIdentitySql.indexOf(
        "comment on function public.accept_organization_invitation(text, text)",
      ),
    );
    const signature = acceptBody.slice(0, acceptBody.indexOf("returns jsonb"));

    expect(signature).toContain("invitation_token text");
    expect(signature).toContain("p_job_title text default null");
    expect(signature).not.toContain("p_company_id");
    expect(signature).not.toContain("p_user_id");
    expect(acceptBody).toContain("security definer");
    expect(acceptBody).toContain("actor_user_id := auth.uid()");
    expect(acceptBody).toContain("'error_code', 'UNAUTHENTICATED'");
    expect(acceptBody).toContain("'error_code', 'RECIPIENT_MISMATCH'");
    expect(professionalIdentitySql).toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto authenticated;",
    );
    expect(professionalIdentitySql).not.toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto anon;",
    );
    expect(acceptRoute).toContain("invitation_token: token");
    expect(acceptRoute).not.toContain("p_company_id");
    expect(acceptRoute).not.toContain("p_user_id");
  });
});
