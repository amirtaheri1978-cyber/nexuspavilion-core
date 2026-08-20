import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { formatMemberIdentity } from "@/lib/auth/professional-identity-display";
import {
  FRIENDLY_IDENTITY_AMBIGUOUS_WORKSPACE,
  FRIENDLY_IDENTITY_NO_ACTIVE_MEMBERSHIP,
  buildOwnJobTitleRpcArgs,
  getFriendlyProfessionalIdentityError,
  parseProfessionalIdentitySaveInput,
  validateProfessionalIdentitySaveInput,
} from "@/lib/auth/professional-identity-settings";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  buildOwnProfessionalNameWritePayload,
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

const settingsPage = readSource("src/app/company/settings/page.tsx");
const membersCenter = readSource("src/components/company-members-center.tsx");
const identityForm = readSource(
  "src/components/professional-identity-settings-form.tsx",
);
const identityApi = readSource(
  "src/app/api/profile/professional-identity/route.ts",
);
const memberDisplay = readSource("src/components/member-identity-display.tsx");
const memberActions = readSource("src/components/member-actions.tsx");
const visualQa = readSource(
  "src/app/dev/company-settings-identity-visual-qa/page.tsx",
);
const nameHelper = readSource("src/lib/auth/professional-names.ts");
const companyPage = readSource("src/app/company/page.tsx");
const identityMigration = readSource(
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql",
);

const rpcCall = identityApi.slice(
  identityApi.indexOf('"update_own_workspace_job_title"'),
  identityApi.indexOf("if (error)"),
);

describe("NP-MASTER-22-B04-4 settings identity collection", () => {
  it("renders first name, last name, and job title on settings", () => {
    expect(identityForm).toContain("First name");
    expect(identityForm).toContain("Last name");
    expect(identityForm).toContain("Job title");
    expect(identityForm).toContain('htmlFor={firstNameId}');
    expect(identityForm).toContain('htmlFor={lastNameId}');
    expect(identityForm).toContain('htmlFor={jobTitleId}');
    expect(settingsPage).toContain("Professional Identity");
    expect(settingsPage).toContain("ProfessionalIdentitySettingsForm");
    expect(identityForm).toContain("Your title in this workspace");
  });

  it("keeps email read-only", () => {
    expect(identityForm).toContain("Email");
    expect(identityForm).toContain("readOnly");
    expect(identityForm).toContain('name="email"');
    expect(identityForm).not.toContain("onEmailChange");
  });

  it("validates names to 80 characters and job title to 120", () => {
    expect(PROFESSIONAL_NAME_MAX_LENGTH).toBe(80);
    expect(JOB_TITLE_MAX_LENGTH).toBe(120);
    expect(identityForm).toContain("maxLength={PROFESSIONAL_NAME_MAX_LENGTH}");
    expect(identityForm).toContain("maxLength={JOB_TITLE_MAX_LENGTH}");
    expect(
      validateProfessionalIdentitySaveInput({
        firstName: "A".repeat(81),
        lastName: "Morgan",
        jobTitle: "Director",
      }).firstNameError,
    ).toBe("First name must not exceed 80 characters.");
    expect(
      validateProfessionalIdentitySaveInput({
        firstName: "Alex",
        lastName: "Morgan",
        jobTitle: "B".repeat(121),
      }).jobTitleError,
    ).toBe("Job title must not exceed 120 characters.");
  });
});

describe("NP-MASTER-22-B04-4 settings write contract", () => {
  it("saves names through syncCurrentUserProfessionalNames without company_id or role", () => {
    expect(identityApi).toContain("syncCurrentUserProfessionalNames");
    expect(identityApi).toContain("requireNames: true");
    expect(identityApi).not.toContain("createAdminClient");
    expect(identityApi).not.toContain("service_role");
    expect(nameHelper).not.toContain("company_id:");

    const payload = buildOwnProfessionalNameWritePayload({
      resolved: { firstName: "Ada", lastName: "Lovelace" },
      storedFirstName: null,
      storedLastName: null,
    });
    expect(payload).toEqual({ first_name: "Ada", last_name: "Lovelace" });
    expect(payload).not.toHaveProperty("company_id");
    expect(payload).not.toHaveProperty("role");

    const nameSyncIndex = identityApi.indexOf("syncCurrentUserProfessionalNames");
    const rpcIndex = identityApi.indexOf('"update_own_workspace_job_title"');
    expect(nameSyncIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(nameSyncIndex);
  });

  it("saves job title through update_own_workspace_job_title without user_id or company_id", () => {
    const rpcArgs = buildOwnJobTitleRpcArgs("Procurement Director");

    expect(rpcArgs).toEqual({ p_job_title: "Procurement Director" });
    expect(Object.keys(rpcArgs)).toEqual(["p_job_title"]);
    expect(rpcCall).toContain("buildOwnJobTitleRpcArgs(input.jobTitle)");
    expect(rpcCall).not.toContain("p_user_id");
    expect(rpcCall).not.toContain("p_company_id");
    expect(identityApi).not.toContain('.from("organization_memberships")');
    expect(identityApi).not.toContain("p_user_id");
    expect(identityApi).not.toContain("p_company_id");
    expect(buildOwnJobTitleRpcArgs("")).toEqual({ p_job_title: null });
  });

  it("maps AMBIGUOUS_WORKSPACE and NO_ACTIVE_MEMBERSHIP to bounded copy", () => {
    expect(getFriendlyProfessionalIdentityError("AMBIGUOUS_WORKSPACE")).toBe(
      FRIENDLY_IDENTITY_AMBIGUOUS_WORKSPACE,
    );
    expect(getFriendlyProfessionalIdentityError("NO_ACTIVE_MEMBERSHIP")).toBe(
      FRIENDLY_IDENTITY_NO_ACTIVE_MEMBERSHIP,
    );
    expect(getFriendlyProfessionalIdentityError("AMBIGUOUS_WORKSPACE")).not.toContain(
      "PGRST",
    );
    expect(
      getFriendlyProfessionalIdentityError("JWT expired" as never),
    ).not.toContain("JWT");
    expect(identityApi).toContain("getFriendlyProfessionalIdentityError");
  });

  it("ignores authority-bearing client fields on identity save", () => {
    const parsed = parseProfessionalIdentitySaveInput({
      firstName: " Ada ",
      lastName: " Lovelace ",
      jobTitle: " Director ",
      userId: "attacker",
      companyId: "attacker-company",
      role: "admin",
    });

    expect(parsed).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Director",
    });
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("companyId");
    expect(parsed).not.toHaveProperty("role");
  });
});

