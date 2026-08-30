import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260839000000_company_capabilities_contract.sql";

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
    lowerRest.indexOf("\ncreate or replace function", marker.length),
    lowerRest.indexOf("\ncomment on", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

describe("company capabilities data contract migration", () => {
  it("creates a normalized company_capabilities table with required fields", () => {
    expect(sql).toContain("create table if not exists public.company_capabilities");
    expect(sql).toContain("company_id uuid not null references public.companies(id) on delete cascade");
    expect(sql).toContain("capability_type text not null");
    expect(sql).toContain("label text not null");
    expect(sql).toContain("sort_order integer not null default 0");
    expect(sql).toContain("created_at timestamptz not null default now()");
    expect(sql).toContain("updated_at timestamptz not null default now()");
  });

  it("accepts only trade, service, product, and region capability types", () => {
    expect(sql).toContain(
      "check (capability_type in ('trade', 'service', 'product', 'region'))",
    );
    expect(normalized).not.toContain("'buyer'");
    expect(normalized).not.toContain("'supplier'");
  });

  it("enforces trimmed non-empty labels and enterprise length limits", () => {
    expect(sql).toContain("check (char_length(btrim(label)) > 0)");
    expect(sql).toContain("check (char_length(label) <= 120)");
    expect(sql).toContain("check (sort_order >= 0)");
  });

  it("prevents case-insensitive duplicates per company and capability type", () => {
    expect(sql).toContain(
      "create unique index if not exists company_capabilities_company_type_label_unique_idx",
    );
    expect(sql).toContain("lower(btrim(label))");
  });

  it("enables RLS and revokes direct authenticated writes", () => {
    expect(sql).toContain("alter table public.company_capabilities enable row level security");
    expect(normalized).toContain(
      "revoke insert, update, delete on table public.company_capabilities from authenticated",
    );
    expect(normalized).toContain(
      "grant select on table public.company_capabilities to anon, authenticated",
    );
  });

  it("allows active workspace members to read their company capabilities", () => {
    const policy = policyBlock("company_capabilities_select_active_member")
      .replace(/\s+/g, " ")
      .toLowerCase();

    expect(policy).toContain("for select");
    expect(policy).toContain("to authenticated");
    expect(policy).toContain("from public.organization_memberships as om");
    expect(policy).toContain("om.user_id = auth.uid()");
    expect(policy).toContain("om.membership_status = 'active'");
    expect(policy).toContain("om.company_id = company_capabilities.company_id");
  });

  it("allows public read only through company_directory visibility", () => {
    const policy = policyBlock("company_capabilities_select_public_company")
      .replace(/\s+/g, " ")
      .toLowerCase();

    expect(policy).toContain("for select");
    expect(policy).toContain("to anon, authenticated");
    expect(policy).toContain("from public.company_directory as cd");
    expect(policy).toContain("cd.id = company_capabilities.company_id");
    expect(policy).toContain("in ('approved', 'verified')");
    expect(policy).not.toContain("from public.companies");
    expect(normalized).not.toContain("grant select on table public.companies to anon");
  });

  it("requires capability label array elements to be JSON strings in the RPC", () => {
    const functionBody = sql.slice(
      sql.indexOf("create or replace function public.replace_company_capabilities"),
      sql.indexOf("comment on table public.company_capabilities"),
    );

    expect(functionBody).toContain("jsonb_typeof(capability_element) <> 'string'");
    expect(functionBody).toContain("from jsonb_array_elements(capability_labels)");
    expect(functionBody).not.toContain("jsonb_array_elements_text");
  });

  it("uses a SECURITY DEFINER replace function with owner/admin write authority", () => {
    expect(sql).toContain(
      "create or replace function public.replace_company_capabilities(",
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain("actor_user_id := auth.uid()");
    expect(sql).toContain("actor_workspace_role not in ('owner', 'admin')");
    expect(sql).toContain("delete from public.company_capabilities");
    expect(sql).toContain("insert into public.company_capabilities");
  });

  it("revokes anon execution and grants authenticated execute only", () => {
    expect(normalized).toContain(
      "revoke all on function public.replace_company_capabilities(uuid, jsonb) from public",
    );
    expect(normalized).toContain(
      "revoke all on function public.replace_company_capabilities(uuid, jsonb) from anon",
    );
    expect(normalized).toContain(
      "grant execute on function public.replace_company_capabilities(uuid, jsonb) to authenticated",
    );
    expect(normalized).not.toContain(
      "grant execute on function public.replace_company_capabilities(uuid, jsonb) to anon",
    );
  });
});
