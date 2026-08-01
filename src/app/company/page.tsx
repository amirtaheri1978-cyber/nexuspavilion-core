import Image from "next/image";
import Link from "next/link";

import CompanyMembersCenter from "@/components/company-members-center";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import {
  canDeleteCompanyWorkspace,
  canManageCompanyWorkspace,
} from "@/lib/authorization/workspace-permissions";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

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
  role: string | null;
  company_id: string | null;
  created_at?: string | null;
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

function getWorkspaceRoleLabel(role: string | null | undefined) {
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

    console.error("Company workspace context lookup failed.", error);

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
    membersResult,
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
     * MemberActions and invitation UI still use the legacy profile role
     * until workspace role and procurement function are fully separated.
     */
    supabase
      .from("profiles")
      .select("id, email, role, company_id, created_at")
      .eq("id", workspace.userId)
      .maybeSingle(),

    /*
     * Temporary legacy member source.
     * This will migrate to organization_memberships in a later bundle.
     */
    supabase
      .from("profiles")
      .select("id, email, role, company_id, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),

    supabase
      .from("invitations")
      .select(
        "id, company_id, email, role, status, token, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(12),

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

  if (currentProfileResult.error || !currentProfileResult.data) {
    console.error("Legacy profile compatibility lookup failed.", {
      userId: workspace.userId,
      error: currentProfileResult.error,
    });

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

  if (membersResult.error) {
    console.error("Company members lookup failed.", {
      companyId,
      userId: workspace.userId,
      error: membersResult.error,
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
   * CompanyMembersCenter is a workspace-governance UI.
   * Give it the authoritative workspace role for current-user controls,
   * while member rows remain on legacy roles during migration.
   */
  const currentProfile: Profile = {
    ...legacyCurrentProfile,
    role:
      workspace.workspaceRole ??
      legacyCurrentProfile.role,
    company_id: companyId,
  };

  const members = (membersResult.data ?? []) as Profile[];
  const invitations =
    (invitationsResult.data ?? []) as Invitation[];
  const activityList =
    (auditResult.data ?? []) as AuditLog[];

  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending",
  );

  const adminsCount = members.filter(
    (member) => member.role === "admin",
  ).length;

  const buyersCount = members.filter(
    (member) => member.role === "buyer",
  ).length;

  const vendorsCount = members.filter(
    (member) => member.role === "vendor",
  ).length;

  const hasOwner = members.some(
    (member) => member.role === "owner",
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

  const workspaceStage =
    workspace.membershipStatus === "active"
      ? "Active"
      : workspace.membershipStatus || "Pending";

  const governanceMessage = canManage
    ? "Your active workspace membership allows organization administration."
    : "Your workspace membership currently provides read-only access.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="mx-auto w-full max-w-[1680px] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard"
            className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
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
              className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.01]"
            >
              Open Marketplace
            </Link>
          </div>
        </div>

        <section className="rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
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
                  <h1 className="text-5xl font-black tracking-[-0.05em] text-white">
                    {company.name || "Company"}
                  </h1>

                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-1 text-sm font-black capitalize text-emerald-300">
                    {company.status || "provisional"}
                  </span>
                </div>

                <p className="mt-3 text-lg font-semibold text-slate-300">
                  {company.category || "Enterprise"} ·{" "}
                  {company.location || "Location N/A"}
                </p>

                <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                  Signed in as{" "}
                  {workspace.email ||
                    currentProfile.email ||
                    "Workspace Member"}{" "}
                  · {workspaceRoleLabel}
                </p>
              </div>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-4">
              <MiniMetric
                title="Team Members"
                value={members.length}
              />

              <MiniMetric
                title="Pending Invites"
                value={pendingInvitationCount}
              />

              <MiniMetric
                title="Admins"
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
              value={company.category || "N/A"}
            />

            <InfoCard
              title="Location"
              value={company.location || "N/A"}
            />

            <InfoCard
              title="Network Role"
              value={
                company.network_role ||
                "Enterprise Workspace"
              }
            />
          </div>
        </section>

        <CompanyMembersCenter
          company={company}
          currentProfile={currentProfile}
          members={members}
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

      <section className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-white/[0.065] p-8 text-center shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
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
            className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01]"
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
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
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
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}