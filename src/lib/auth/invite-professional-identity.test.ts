import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  INVITE_ACCEPT_AUTHORITY_FIELD_NAMES,
  buildInvitationAcceptRpcArgs,
  buildInviteSignupTransitMetadata,
  parseInvitationAcceptInput,
  validateInvitationEnrollmentIdentity,
} from "@/lib/auth/invite-enrollment";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  buildOwnProfessionalNameWritePayload,
  resolveProfessionalNames,
} from "@/lib/auth/professional-names";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function countHeading(source: string, tag: "h1" | "h2") {
  return source.match(new RegExp(`<${tag}[\\s>]`, "g"))?.length ?? 0;
}

const inviteSignupPage = readSource("src/app/invite/[token]/signup/page.tsx");
const inviteLanding = readSource("src/app/invite/[token]/page.tsx");
const enrollmentForm = readSource(
  "src/components/executive/enrollment/executive-enrollment-form.tsx",
);
const identityForm = readSource(
  "src/components/executive/invitation/invite-acceptance-identity-form.tsx",
);
const acceptRoute = readSource(
  "src/app/api/company-invitations/accept/route.ts",
);
const nameHelper = readSource("src/lib/auth/professional-names.ts");
const inviteHelper = readSource("src/lib/auth/invite-enrollment.ts");
const founderSignup = readSource("src/app/signup/page.tsx");
const createCompanyPage = readSource("src/app/create-company/page.tsx");
const visualQaFixture = readSource(
  "src/app/dev/invite-enrollment-visual-qa/page.tsx",
);
const identityMigration = readSource(
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql",
);
const invitationContextSql = readSource(
  "supabase/migrations/20260823000000_create_get_organization_invitation_context.sql",
);
const acceptBody = identityMigration.slice(
  identityMigration.indexOf(
    "create or replace function public.accept_organization_invitation(",
  ),
  identityMigration.indexOf(
    "comment on function public.accept_organization_invitation(text, text)",
  ),
);
const rpcCall = acceptRoute.slice(
  acceptRoute.indexOf('"accept_organization_invitation"'),
  acceptRoute.indexOf("if (error)"),
);
const signUpBlock = inviteSignupPage.slice(
  inviteSignupPage.indexOf("supabase.auth.signUp({"),
  inviteSignupPage.indexOf("const existingAccount"),
);
const postHandler = acceptRoute.slice(
  acceptRoute.indexOf("export async function POST"),
);

