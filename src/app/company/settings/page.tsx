import Link from "next/link";

import { CompanyCapabilitiesEditor } from "@/components/company-capabilities-editor";
import { CompanyComplianceEditor } from "@/components/company-compliance-editor";
import { CompanyDocumentsEditor } from "@/components/company-documents-editor";
import { CompanyQualificationsEditor } from "@/components/company-qualifications-editor";
import CompanyCommandCenter from "@/components/company-command-center";
import CompanyGovernanceCenter from "@/components/company-governance-center";
import CompanyMembersCenter from "@/components/company-members-center";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ProfessionalIdentitySettingsForm } from "@/components/professional-identity-settings-form";
import { formatMemberIdentity } from "@/lib/auth/professional-identity-display";
import { loadCurrentUserProfessionalNames } from "@/lib/auth/professional-names";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import {
  canInviteWorkspaceMembers,
  canManageCompanyWorkspace,
} from "@/lib/authorization/workspace-permissions";
import { loadCompanyCapabilities, createEmptyGroupedCapabilities } from "@/lib/company/capabilities";
import {
  COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE,
  createEmptyGroupedCompliance,
  loadCompanyCompliance,
} from "@/lib/company/compliance";
import {
  COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE,
  loadCompanyDocuments,
  type CompanyDocumentRecord,
} from "@/lib/company/documents";
import {
  createEmptyGroupedQualifications,
  loadCompanyQualifications,
} from "@/lib/company/qualifications";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

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

type WorkspaceMember = {
  profile: Profile;
  membership: Membership | null;
};

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

type Invitation = {
id: string;
email: string | null;
role: string | null;
status: string | null;
created_at: string | null;
company_id: string | null;
token: string | null;
};

type AuditLog = {
id: string;
action: string | null;
entity_type: string | null;
created_at: string | null;
};

type OwnershipTransfer = {
  id: string;
  company_id: string;
  from_user_id: string;
  to_user_id: string;
  status:
    | "pending_acceptance"
    | "rejected"
    | "cancelled"
    | "expired"
    | "completed";
  previous_owner_next_role:
    | "admin"
    | "member"
    | "viewer";
  transfer_reason: string | null;
  requested_at: string;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
};

function getWorkspaceRoleLabel(
  role: Membership["workspace_role"] | null | undefined,
) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "member") return "Member";
  if (role === "viewer") return "Viewer";

  return "Workspace Member";
}

function canManageWorkspace(role: string | null) {
return role === "owner" || role === "admin" || role === "buyer";
}

function canDeleteWorkspace(role: string | null) {
return role === "owner" || role === "admin";
}

function getWorkspaceReadiness({
memberCount,
hasOwner,
hasCompanyProfile,
rfqCount,
activityCount,
pendingInviteCount,
}: {
memberCount: number;
hasOwner: boolean;
hasCompanyProfile: boolean;
rfqCount: number;
activityCount: number;
pendingInviteCount: number;
}) {
let score = 45;

if (hasOwner) score += 15;
if (hasCompanyProfile) score += 15;
if (memberCount >= 1) score += 10;
if (memberCount >= 2) score += 8;
if (rfqCount > 0) score += 5;
if (activityCount > 0) score += 1;
if (pendingInviteCount <= 5) score += 1;

return Math.min(100, score);
}

function getWorkspaceStage(score: number, rfqCount: number) {
if (score >= 90) return "Launch Ready";
if (score >= 75) return "Healthy";
if (rfqCount === 0) return "Onboarding";

return "Needs Setup";
}

function getWorkspaceMessage(stage: string) {
if (stage === "Launch Ready") {
return "Workspace foundation is strong and ready for procurement execution.";
}

if (stage === "Healthy") {
return "Workspace is active. Complete the remaining setup steps to improve procurement readiness.";
}

if (stage === "Onboarding") {
return "Workspace is live. Invite your team, complete the profile, and create the first RFQ to activate procurement intelligence.";
}

return "Workspace requires setup attention before procurement operations begin.";
}

function getGovernanceMessage({
hasOwner,
adminCount,
pendingInviteCount,
}: {
hasOwner: boolean;
adminCount: number;
pendingInviteCount: number;
}) {
if (!hasOwner) {
return "Ownership is not assigned. Recover ownership before inviting additional stakeholders.";
}

if (adminCount === 0) {
return "Owner access is active. Add a backup admin before wider team rollout.";
}

if (adminCount === 1) {
return "Workspace governance is active. Add one backup admin for stronger access continuity.";
}

if (pendingInviteCount > 10) {
return "Several invitations are pending. Review stale invites before launch.";
}

return "Workspace governance controls are healthy and ready for procurement activity.";
}

export default async function CompanySettingsPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id, created_at")
.eq("id", user.id)
.single()
: { data: null };

const currentProfile = profile as Profile | null;

