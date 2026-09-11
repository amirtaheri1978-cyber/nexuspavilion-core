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
    rest.indexOf(" comment on ", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

function functionBody(functionName: string) {
  const marker = `create or replace function public.${functionName.toLowerCase()}`;
  const start = sql.indexOf(marker);
  expect(start, `missing function ${functionName}`).toBeGreaterThan(-1);
  const alterMarker = `alter function public.${functionName.toLowerCase()}`;
  const end = sql.indexOf(alterMarker, start);
  expect(end, `missing alter for ${functionName}`).toBeGreaterThan(start);
  return sql.slice(start, end);
}

describe("company capabilities data contract (FINAL ACTIVE: Baseline V2)", () => {
  it("creates a normalized company_capabilities table with required fields", () => {
    expect(sql).toContain("create table if not exists public.company_capabilities");
    expect(sql).toContain("company_id uuid not null");
    expect(sql).toContain(
      "company_capabilities_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade",
    );
    expect(sql).toContain("capability_type text not null");
    expect(sql).toContain("label text not null");
    expect(sql).toContain("sort_order integer default 0 not null");
    expect(sql).toContain(
      "created_at timestamp with time zone default now() not null",
    );
    expect(sql).toContain(
      "updated_at timestamp with time zone default now() not null",
    );
  });

  it("accepts only trade, service, product, and region capability types", () => {
    expect(sql).toContain(
      "capability_type = any (array['trade'::text, 'service'::text, 'product'::text, 'region'::text])",
    );
    const tableBlock = sql.slice(
      sql.indexOf("create table if not exists public.company_capabilities"),
      sql.indexOf("alter table public.company_capabilities owner"),
    );
    expect(tableBlock).not.toContain("'buyer'");
    expect(tableBlock).not.toContain("'supplier'");
  });

  it("enforces trimmed non-empty labels and enterprise length limits", () => {
    expect(sql).toContain("check ((char_length(btrim(label)) > 0))");
    expect(sql).toContain("check ((char_length(label) <= 120))");
    expect(sql).toContain("check ((sort_order >= 0))");
  });

  it("prevents case-insensitive duplicates per company and capability type", () => {
    expect(sql).toContain(
      "create unique index company_capabilities_company_type_label_unique_idx",
    );
    expect(sql).toContain("lower(btrim(label))");
  });

  it("enables RLS and revokes direct authenticated writes", () => {
    expect(sql).toContain(
      "alter table public.company_capabilities enable row level security",
    );
    expect(normalized).toContain(
      "grant select on table public.company_capabilities to authenticated",
    );
    expect(normalized).toContain(
      "grant select on table public.company_capabilities to anon",
    );
    expect(normalized).not.toContain(
      "grant insert on table public.company_capabilities to authenticated",
    );
    expect(normalized).not.toContain(
      "grant update on table public.company_capabilities to authenticated",
    );
    expect(normalized).not.toContain(
      "grant delete on table public.company_capabilities to authenticated",
    );
    expect(normalized).not.toContain(
      "grant all on table public.company_capabilities to authenticated",
    );
    expect(normalized).not.toContain(
      "grant insert on table public.company_capabilities to anon",
    );
    expect(normalized).not.toContain(
      "grant update on table public.company_capabilities to anon",
    );
    expect(normalized).not.toContain(
      "grant delete on table public.company_capabilities to anon",
    );
    expect(normalized).not.toContain(
      "grant all on table public.company_capabilities to anon",
    );
  });

  it("allows active and archived workspace members to read their company capabilities", () => {
    const policy = policyBlock("company_capabilities_select_active_member");

    expect(policy).toContain("for select");
    expect(policy).toContain("to authenticated");
    expect(policy).toContain("from public.organization_memberships om");
    expect(policy).toContain("om.user_id = auth.uid()");
    expect(policy).toContain(
      "om.membership_status = any (array['active'::text, 'archived'::text])",
    );
    expect(policy).toContain("om.company_id = company_capabilities.company_id");
  });

  it("allows public read only through company_directory visibility", () => {
    const policy = policyBlock("company_capabilities_select_public_company");

    expect(policy).toContain("for select");
    expect(policy).toContain("to authenticated, anon");
    expect(policy).toContain("from public.company_directory cd");
    expect(policy).toContain("cd.id = company_capabilities.company_id");
    expect(policy).toContain("array['approved'::text, 'verified'::text]");
    expect(policy).not.toContain("from public.companies");
  });

  it("requires capability label array elements to be JSON strings in the RPC", () => {
    const body = functionBody("replace_company_capabilities");

    expect(body).toContain("jsonb_typeof(capability_element) <> 'string'");
    expect(body).toContain("from jsonb_array_elements(capability_labels)");
    expect(body).not.toContain("jsonb_array_elements_text");
  });

  it("uses a SECURITY DEFINER replace function with owner/admin write authority", () => {
    const body = functionBody("replace_company_capabilities");

    expect(sql).toContain(
      "create or replace function public.replace_company_capabilities(",
    );
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path to 'public', 'pg_temp'");
    expect(body).toContain("actor_user_id := auth.uid()");
    expect(body).toContain("actor_workspace_role not in ('owner', 'admin')");
    expect(body).toContain("delete from public.company_capabilities");
    expect(body).toContain("insert into public.company_capabilities");
  });

  it("revokes public execution and grants authenticated only", () => {
    expect(normalized).toContain(
      "revoke all on function public.replace_company_capabilities(p_company_id uuid, p_capabilities jsonb) from public",
    );
    expect(normalized).toContain(
      "grant all on function public.replace_company_capabilities(p_company_id uuid, p_capabilities jsonb) to authenticated",
    );
    expect(normalized).not.toContain(
      "grant all on function public.replace_company_capabilities(p_company_id uuid, p_capabilities jsonb) to anon",
    );
    expect(normalized).not.toContain(
      "grant execute on function public.replace_company_capabilities(p_company_id uuid, p_capabilities jsonb) to anon",
    );
  });
});
