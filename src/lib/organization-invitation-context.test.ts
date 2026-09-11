import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BASELINE_V2_PATH =
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql";
const HISTORICAL_ACCEPT_V1_PATH =
  "supabase/legacy-migrations/pre-baseline/20260801_create_accept_organization_invitation_rpc.sql";
const HISTORICAL_PROFESSIONAL_IDENTITY_PATH =
  "supabase/legacy-migrations/pre-baseline-v2/20260827000000_enable_professional_identity_primitives.sql";

function normalizeContractSql(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const sql = normalizeContractSql(readSource(BASELINE_V2_PATH));
const normalized = sql;

const historicalAcceptV1 = normalizeContractSql(
  readSource(HISTORICAL_ACCEPT_V1_PATH),
);
const historicalProfessionalIdentity = readSource(
  HISTORICAL_PROFESSIONAL_IDENTITY_PATH,
).replace(/\r\n/g, "\n");

const landing = readSource("src/app/invite/[token]/page.tsx");
const signup = readSource("src/app/invite/[token]/signup/page.tsx");
const accessState = readSource(
  "src/components/executive/invitation/executive-access-state.tsx",
);
const acceptRoute = readSource(
  "src/app/api/company-invitations/accept/route.ts",
);

function functionBody(name: string) {
  const marker = `create or replace function public.${name.toLowerCase()}`;
  const start = sql.indexOf(marker);
  expect(start, `missing ${name}`).toBeGreaterThan(-1);
  const end = sql.indexOf(`alter function public.${name.toLowerCase()}`, start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

describe("organization invitation token context RPC (FINAL ACTIVE: Baseline V2)", () => {
  it("is a read-only SECURITY DEFINER token context command", () => {
    const body = functionBody("get_organization_invitation_context");

    expect(body).toContain(
      "create or replace function public.get_organization_invitation_context(",
    );
    expect(body).toContain("p_token text");
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path to ''");
    expect(body).toContain("language sql");
    expect(body).toContain("stable");
    expect(body).toContain("from public.invitations as i");
    expect(body).toContain("join public.companies as c");
    expect(body).toContain("length(btrim(p_token)) >= 32");
    expect(body).toContain("i.token = btrim(p_token)");
    expect(body).toContain("i.status = 'pending'");
    expect(body).toContain("i.expires_at >= now()");
    expect(body).not.toMatch(/\b(insert|update|delete)\s+/);
  });

  it("revokes public execute and grants only bounded client execute", () => {
    expect(normalized).toContain(
      "revoke all on function public.get_organization_invitation_context(p_token text) from public",
    );
    expect(normalized).toContain(
      "grant all on function public.get_organization_invitation_context(p_token text) to anon",
    );
    expect(normalized).toContain(
      "grant all on function public.get_organization_invitation_context(p_token text) to authenticated",
    );
    expect(normalized).toContain(
      "grant all on function public.get_organization_invitation_context(p_token text) to service_role",
    );
    expect(normalized).not.toMatch(
      /grant\s+(all|execute)\s+on function public\.get_organization_invitation_context\(p_token text\)\s+to public/,
    );
  });

  it("does not grant invitation-table SELECT to anon or authenticated", () => {
    expect(normalized).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.invitations\s+to\s+(anon|authenticated)/,
    );
    expect(normalized).not.toMatch(
      /grant\s+all\s+on\s+table\s+public\.invitations\s+to\s+(anon|authenticated)/,
    );
  });

  it("returns only landing fields and never the invitation token", () => {
    const body = functionBody("get_organization_invitation_context");
    const returnsBlock = body.slice(
      body.indexOf("returns table"),
      body.indexOf("language sql"),
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
    const body = functionBody("get_organization_invitation_context");
    expect(body).toContain("limit 1");
    expect(body).toContain("i.status = 'pending'");
    expect(body).toContain("i.expires_at >= now()");
    expect(body).not.toContain("error_code");
    expect(body).not.toContain("invitation_expired");
    expect(body).not.toContain("invitation_not_found");
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

describe("accept_organization_invitation authenticated boundary (FINAL ACTIVE: Baseline V2)", () => {
  it("remains an authenticated-only SECURITY DEFINER command", () => {
    const acceptBody = functionBody("accept_organization_invitation");

    expect(acceptBody).toContain("security definer");
    expect(acceptBody).toContain("actor_user_id := auth.uid()");
    expect(acceptBody).toContain("'error_code', 'unauthenticated'");
    expect(sql).toContain(
      "grant all on function public.accept_organization_invitation(invitation_token text, p_job_title text) to authenticated",
    );
    expect(sql).not.toContain(
      "grant all on function public.accept_organization_invitation(invitation_token text, p_job_title text) to anon",
    );

    expect(acceptRoute).toContain("await supabase.auth.getUser()");
    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).toContain("`/login?next=${encodeURIComponent(");
  });

  it("keeps final accept(text, text) bounds including optional job-title", () => {
    const acceptBody = functionBody("accept_organization_invitation");
    const signature = acceptBody.slice(0, acceptBody.indexOf("returns jsonb"));

    expect(signature).toContain("invitation_token text");
    expect(signature).toContain("p_job_title text default null");
    expect(signature).not.toContain("p_company_id");
    expect(signature).not.toContain("p_user_id");
    expect(acceptBody).toContain("security definer");
    expect(acceptBody).toContain("actor_user_id := auth.uid()");
    expect(acceptBody).toContain("'error_code', 'unauthenticated'");
    expect(acceptBody).toContain("'error_code', 'recipient_mismatch'");
    expect(sql).toContain(
      "grant all on function public.accept_organization_invitation(invitation_token text, p_job_title text) to authenticated",
    );
    expect(sql).not.toContain(
      "grant all on function public.accept_organization_invitation(invitation_token text, p_job_title text) to anon",
    );
    expect(acceptRoute).toContain("invitation_token: token");
    expect(acceptRoute).not.toContain("p_company_id");
    expect(acceptRoute).not.toContain("p_user_id");
  });
});

describe("HISTORICAL PROVENANCE: accept evolution before Baseline V2", () => {
  it("retains the pre-baseline v1 single-arg accept grant shape as provenance only", () => {
    expect(historicalAcceptV1).toContain(
      "grant execute on function public.accept_organization_invitation(text) to authenticated",
    );
    expect(historicalAcceptV1).not.toContain(
      "grant execute on function public.accept_organization_invitation(text) to anon",
    );
  });

  it("retains professional-identity archive provenance for job_title addition", () => {
    const acceptBody = historicalProfessionalIdentity.slice(
      historicalProfessionalIdentity.indexOf(
        "create or replace function public.accept_organization_invitation(",
      ),
      historicalProfessionalIdentity.indexOf(
        "comment on function public.accept_organization_invitation(text, text)",
      ),
    );
    const signature = acceptBody.slice(0, acceptBody.indexOf("returns jsonb"));

    expect(signature).toContain("invitation_token text");
    expect(signature).toContain("p_job_title text default null");
  });
});