if (!user || !currentProfile?.company_id) {
return <WorkspaceUnavailable />;
}

const companyId = currentProfile.company_id;

const { data: companyData } = await supabase
.from("companies")
.select(
"id, name, slug, category, location, network_role, status, logo_url, user_id"
)
.eq("id", companyId)
.single();

const company = companyData as Company | null;

if (!company) {
return <CompanyNotFound />;
}

const {
  data: organizationMembersData,
  error: organizationMembersError,
} = await supabase.rpc(
  "get_organization_members",
);

if (organizationMembersError) {
  console.error("Organization members RPC failed.", {
    companyId,
    userId: currentProfile.id,
    error: organizationMembersError,
  });
}

const organizationMemberRows =
  (organizationMembersData ??
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
  const memberList = workspaceMembers.map(
  ({ profile }) => profile,
);

const {
  data: invitations,
  error: invitationsError,
} = await supabase.rpc("get_company_workspace_invitations");

if (invitationsError) {
  console.error("Company invitations RPC failed.", {
    companyId,
    userId: currentProfile.id,
    error: invitationsError,
  });
}

const invitationList = (invitations ?? []) as Invitation[];

const { data: auditLogs } = await supabase
.from("audit_logs")
.select("id, action, entity_type, created_at")
.eq("company_id", companyId)
.order("created_at", { ascending: false })
.limit(8);

const activityList = (auditLogs ?? []) as AuditLog[];

const { data: pendingTransferData } = await supabase
  .from("ownership_transfer_requests")
  .select(
    `
      id,
      company_id,
      from_user_id,
      to_user_id,
      status,
      previous_owner_next_role,
      transfer_reason,
      requested_at,
      expires_at,
      accepted_at,
      rejected_at,
      completed_at
    `,
  )
  .eq("company_id", companyId)
  .eq("status", "pending_acceptance")
  .order("requested_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const pendingTransfer =
  pendingTransferData as OwnershipTransfer | null;
  const pendingTransferFromEmail =
  workspaceMembers.find(
    ({ profile }) =>
      profile.id === pendingTransfer?.from_user_id,
  )?.profile.email ?? null;

const pendingTransferToEmail =
  workspaceMembers.find(
    ({ profile }) =>
      profile.id === pendingTransfer?.to_user_id,
  )?.profile.email ?? null;

const { count: rfqCount } = await supabase
.from("rfqs")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId);

const { count: activeRfqCount } = await supabase
.from("rfqs")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId)
.eq("status", "open");

const { count: quoteCount } = await supabase
.from("quotes")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId);

const { count: awardedCount } = await supabase
.from("quotes")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId)
.eq("decision", "awarded");

const admins = workspaceMembers.filter(
  ({ membership }) =>
    membership?.workspace_role === "admin",
);

const buyers = workspaceMembers.filter(
  ({ membership }) =>
    membership?.procurement_function === "buyer",
);

const vendors = workspaceMembers.filter(
  ({ membership }) =>
    membership?.procurement_function === "supplier",
);

const pendingInvitations = invitationList.filter(
(invitation) =>
!invitation.status ||
invitation.status === "pending" ||
invitation.status === "sent"
);

const hasOwner = workspaceMembers.some(
  ({ membership }) =>
    membership?.workspace_role === "owner",
);
const hasCompanyProfile = Boolean(
company.name && company.category && company.location
);

const canManage = canManageWorkspace(currentProfile.role);
const canDelete = canDeleteWorkspace(currentProfile.role);
const ownNames = await loadCurrentUserProfessionalNames(supabase);
const currentMember = workspaceMembers.find(
  ({ profile }) => profile.id === currentProfile.id,
);

let canManageInvitations = false;
let canManageCapabilities = false;

try {
  const workspace = await getCurrentWorkspaceContext(supabase);

  canManageInvitations =
    workspace.companyId === companyId &&
    canInviteWorkspaceMembers({
      workspaceRole: workspace.workspaceRole,
      membershipStatus: workspace.membershipStatus,
    });

  canManageCapabilities =
    workspace.companyId === companyId &&
    canManageCompanyWorkspace({
      workspaceRole: workspace.workspaceRole,
      membershipStatus: workspace.membershipStatus,
    });
} catch (error) {
  if (
    !(
      error instanceof WorkspaceContextError &&
      error.code === "UNAUTHENTICATED"
    )
  ) {
    console.error(
      "Workspace context lookup failed for invitation authority.",
      {
        companyId,
        userId: currentProfile.id,
        error,
      },
    );
  }
}

const ownJobTitle = currentMember?.membership?.job_title || "";
const ownEmail =
  currentProfile.email || user.email || "";
const ownIdentity = formatMemberIdentity({
  firstName: ownNames.firstName,
  lastName: ownNames.lastName,
  jobTitle: ownJobTitle,
  email: ownEmail,
});
const workspaceRoleLabel = getWorkspaceRoleLabel(
  currentMember?.membership?.workspace_role,
);

