import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const reverse290Path = "docs/operations/sql/task28_reverse_20260829000000.sql";
const reverse280Path = "docs/operations/sql/task28_reverse_20260828000000.sql";
const awardMigrationPath =
  "supabase/migrations/20260826000000_enforce_atomic_rfq_award_integrity.sql";
const baselineMigrationPath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function historicalAwardBlock(source: string) {
  const start = source.indexOf(
    "create or replace function public.award_rfq_quote(p_quote_id uuid)",
  );
  const end = source.indexOf("\ncommit;", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end).trim();
}

function baselinePolicy(source: string, name: string) {
  const marker = `CREATE POLICY "${name}"`;
  const start = source.indexOf(marker);
  expect(start, `missing baseline policy ${name}`).toBeGreaterThan(-1);
  const end = source.indexOf(";\n", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 1);
}

function uncommented(source: string) {
  return source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

const reverse290 = readSource(reverse290Path);
const reverse280 = readSource(reverse280Path);
const awardMigration = readSource(awardMigrationPath);
const baseline = readSource(baselineMigrationPath);
const active290 = uncommented(reverse290);
const active280 = uncommented(reverse280);

describe("Task 28 reverse SQL operator artifacts", () => {
  it("keeps reverse artifacts as operator SQL, not forward migrations", () => {
    expect(reverse290Path.startsWith("docs/operations/sql/")).toBe(true);
    expect(reverse280Path.startsWith("docs/operations/sql/")).toBe(true);
    expect(reverse290Path).not.toContain("supabase/migrations/");
    expect(reverse280Path).not.toContain("supabase/migrations/");
    expect(reverse290).toContain("OPERATOR ARTIFACT");
    expect(reverse280).toContain("OPERATOR ARTIFACT");
    expect(reverse290).toContain("NOT a forward Supabase migration");
    expect(reverse280).toContain("NOT a forward Supabase migration");
  });

  it("restores the exact pre-290 award_rfq_quote definition from 20260826000000", () => {
    const historical = historicalAwardBlock(awardMigration);
    expect(reverse290).toContain(historical);
    expect(active290).toContain("security definer");
    expect(active290).toContain("set search_path = ''");
    expect(active290).toContain(
      "alter function public.award_rfq_quote(uuid) owner to postgres",
    );
    expect(active290).toContain(
      "grant execute\non function public.award_rfq_quote(uuid)\nto authenticated, service_role;",
    );
    expect(historical).not.toContain("parse_rfq_deadline_timestamptz");
    expect(historical).not.toContain(
      "Commercial evaluation remains locked until the RFQ deadline.",
    );
  });

  it("drops 290 helper RPCs only after award_rfq_quote is restored", () => {
    const awardAt = reverse290.indexOf(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
    const countDropAt = reverse290.indexOf(
      "drop function if exists public.count_rfq_quote_submissions(uuid);",
    );
    const parserDropAt = reverse290.indexOf(
      "drop function if exists public.parse_rfq_deadline_timestamptz(text);",
    );
    expect(awardAt).toBeGreaterThan(-1);
    expect(countDropAt).toBeGreaterThan(awardAt);
    expect(parserDropAt).toBeGreaterThan(countDropAt);
  });

  it("restores the exact baseline quotes SELECT and UPDATE policies", () => {
    const selectPolicy = baselinePolicy(
      baseline,
      "Company members can read permitted quotes",
    );
    const updatePolicy = baselinePolicy(
      baseline,
      "Workspace administrators can update RFQ quote decisions",
    );
    expect(reverse290).toContain(selectPolicy);
    expect(reverse290).toContain(updatePolicy);
    expect(active290).toContain(
      'drop policy if exists "Company members can read own company quotes"',
    );
    expect(active290).toContain(
      'drop policy if exists "Issuing buyers can read quotes after commercial unlock"',
    );
    expect(updatePolicy.toLowerCase()).not.toContain(
      "parse_rfq_deadline_timestamptz",
    );
  });

  it("restores table-level authenticated UPDATE without touching INSERT", () => {
    expect(active290).toContain(
      "revoke update (decision)\non table public.quotes\nfrom authenticated;",
    );
    expect(active290).toContain(
      "grant update\non table public.quotes\nto authenticated;",
    );
    expect(active290).not.toContain("grant select");
    expect(active290).not.toContain("grant insert");
    expect(active290).not.toContain(
      'drop policy if exists "Supplier members can submit company quotes"',
    );
    expect(active290).not.toContain(
      'CREATE POLICY "Supplier members can submit company quotes"',
    );
  });

  it("warns that 290 reverse is emergency-only and restores the known weakness", () => {
    expect(reverse290).toContain("EMERGENCY REVERSE ONLY");
    expect(reverse290).toContain("APPLICATION ROLLBACK");
    expect(reverse290).toContain("FORWARD-FIX");
    expect(reverse290).toContain("Product Owner and security approval");
    expect(reverse290).toContain("issuers can SELECT locked");
    expect(reverse290).toContain("UPDATE quote decision before commercial unlock");
    expect(reverse290).toContain("table-level UPDATE on public.quotes");
    expect(reverse290).toContain("award_rfq_quote can award before the RFQ deadline");
  });

  it("does not delete business data or mutate migration history in 290 reverse", () => {
    expect(active290).not.toMatch(/delete\s+from\s+public\.quotes/i);
    expect(active290).not.toMatch(/delete\s+from\s+public\.rfqs/i);
    expect(active290).not.toMatch(/delete\s+from\s+supabase_migrations/i);
    expect(reverse290).toContain(
      "It does NOT DELETE rows from supabase_migrations.schema_migrations.",
    );
    expect(reverse290).toContain("quote/RFQ business rows");
  });

  it("drops record_procurement_activity and 280 SELECT policies", () => {
    expect(active280).toContain(
      "drop function if exists public.record_procurement_activity(text, uuid);",
    );
    expect(active280).toContain(
      'drop policy if exists "Company members can read company notifications"',
    );
    expect(active280).toContain(
      'drop policy if exists "Company members can read company audit logs"',
    );
  });

  it("revokes authenticated SELECT before disabling RLS", () => {
    const notificationsRevoke = reverse280.indexOf(
      "revoke select\non table public.notifications\nfrom authenticated;",
    );
    const auditRevoke = reverse280.indexOf(
      "revoke select\non table public.audit_logs\nfrom authenticated;",
    );
    const notificationsDisable = reverse280.indexOf(
      "alter table public.notifications\n  disable row level security;",
    );
    const auditDisable = reverse280.indexOf(
      "alter table public.audit_logs\n  disable row level security;",
    );
    expect(notificationsRevoke).toBeGreaterThan(-1);
    expect(auditRevoke).toBeGreaterThan(notificationsRevoke);
    expect(notificationsDisable).toBeGreaterThan(auditRevoke);
    expect(auditDisable).toBeGreaterThan(notificationsDisable);
    expect(reverse280).toContain(
      "Never DISABLE ROW LEVEL SECURITY while authenticated still has SELECT.",
    );
  });

  it("does not drop audit tables, delete history, or drop company_id on the active 280 path", () => {
    expect(active280).not.toMatch(/drop table(?: if exists)? public\.audit_logs/i);
    expect(active280).not.toMatch(
      /drop table(?: if exists)? public\.notifications/i,
    );
    expect(active280).not.toMatch(/delete\s+from\s+public\.audit_logs/i);
    expect(active280).not.toMatch(/delete\s+from\s+public\.notifications/i);
    expect(active280).not.toMatch(/drop column if exists company_id/i);
    expect(reverse280).toContain("notifications.company_id");
    expect(reverse280).toContain("intentionally retained");
    expect(reverse280).toContain("DESTRUCTIVE — DO NOT EXECUTE AS NORMAL ROLLBACK");
    expect(reverse280).toContain("--   drop column if exists company_id;");
    expect(active280).not.toMatch(/delete\s+from\s+supabase_migrations/i);
    expect(reverse280).toContain(
      "It does NOT DELETE rows from supabase_migrations.schema_migrations.",
    );
  });

  it("wraps each reverse in one transaction and documents full rollback order", () => {
    expect(active290.trim().startsWith("begin;")).toBe(true);
    expect(active290.trim().endsWith("commit;")).toBe(true);
    expect(active280.trim().startsWith("begin;")).toBe(true);
    expect(active280.trim().endsWith("commit;")).toBe(true);
    for (const source of [reverse290, reverse280]) {
      expect(source).toContain("roll the application back first");
      expect(source).toContain("execute 290 reverse");
      expect(source).toContain("execute");
      expect(source).toContain("280 reverse");
      expect(source).toContain("migration-history reconciliation");
    }
  });
});
