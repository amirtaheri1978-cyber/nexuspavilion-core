import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const signupPage = readSource("src/app/signup/page.tsx");
const loginPage = readSource("src/app/login/page.tsx");
const callbackRoute = readSource("src/app/auth/callback/route.ts");
const createCompanyPage = readSource("src/app/create-company/page.tsx");
const createRoute = readSource("src/app/api/companies/create/route.ts");
const inviteSignupPage = readSource("src/app/invite/[token]/signup/page.tsx");
const inviteLanding = readSource("src/app/invite/[token]/page.tsx");
const acceptRoute = readSource("src/app/api/company-invitations/accept/route.ts");
const nameHelper = readSource("src/lib/auth/professional-names.ts");
const workspaceBootstrap = readSource("src/lib/auth/workspace-bootstrap.ts");
const identityMigration = readSource(
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql",
);
const visualQaFixture = readSource(
  "src/app/dev/founder-onboarding-visual-qa/page.tsx",
);

function countHeading(source: string, tag: "h1" | "h2") {
  return source.match(new RegExp(`<${tag}[\\s>]`, "g"))?.length ?? 0;
}

describe("NP-MASTER-22-B04-2 signup field collection", () => {
  it("renders first name and last name with accessible labels", () => {
    expect(signupPage).toContain("First name");
    expect(signupPage).toContain("Last name");
    expect(signupPage).toContain('htmlFor={firstNameId}');
    expect(signupPage).toContain('htmlFor={lastNameId}');
    expect(signupPage).toContain("aria-invalid={Boolean(firstNameError)}");
    expect(signupPage).toContain("aria-describedby={");
    expect(signupPage).toContain("autoComplete=\"given-name\"");
    expect(signupPage).toContain("autoComplete=\"family-name\"");
  });

  it("does not collect job title on signup", () => {
    expect(signupPage).not.toContain("Job title");
    expect(signupPage).not.toContain("jobTitle");
    expect(signupPage).not.toContain("job_title");
    expect(signupPage).not.toContain("Your title in this workspace");
  });

  it("validates names to 80 characters and trims input", () => {
    expect(signupPage).toContain("PROFESSIONAL_NAME_MAX_LENGTH");
    expect(signupPage).toContain("maxLength={PROFESSIONAL_NAME_MAX_LENGTH}");
    expect(signupPage).toContain("normalizeProfessionalName(firstName)");
    expect(signupPage).toContain("validateProfessionalName(");
  });

  it("sends first_name and last_name as transit-only signup metadata", () => {
    expect(signupPage).toContain("supabase.auth.signUp({");
    expect(signupPage).toContain("first_name: submittedFirstName");
    expect(signupPage).toContain("last_name: submittedLastName");
    expect(signupPage).toContain("data: {");
    expect(signupPage).not.toContain("profiles.job_title");
    expect(signupPage).not.toContain("display_name");
    expect(signupPage).not.toContain("full_name");
  });

  it("keeps confirmation emailRedirectTo on /auth/callback?next=/create-company", () => {
    expect(signupPage).toContain('"/auth/callback"');
    expect(signupPage).toContain(
      'confirmationRedirect.searchParams.set("next", "/create-company")',
    );
    expect(signupPage).toContain(
      "emailRedirectTo: confirmationRedirect.toString()",
    );
    expect(signupPage).not.toContain(
      "emailRedirectTo: `${window.location.origin}/create-company`",
    );
  });

  it("uses frozen B01 language without a hover-scale CTA and with one h1", () => {
    expect(countHeading(signupPage, "h1")).toBe(1);
    expect(signupPage).toContain("EXECUTIVE_PAGE_CLASS");
    expect(signupPage).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(signupPage).not.toContain("hover:scale");
    expect(signupPage).not.toContain("text-orange-");
    expect(signupPage).not.toContain("bg-orange-");
    expect(signupPage).toContain("focus-visible:ring");
  });
});