describe("NP-MASTER-22-B04-3 invite signup identity collection", () => {
  it("collects first name on invite signup", () => {
    expect(enrollmentForm).toContain("First name");
    expect(enrollmentForm).toContain('htmlFor={firstNameId}');
    expect(enrollmentForm).toContain('name="firstName"');
    expect(enrollmentForm).toContain("autoComplete=\"given-name\"");
    expect(inviteSignupPage).toContain("firstName={firstName}");
    expect(inviteSignupPage).toContain("onFirstNameChange={setFirstName}");
  });

  it("collects last name on invite signup", () => {
    expect(enrollmentForm).toContain("Last name");
    expect(enrollmentForm).toContain('htmlFor={lastNameId}');
    expect(enrollmentForm).toContain('name="lastName"');
    expect(enrollmentForm).toContain("autoComplete=\"family-name\"");
    expect(inviteSignupPage).toContain("lastName={lastName}");
    expect(inviteSignupPage).toContain("onLastNameChange={setLastName}");
  });

  it("collects required job title on invite signup", () => {
    expect(enrollmentForm).toContain("Job title");
    expect(enrollmentForm).toContain('htmlFor={jobTitleId}');
    expect(enrollmentForm).toContain('name="jobTitle"');
    expect(enrollmentForm).toContain("autoComplete=\"organization-title\"");
    expect(inviteSignupPage).toContain("jobTitle={jobTitle}");
    expect(inviteSignupPage).toContain("formData.append(\"jobTitle\", submittedJobTitle)");
    expect(validateInvitationEnrollmentIdentity({
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "",
    }).jobTitleError).toBe("Job title is required.");
  });

  it("validates names to 80 characters and trims", () => {
    expect(enrollmentForm).toContain("PROFESSIONAL_NAME_MAX_LENGTH");
    expect(enrollmentForm).toContain("maxLength={PROFESSIONAL_NAME_MAX_LENGTH}");
    expect(inviteSignupPage).toContain("normalizeProfessionalName(firstName)");
    expect(inviteSignupPage).toContain("validateInvitationEnrollmentIdentity");
    expect(PROFESSIONAL_NAME_MAX_LENGTH).toBe(80);
    expect(
      validateInvitationEnrollmentIdentity({
        firstName: "A".repeat(81),
        lastName: "Lovelace",
        jobTitle: "Director",
      }).firstNameError,
    ).toBe("First name must not exceed 80 characters.");
  });

  it("validates job title to 120 characters", () => {
    expect(enrollmentForm).toContain("JOB_TITLE_MAX_LENGTH");
    expect(enrollmentForm).toContain("maxLength={JOB_TITLE_MAX_LENGTH}");
    expect(inviteSignupPage).toContain("normalizeJobTitle(jobTitle)");
    expect(JOB_TITLE_MAX_LENGTH).toBe(120);
    expect(
      validateInvitationEnrollmentIdentity({
        firstName: "Ada",
        lastName: "Lovelace",
        jobTitle: "B".repeat(121),
      }).jobTitleError,
    ).toBe("Job title must not exceed 120 characters.");
  });

  it("keeps invite signup accessible with frozen executive language", () => {
    expect(countHeading(readSource(
      "src/components/executive/enrollment/executive-enrollment-gateway.tsx",
    ), "h1")).toBe(1);
    expect(countHeading(enrollmentForm, "h1")).toBe(0);
    expect(enrollmentForm).toContain("aria-invalid={Boolean(firstNameError)}");
    expect(enrollmentForm).toContain("aria-describedby={");
    expect(enrollmentForm).toContain("role=\"alert\"");
    expect(enrollmentForm).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(enrollmentForm).toContain("EXECUTIVE_FOCUS_GOLD");
    expect(enrollmentForm).not.toContain("hover:scale");
    expect(enrollmentForm).not.toContain("hover:-translate-y");
    expect(enrollmentForm).not.toContain("text-orange-");
    expect(enrollmentForm).not.toContain("bg-orange-");
    expect(enrollmentForm).not.toContain("name=\"role\"");
    expect(enrollmentForm).not.toContain("name=\"companyId\"");
  });
});

describe("NP-MASTER-22-B04-3 invite signup metadata", () => {
  it("sends first_name and last_name as transit-only signup metadata", () => {
    const metadata = buildInviteSignupTransitMetadata("Ada", "Lovelace");

    expect(metadata).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
    });
    expect(signUpBlock).toContain("buildInviteSignupTransitMetadata(");
    expect(signUpBlock).toContain("submittedFirstName");
    expect(signUpBlock).toContain("submittedLastName");
    expect(Object.keys(metadata).sort()).toEqual(["first_name", "last_name"]);
  });

  it("does not put company or role authorization state into auth metadata", () => {
    const metadata = buildInviteSignupTransitMetadata("Ada", "Lovelace");

    expect(metadata).not.toHaveProperty("company_id");
    expect(metadata).not.toHaveProperty("role");
    expect(metadata).not.toHaveProperty("workspace_role");
    expect(metadata).not.toHaveProperty("procurement_function");
    expect(metadata).not.toHaveProperty("membership_type");
    expect(metadata).not.toHaveProperty("job_title");
    expect(signUpBlock).not.toContain("company_id");
    expect(signUpBlock).not.toContain("workspace_role");
    expect(signUpBlock).not.toContain("procurement_function");
    expect(signUpBlock).not.toContain("membership_type");
    expect(signUpBlock).not.toContain("job_title");
    expect(signUpBlock).not.toContain("emailRedirectTo");
    expect(inviteSignupPage).not.toContain("/auth/callback?next=/create-company");
  });
});

