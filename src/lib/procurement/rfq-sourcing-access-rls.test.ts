import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const originalMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/legacy-migrations/pre-baseline/20260816_create_procurement_domain_schema.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const fixMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/legacy-migrations/pre-baseline/20260819_restrict_rfq_sourcing_access_rls.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const normalizedFix = fixMigration.replace(/\s+/g, " ").trim().toLowerCase();
const normalizedOriginal = originalMigration
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

function policyBlock(sql: string, policyName: string) {
  const lowerSql = sql.toLowerCase();
  const marker = `create policy "${policyName.toLowerCase()}"`;
  const start = lowerSql.indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = sql.slice(start);
  const lowerRest = rest.toLowerCase();
  const candidates = [
    lowerRest.indexOf("\ndrop policy", marker.length),
    lowerRest.indexOf("\ncreate policy", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

function helperFunctionSql(sql: string) {
  const start = sql
    .toLowerCase()
    .indexOf(
      "create or replace function public.current_user_has_supplier_rfq_access(p_rfq_id uuid)",
    );
  expect(start).toBeGreaterThan(-1);
  const dropAt = sql.toLowerCase().indexOf("drop policy if exists", start);
  expect(dropAt).toBeGreaterThan(start);
  return sql.slice(start, dropAt);
}

describe("F16-01 RFQ sourcing access RLS", () => {
  it("does not rewrite the original procurement schema migration", () => {
    expect(originalMigration).toContain(
      'create policy "Authenticated users can read permitted RFQs"',
    );
    expect(originalMigration).toContain(
      'create policy "Supplier members can submit company quotes"',
    );
    expect(normalizedOriginal).not.toContain(
      "current_user_has_supplier_rfq_access",
    );
    expect(normalizedOriginal).not.toContain("rfqs.sourcing_method = 'open'");
  });

  it("adds a boolean-only security definer helper with a fixed search_path", () => {
    const helper = helperFunctionSql(fixMigration).replace(/\s+/g, " ").toLowerCase();

    expect(helper).toContain("returns boolean");
    expect(helper).toContain("security definer");
    expect(helper).toContain("set search_path = ''");
    expect(helper).toContain("stable");
    expect(helper).not.toContain("returns table");
    expect(helper).not.toContain("token");
    expect(helper).toContain("from public.rfq_invites i");
    expect(helper).toContain("i.status in ('sent', 'invited')");
    expect(helper).toContain("i.email = v_email");
    expect(helper).toContain("auth.jwt() ->> 'email'");
    expect(helper).toContain("lower(btrim(p.email))");
    expect(helper).toContain("from public.quotes q");
    expect(helper).toContain("join public.organization_memberships om");
    expect(helper).toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(helper).not.toContain("company_members");
    expect(normalizedFix).toContain(
      "revoke all on function public.current_user_has_supplier_rfq_access(uuid) from public",
    );
    expect(normalizedFix).toContain(
      "revoke all on function public.current_user_has_supplier_rfq_access(uuid) from anon",
    );
    expect(normalizedFix).toContain(
      "grant execute on function public.current_user_has_supplier_rfq_access(uuid) to authenticated",
    );
    expect(normalizedFix).not.toContain(
      "grant execute on function public.current_user_has_supplier_rfq_access(uuid) to anon",
    );
    expect(normalizedFix).not.toContain(
      "grant all on function public.current_user_has_supplier_rfq_access",
    );
    expect(normalizedFix).not.toContain("service_role");
  });

  describe("RFQ SELECT", () => {
    const policy = policyBlock(
      fixMigration,
      "Authenticated users can read permitted RFQs",
    );
    const normalizedPolicy = policy.replace(/\s+/g, " ").toLowerCase();

    it("keeps buyer company authorized access", () => {
      expect(normalizedPolicy).toContain("for select");
      expect(normalizedPolicy).toContain("to authenticated");
      expect(normalizedPolicy).toContain("from public.organization_memberships om");
      expect(normalizedPolicy).toContain("om.company_id = rfqs.company_id");
      expect(normalizedPolicy).toContain("om.user_id = auth.uid()");
      expect(normalizedPolicy).toContain("om.membership_status = 'active'");
    });

    it("authorizes supplier/consultant access for open/public sourcing", () => {
      expect(normalizedPolicy).toContain("rfqs.status = 'open'");
      expect(normalizedPolicy).toContain(
        "om.procurement_function in ('supplier', 'consultant')",
      );
      expect(normalizedPolicy).toContain("rfqs.sourcing_method = 'open'");
      expect(normalizedPolicy).toContain(
        "public.current_user_has_supplier_rfq_access(rfqs.id)",
      );
    });

    it("denies unrelated suppliers for invited sourcing", () => {
      expect(normalizedPolicy).toContain(
        "rfqs.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(rfqs.id)",
      );
      const helper = helperFunctionSql(fixMigration)
        .replace(/\s+/g, " ")
        .toLowerCase();
      expect(helper).not.toContain("sourcing_method = 'invited'");
      expect(helper).toContain("return false");
      expect(helper).not.toContain("rfqs.status = 'open'");
    });

    it("denies unrelated suppliers for sealed_bid sourcing", () => {
      expect(normalizedPolicy).toContain("rfqs.sourcing_method = 'open'");
      const helper = helperFunctionSql(fixMigration)
        .replace(/\s+/g, " ")
        .toLowerCase();
      expect(helper).not.toContain("sourcing_method = 'sealed_bid'");
      expect(helper).not.toContain("sourcing_method = 'open'");
    });

    it("allows an explicitly invited restricted supplier via the existing invite email model", () => {
      const helper = helperFunctionSql(fixMigration)
        .replace(/\s+/g, " ")
        .toLowerCase();
      expect(helper).toContain("from public.rfq_invites i");
      expect(helper).toContain("i.rfq_id = p_rfq_id");
      expect(helper).toContain("i.email = v_email");
      expect(helper).toContain("i.status in ('sent', 'invited')");
      expect(helper).toContain("from public.quotes q");
      expect(helper).toContain("om.company_id = q.company_id");
    });
  });

  describe("quote INSERT", () => {
    const policy = policyBlock(
      fixMigration,
      "Supplier members can submit company quotes",
    );
    const normalizedPolicy = policy.replace(/\s+/g, " ").toLowerCase();

    it("lets an eligible supplier quote open/public sourcing", () => {
      expect(normalizedPolicy).toContain("for insert");
      expect(normalizedPolicy).toContain("user_id = auth.uid()");
      expect(normalizedPolicy).toContain("om.procurement_function = 'supplier'");
      expect(normalizedPolicy).toContain("r.status = 'open'");
      expect(normalizedPolicy).toContain("r.sourcing_method = 'open'");
      expect(normalizedPolicy).toContain(
        "public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
      );
    });

    it("blocks unrelated suppliers from quoting invited sourcing", () => {
      expect(normalizedPolicy).toContain(
        "r.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
      );
    });

    it("blocks unrelated suppliers from quoting sealed_bid sourcing", () => {
      const helper = helperFunctionSql(fixMigration)
        .replace(/\s+/g, " ")
        .toLowerCase();
      expect(helper).not.toContain("sourcing_method = 'sealed_bid'");
      expect(normalizedPolicy).toContain("r.sourcing_method = 'open'");
      expect(normalizedPolicy).not.toContain("r.sourcing_method in");
    });

    it("allows an explicitly authorized restricted supplier to quote", () => {
      const helper = helperFunctionSql(fixMigration)
        .replace(/\s+/g, " ")
        .toLowerCase();
      expect(helper).toContain("from public.rfq_invites i");
      expect(helper).toContain("i.status in ('sent', 'invited')");
      expect(helper).toContain("from public.quotes q");
    });

    it("preserves the no-self-quote rule", () => {
      expect(normalizedPolicy).toContain("r.company_id <> quotes.company_id");
    });

    it("rejects quotes against non-open RFQs", () => {
      expect(normalizedPolicy).toContain("r.status = 'open'");
      expect(normalizedPolicy).not.toContain("r.status in");
    });
  });

  it("does not widen table grants or invitation-token exposure", () => {
    expect(normalizedFix).not.toContain("grant select on public.rfq_invites");
    expect(normalizedFix).not.toContain("grant all on public.rfqs");
    expect(normalizedFix).not.toContain("grant all on public.quotes");
    expect(normalizedFix).not.toContain("to anon");
    expect(fixMigration.toLowerCase()).not.toMatch(
      /create policy[\s\S]*on public\.rfq_invites/,
    );
    expect(helperFunctionSql(fixMigration).toLowerCase()).not.toContain(
      "token",
    );
  });
});