describe("NP-MASTER-22-B04-4 member display", () => {
  it("prefers First Last and shows job title with email secondary", () => {
    const named = formatMemberIdentity({
      firstName: "Alex",
      lastName: "Morgan",
      jobTitle: "Procurement Director",
      email: "alex.morgan@example.com",
    });

    expect(named.primary).toBe("Alex Morgan");
    expect(named.fullName).toBe("Alex Morgan");
    expect(named.jobTitle).toBe("Procurement Director");
    expect(named.email).toBe("alex.morgan@example.com");
    expect(named.emailIsPrimary).toBe(false);
    expect(memberDisplay).toContain("{identity.primary}");
    expect(memberDisplay).toContain("{identity.jobTitle}");
    expect(membersCenter).toContain("MemberIdentityDisplay");
    expect(settingsPage).toContain("first_name: row.first_name");
    expect(companyPage).toContain("job_title: row.job_title");
  });

  it("uses email as primary when names are missing and never fabricates a name", () => {
    const fallback = formatMemberIdentity({
      firstName: null,
      lastName: "  ",
      jobTitle: null,
      email: "legacy.user@example.com",
    });

    expect(fallback.primary).toBe("legacy.user@example.com");
    expect(fallback.fullName).toBeNull();
    expect(fallback.emailIsPrimary).toBe(true);
    expect(fallback.primary).not.toContain("Member 1");
    expect(fallback.primary).not.toContain("User ");
    expect(memberDisplay).not.toContain("display_name");
    expect(memberDisplay).not.toContain("full_name");
    expect(membersCenter).not.toContain("profiles.job_title");
    expect(membersCenter).not.toContain("profile.role as job");
  });

  it("shows workspace role and procurement function as badges/context", () => {
    expect(membersCenter).toContain("getWorkspaceRoleLabel");
    expect(membersCenter).toContain("getProcurementFunctionLabel");
    expect(membersCenter).toContain("StatusPill");
    expect(membersCenter).toContain("Workspace Role");
    expect(membersCenter).toContain("Procurement Function");
  });

  it("marks the current user without exposing an auth user id", () => {
    expect(memberDisplay).toContain("You");
    expect(memberDisplay).toContain("isCurrentUser");
    expect(membersCenter).toContain("profile.id === currentProfile.id");
    expect(memberDisplay).not.toContain("currentUserId");
    expect(memberDisplay).not.toContain("{profile.id}");
    expect(membersCenter).toContain("currentUserId={currentProfile.id}");
    expect(memberActions).toContain("currentUserId");
    expect(memberActions).not.toContain("firstName");
    expect(memberActions).not.toContain("jobTitle");
  });

  it("does not add a cross-user identity edit path", () => {
    expect(membersCenter).not.toContain("/api/profile/professional-identity");
    expect(memberActions).not.toContain("syncCurrentUserProfessionalNames");
    expect(memberActions).not.toContain("update_own_workspace_job_title");
    expect(identityApi).not.toContain("targetUserId");
    expect(identityApi).not.toContain("p_user_id");
  });
});

describe("NP-MASTER-22-B04-4 settings golden page and fallback", () => {
  it("uses frozen executive language with one page h1", () => {
    expect(settingsPage).toContain("EXECUTIVE_PAGE_CLASS");
    expect(settingsPage).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(settingsPage).toContain("Professional Identity");
    expect(countHeading(settingsPage, "h1")).toBe(2);
    expect(settingsPage).toContain("Company Command & Governance");
    expect(settingsPage).not.toContain("hover:scale");
    expect(identityForm).not.toContain("hover:scale");
    expect(identityForm).toContain("aria-invalid={Boolean(firstNameError)}");
    expect(identityForm).toContain("aria-describedby={");
    expect(visualQa).toContain('process.env.NODE_ENV === "production"');
    expect(visualQa).toContain("notFound()");
  });

  it("still loads settings when names and title are null", () => {
    expect(settingsPage).toContain("ownNames.firstName || \"\"");
    expect(settingsPage).toContain("ownNames.lastName || \"\"");
    expect(settingsPage).toContain("loadCurrentUserProfessionalNames");
    expect(settingsPage).not.toContain("redirect(\"/create-company\")");
    expect(identityMigration).toContain("update_own_workspace_job_title");
  });
});
