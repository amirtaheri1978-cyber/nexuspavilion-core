import Image from "next/image";
import Link from "next/link";

import { AccountIdentityLine } from "@/components/account-identity-line";
import { CompanyCapabilitiesDisplay } from "@/components/company-capabilities-display";
import { CompanyComplianceDisplay } from "@/components/company-compliance-display";
import { CompanyDocumentsDisplay } from "@/components/company-documents-display";
import { CompanyQualificationsDisplay } from "@/components/company-qualifications-display";
import CompanyMembersCenter from "@/components/company-members-center";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import {
  canDeleteCompanyWorkspace,
  canManageCompanyWorkspace,
} from "@/lib/authorization/workspace-permissions";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";
import {
  createEmptyGroupedCapabilities,
  loadCompanyCapabilities,
} from "@/lib/company/capabilities";
import {
  createEmptyGroupedCompliance,
  loadCompanyCompliance,
} from "@/lib/company/compliance";
import {
  loadCompanyDocuments,
  type CompanyDocumentRecord,
} from "@/lib/company/documents";
import {
  createEmptyGroupedQualifications,
  loadCompanyQualifications,
} from "@/lib/company/qualifications";
import { getPublicSiteUrl } from "@/lib/ops/public-site-url";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = getPublicSiteUrl() ?? "";

type Company = {
  id: string;
  name: string | null;
  slug: string | null;
  category: string | null;
  location: string | null;
  network_role: string | null;
  status: string | null;
  logo_url: string | null;
  user_id: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role: string | null;
  company_id: string | null;
  created_at?: string | null;
};

type Membership = {
  id: string;
  user_id: string;
  company_id: string;
  workspace_role: "owner" | "admin" | "member" | "viewer";
  procurement_function:
    | "buyer"
    | "supplier"
    | "consultant"
    | "none";
  membership_status:
    | "pending"
    | "active"
    | "suspended"
    | "revoked";
  job_title?: string | null;
};

type OrganizationMemberRow = {
  membership_id: string;
  user_id: string;
  company_id: string;

  email: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  legacy_role: string | null;
  profile_created_at: string | null;

  workspace_role: "owner" | "admin" | "member" | "viewer";
  procurement_function:
    | "buyer"
    | "supplier"
    | "consultant"
    | "none";
  membership_type:
    | "founder"
    | "employee"
    | "external_consultant"
    | "procurement_agent"
    | "temporary_staff";
  membership_status:
    | "pending"
    | "active"
    | "suspended"
    | "revoked";

  joined_at: string | null;
  role_changed_at: string | null;
  membership_created_at: string;
  membership_updated_at: string;
};

export type WorkspaceMember = {
  profile: Profile;
  membership: Membership | null;
};

type Invitation = {
  id: string;
  company_id: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  token: string | null;
  created_at: string | null;
};

type AuditLog = {
  id: string;
  action: string | null;
  entity_type: string | null;
  created_at: string | null;
};

function getWorkspaceRoleLabel(
  role: string | null | undefined,
) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "member") return "Member";
  if (role === "viewer") return "Viewer";

  return "Workspace Member";
}

