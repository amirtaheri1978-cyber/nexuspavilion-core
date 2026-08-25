import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const migrationPath =
  "supabase/migrations/20260832000000_bootstrap_vendor_supplier_founder_capability.sql";
const historicalBootstrapPath =
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql";
const createRoutePath = "src/app/api/companies/create/route.ts";
const createCompanyPagePath = "src/app/create-company/page.tsx";
const quotesRoutePath = "src/app/api/quotes/route.ts";
const quotesAuthPath = "src/lib/procurement/procurement-write-authorization.ts";
const acceptRoutePath = "src/app/api/company-invitations/accept/route.ts";
const submitPagePath = "src/app/rfq/[slug]/submit/page.tsx";
const inviteSignupPath = "src/app/invite/[token]/signup/page.tsx";
const sourcingRlsPath =
  "supabase/legacy-migrations/pre-baseline/20260819_restrict_rfq_sourcing_access_rls.sql";
const baselinePath = "supabase/migrations/20260822000000_dev_public_baseline.sql";

const sql = readSource(migrationPath);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const historicalBootstrap = readSource(historicalBootstrapPath);
const createRoute = readSource(createRoutePath);
const createCompanyPage = readSource(createCompanyPagePath);
const quotesRoute = readSource(quotesRoutePath);
const quotesAuth = readSource(quotesAuthPath);
const acceptRoute = readSource(acceptRoutePath);
const submitPage = readSource(submitPagePath);
const inviteSignup = readSource(inviteSignupPath);
const sourcingRls = readSource(sourcingRlsPath);
const baseline = readSource(baselinePath);

const bootstrapBody = sql.slice(
  sql.indexOf(
    "create or replace function public.bootstrap_owned_company_workspace(",
  ),
  sql.indexOf(
    "comment on function public.bootstrap_owned_company_workspace(uuid, text, text, text)",
  ),
);

const membershipInsert = bootstrapBody.slice(
  bootstrapBody.indexOf("insert into public.organization_memberships"),
);

const conflictUpdate = membershipInsert.slice(
  membershipInsert.indexOf("on conflict (user_id, company_id)"),
);

const rpcCall = createRoute.slice(
  createRoute.indexOf('"bootstrap_owned_company_workspace"'),
  createRoute.indexOf("const bootstrapPayload"),
);

const historicalAccept = historicalBootstrap.slice(
  historicalBootstrap.indexOf(
    "create or replace function public.accept_organization_invitation(",
  ),
  historicalBootstrap.indexOf(
    "comment on function public.accept_organization_invitation(text, text)",
  ),
);