const readinessScore = getWorkspaceReadiness({
memberCount: memberList.length,
hasOwner,
hasCompanyProfile,
rfqCount: rfqCount || 0,
activityCount: activityList.length,
pendingInviteCount: pendingInvitations.length,
});

const workspaceStage = getWorkspaceStage(readinessScore, rfqCount || 0);
const workspaceMessage = getWorkspaceMessage(workspaceStage);

const governanceMessage = getGovernanceMessage({
hasOwner,
adminCount: admins.length,
pendingInviteCount: pendingInvitations.length,
});

let companyCapabilities = createEmptyGroupedCapabilities();
let companyQualifications = createEmptyGroupedQualifications();
let companyCompliance = createEmptyGroupedCompliance();
let companyDocuments: CompanyDocumentRecord[] = [];

try {
  companyCapabilities = await loadCompanyCapabilities(supabase, companyId);
} catch (error) {
  console.error("Company capabilities lookup failed.", {
    companyId,
    userId: currentProfile.id,
    error,
  });
}

try {
  companyQualifications = await loadCompanyQualifications(supabase, companyId);
} catch (error) {
  console.error("Company qualifications lookup failed.", {
    companyId,
    userId: currentProfile.id,
    error,
  });
}

try {
  companyCompliance = await loadCompanyCompliance(supabase, companyId);
} catch {
  console.error("Company compliance lookup failed.", {
    companyId,
    userId: currentProfile.id,
    errorCode: "COMPANY_COMPLIANCE_LOOKUP_FAILED",
  });
}

try {
  companyDocuments = await loadCompanyDocuments(supabase, companyId);
} catch {
  console.error("Company documents lookup failed.", {
    companyId,
    userId: currentProfile.id,
    errorCode: "COMPANY_DOCUMENTS_LOOKUP_FAILED",
  });
}

