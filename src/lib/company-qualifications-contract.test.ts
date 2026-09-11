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

const baselineSql = readFileSync(resolve(process.cwd(), BASELINE_V2_PATH), "utf8");
const sql = normalizeContractSql(baselineSql);
const normalized = sql;

function policyBlock(policyName: string) {
  const marker = `create policy ${policyName.toLowerCase()}`;
  const start = sql.indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = sql.slice(start);
  const candidates = [
    rest.indexOf(" create policy ", marker.length),
    rest.indexOf(" alter table ", marker.length),
    rest.indexOf(" revoke ", marker.length),
    rest.indexOf(" grant ", marker.length),
    rest.indexOf(" create or replace function ", marker.length),
    rest.indexOf(" create or replace view ", marker.length),
    rest.indexOf(" comment on ", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

function replaceFunctionBody() {
  const start = sql.indexOf(
    "create or replace function public.replace_company_qualifications",
  );
  expect(start).toBeGreaterThan(-1);
  const end = sql.indexOf(
    "alter function public.replace_company_qualifications",
    start,
  );
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

describe("company qualifications data contract (FINAL ACTIVE: Baseline V2)", () => {
  it("creates a normalized company_qualifications table with required fields", () => {
    expect(sql).toContain(
      "create table if not exists public.company_qualifications",
    );
    expect(sql).toContain("company_id uuid not null");
    expect(sql).toContain(
      "company_qualifications_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade",
    );
    expect(sql).toContain("qualification_type text not null");
    expect(sql).toContain("name text not null");
    expect(sql).toContain("issuer text");
    expect(sql).toContain("credential_identifier text");
    expect(sql).toContain("issued_on date");
    expect(sql).toContain("expires_on date");
    expect(sql).toContain("is_public boolean default false not null");
    expect(sql).toContain("sort_order integer default 0 not null");
    expect(sql).toContain(
      "created_at timestamp with time zone default now() not null",
    );
    expect(sql).toContain(
      "updated_at timestamp with time zone default now() not null",
    );
  });

  it("accepts only license, certification, accreditation, and registration types", () => {
    expect(sql).toContain(
      "qualification_type = any (array['license'::text, 'certification'::text, 'accreditation'::text, 'registration'::text])",
    );
    const tableBlock = sql.slice(
      sql.indexOf("create table if not exists public.company_qualifications"),
      sql.indexOf("alter table public.company_qualifications owner"),
    );
    expect(tableBlock).not.toContain("'trade'");
    expect(tableBlock).not.toContain("'buyer'");
  });

  it("enforces trimmed non-empty names and enterprise length limits", () => {
    expect(sql).toContain("check ((char_length(btrim(name)) > 0))");
    expect(sql).toContain("check ((char_length(name) <= 160))");
    expect(sql).toContain(
      "check (((issuer is null) or (char_length(issuer) <= 160)))",
    );
    expect(sql).toContain(
      "check (((credential_identifier is null) or (char_length(credential_identifier) <= 120)))",
    );
    expect(sql).toContain("check ((sort_order >= 0))");
    expect(sql).toContain(
      "check (((expires_on is null) or (issued_on is null) or (expires_on >= issued_on)))",
    );
  });

  it("prevents case-insensitive duplicates per company and qualification type", () => {
    expect(sql).toContain(
      "create unique index company_qualifications_company_type_dedupe_idx",
    );
    expect(sql).toContain("lower(btrim(name))");
    expect(sql).toContain("coalesce(lower(btrim(issuer)), ''::text)");
    expect(sql).toContain(
      "coalesce(lower(btrim(credential_identifier)), ''::text)",
    );
    expect(sql).not.toContain("lower(btrim(coalesce(issuer, '')))");
    expect(sql).not.toContain(
      "lower(btrim(coalesce(credential_identifier, '')))",
    );
  });

  it("enables RLS and revokes direct authenticated writes without anon base-table read", () => {
    expect(sql).toContain(
      "alter table public.company_qualifications enable row level security",
    );
    expect(normalized).toContain(
      "grant select on table public.company_qualifications to authenticated",
    );
    expect(normalized).not.toContain(
      "grant select on table public.company_qualifications to anon",
    );
    expect(normalized).not.toContain(
      "grant insert on table public.company_qualifications to authenticated",
    );
    expect(normalized).not.toContain(
      "grant update on table public.company_qualifications to authenticated",
    );
    expect(normalized).not.toContain(
      "grant delete on table public.company_qualifications to authenticated",
    );
    expect(normalized).not.toContain(
      "grant all on table public.company_qualifications to authenticated",
    );
  });

  it("allows active and archived workspace members to read their company qualifications", () => {
    const policy = policyBlock("company_qualifications_select_active_member");

    expect(policy).toContain("for select");
    expect(policy).toContain("to authenticated");
    expect(policy).toContain("from public.organization_memberships om");
    expect(policy).toContain("om.user_id = auth.uid()");
    expect(policy).toContain(
      "om.membership_status = any (array['active'::text, 'archived'::text])",
    );
    expect(policy).toContain(
      "om.company_id = company_qualifications.company_id",
    );
  });

  it("creates a public-safe projection without credential_identifier", () => {
    expect(sql).toContain(
      "create or replace view public.company_qualifications_public",
    );

    const viewBody = sql.slice(
      sql.indexOf("create or replace view public.company_qualifications_public"),
      sql.indexOf("alter view public.company_qualifications_public"),
    );

    const selectList = viewBody.slice(
      viewBody.indexOf("select"),
      viewBody.indexOf("from public.company_qualifications"),
    );

    expect(selectList).toContain("id");
    expect(selectList).toContain("company_id");
    expect(selectList).toContain("qualification_type");
    expect(selectList).toContain("name");
    expect(selectList).toContain("issuer");
    expect(selectList).toContain("issued_on");
    expect(selectList).toContain("expires_on");
    expect(selectList).toContain("sort_order");
    expect(selectList).not.toContain("credential_identifier");
    expect(selectList).not.toContain("is_public");
    expect(viewBody).toContain("from public.company_directory cd");
    expect(viewBody).toContain("array['approved'::text, 'verified'::text]");
    expect(normalized).toContain(
      "grant select on table public.company_qualifications_public to anon",
    );
    expect(normalized).toContain(
      "grant select on table public.company_qualifications_public to authenticated",
    );
  });

  it("requires strict JSON string validation in the RPC", () => {
    const functionBody = replaceFunctionBody();

    expect(functionBody).toContain(
      "jsonb_typeof(qualification_item -> 'issuer') <> 'string'",
    );
    expect(functionBody).toContain(
      "jsonb_typeof(qualification_item -> 'credential_identifier') <> 'string'",
    );
    expect(functionBody).toContain(
      "jsonb_typeof(qualification_item -> 'issued_on') <> 'string'",
    );
    expect(functionBody).toContain(
      "jsonb_typeof(qualification_item -> 'is_public') <> 'boolean'",
    );
    expect(functionBody).toContain("duplicate_qualification");
    expect(functionBody).toContain("duplicate qualification detected");
    expect(functionBody).toContain("if normalized_issuer = '' then");
    expect(functionBody).toContain("normalized_issuer := null;");
    expect(functionBody).toContain("if normalized_identifier = '' then");
    expect(functionBody).toContain("normalized_identifier := null;");
    expect(functionBody).toContain("coalesce(normalized_issuer, '')");
    expect(functionBody).toContain("coalesce(normalized_identifier, '')");
  });

  it("rejects missing, null, and non-string names before any write", () => {
    const functionBody = replaceFunctionBody();

    expect(functionBody).toContain("if not (qualification_item ? 'name')");
    expect(functionBody).toContain(
      "jsonb_typeof(qualification_item -> 'name') is distinct from 'string'",
    );
    expect(functionBody).not.toContain(
      "jsonb_typeof(qualification_item -> 'name') <> 'string'",
    );
    expect(functionBody.indexOf("invalid_qualification_name")).toBeLessThan(
      functionBody.indexOf("delete from public.company_qualifications"),
    );
  });

  it("rejects unsupported qualification item keys before any write", () => {
    const functionBody = replaceFunctionBody();

    expect(functionBody).toContain(
      "select jsonb_object_keys(qualification_item)",
    );
    expect(functionBody).toContain("qualification_field not in (");
    expect(functionBody).toContain("invalid_qualification_field");
    expect(functionBody.indexOf("invalid_qualification_field")).toBeLessThan(
      functionBody.indexOf("delete from public.company_qualifications"),
    );

    const allowedFieldBlock = functionBody.slice(
      functionBody.indexOf("qualification_field not in ("),
      functionBody.indexOf("invalid_qualification_field"),
    );

    for (const field of [
      "'name'",
      "'issuer'",
      "'credential_identifier'",
      "'issued_on'",
      "'expires_on'",
      "'is_public'",
    ]) {
      expect(allowedFieldBlock).toContain(field);
    }
  });

  it("requires strict YYYY-MM-DD dates and rejects invalid calendar dates", () => {
    const functionBody = replaceFunctionBody();

    expect(functionBody).toContain(
      "(qualification_item ->> 'issued_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'",
    );
    expect(functionBody).toContain(
      "(qualification_item ->> 'expires_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'",
    );
    expect(functionBody).toContain("issued date must be a valid calendar date.");
    expect(functionBody).toContain("expiry date must be a valid calendar date.");
    expect(functionBody).toContain("normalized_expires_on < normalized_issued_on");
  });

  it("resolves owner/admin authorization before any payload validation", () => {
    const functionBody = replaceFunctionBody();

    const authenticationGate = functionBody.indexOf("actor_user_id is null");
    const companyGuard = functionBody.indexOf("invalid_company");
    const membershipLookup = functionBody.indexOf(
      "from public.organization_memberships as om",
    );
    const membershipGate = functionBody.indexOf(
      "if actor_workspace_role is null then",
    );
    const roleGate = functionBody.indexOf(
      "actor_workspace_role not in ('owner', 'admin')",
    );
    const payloadGate = functionBody.indexOf("invalid_payload");

    for (const marker of [
      authenticationGate,
      companyGuard,
      membershipLookup,
      membershipGate,
      roleGate,
      payloadGate,
    ]) {
      expect(marker).toBeGreaterThan(-1);
    }

    expect(authenticationGate).toBeLessThan(companyGuard);
    expect(companyGuard).toBeLessThan(membershipLookup);
    expect(membershipLookup).toBeLessThan(membershipGate);
    expect(membershipGate).toBeLessThan(roleGate);
    expect(roleGate).toBeLessThan(payloadGate);

    for (const payloadMarker of [
      "invalid_payload",
      "invalid_qualification_type",
      "invalid_qualification_group",
      "invalid_qualification_item",
      "invalid_qualification_field",
      "invalid_qualification_name",
      "invalid_qualification_issuer",
      "invalid_qualification_identifier",
      "invalid_qualification_date",
      "invalid_qualification_visibility",
      "qualification_limit_exceeded",
      "duplicate_qualification",
    ]) {
      expect(
        functionBody.indexOf(payloadMarker),
        `${payloadMarker} must be gated behind authorization`,
      ).toBeGreaterThan(roleGate);
    }
  });

  it("collapses whitespace before trimming to match TypeScript normalization", () => {
    const functionBody = replaceFunctionBody();

    for (const field of ["name", "issuer", "credential_identifier"]) {
      expect(
        functionBody,
        `${field} must not trim before collapsing`,
      ).not.toContain(`btrim(qualification_item ->> '${field}')`);
    }

    expect(
      functionBody.match(
        /normalized_name := btrim\( regexp_replace\(qualification_item ->> 'name', '\\s\+', ' ', 'g'\) \)/g,
      ),
    ).toHaveLength(2);
    expect(functionBody).toContain(
      "normalized_issuer := btrim( regexp_replace(qualification_item ->> 'issuer', '\\s+', ' ', 'g') )",
    );
    expect(functionBody).toContain(
      "normalized_issuer := nullif( btrim(regexp_replace(qualification_item ->> 'issuer', '\\s+', ' ', 'g')), '' )",
    );
    expect(
      functionBody.match(
        /btrim\( regexp_replace\( qualification_item ->> 'credential_identifier', '\\s\+', ' ', 'g' \) \)/g,
      ),
    ).toHaveLength(2);

    expect(functionBody).toContain("if normalized_name = '' then");
    expect(functionBody.indexOf("if normalized_name = '' then")).toBeLessThan(
      functionBody.indexOf("delete from public.company_qualifications"),
    );
    expect(functionBody).toContain("if normalized_issuer = '' then");
    expect(functionBody).toContain("if normalized_identifier = '' then");
  });

  it("leaves the dedupe index and table constraints untouched by normalization parity", () => {
    expect(sql).toContain("lower(btrim(name))");
    expect(sql).toContain("coalesce(lower(btrim(issuer)), ''::text)");
    expect(sql).toContain(
      "coalesce(lower(btrim(credential_identifier)), ''::text)",
    );
    expect(sql).toContain("check ((char_length(btrim(name)) > 0))");
  });

  it("emits the audit event inside the replace function transaction", () => {
    const functionBody = replaceFunctionBody();

    const insertAudit = functionBody.indexOf("insert into public.audit_logs");
    const auditAction = functionBody.indexOf(
      "'company_qualifications_updated'",
    );
    const successReturn = functionBody.indexOf("'success', true");

    expect(insertAudit).toBeGreaterThan(-1);
    expect(auditAction).toBeGreaterThan(insertAudit);
    expect(insertAudit).toBeGreaterThan(
      functionBody.indexOf("insert into public.company_qualifications"),
    );
    expect(insertAudit).toBeLessThan(successReturn);

    const auditBlock = functionBody.slice(insertAudit, successReturn);
    expect(auditBlock).not.toContain("exception");
    expect(auditBlock).not.toContain("when others");
  });

  it("restricts RPC audit metadata to aggregate values only", () => {
    const functionBody = replaceFunctionBody();
    const auditBlock = functionBody.slice(
      functionBody.indexOf("insert into public.audit_logs"),
      functionBody.indexOf("'success', true"),
    );

    expect(auditBlock).toContain("'qualification_count', inserted_count");
    expect(auditBlock).toContain("'public_count', public_count");
    expect(auditBlock).toContain("'counts_by_type', counts_by_type");
    expect(auditBlock).toContain("'id', actor_user_id");
    expect(auditBlock).toContain("'workspace_role', actor_workspace_role");
    expect(auditBlock).toContain("'updated_at'");

    for (const forbidden of [
      "normalized_name",
      "normalized_issuer",
      "normalized_identifier",
      "normalized_issued_on",
      "normalized_expires_on",
      "'name'",
      "'issuer'",
      "'credential_identifier'",
      "'issued_on'",
      "'expires_on'",
      "membership_type",
    ]) {
      expect(
        auditBlock,
        `${forbidden} must not appear in audit metadata`,
      ).not.toContain(forbidden);
    }
  });

  it("builds collision-safe dedupe keys without delimiter concatenation", () => {
    const functionBody = replaceFunctionBody();

    expect(functionBody).toContain("dedupe_key := jsonb_build_array(");
    expect(functionBody).toContain("::text;");
    expect(functionBody).not.toContain("|| '|' ||");
  });

  it("uses a SECURITY DEFINER replace function with owner/admin write authority", () => {
    const functionBody = replaceFunctionBody();

    expect(sql).toContain(
      "create or replace function public.replace_company_qualifications(",
    );
    expect(functionBody).toContain("security definer");
    expect(functionBody).toContain("set search_path to 'public', 'pg_temp'");
    expect(functionBody).toContain("actor_user_id := auth.uid()");
    expect(functionBody).toContain(
      "actor_workspace_role not in ('owner', 'admin')",
    );
    expect(functionBody).toContain("delete from public.company_qualifications");
    expect(functionBody).toContain("insert into public.company_qualifications");
  });

  it("revokes public execution and grants authenticated only", () => {
    expect(normalized).toContain(
      "revoke all on function public.replace_company_qualifications(p_company_id uuid, p_qualifications jsonb) from public",
    );
    expect(normalized).toContain(
      "grant all on function public.replace_company_qualifications(p_company_id uuid, p_qualifications jsonb) to authenticated",
    );
    expect(normalized).not.toContain(
      "grant all on function public.replace_company_qualifications(p_company_id uuid, p_qualifications jsonb) to anon",
    );
  });
});