export default async function CompanyWorkspacePage() {
  const supabase = await createClient();

  let workspace;

  try {
    workspace = await getCurrentWorkspaceContext(supabase);
  } catch (error) {
    if (
      error instanceof WorkspaceContextError &&
      error.code === "UNAUTHENTICATED"
    ) {
      return (
        <SystemState
          eyebrow="Secure Access Required"
          title="Sign in required."
          description="Please sign in to access your company workspace and manage enterprise account settings."
          primaryHref="/login"
          primaryLabel="Sign In"
          secondaryHref="/"
          secondaryLabel="Back Home"
        />
      );
    }

    console.error(
      "Company workspace context lookup failed.",
      error,
    );

    return (
      <SystemState
        eyebrow="Company Workspace"
        title="Workspace access could not be verified."
        description="We could not verify your organization membership. Please try again or contact your workspace administrator."
        primaryHref="/dashboard"
        primaryLabel="Back to Dashboard"
        secondaryHref="/"
        secondaryLabel="Back Home"
      />
    );
  }

  if (!workspace.companyId || !workspace.membership) {
    return (
      <SystemState
        eyebrow="Company Workspace"
        title="No company connected."
        description="Your account is not attached to an active company workspace yet. Create a workspace or accept an invitation from a company administrator."
        primaryHref="/create-company"
        primaryLabel="Create Workspace"
        secondaryHref="/dashboard"
        secondaryLabel="Back to Dashboard"
      />
    );
  }

  const companyId = workspace.companyId;

const [
  companyResult,
  currentProfileResult,
  organizationMembersResult,
  invitationsResult,
  auditResult,
] = await Promise.all([
    supabase
      .from("companies")
      .select(
        `
          id,
          name,
          slug,
          category,
          location,
          network_role,
          status,
          logo_url,
          user_id
        `,
      )
      .eq("id", companyId)
      .maybeSingle(),

    /*
     * Temporary compatibility read.
     * Some UI and procurement flows still depend on the legacy role.
     */
    supabase
      .from("profiles")
      .select("id, email, role, company_id, created_at")
      .eq("id", workspace.userId)
      .maybeSingle(),

    /*
     * Profiles currently provide member identity information.
     * Organization membership supplies workspace authority.
     */
   

    supabase.rpc("get_organization_members"),

    supabase.rpc("get_company_workspace_invitations"),

    supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (companyResult.error) {
    console.error("Company workspace lookup failed.", {
      companyId,
      userId: workspace.userId,
      error: companyResult.error,
    });
  }

  if (!companyResult.data) {
    return (
      <SystemState
        eyebrow="Company Workspace"
        title="Company workspace not found."
        description="Your membership exists, but the connected organization workspace could not be loaded."
        primaryHref="/dashboard"
        primaryLabel="Back to Dashboard"
        secondaryHref="/"
        secondaryLabel="Back Home"
      />
    );
  }

  if (
    currentProfileResult.error ||
    !currentProfileResult.data
  ) {
    console.error(
      "Legacy profile compatibility lookup failed.",
      {
        userId: workspace.userId,
        error: currentProfileResult.error,
      },
    );

    return (
      <SystemState
        eyebrow="Company Workspace"
        title="Profile information could not be loaded."
        description="Your workspace membership is active, but temporary profile compatibility data is unavailable."
        primaryHref="/dashboard"
        primaryLabel="Back to Dashboard"
        secondaryHref="/"
        secondaryLabel="Back Home"
      />
    );
  }

if (organizationMembersResult.error) {
  console.error("Organization members RPC failed.", {
    companyId,
    userId: workspace.userId,
    error: organizationMembersResult.error,
  });
}

  if (invitationsResult.error) {
    console.error("Company invitations lookup failed.", {
      companyId,
      userId: workspace.userId,
      error: invitationsResult.error,
    });
  }

  if (auditResult.error) {
    console.error("Company activity lookup failed.", {
      companyId,
      userId: workspace.userId,
      error: auditResult.error,
    });
  }

  const company = companyResult.data as Company;

  const legacyCurrentProfile =
    currentProfileResult.data as Profile;

  /*
   * Current-user governance is authoritative from membership.
   * The compatibility profile remains available to legacy UI.
   */
  const currentProfile: Profile = {
    ...legacyCurrentProfile,
    role:
      workspace.workspaceRole ??
      legacyCurrentProfile.role,
    company_id: companyId,
  };

const organizationMemberRows =
  (organizationMembersResult.data ??
    []) as OrganizationMemberRow[];

const workspaceMembers: WorkspaceMember[] =
  organizationMemberRows.map((row) => ({
    profile: {
      id: row.user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.legacy_role,
      company_id: row.company_id,
      created_at: row.profile_created_at,
    },

    membership: {
      id: row.membership_id,
      user_id: row.user_id,
      company_id: row.company_id,
      workspace_role: row.workspace_role,
      procurement_function:
        row.procurement_function,
      membership_status: row.membership_status,
      job_title: row.job_title,
    },
  }));

  const invitations = (
    (invitationsResult.data ?? []) as Invitation[]
  ).slice(0, 12);

  const activityList =
    (auditResult.data ?? []) as AuditLog[];

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  /*
   * These summaries now use the authoritative membership model.
   */
  const adminsCount = workspaceMembers.filter(
    ({ membership }) =>
      membership?.workspace_role === "admin",
  ).length;

  const buyersCount = workspaceMembers.filter(
    ({ membership }) =>
      membership?.procurement_function === "buyer",
  ).length;

  const vendorsCount = workspaceMembers.filter(
    ({ membership }) =>
      membership?.procurement_function === "supplier",
  ).length;

  const hasOwner = workspaceMembers.some(
    ({ membership }) =>
      membership?.workspace_role === "owner",
  );

  const permissionContext = {
    workspaceRole: workspace.workspaceRole,
    membershipStatus: workspace.membershipStatus,
  };

  const canManage =
    canManageCompanyWorkspace(permissionContext);

  const canDelete =
    canDeleteCompanyWorkspace(permissionContext);

  const pendingInvitationCount =
    pendingInvitations.length;

  const workspaceRoleLabel =
    getWorkspaceRoleLabel(workspace.workspaceRole);

  const companyStatusLabel =
    company.status?.trim() || "Status not set";
  const companyStatusIsVerified = ["verified", "approved"].includes(
    String(company.status || "").toLowerCase(),
  );

  const currentWorkspaceMember = workspaceMembers.find(
    ({ profile }) => profile.id === workspace.userId,
  );

  const workspaceStage =
    workspace.membershipStatus === "active"
      ? "Active"
      : workspace.membershipStatus || "Pending";

  const governanceMessage = canManage
    ? "Your active workspace membership allows organization administration."
    : "Your workspace membership currently provides read-only access.";

  let companyCapabilities = createEmptyGroupedCapabilities();
  let companyQualifications = createEmptyGroupedQualifications();
  let companyCompliance = createEmptyGroupedCompliance();
  let companyDocuments: CompanyDocumentRecord[] = [];

  try {
    companyCapabilities = await loadCompanyCapabilities(supabase, companyId);
  } catch (error) {
    console.error("Company capabilities lookup failed.", {
      companyId,
      userId: workspace.userId,
      error,
    });
  }

  try {
    companyQualifications = await loadCompanyQualifications(supabase, companyId);
  } catch (error) {
    console.error("Company qualifications lookup failed.", {
      companyId,
      userId: workspace.userId,
      error,
    });
  }

  try {
    companyCompliance = await loadCompanyCompliance(supabase, companyId);
  } catch {
    console.error("Company compliance lookup failed.", {
      companyId,
      userId: workspace.userId,
      errorCode: "COMPANY_COMPLIANCE_LOOKUP_FAILED",
    });
  }

  try {
    companyDocuments = await loadCompanyDocuments(supabase, companyId);
  } catch {
    console.error("Company documents lookup failed.", {
      companyId,
      userId: workspace.userId,
      errorCode: "COMPANY_DOCUMENTS_LOOKUP_FAILED",
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="mx-auto w-full max-w-[1680px] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard"
            className={`inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
          >
            ← Back to Dashboard
          </Link>

          <div className="flex flex-wrap gap-3">
            {company.slug ? (
              <Link
                href={`/company/${company.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
              >
                Public Profile
              </Link>
            ) : null}

            <Link
              href="/rfq"
              className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
            >
              Open Procurement Center
            </Link>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-6">
              {company.logo_url ? (
                <Image
                  src={company.logo_url}
                  alt={company.name || "Company"}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-3xl border border-white/10 bg-white object-contain p-2"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] text-4xl font-black text-slate-400">
                  {company.name?.charAt(0) || "C"}
                </div>
              )}

              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
                  Company Command Center
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="max-w-4xl break-words text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
                    {company.name?.trim() || "Company"}
                  </h1>

                  <span
                    className={`rounded-full border px-4 py-1 text-sm font-black capitalize ${
                      companyStatusIsVerified
                        ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.055] text-slate-300"
                    }`}
                  >
                    {companyStatusLabel}
                  </span>
                </div>

                <p className="mt-3 text-lg font-semibold text-slate-300">
                  {company.category?.trim() || "Not specified"} ·{" "}
                  {company.location?.trim() || "Location N/A"}
                </p>

                <AccountIdentityLine
                  firstName={currentWorkspaceMember?.profile.first_name}
                  lastName={currentWorkspaceMember?.profile.last_name}
                  jobTitle={currentWorkspaceMember?.membership?.job_title}
                  email={workspace.email || currentProfile.email}
                  roleLabel={workspaceRoleLabel}
                />

                <Link
                  href="/company/settings#professional-identity"
                  className={`mt-3 inline-flex text-xs font-bold text-slate-400 underline-offset-4 transition hover:text-slate-200 hover:underline ${EXECUTIVE_FOCUS_CYAN}`}
                >
                  Edit Professional Identity
                </Link>
              </div>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-4">
              <MiniMetric
                title="Team Members"
                value={workspaceMembers.length}
              />

              <MiniMetric
                title="Pending Invites"
                value={pendingInvitationCount}
              />

              <MiniMetric
                title="Owners / Admins"
                value={
                  adminsCount + (hasOwner ? 1 : 0)
                }
              />

              <MiniMetric
                title="Your Access"
                value={workspaceRoleLabel}
              />
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <InfoCard
              title="Category"
              value={company.category?.trim() || "Not specified"}
            />

            <InfoCard
              title="Location"
              value={company.location?.trim() || "Location N/A"}
            />

            <InfoCard
              title="Network Role"
              value={company.network_role?.trim() || "Not specified"}
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-8">
          <CompanyCapabilitiesDisplay
            capabilities={companyCapabilities}
            variant="internal"
          />
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-8">
          <CompanyQualificationsDisplay
            qualifications={companyQualifications}
            variant="internal"
          />
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-8">
          <CompanyComplianceDisplay compliance={companyCompliance} />
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-8">
          <CompanyDocumentsDisplay
            documents={companyDocuments}
            companyId={companyId}
          />
        </section>

        <CompanyMembersCenter
          company={company}
          currentProfile={currentProfile}
          workspaceMembers={workspaceMembers}
          pendingInvitations={pendingInvitations}
          activityList={activityList}
          adminsCount={adminsCount}
          buyersCount={buyersCount}
          vendorsCount={vendorsCount}
          hasOwner={hasOwner}
          canManage={canManage}
          canDelete={canDelete}
          workspaceStage={workspaceStage}
          governanceMessage={governanceMessage}
                    pendingTransfer={null}
          pendingTransferFromEmail={null}
          pendingTransferToEmail={null}
          siteUrl={SITE_URL}
        />
      </div>
    </main>
  );
}

function SystemState({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061426] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <section className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.065] p-8 text-center shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
          {eyebrow}
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
          {title}
        </h1>

        <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
          {description}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href={primaryHref}
            className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
          >
            {primaryLabel}
          </Link>

          <Link
            href={secondaryHref}
            className="flex h-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
          >
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 truncate text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}