return (
<main className="relative min-h-screen overflow-hidden bg-[#07111F] text-white">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#07111F_0%,#07111F_45%,#020617_100%)]" />
<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

<div className={EXECUTIVE_PAGE_CLASS}>
<section className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Company Workspace
</p>

<h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
Company Workspace Settings
</h1>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
Manage company identity, access governance, team structure,
invitations, procurement readiness, and workspace launch
controls from one executive-grade command layer.
</p>
</div>

<div className="flex flex-wrap gap-3">
<Link
href="/dashboard"
className={`${EXECUTIVE_CTA_SECONDARY} min-h-12 px-5`}
>
Dashboard
</Link>

<Link
href="/rfq/new"
className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-5`}
>
Create RFQ
</Link>

<Link
href="/analytics"
className={`${EXECUTIVE_CTA_SECONDARY} min-h-12 px-5`}
>
Executive Analytics
</Link>
</div>
</div>
</section>

<CompanyCommandCenter
companyName={company.name?.trim() || "Company"}
companyStatus={company.status?.trim() || "Status not set"}
companyLogoUrl={company.logo_url}
companySlug={company.slug}
userIdentityFirstName={ownNames.firstName}
userIdentityLastName={ownNames.lastName}
userIdentityJobTitle={ownIdentity.jobTitle}
userIdentityEmail={ownEmail}
workspaceRoleLabel={workspaceRoleLabel}
readinessScore={readinessScore}
workspaceStage={workspaceStage}
workspaceMessage={workspaceMessage}
memberCount={memberList.length}
activeRfqCount={activeRfqCount || 0}
rfqCount={rfqCount || 0}
hasOwner={hasOwner}
hasCompanyProfile={hasCompanyProfile}
/>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<FooterMetric title="Total RFQs" value={rfqCount || 0} />
<FooterMetric title="Active RFQs" value={activeRfqCount || 0} />
<FooterMetric title="Quotes" value={quoteCount || 0} />
<FooterMetric title="Awards" value={awardedCount || 0} />
</section>

<CompanyGovernanceCenter
workspaceStage={workspaceStage}
governanceMessage={governanceMessage}
hasOwner={hasOwner}
adminCount={admins.length}
pendingInviteCount={pendingInvitations.length}
activityCount={activityList.length}
rfqCount={rfqCount || 0}
companyStatus={company.status?.trim() || "Status not set"}
category={company.category?.trim() || "Not specified"}
location={company.location?.trim() || "Location N/A"}
networkRole={company.network_role?.trim() || "Not specified"}
/>

<ExecutivePanel
  id="professional-identity"
  variant="operational"
  padding="lg"
  tone="gold"
  className="mt-8"
>
  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
    Account Identity
  </p>
  <h2 className="mt-3 text-3xl font-black text-white">
    Professional Identity
  </h2>
  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
    Confirm your name and title for this workspace. Email remains
    the account identifier and is shown as a fallback when a name
    is not yet stored.
  </p>
  <ProfessionalIdentitySettingsForm
    initialFirstName={ownNames.firstName || ""}
    initialLastName={ownNames.lastName || ""}
    initialJobTitle={ownJobTitle}
    email={ownEmail || "No email"}
  />
</ExecutivePanel>

<ExecutivePanel
  id="company-capabilities"
  variant="operational"
  padding="lg"
  tone="gold"
  className="mt-8"
>
  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
    Organization Profile
  </p>
  <h2 className="mt-3 text-3xl font-black text-white">
    Company Capabilities
  </h2>
  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
    Describe what your organization delivers and where it operates.
    Capabilities appear in your internal workspace and on your public
    company profile when approved.
  </p>
  <CompanyCapabilitiesEditor
    companyId={companyId}
    initialCapabilities={companyCapabilities}
    canEdit={canManageCapabilities}
  />
</ExecutivePanel>

<ExecutivePanel
  id="company-qualifications"
  variant="operational"
  padding="lg"
  tone="gold"
  className="mt-8"
>
  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
    Organization Profile
  </p>
  <h2 className="mt-3 text-3xl font-black text-white">
    Company Qualifications
  </h2>
  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
    Record licenses, certifications, accreditations, and registrations held by
    your organization. Public visibility is optional; credential identifiers
    remain workspace-only.
  </p>
  <CompanyQualificationsEditor
    companyId={companyId}
    initialQualifications={companyQualifications}
    canEdit={canManageCapabilities}
  />
</ExecutivePanel>

<ExecutivePanel
  id="company-compliance"
  variant="operational"
  padding="lg"
  tone="gold"
  className="mt-8"
>
  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
    Organization Governance
  </p>
  <h2 className="mt-3 text-3xl font-black text-white">
    Company Compliance
  </h2>
  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
    Record insurance, workers&rsquo; compensation, and safety standing held by
    your organization. Compliance stays inside this workspace and is never
    published to your public company profile.{" "}
    {COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE}
  </p>
  <CompanyComplianceEditor
    companyId={companyId}
    initialCompliance={companyCompliance}
    canEdit={canManageCapabilities}
  />
</ExecutivePanel>

<ExecutivePanel
  id="company-documents"
  variant="operational"
  padding="lg"
  tone="gold"
  className="mt-8"
>
  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
    Organization Governance
  </p>
  <h2 className="mt-3 text-3xl font-black text-white">
    Company Documents
  </h2>
  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
    Upload insurance, workers&rsquo; compensation, safety, qualification, and
    other governance evidence for this workspace. Documents stay inside this
    workspace and are never published to your public company profile.{" "}
    {COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE}
  </p>
  <CompanyDocumentsEditor
    companyId={companyId}
    initialDocuments={companyDocuments}
    canEdit={canManageCapabilities}
  />
</ExecutivePanel>

<CompanyMembersCenter
  company={company}
  currentProfile={currentProfile}
  workspaceMembers={workspaceMembers}
  pendingInvitations={pendingInvitations}
  activityList={activityList}
  adminsCount={admins.length}
  buyersCount={buyers.length}
  vendorsCount={vendors.length}
  hasOwner={hasOwner}
  canManage={canManage}
  canManageInvitations={canManageInvitations}
  canDelete={canDelete}
  workspaceStage={workspaceStage}
  governanceMessage={governanceMessage}
  pendingTransfer={pendingTransfer}
  pendingTransferFromEmail={pendingTransferFromEmail}
  pendingTransferToEmail={pendingTransferToEmail}
  siteUrl={SITE_URL}
/>
</div>
</main>
);
}

function WorkspaceUnavailable() {
return (
<SystemState
eyebrow="Workspace Access Required"
title="Company workspace unavailable."
description="You need to be signed in and connected to a company workspace before managing company account settings."
primaryHref="/login"
primaryLabel="Sign In"
secondaryHref="/dashboard"
secondaryLabel="Back to Dashboard"
/>
);
}

function CompanyNotFound() {
return (
<SystemState
eyebrow="Workspace Not Found"
title="We could not locate your company workspace."
description="Your account is signed in, but the connected company workspace could not be loaded securely."
primaryHref="/create-company"
primaryLabel="Create Workspace"
secondaryHref="/dashboard"
secondaryLabel="Back to Dashboard"
/>
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
className={EXECUTIVE_CTA_PRIMARY}
>
{primaryLabel}
</Link>

<Link
href={secondaryHref}
className={EXECUTIVE_CTA_SECONDARY}
>
{secondaryLabel}
</Link>
</div>
</section>
</main>
);
}

function FooterMetric({
title,
value,
}: {
title: string;
value: number | string;
}) {
return (
<div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-4xl font-black text-white">{value}</p>
</div>
);
}