describe("Task 32C vendor_supplier founder capability migration", () => {
  it("drops prior bootstrap overloads and recreates a 4-arg function with defaults", () => {
    expect(sql).toContain(
      "drop function if exists public.bootstrap_owned_company_workspace(uuid, text);",
    );
    expect(sql).toContain(
      "drop function if exists public.bootstrap_owned_company_workspace(uuid, text, text);",
    );
    expect(sql).toContain(
      "drop function if exists public.bootstrap_owned_company_workspace(uuid, text, text, text);",
    );
    expect(bootstrapBody).toContain("p_company_id uuid");
    expect(bootstrapBody).toContain("p_profile_role text");
    expect(bootstrapBody).toContain("p_job_title text default null");
    expect(bootstrapBody).toContain("p_account_type text default null");
    expect(bootstrapBody).not.toContain("p_user_id");
    expect(bootstrapBody).not.toContain("p_procurement_function");
    expect(sql).not.toMatch(
      /create or replace function public\.bootstrap_owned_company_workspace\(\s*p_company_id uuid,\s*p_profile_role text,\s*p_job_title text default null\s*\)/,
    );
  });

  it("preserves SECURITY DEFINER, empty search_path, owner, and execute grants", () => {
    expect(bootstrapBody).toContain("security definer");
    expect(bootstrapBody).toContain("set search_path = ''");
    expect(bootstrapBody).toContain("actor_user_id uuid := auth.uid();");
    expect(sql).toContain(
      "alter function public.bootstrap_owned_company_workspace(uuid, text, text, text)\n  owner to postgres;",
    );
    expect(sql).toContain(
      "revoke all\non function public.bootstrap_owned_company_workspace(uuid, text, text, text)\nfrom public;",
    );
    expect(sql).toContain(
      "revoke all\non function public.bootstrap_owned_company_workspace(uuid, text, text, text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.bootstrap_owned_company_workspace(uuid, text, text, text)\nto authenticated, service_role;",
    );
    expect(sql).not.toMatch(
      /grant execute[\s\S]*bootstrap_owned_company_workspace[\s\S]*to anon/i,
    );
  });

  it("keeps ownership, anonymity, and foreign-company rejection unchanged", () => {
    expect(bootstrapBody).toContain("'error_code', 'AUTHENTICATION_REQUIRED'");
    expect(bootstrapBody).toContain("if actor_user_id is null then");
    expect(bootstrapBody).toContain("c.id = p_company_id");
    expect(bootstrapBody).toContain("c.user_id = actor_user_id");
    expect(bootstrapBody).toContain("'error_code', 'COMPANY_NOT_OWNED'");
    expect(bootstrapBody).toContain("'error_code', 'ALREADY_CONNECTED'");
    expect(bootstrapBody).not.toContain("user_id = p_");
    expect(membershipInsert).toContain("actor_user_id,\n    owned_company_id");
  });

  it("maps bounded account types to founder procurement_function on INSERT only", () => {
    expect(bootstrapBody).toContain(
      "normalized_account_type := nullif(btrim(coalesce(p_account_type, '')), '');",
    );
    expect(bootstrapBody).toContain(
      "if normalized_account_type is null then\n    derived_procurement_function := 'none';",
    );
    expect(bootstrapBody).toContain(
      "elsif normalized_account_type = 'vendor_supplier' then\n    derived_procurement_function := 'supplier';",
    );
    expect(bootstrapBody).toContain(
      "normalized_account_type = 'buyer_owner'",
    );
    expect(bootstrapBody).toContain("normalized_account_type = 'consultant'");
    expect(bootstrapBody).toContain(
      "normalized_account_type = 'service_provider'",
    );
    expect(bootstrapBody).toContain("derived_procurement_function := 'none';");
    expect(membershipInsert).toContain("derived_procurement_function");
    expect(bootstrapBody).not.toContain("p_procurement_function");
  });

  it("rejects unknown non-null account types", () => {
    expect(bootstrapBody).toContain("'error_code', 'INVALID_ACCOUNT_TYPE'");
    expect(bootstrapBody).toContain(
      "The organization type is not supported.",
    );
  });

  it("does not overwrite procurement_function on conflict or recovery", () => {
    expect(conflictUpdate).toContain("workspace_role = 'owner'");
    expect(conflictUpdate).toContain("membership_type = 'founder'");
    expect(conflictUpdate).toContain("membership_status = 'active'");
    expect(conflictUpdate).toContain(
      "job_title = coalesce(\n      excluded.job_title,\n      existing_membership.job_title\n    )",
    );
    expect(conflictUpdate).not.toMatch(/procurement_function\s*=/);
    expect(historicalBootstrap).toContain("procurement_function = 'none'");
  });

  it("does not backfill existing memberships or rewrite RLS/invitation SQL", () => {
    expect(normalized).not.toContain(
      "update public.organization_memberships",
    );
    expect(sql).not.toContain("accept_organization_invitation");
    expect(sql).not.toContain("current_user_has_supplier_rfq_access");
    expect(sql).not.toContain("create policy");
    expect(sql).not.toContain("drop policy");
    expect(sql).not.toContain("canSubmitCompanyQuote");
  });
});