describe("NP-MASTER-22-B04-2 profile name sync", () => {
  it("writes only the current user's first_name and last_name", () => {
    expect(nameHelper).toContain("export async function syncCurrentUserProfessionalNames");
    expect(nameHelper).toContain('.from("profiles")');
    expect(nameHelper).toContain(".update(payload)");
    expect(nameHelper).toContain("eq(\"id\", user.id)");
    expect(nameHelper).toContain("first_name?: string");
    expect(nameHelper).toContain("last_name?: string");
    expect(nameHelper).not.toContain("service_role");
    expect(nameHelper).not.toContain("createAdminClient");
  });

  it("never puts company_id or role in the name-sync payload", () => {
    expect(nameHelper).toContain("buildOwnProfessionalNameWritePayload");
    expect(nameHelper).not.toMatch(
      /update\([\s\S]*(company_id|role:)/,
    );
    expect(nameHelper).not.toContain("company_id:");
    expect(nameHelper).not.toContain('role: "buyer"');
    expect(nameHelper).not.toContain("p_user_id");
  });

  it("uses metadata only as a fallback for missing profile names", () => {
    expect(nameHelper).toContain("readTransitNamesFromMetadata");
    expect(nameHelper).toContain("resolveProfessionalNameField");
    expect(nameHelper).toContain("if (storedNormalized)");
    expect(loginPage).toContain("syncCurrentUserProfessionalNames(supabase, {");
    expect(loginPage).toContain("requireNames: false");
    expect(callbackRoute).toContain("requireNames: false");
  });
});

describe("NP-MASTER-22-B04-2 login and callback continuity", () => {
  it("lets legacy null-name users sign in without a name blocker", () => {
    expect(loginPage).toContain("signInWithPassword");
    expect(loginPage).toContain("router.push(nextPath)");
    expect(loginPage).not.toContain("First name is required.");
    expect(loginPage).not.toContain('htmlFor={firstNameId}');
    expect(loginPage).not.toContain("requireNames: true");
    expect(loginPage).not.toContain('router.push("/create-company")');
  });

  it("does not redirect confirmed users away from normal login because names are null", () => {
    expect(callbackRoute).toContain("exchangeCodeForSession(code)");
    expect(callbackRoute).toContain("getSafeNextPath(");
    expect(callbackRoute).toContain(
      "NextResponse.redirect(new URL(next, SITE_URL))",
    );
    expect(callbackRoute).not.toContain('"/create-company"');
    expect(callbackRoute).toContain("requireNames: false");
  });

  it("keeps generic unauthorized and session copy unchanged", () => {
    expect(createRoute).toContain('{ error: "Unauthorized." }');
    expect(workspaceBootstrap).toContain(
      "Please sign in to continue creating your workspace.",
    );
    expect(workspaceBootstrap).toContain(
      "Do not create another company",
    );
    expect(callbackRoute).toContain(
      "This secure authentication link is incomplete. Please request a new link or sign in again.",
    );
    expect(callbackRoute).toContain(
      "This secure authentication link has expired or is no longer valid. Please request a new link.",
    );
  });
});

describe("NP-MASTER-22-B04-2 create-company founder identity", () => {
  it("preloads canonical or transit names into the founder review step", () => {
    expect(createCompanyPage).toContain("loadCurrentUserProfessionalNames");
    expect(createCompanyPage).toContain("setFirstName");
    expect(createCompanyPage).toContain("setLastName");
    expect(createCompanyPage).toContain("Founder Professional Identity");
    expect(createCompanyPage).toContain("First name");
    expect(createCompanyPage).toContain("Last name");
  });

  it("collects a required workspace job title of at most 120 characters", () => {
    expect(createCompanyPage).toContain("Job title");
    expect(createCompanyPage).toContain("Your title in this workspace");
    expect(createCompanyPage).toContain("JOB_TITLE_MAX_LENGTH");
    expect(createCompanyPage).toContain("maxLength={JOB_TITLE_MAX_LENGTH}");
    expect(createCompanyPage).toContain("validateFounderJobTitle");
    expect(createCompanyPage).toContain("jobTitle: submittedJobTitle");
  });

  it("keeps the company wizard structure and frozen B01 language", () => {
    expect(createCompanyPage).toContain('useState<WizardStep>("identity")');
    expect(createCompanyPage).toContain("Company Identity");
    expect(createCompanyPage).toContain("Organization Type");
    expect(createCompanyPage).toContain("Review & Activate");
    expect(countHeading(createCompanyPage, "h1")).toBe(1);
    expect(createCompanyPage).toContain("EXECUTIVE_PAGE_CLASS");
    expect(createCompanyPage).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(createCompanyPage).not.toContain("hover:scale");
    expect(createCompanyPage).not.toContain("text-orange-");
  });

  it("exposes a production-guarded visual QA fixture without mutating Dev", () => {
    expect(visualQaFixture).toContain('process.env.NODE_ENV === "production"');
    expect(visualQaFixture).toContain("notFound()");
    expect(visualQaFixture).toContain("CreateCompanyPage");
    expect(visualQaFixture).not.toContain("service_role");
  });
});

describe("NP-MASTER-22-B04-2 create API and bootstrap call", () => {
  it("passes only p_job_title into bootstrap_owned_company_workspace", () => {
    const rpcCall = createRoute.slice(
      createRoute.indexOf('"bootstrap_owned_company_workspace"'),
      createRoute.indexOf("const bootstrapPayload"),
    );

    expect(rpcCall).toContain("p_company_id: company.id");
    expect(rpcCall).toContain("p_profile_role: accountConfig.profileRole");
    expect(rpcCall).toContain("p_job_title: jobTitle || null");
    expect(rpcCall).not.toContain("p_user_id");
    expect(rpcCall).not.toContain("p_first_name");
    expect(rpcCall).not.toContain("user_id:");
    expect(rpcCall.split("p_company_id").length).toBe(2);
  });

  it("syncs names before company insert and preserves retry-safe recovery", () => {
    const postHandler = createRoute.slice(
      createRoute.indexOf("export async function POST"),
    );
    const nameSyncIndex = postHandler.indexOf("syncCurrentUserProfessionalNames");
    const insertIndex = postHandler.indexOf('status: "verified"');
    const recoverIndex = postHandler.indexOf('companyPlan.action === "recover"');
    const bootstrapIndex = postHandler.indexOf(
      '"bootstrap_owned_company_workspace"',
    );

    expect(nameSyncIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(nameSyncIndex);
    expect(recoverIndex).toBeGreaterThan(-1);
    expect(bootstrapIndex).toBeGreaterThan(insertIndex);
    expect(postHandler).toContain('companyPlan.action === "already_connected"');
    expect(postHandler).toContain("WORKSPACE_RECOVERY_REQUIRED_ERROR");
    expect(postHandler).toContain("planOwnedCompanyResolution");
    expect(postHandler).toContain("p_job_title: jobTitle || null");
    expect(workspaceBootstrap).toContain('action: "recover"');
    expect(identityMigration).toContain(
      "job_title = coalesce(\n      excluded.job_title,\n      existing_membership.job_title\n    )",
    );
  });

  it("does not expand bootstrap RPC arguments with user_id or extra company_id", () => {
    expect(createRoute).not.toContain("p_user_id");
    expect(createRoute).not.toContain("p_actor");
    expect(identityMigration).not.toContain(
      "create or replace function public.bootstrap_owned_company_workspace(\n  p_company_id uuid,\n  p_profile_role text,\n  p_job_title text default null,\n  p_user_id",
    );
  });
});

describe("NP-MASTER-22-B04-2 invitation flow isolation", () => {
  it("does not change Task 17 invitation signup or accept authorization", () => {
    expect(inviteSignupPage).toContain("supabase.auth.signUp({");
    expect(inviteSignupPage).toContain("/api/company-invitations/accept");
    expect(inviteSignupPage).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(inviteLanding).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(inviteSignupPage).not.toContain(
      "/auth/callback?next=/create-company",
    );
    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).toContain("invitation_token: token");
    expect(acceptRoute).not.toContain("p_company_id");
    expect(acceptRoute).not.toContain("p_user_id");
    expect(acceptRoute).not.toContain("p_workspace_role");
    expect(acceptRoute).not.toContain("p_procurement_function");
    expect(inviteSignupPage).not.toContain("p_company_id");
    expect(inviteSignupPage).not.toContain("p_user_id");
  });
});