describe("NP-MASTER-22-B04-3 existing-account invite acceptance", () => {
  it("prefills canonical profile names for the authenticated recipient", () => {
    expect(inviteLanding).toContain("loadCurrentUserProfessionalNames");
    expect(inviteLanding).toContain("Boolean(user) && !emailMismatch");
    expect(inviteLanding).toContain("initialFirstName={ownNames.firstName || \"\"}");
    expect(inviteLanding).toContain("initialLastName={ownNames.lastName || \"\"}");
    expect(identityForm).toContain("useState(initialFirstName)");
    expect(identityForm).toContain("useState(initialLastName)");
    expect(identityForm).toContain("First name");
    expect(identityForm).toContain("Last name");
    expect(identityForm).toContain("Job title");
  });

  it("uses metadata only to fill missing names and never wipes stored names", () => {
    expect(nameHelper).toContain("readTransitNamesFromMetadata");
    expect(nameHelper).toContain("if (storedNormalized)");
    expect(inviteLanding).not.toContain('.from("profiles")');
    expect(inviteSignupPage).toContain("syncCurrentUserProfessionalNames");
    expect(acceptRoute).toContain("syncCurrentUserProfessionalNames");
    expect(inviteHelper).not.toContain('.from("profiles")');

    expect(
      resolveProfessionalNames({
        storedFirstName: null,
        storedLastName: null,
        metadataFirstName: "Ada",
        metadataLastName: "Lovelace",
      }),
    ).toEqual({ firstName: "Ada", lastName: "Lovelace" });

    expect(
      resolveProfessionalNames({
        storedFirstName: "Grace",
        storedLastName: "Hopper",
        inputFirstName: "",
        inputLastName: "   ",
        metadataFirstName: "Ada",
        metadataLastName: "Lovelace",
      }),
    ).toEqual({ firstName: "Grace", lastName: "Hopper" });
  });
});

