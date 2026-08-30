import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260840000000_company_qualifications_contract.sql";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

function policyBlock(policyName: string) {
  const marker = `create policy ${policyName.toLowerCase()}`;
  const start = sql.toLowerCase().indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = sql.slice(start);
  const lowerRest = rest.toLowerCase();
  const candidates = [
    lowerRest.indexOf("\ncreate policy", marker.length),
    lowerRest.indexOf("\nrevoke ", marker.length),
    lowerRest.indexOf("\ncreate or replace view", marker.length),
    lowerRest.indexOf("\ncreate or replace function", marker.length),
    lowerRest.indexOf("\ncomment on", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

function replaceFunctionBody() {
  return sql.slice(
    sql.indexOf(
      "create or replace function public.replace_company_qualifications",
    ),
    sql.indexOf("comment on table public.company_qualifications"),
  );
}

describe("company qualifications data contract migration", () => {
  it("creates a normalized company_qualifications table with required fields", () => {
    expect(sql).toContain(
      "create table if not exists public.company_qualifications",
    );
    expect(sql).toContain(
      "company_id uuid not null references public.companies(id) on delete cascade",
    );
    expect(sql).toContain("qualification_type text not null");
    expect(sql).toContain("name text not null");
    expect(sql).toContain("issuer text");
    expect(sql).toContain("credential_identifier text");
    expect(sql).toContain("issued_on date");
    expect(sql).toContain("expires_on date");
    expect(sql).toContain("is_public boolean not null default false");
    expect(sql).toContain("sort_order integer not null default 0");
    expect(sql).toContain("created_at timestamptz not null default now()");
    expect(sql).toContain("updated_at timestamptz not null default now()");
  });

  it("accepts only license, certification, accreditation, and registration types", () => {
    expect(sql).toContain(
      "check (qualification_type in ('license', 'certification', 'accreditation', 'registration'))",
    );
    expect(normalized).not.toContain("'trade'");
    expect(normalized).not.toContain("'buyer'");
  });

  it("enforces trimmed non-empty names and enterprise length limits", () => {
    expect(sql).toContain("check (char_length(btrim(name)) > 0)");
    expect(sql).toContain("check (char_length(name) <= 160)");
    expect(sql).toContain(
      "check (issuer is null or char_length(issuer) <= 160)",
    );
    expect(sql).toContain(
      "check (credential_identifier is null or char_length(credential_identifier) <= 120)",
    );
    expect(sql).toContain("check (sort_order >= 0)");
    expect(sql).toContain(
      "check (expires_on is null or issued_on is null or expires_on >= issued_on)",
    );
  });

  it("prevents case-insensitive duplicates per company and qualification type", () => {
    expect(sql).toContain(
      "create unique index if not exists company_qualifications_company_type_dedupe_idx",
    );
    expect(sql).toContain("lower(btrim(name))");
    expect(sql).toContain("coalesce(lower(btrim(issuer)), '')");
    expect(sql).toContain(
      "coalesce(lower(btrim(credential_identifier)), '')",
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
      "revoke insert, update, delete on table public.company_qualifications from authenticated",
    );
    expect(normalized).toContain(
      "grant select on table public.company_qualifications to authenticated",
    );
    expect(normalized).not.toContain(
      "grant select on table public.company_qualifications to anon",
    );
  });

  it("allows active workspace members to read their company qualifications", () => {
    const policy = policyBlock("company_qualifications_select_active_member")
      .replace(/\s+/g, " ")
      .toLowerCase();

    expect(policy).toContain("for select");
    expect(policy).toContain("to authenticated");
    expect(policy).toContain("from public.organization_memberships as om");
    expect(policy).toContain("om.user_id = auth.uid()");
    expect(policy).toContain("om.membership_status = 'active'");
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
      sql.indexOf("comment on view public.company_qualifications_public"),
    );

    const selectList = viewBody
      .slice(viewBody.indexOf("select"), viewBody.indexOf("from public.company_qualifications"))
      .toLowerCase();

    expect(selectList).toContain("cq.id");
    expect(selectList).toContain("cq.company_id");
    expect(selectList).toContain("cq.qualification_type");
    expect(selectList).toContain("cq.name");
    expect(selectList).toContain("cq.issuer");
    expect(selectList).toContain("cq.issued_on");
    expect(selectList).toContain("cq.expires_on");
    expect(selectList).toContain("cq.sort_order");
    expect(selectList).not.toContain("credential_identifier");
    expect(selectList).not.toContain("is_public");
    expect(viewBody).toContain("from public.company_directory as cd");
    expect(viewBody).toContain("in ('approved', 'verified')");
    expect(normalized).toContain(
      "grant select on table public.company_qualifications_public to anon, authenticated",
    );
  });

  it("requires strict JSON string validation in the RPC", () => {
    const functionBody = sql.slice(
      sql.indexOf("create or replace function public.replace_company_qualifications"),
      sql.indexOf("comment on table public.company_qualifications"),
    );

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
    expect(functionBody).toContain("DUPLICATE_QUALIFICATION");
    expect(functionBody).toContain("Duplicate qualification detected");
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
    expect(functionBody.indexOf("INVALID_QUALIFICATION_NAME")).toBeLessThan(
      functionBody.indexOf("delete from public.company_qualifications"),
    );
  });

  it("rejects unsupported qualification item keys before any write", () => {
    const functionBody = replaceFunctionBody();

    expect(functionBody).toContain(
      "select jsonb_object_keys(qualification_item)",
    );
    expect(functionBody).toContain("qualification_field not in (");
    expect(functionBody).toContain("INVALID_QUALIFICATION_FIELD");
    expect(functionBody.indexOf("INVALID_QUALIFICATION_FIELD")).toBeLessThan(
      functionBody.indexOf("delete from public.company_qualifications"),
    );

    const allowedFieldBlock = functionBody.slice(
      functionBody.indexOf("qualification_field not in ("),
      functionBody.indexOf("INVALID_QUALIFICATION_FIELD"),
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
    expect(functionBody).toContain("Issued date must be a valid calendar date.");
    expect(functionBody).toContain("Expiry date must be a valid calendar date.");
    expect(functionBody).toContain("normalized_expires_on < normalized_issued_on");
  });

  it("resolves owner/admin authorization before any payload validation", () => {
    const functionBody = replaceFunctionBody();

    const authenticationGate = functionBody.indexOf("actor_user_id is null");
    const companyGuard = functionBody.indexOf("INVALID_COMPANY");
    const membershipLookup = functionBody.indexOf(
      "from public.organization_memberships as om",
    );
    const membershipGate = functionBody.indexOf(
      "if actor_workspace_role is null then",
    );
    const roleGate = functionBody.indexOf(
      "actor_workspace_role not in ('owner', 'admin')",
    );
    const payloadGate = functionBody.indexOf("INVALID_PAYLOAD");

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

    // FORBIDDEN must precede every form of payload feedback.
    expect(roleGate).toBeLessThan(payloadGate);

    for (const payloadMarker of [
      "INVALID_PAYLOAD",
      "INVALID_QUALIFICATION_TYPE",
      "INVALID_QUALIFICATION_GROUP",
      "INVALID_QUALIFICATION_ITEM",
      "INVALID_QUALIFICATION_FIELD",
      "INVALID_QUALIFICATION_NAME",
      "INVALID_QUALIFICATION_ISSUER",
      "INVALID_QUALIFICATION_IDENTIFIER",
      "INVALID_QUALIFICATION_DATE",
      "INVALID_QUALIFICATION_VISIBILITY",
      "QUALIFICATION_LIMIT_EXCEEDED",
      "DUPLICATE_QUALIFICATION",
    ]) {
      expect(
        functionBody.indexOf(payloadMarker),
        `${payloadMarker} must be gated behind authorization`,
      ).toBeGreaterThan(roleGate);
    }
  });

  it("collapses whitespace before trimming to match TypeScript normalization", () => {
    const functionBody = replaceFunctionBody();

    for (const field of [
      "name",
      "issuer",
      "credential_identifier",
    ]) {
      expect(
        functionBody,
        `${field} must not trim before collapsing`,
      ).not.toContain(`btrim(qualification_item ->> '${field}')`);
    }

    const collapsed = functionBody.replace(/\s+/g, " ");

    // Validation pass and insertion pass must both trim after collapsing.
    expect(
      collapsed.match(
        /normalized_name := btrim\( regexp_replace\(qualification_item ->> 'name', '\\s\+', ' ', 'g'\) \)/g,
      ),
    ).toHaveLength(2);
    expect(collapsed).toContain(
      "normalized_issuer := btrim( regexp_replace(qualification_item ->> 'issuer', '\\s+', ' ', 'g') )",
    );
    expect(collapsed).toContain(
      "normalized_issuer := nullif( btrim(regexp_replace(qualification_item ->> 'issuer', '\\s+', ' ', 'g')), '' )",
    );
    expect(
      collapsed.match(
        /btrim\( regexp_replace\( qualification_item ->> 'credential_identifier', '\\s\+', ' ', 'g' \) \)/g,
      ),
    ).toHaveLength(2);

    // Whitespace-only names still fail structurally before any write.
    expect(functionBody).toContain("if normalized_name = '' then");
    expect(functionBody.indexOf("if normalized_name = '' then")).toBeLessThan(
      functionBody.indexOf("delete from public.company_qualifications"),
    );

    // Blank optional fields still collapse to NULL.
    expect(functionBody).toContain("if normalized_issuer = '' then");
    expect(functionBody).toContain("if normalized_identifier = '' then");
  });

  it("leaves the dedupe index and table constraints untouched by normalization parity", () => {
    expect(sql).toContain("lower(btrim(name))");
    expect(sql).toContain("coalesce(lower(btrim(issuer)), '')");
    expect(sql).toContain("coalesce(lower(btrim(credential_identifier)), '')");
    expect(sql).toContain("check (char_length(btrim(name)) > 0)");
  });

  it("emits the audit event inside the replace function transaction", () => {
    const functionBody = replaceFunctionBody();

    const insertAudit = functionBody.indexOf(
      "insert into public.audit_logs",
    );
    const auditAction = functionBody.indexOf(
      "'COMPANY_QUALIFICATIONS_UPDATED'",
    );
    const successReturn = functionBody.indexOf("'success', true");

    expect(insertAudit).toBeGreaterThan(-1);
    expect(auditAction).toBeGreaterThan(insertAudit);
    expect(insertAudit).toBeGreaterThan(
      functionBody.indexOf("insert into public.company_qualifications"),
    );
    expect(insertAudit).toBeLessThan(successReturn);

    // No exception handler may swallow the audit failure.
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
    expect(sql).toContain(
      "create or replace function public.replace_company_qualifications(",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain("actor_user_id := auth.uid()");
    expect(sql).toContain("actor_workspace_role not in ('owner', 'admin')");
    expect(sql).toContain("delete from public.company_qualifications");
    expect(sql).toContain("insert into public.company_qualifications");
  });

  it("revokes anon execution and grants authenticated execute only", () => {
    expect(normalized).toContain(
      "revoke all on function public.replace_company_qualifications(uuid, jsonb) from public",
    );
    expect(normalized).toContain(
      "revoke all on function public.replace_company_qualifications(uuid, jsonb) from anon",
    );
    expect(normalized).toContain(
      "grant execute on function public.replace_company_qualifications(uuid, jsonb) to authenticated",
    );
    expect(normalized).not.toContain(
      "grant execute on function public.replace_company_qualifications(uuid, jsonb) to anon",
    );
  });
});
