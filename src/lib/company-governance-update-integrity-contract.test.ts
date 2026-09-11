import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const BASELINE_V2_PATH =
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql";

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

const baselineSql = readSource(BASELINE_V2_PATH);
const sql = normalizeContractSql(baselineSql);
const compactSql = sql;

function sectionBetween(start: string, end: string) {
  const normalizedStart = start.toLowerCase();
  const normalizedEnd = end.toLowerCase();
  const startIndex = compactSql.indexOf(normalizedStart);

  expect(startIndex).toBeGreaterThan(-1);

  const endIndex = compactSql.indexOf(normalizedEnd, startIndex);

  expect(endIndex).toBeGreaterThan(startIndex);

  return compactSql.slice(startIndex, endIndex);
}

const triggerFunction = sectionBetween(
  "create or replace function public.enforce_company_governance_update_integrity()",
  "alter function public.enforce_company_governance_update_integrity()",
);

describe("company governance update-integrity contract (FINAL ACTIVE: Baseline V2)", () => {
  it("installs a postgres-owned SECURITY DEFINER trigger boundary with no caller execution grant", () => {
    expect(triggerFunction).toContain("security definer");
    expect(triggerFunction).toContain("set search_path to 'public', 'pg_temp'");
    expect(compactSql).toContain(
      "alter function public.enforce_company_governance_update_integrity() owner to postgres",
    );
    expect(compactSql).toContain(
      "revoke all on function public.enforce_company_governance_update_integrity() from public",
    );
    expect(compactSql).not.toMatch(
      /grant\s+(all|execute)\s+on\s+function\s+public\.enforce_company_governance_update_integrity/,
    );
  });

  it("revalidates the authenticated actor against active same-company owner/admin membership", () => {
    expect(triggerFunction).toContain("actor_user_id uuid := auth.uid()");
    expect(triggerFunction).toContain(
      "from public.organization_memberships as om",
    );
    expect(triggerFunction).toContain("om.user_id = actor_user_id");
    expect(triggerFunction).toContain("om.company_id = new.id");
    expect(triggerFunction).toContain("om.membership_status = 'active'");
    expect(triggerFunction).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(triggerFunction).not.toContain("'buyer'");
  });

  it("makes company-profile audit and notification atomic with the company update", () => {
    expect(triggerFunction).toContain("'company_updated'");
    expect(triggerFunction).toContain("insert into public.audit_logs");
    expect(triggerFunction).toContain("insert into public.notifications");
    expect(triggerFunction).toContain("'company profile updated'");
    expect(triggerFunction).toContain(
      "new.name || ' workspace profile was updated.'",
    );
    expect(triggerFunction).toContain("'previous'");
    expect(triggerFunction).toContain("'updated'");
    expect(triggerFunction).toContain("'updated_by'");
  });

  it("validates logo binding against the managed same-company Storage object before auditing", () => {
    expect(triggerFunction).toContain(
      "'/storage/v1/object/public/company-logos/'",
    );
    expect(triggerFunction).toContain("new.id::text || '/branding/'");
    expect(triggerFunction).toContain("from storage.objects as so");
    expect(triggerFunction).toContain("so.bucket_id = 'company-logos'");
    expect(triggerFunction).toContain("so.name = logo_path");
    expect(triggerFunction).toContain("so.metadata ->> 'mimetype'");
    expect(triggerFunction).toContain("'image/jpeg'");
    expect(triggerFunction).toContain("'image/png'");
    expect(triggerFunction).toContain("'image/webp'");
    expect(triggerFunction).toContain(
      "(so.metadata ->> 'size')::bigint <= 5242880",
    );
    expect(triggerFunction).toContain("'company_logo_updated'");
  });

  it("watches only ordinary profile and logo columns and does not take ownership of company deletion", () => {
    expect(compactSql).toContain(
      "create or replace trigger enforce_company_governance_update_integrity before update of name, category, location, network_role, logo_url",
    );
    expect(compactSql).not.toContain("company_deleted");
    expect(compactSql).not.toMatch(/delete\s+from\s+public\.companies/);

    const triggerDefinition = sectionBetween(
      "create or replace trigger enforce_company_governance_update_integrity",
      "create or replace trigger enforce_company_workspace_membership_lifecycle",
    );

    expect(triggerDefinition).not.toMatch(/\buser_id\b/);
  });

  it("does not restore client INSERT authority or cross procurement-domain boundaries", () => {
    expect(compactSql).not.toMatch(
      /grant\s+insert\s+on\s+(?:table\s+)?public\.(?:audit_logs|notifications)\s+to\s+authenticated/,
    );
    expect(triggerFunction).not.toMatch(/record_procurement_activity\s*\(/);
    expect(triggerFunction).not.toContain("rfq_");
    expect(triggerFunction).not.toContain("quote_");
  });
});