describe("NP-MASTER-22-B04-3 canonical name sync", () => {
  it("reuses own-profile name sync without company_id or role", () => {
    const payload = buildOwnProfessionalNameWritePayload({
      resolved: { firstName: "Ada", lastName: "Lovelace" },
      storedFirstName: null,
      storedLastName: null,
    });

    expect(payload).toEqual({ first_name: "Ada", last_name: "Lovelace" });
    expect(payload).not.toHaveProperty("company_id");
    expect(payload).not.toHaveProperty("role");
    expect(nameHelper).not.toContain("service_role");
    expect(acceptRoute).not.toContain("createAdminClient");
    expect(acceptRoute).not.toContain("service_role");
    expect(inviteSignupPage).toContain("requireNames: true");
    expect(postHandler).toContain("requireNames: true");

    const nameSyncIndex = postHandler.indexOf("syncCurrentUserProfessionalNames");
    const rpcIndex = postHandler.indexOf('"accept_organization_invitation"');
    expect(nameSyncIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(nameSyncIndex);
  });
});

describe("NP-MASTER-22-B04-3 accept API contract", () => {
  it("accepts jobTitle and identity fields from the enrollment request", () => {
    expect(acceptRoute).toContain("parseInvitationAcceptInput(formData)");
    expect(acceptRoute).toContain("const jobTitle = input.jobTitle");
    expect(acceptRoute).toContain("p_job_title: jobTitle || null");
    expect(inviteSignupPage).toContain('formData.append("firstName", submittedFirstName)');
    expect(inviteSignupPage).toContain('formData.append("lastName", submittedLastName)');
    expect(identityForm).toContain('name="jobTitle"');

    const parsed = parseInvitationAcceptInput({
      token: " invite-token ",
      firstName: " Ada ",
      lastName: " Lovelace ",
      jobTitle: " Director ",
    });
    expect(parsed).toEqual({
      token: "invite-token",
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Director",
    });
  });

  it("ignores authority-bearing client fields", () => {
    const parsed = parseInvitationAcceptInput({
      token: "invite-token",
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Director",
      userId: "attacker-user",
      companyId: "attacker-company",
      role: "admin",
      workspaceRole: "owner",
      procurementFunction: "buyer",
      membershipType: "founder",
    });

    expect(Object.keys(parsed).sort()).toEqual([
      "firstName",
      "jobTitle",
      "lastName",
      "token",
    ]);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("companyId");
    expect(parsed).not.toHaveProperty("role");
    expect(INVITE_ACCEPT_AUTHORITY_FIELD_NAMES).toEqual([
      "userId",
      "companyId",
      "role",
      "workspaceRole",
      "procurementFunction",
      "membershipType",
    ]);
    expect(acceptRoute).not.toContain("formData.get(\"userId\")");
    expect(acceptRoute).not.toContain("formData.get(\"companyId\")");
    expect(acceptRoute).not.toContain("formData.get(\"role\")");
    expect(acceptRoute).not.toContain("p_role");
    expect(acceptRoute).not.toContain("p_workspace_role");
    expect(acceptRoute).not.toContain("p_procurement_function");
    expect(acceptRoute).not.toContain("p_user_id");
    expect(acceptRoute).not.toContain("p_company_id");
  });
});

describe("NP-MASTER-22-B04-3 RPC and Task 17 authorization", () => {
  it("sends only invitation_token and p_job_title to the accept RPC", () => {
    const rpcArgs = buildInvitationAcceptRpcArgs("invite-token", "Director");

    expect(rpcArgs).toEqual({
      invitation_token: "invite-token",
      p_job_title: "Director",
    });
    expect(Object.keys(rpcArgs).sort()).toEqual([
      "invitation_token",
      "p_job_title",
    ]);
    expect(rpcCall).toContain("invitation_token: token");
    expect(rpcCall).toContain("p_job_title: jobTitle || null");
    expect(rpcCall).not.toContain("p_user_id");
    expect(rpcCall).not.toContain("p_company_id");
    expect(rpcCall).not.toContain("p_role");
    expect(rpcCall).not.toContain("p_workspace_role");
    expect(rpcCall).not.toContain("p_procurement_function");
    expect(rpcCall).not.toContain("p_membership_type");
    expect(rpcCall.split("invitation_token").length).toBe(2);
    expect(rpcCall.split("p_job_title").length).toBe(2);
  });

  it("keeps invitation company and role server-derived", () => {
    expect(acceptBody).toContain("invitation_record.company_id");
    expect(acceptBody).toContain("actor_user_id := auth.uid()");
    expect(acceptBody).toContain(
      "lower(trim(coalesce(invitation_record.role, '')))",
    );
    expect(acceptBody).toContain("next_workspace_role");
    expect(acceptRoute).not.toContain("p_company_id");
    expect(inviteSignupPage).not.toContain("p_company_id");
    expect(inviteLanding).not.toContain("p_company_id");
    expect(identityForm).not.toContain("name=\"role\"");
    expect(identityForm).not.toContain("name=\"companyId\"");
    expect(enrollmentForm).not.toContain("name=\"workspaceRole\"");
  });

  it("preserves recipient mismatch, pending, and expiry contracts", () => {
    expect(acceptRoute).toContain('case "RECIPIENT_MISMATCH"');
    expect(acceptRoute).toContain('case "INVITATION_EXPIRED"');
    expect(acceptRoute).toContain('case "INVITATION_NOT_PENDING"');
    expect(acceptRoute).toContain("`/invite/${token}?error=recipient-mismatch`");
    expect(acceptBody).toContain("'error_code', 'RECIPIENT_MISMATCH'");
    expect(acceptBody).toContain("'error_code', 'INVITATION_EXPIRED'");
    expect(acceptBody).toContain("'error_code', 'INVITATION_NOT_PENDING'");
    expect(acceptBody).toContain(
      "actor_email <> lower(trim(invitation_record.email))",
    );
    expect(acceptBody).toContain("invitation_record.status <> 'pending'");
    expect(acceptBody).toContain(
      "invitation_record.expires_at < accepted_timestamp",
    );
  });

  it("keeps anonymous accept RPC execution denied", () => {
    expect(identityMigration).toContain(
      "revoke all\non function public.accept_organization_invitation(text, text)\nfrom anon;",
    );
    expect(identityMigration).toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto authenticated;",
    );
    expect(identityMigration).not.toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto anon;",
    );
    expect(acceptRoute).toContain("await supabase.auth.getUser()");
  });
});