describe("Task 32C create-company route mapping", () => {
  it("passes validated accountType and never a caller-selected procurement_function", () => {
    expect(createRoute).toContain("p_account_type: createdNewCompany ? rawAccountType : null");
    expect(rpcCall).toContain("p_company_id: company.id");
    expect(rpcCall).toContain("p_profile_role: accountConfig.profileRole");
    expect(rpcCall).toContain("p_job_title: jobTitle || null");
    expect(rpcCall).not.toContain("p_procurement_function");
    expect(rpcCall).not.toContain("p_user_id");
    expect(createRoute).not.toContain("body.procurement_function");
    expect(createRoute).not.toContain("procurement_function:");
    const accountTypeGuardIndex = createRoute.indexOf(
      "if (!isAccountType(rawAccountType))",
    );
    const bootstrapIndex = createRoute.indexOf(
      '"bootstrap_owned_company_workspace"',
    );
    expect(accountTypeGuardIndex).toBeGreaterThan(-1);
    expect(bootstrapIndex).toBeGreaterThan(accountTypeGuardIndex);
  });

  it("does not grant buyer capability or membership on another company", () => {
    expect(bootstrapBody).not.toContain("derived_procurement_function := 'buyer'");
    expect(membershipInsert).not.toContain("'buyer'");
    expect(createRoute).not.toContain('.from("organization_memberships")');
    expect(rpcCall).toContain("p_company_id: company.id");
    expect(rpcCall.split("p_company_id").length).toBe(2);
  });

  it("keeps create-company Supplier mapped to vendor_supplier without changing defaults", () => {
    expect(createCompanyPage).toContain('accountType: "vendor_supplier"');
    expect(createCompanyPage).toContain(
      'useState<OrganizationType>("owner_developer")',
    );
    expect(createCompanyPage).toContain('accountType: "buyer_owner"');
    expect(createCompanyPage).toContain('accountType: "consultant"');
    expect(createCompanyPage).toContain('accountType: "service_provider"');
  });
});

describe("Task 32C authorization invariants remain unchanged", () => {
  it("keeps workspace invitation vendor→supplier server-derived", () => {
    expect(historicalAccept).toContain("when 'vendor' then");
    expect(historicalAccept).toContain("next_procurement_function := 'supplier'");
    expect(historicalAccept).not.toContain("p_procurement_function");
    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).not.toContain("p_procurement_function");
    expect(acceptRoute).not.toContain("p_account_type");
  });

  it("keeps anonymous quote submission unauthorized", () => {
    expect(quotesRoute).toContain("supabase.auth.getUser()");
    expect(quotesRoute).toContain("if (userError || !user)");
    expect(quotesRoute).toContain(
      'return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
    );
  });

  it("keeps restricted RFQ access on invited authenticated email", () => {
    expect(sourcingRls).toContain("from public.rfq_invites i");
    expect(sourcingRls).toContain("i.email = v_email");
    expect(sourcingRls).toContain("i.status in ('sent', 'invited')");
    expect(baseline).toContain("current_user_has_supplier_rfq_access");
    expect(quotesRoute).toContain("canSubmitCompanyQuote");
    expect(quotesAuth).toContain(
      'membership.procurementFunction === "supplier"',
    );
  });

  it("keeps cross-company and own-RFQ quote submission denied", () => {
    expect(quotesRoute).toContain("rfq.company_id === profile.company_id");
    expect(quotesRoute).toContain(
      "Your company cannot submit a quote to its own RFQ.",
    );
    expect(sourcingRls.toLowerCase()).toContain(
      "r.company_id <> quotes.company_id",
    );
  });

  it("preserves Task 32A login continuation and Task 32B onboarding continuation", () => {
    expect(submitPage).toContain(
      "redirect(`/login?next=${encodeURIComponent(submitPath)}`)",
    );
    expect(createRoute).toContain("getPostCompanyCreatePath");
    expect(inviteSignup).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(inviteSignup).not.toContain("getCompanyOnboardingPath");
  });
});