describe("NP-MASTER-22-B04-3 failure, retry, and privacy", () => {
  it("does not accept when identity validation or name sync fails", () => {
    const nameSyncIndex = postHandler.indexOf("syncCurrentUserProfessionalNames");
    const rpcIndex = postHandler.indexOf('"accept_organization_invitation"');
    const identityRedirectIndex = postHandler.indexOf(
      'getFailureRedirect(token, "IDENTITY_REQUIRED")',
    );

    expect(nameSyncIndex).toBeGreaterThan(-1);
    expect(identityRedirectIndex).toBeGreaterThan(-1);
    expect(identityRedirectIndex).toBeLessThan(rpcIndex);
    expect(postHandler).toContain("if (!nameSync.ok)");
    expect(postHandler).toContain("validateFounderJobTitle(jobTitle, {");
    expect(postHandler).toContain("required: true");
    expect(inviteSignupPage).toContain("if (!nameSync.ok)");
    expect(inviteSignupPage).toContain("await acceptInvitationAfterSignup()");
    expect(inviteSignupPage.indexOf("if (!nameSync.ok)")).toBeLessThan(
      inviteSignupPage.indexOf("await acceptInvitationAfterSignup()"),
    );
  });

  it("does not fabricate success or duplicate memberships on retry", () => {
    expect(inviteSignupPage).toContain(
      "isSuccessfulInvitationAcceptDestination(response.url)",
    );
    expect(inviteSignupPage).toContain("getInvitationRecoveryPath(token)");
    expect(acceptRoute).not.toContain('.from("organization_memberships")');
    expect(acceptRoute).not.toContain(".insert(");
    expect(identityMigration).toContain(
      "job_title = coalesce(\n      excluded.job_title,\n      existing_membership.job_title\n    )",
    );
    expect(buildInvitationAcceptRpcArgs("token", "")).toEqual({
      invitation_token: "token",
      p_job_title: null,
    });
  });

  it("does not broaden public invitation context privacy", () => {
    expect(invitationContextSql).toContain(
      "create or replace function public.get_organization_invitation_context(",
    );
    expect(invitationContextSql).not.toContain("first_name");
    expect(invitationContextSql).not.toContain("job_title");
    expect(inviteLanding).toContain('rpc("get_organization_invitation_context"');
    expect(inviteSignupPage).toContain('rpc("get_organization_invitation_context"');
    expect(inviteLanding).not.toMatch(/\.from\(\s*["']invitations["']\s*\)/);
    expect(inviteSignupPage).not.toMatch(/\.from\(\s*["']invitations["']\s*\)/);
    expect(inviteLanding).not.toContain('.from("organization_memberships")');
    expect(inviteSignupPage).not.toContain('.from("organization_memberships")');
    expect(visualQaFixture).toContain('process.env.NODE_ENV === "production"');
    expect(visualQaFixture).toContain("notFound()");
    expect(visualQaFixture).not.toContain("service_role");
  });

  it("leaves the founder signup and create-company identity flow intact", () => {
    expect(founderSignup).toContain("first_name: submittedFirstName");
    expect(founderSignup).toContain("last_name: submittedLastName");
    expect(founderSignup).not.toContain("Job title");
    expect(createCompanyPage).toContain("Founder Professional Identity");
    expect(createCompanyPage).toContain("validateFounderJobTitle");
    expect(createCompanyPage).toContain("jobTitle: submittedJobTitle");
  });
});
