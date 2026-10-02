import Link from "next/link";
import { redirect } from "next/navigation";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { getSafeNextPath } from "@/lib/auth/login-continuation";
import {
  getActiveMembershipForUserCompany,
  type OrganizationMembership,
} from "@/lib/auth/membership";
import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_EMPTY_ACTION,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_EYEBROW,
  EXECUTIVE_EMPTY_FULL,
  EXECUTIVE_EMPTY_LIVE,
  EXECUTIVE_EMPTY_ROLE,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import type {
  ProcurementContractFramework,
  ProcurementRfq,
  ProcurementSourcingMethod,
  RfqAccessReason,
} from "@/lib/procurement/rfq-access-contract";
import { getProcurementContext } from "@/lib/procurement/procurement-context-repository";
import { canInviteCompanySuppliers } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";
import {
  buildProcurementMarketplaceViewModel,
  type MarketplaceRecord,
} from "@/lib/procurement/marketplace-view-model";

type PageProps = {
  searchParams: Promise<{
    inviteCompanyId?: string | string[];
  }>;
};

type InvitationTargetCompany = {
  id: string;
  name: string;
  network_role: string | null;
};

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type ProcurementScope =
  | "material"
  | "subcontractor"
  | "equipment"
  | "professional_service";

const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
  material: "Material / Product",
  subcontractor: "Subcontractor / Trade",
  equipment: "Equipment Rental",
  professional_service: "Professional Service",
};

const SOURCING_METHOD_LABELS: Record<
  "open" | "invited" | "sealed_bid",
  string
> = {
  open: "Open Tender",
  invited: "Invited / Selective",
  sealed_bid: "Sealed Bid",
};

const CONTRACT_FRAMEWORK_LABELS: Record<
  "project_specific" | "framework",
  string
> = {
  project_specific: "Project Specific",
  framework: "Framework Agreement",
};

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getStatusLabel(status: string | null) {
  const normalizedStatus = normalize(status);

  if (normalizedStatus === "awarded") return "Awarded";
  if (normalizedStatus === "closed") return "Closed";

  return "Open";
}

function getStatusTone(
  status: string | null,
): "success" | "warning" | "neutral" {
  const normalizedStatus = normalize(status);

  if (normalizedStatus === "awarded") return "success";
  if (normalizedStatus === "closed") return "neutral";

  return "warning";
}

function getActionLabel(status: string | null) {
  const normalizedStatus = normalize(status);

  if (normalizedStatus === "awarded") return "View Award →";
  if (normalizedStatus === "closed") return "View Closed →";

  return "Open →";
}

function getProcurementScope(
  value: ProcurementRfq["procurement_scope"],
): ProcurementScope {
  const normalizedValue = normalize(value);

  if (
    normalizedValue === "material" ||
    normalizedValue === "equipment" ||
    normalizedValue === "professional_service"
  ) {
    return normalizedValue;
  }

  return "subcontractor";
}

function getSourcingMethod(
  value: ProcurementSourcingMethod,
): "open" | "invited" | "sealed_bid" {
  const normalizedValue = normalize(value);

  if (
    normalizedValue === "open" ||
    normalizedValue === "sealed_bid"
  ) {
    return normalizedValue;
  }

  return "invited";
}

function getContractFramework(
  value: ProcurementContractFramework,
): "project_specific" | "framework" {
  return normalize(value) === "framework"
    ? "framework"
    : "project_specific";
}

function getScopeLabel(
  value: ProcurementRfq["procurement_scope"],
) {
  return PROCUREMENT_SCOPE_LABELS[getProcurementScope(value)];
}

function getSourcingLabel(value: ProcurementSourcingMethod) {
  return SOURCING_METHOD_LABELS[getSourcingMethod(value)];
}

function getFrameworkLabel(
  value: ProcurementContractFramework,
) {
  return CONTRACT_FRAMEWORK_LABELS[
    getContractFramework(value)
  ];
}

function getBudgetLabel(
  value: number | string | null | undefined,
) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Not specified";
  }

  return `$${amount.toLocaleString()}`;
}

function getAccessLabel(
  accessReason: RfqAccessReason,
  mode: "buyer" | "supplier",
) {
  if (mode === "buyer") return "Company Managed";

  const labels: Record<RfqAccessReason, string> = {
    owned: "Company Managed",
    public: "Open Marketplace",
    direct_invitation: "Direct Invitation",
    company_invitation: "Company Invitation",
    existing_participation: "Existing Participation",
  };

  return labels[accessReason];
}

function getParticipantRoleLabel(
  participantRole: MarketplaceRecord["participantRole"],
) {
  return participantRole === "issuer"
    ? "Issuing Organization"
    : "Responding Organization";
}

function getParticipantRoleTone(
  participantRole: MarketplaceRecord["participantRole"],
): "success" | "blue" {
  return participantRole === "issuer"
    ? "success"
    : "blue";
}

export default async function RFQMarketplacePage({
  searchParams,
}: PageProps) {
  const { inviteCompanyId: inviteCompanyIdParam } = await searchParams;
  const inviteCompanyId = readSingleSearchParam(inviteCompanyIdParam).trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(getSafeNextPath("/rfq"))}`);
  }

  const context = await getProcurementContext();

  const marketplace =
    buildProcurementMarketplaceViewModel(context);

  let sourcingMembership: OrganizationMembership | null = null;

  if (context.identity.companyId) {
    try {
      sourcingMembership = await getActiveMembershipForUserCompany(
        supabase,
        user.id,
        context.identity.companyId,
      );
    } catch (membershipError) {
      console.error("RFQ invitation routing membership lookup failed.", {
        userId: user.id,
        companyId: context.identity.companyId,
        error: membershipError,
      });
    }
  }

  const canRouteNetworkInvitation = canInviteCompanySuppliers(
    sourcingMembership,
    context.identity.companyId ?? "",
  );
  const networkInvitationRequested = Boolean(inviteCompanyId);
  let invitationTarget: InvitationTargetCompany | null = null;

  if (networkInvitationRequested && canRouteNetworkInvitation) {
    const { data: invitationTargetData, error: invitationTargetError } =
      await supabase
        .from("company_directory")
        .select("id, name, network_role")
        .eq("id", inviteCompanyId)
        .in("status", ["approved", "verified"])
        .limit(1)
        .maybeSingle();

    if (invitationTargetError) {
      console.error("Network invitation target lookup failed.", {
        inviteCompanyId,
        error: invitationTargetError,
      });
    } else if (
      invitationTargetData &&
      invitationTargetData.id !== context.identity.companyId
    ) {
      invitationTarget = invitationTargetData as InvitationTargetCompany;
    }
  }

  const invitationRoutingStatus = !networkInvitationRequested
    ? null
    : !canRouteNetworkInvitation
      ? "unauthorized"
      : invitationTarget
        ? "ready"
        : "unavailable";

  return (
    <main className="min-h-screen bg-nexus-navy text-white">
      <div className={EXECUTIVE_PAGE_CLASS}>
        <ExecutivePanel
          variant="executive"
          padding="lg"
          tone="gold"
          className="np-region-major"
          aria-labelledby="procurement-center-heading"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="np-type-eyebrow">Procurement Center</p>

              <h1
                id="procurement-center-heading"
                className="np-type-h1 mt-3 max-w-5xl text-pretty"
              >
                {marketplace.title}
              </h1>

              <p className="np-type-body mt-4 max-w-4xl text-pretty text-nexus-text-secondary">
                {marketplace.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <ExecutiveBadge tone="blue">
                  {marketplace.experienceLabel}
                </ExecutiveBadge>

                <ExecutiveBadge
                  tone={
                    marketplace.records.length > 0
                      ? "success"
                      : "warning"
                  }
                >
                  {marketplace.availabilityLabel}
                </ExecutiveBadge>

                <ExecutiveBadge tone="neutral">
                  {marketplace.contextLabel}
                </ExecutiveBadge>
              </div>
            </div>

            <div className="grid min-w-0 w-full gap-3 sm:grid-cols-2 xl:max-w-xl">
              <ExecutiveMetricCard
                label={marketplace.hero.primaryLabel}
                value={marketplace.hero.primaryValue}
                tone="gold"
              />
              <ExecutiveMetricCard
                label="Procurement Health"
                value={marketplace.hero.health}
                tone="blue"
              />
              <ExecutiveMetricCard
                label={marketplace.hero.openLabel}
                value={marketplace.hero.openValue}
                tone="neutral"
              />
              <ExecutiveMetricCard
                label={marketplace.hero.budgetLabel}
                value={marketplace.hero.budgetValue}
                tone="neutral"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {marketplace.canCreateRfq ? (
              <Link href="/rfq/new" className={EXECUTIVE_BUTTON_PRIMARY}>
                Create RFQ
              </Link>
            ) : null}

            <Link href="/dashboard" className={EXECUTIVE_BUTTON_SECONDARY}>
              Dashboard
            </Link>

            <Link href="/analytics" className={EXECUTIVE_BUTTON_TERTIARY}>
              Executive Analytics
            </Link>
          </div>
        </ExecutivePanel>

        {invitationRoutingStatus ? (
          <ExecutivePanel
            id="network-invitation-routing"
            variant="operational"
            padding="lg"
            tone={
              invitationRoutingStatus === "ready"
                ? "blue"
                : invitationRoutingStatus === "unauthorized"
                  ? "risk"
                  : "gold"
            }
            className="np-region"
            data-network-invitation-routing={invitationRoutingStatus}
            aria-labelledby="network-invitation-routing-heading"
          >
            <p className="np-type-eyebrow">Network Invitation Handoff</p>

            {invitationRoutingStatus === "ready" && invitationTarget ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2
                    id="network-invitation-routing-heading"
                    className="np-type-h2 min-w-0 text-pretty"
                  >
                    Select a company-managed RFQ for {invitationTarget.name}
                  </h2>
                  <ExecutiveBadge tone="blue">
                    {invitationTarget.network_role || "Network Company"}
                  </ExecutiveBadge>
                </div>

                <p className="np-type-body mt-3 max-w-4xl text-pretty text-nexus-text-secondary">
                  Choose a company-managed RFQ below. Selecting an RFQ opens
                  its workspace; the existing secure email invitation form is
                  shown only while the RFQ remains open under its deadline and
                  governance controls. No invitation is sent from Company Network.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ExecutiveBadge tone="success">
                    {context.buyer.openOwnedRfqs.length} Open-Status Company RFQs
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral">
                    Existing Invitation Flow
                  </ExecutiveBadge>
                </div>
              </>
            ) : invitationRoutingStatus === "unauthorized" ? (
              <>
                <h2
                  id="network-invitation-routing-heading"
                  className="np-type-h2 mt-3 text-pretty"
                >
                  Sourcing authorization required
                </h2>
                <p className="np-type-body mt-3 max-w-4xl text-pretty text-nexus-text-secondary">
                  Supplier invitations are available only to active organization
                  owners, administrators, or non-viewer users assigned the buyer
                  procurement function.
                </p>
              </>
            ) : (
              <>
                <h2
                  id="network-invitation-routing-heading"
                  className="np-type-h2 mt-3 text-pretty"
                >
                  Invitation target unavailable
                </h2>
                <p className="np-type-body mt-3 max-w-4xl text-pretty text-nexus-text-secondary">
                  The selected network company is unavailable for this handoff.
                  Return to Company Network and select another relevant company.
                </p>
              </>
            )}
          </ExecutivePanel>
        ) : null}

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="np-region"
          aria-labelledby="operating-snapshot-heading"
        >
          <div className="min-w-0">
            <p className="np-type-eyebrow">Operating Snapshot</p>
            <h2
              id="operating-snapshot-heading"
              className="np-type-h2 mt-2 text-pretty"
            >
              Current procurement mix
            </h2>
            <p className="np-type-body mt-2 max-w-3xl text-pretty text-nexus-text-secondary">
              Recorded status, scope, and sourcing totals for the current
              accessible portfolio.
            </p>
          </div>

          <section
            className="mt-5"
            aria-labelledby="status-metrics-heading"
          >
            <h3 id="status-metrics-heading" className="np-type-h3 text-pretty">
              Current work / status
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {marketplace.statusMetrics.map((metric) => (
                <ExecutiveMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={String(metric.value)}
                  tone="neutral"
                />
              ))}
            </div>
          </section>

          <section
            className="mt-5 border-t border-white/10 pt-5"
            aria-labelledby="scope-metrics-heading"
          >
            <h3 id="scope-metrics-heading" className="np-type-h3 text-pretty">
              Procurement scope mix
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {marketplace.scopeMetrics.map((metric) => (
                <ExecutiveMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={String(metric.value)}
                  tone="blue"
                />
              ))}
            </div>
          </section>

          <section
            className="mt-5 border-t border-white/10 pt-5"
            aria-labelledby="sourcing-metrics-heading"
          >
            <h3
              id="sourcing-metrics-heading"
              className="np-type-h3 text-pretty"
            >
              Sourcing / framework mix
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {marketplace.sourcingMetrics.map((metric) => (
                <ExecutiveMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={String(metric.value)}
                  tone="gold"
                />
              ))}
            </div>
          </section>
        </ExecutivePanel>

        <ExecutivePanel
          variant="boardroom"
          padding="lg"
          tone="blue"
          className="np-region-major"
          aria-labelledby="procurement-pipeline-heading"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="np-type-eyebrow">Procurement Pipeline</p>

              <h2
                id="procurement-pipeline-heading"
                className="np-type-h2 mt-2 text-pretty"
              >
                {marketplace.pipelineTitle}
              </h2>

              <p className="np-type-body mt-2 max-w-3xl text-pretty text-nexus-text-secondary">
                {marketplace.pipelineDescription}
              </p>
            </div>

            <div className="shrink-0">
              <ExecutiveBadge tone="blue">
                {marketplace.records.length} Records
              </ExecutiveBadge>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {marketplace.records.length > 0 ? (
              marketplace.records.map((record) => (
                <MarketplaceCard
                  key={record.rfq.id}
                  record={record}
                  mode={marketplace.mode}
                  invitationTarget={
                    invitationRoutingStatus === "ready"
                      ? invitationTarget
                      : null
                  }
                />
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  title={marketplace.emptyState.title}
                  description={
                    marketplace.emptyState.description
                  }
                  canCreate={marketplace.canCreateRfq}
                />
              </div>
            )}
          </div>
        </ExecutivePanel>
      </div>
    </main>
  );
}

function MarketplaceCard({
  record,
  mode,
  invitationTarget,
}: {
  record: MarketplaceRecord;
  mode: "buyer" | "supplier";
  invitationTarget: InvitationTargetCompany | null;
}) {
  const { rfq } = record;
  const normalizedStatus = normalize(rfq.status);
  const canSelectForInvitation =
    Boolean(invitationTarget) &&
    record.participantRole === "issuer" &&
    (normalizedStatus === "" || normalizedStatus === "open");
  const href = canSelectForInvitation
    ? `/rfq/${rfq.slug}#supplier-invitations`
    : `/rfq/${rfq.slug}`;

  return (
    <Link
      href={href}
      className={[
        "group flex h-full min-h-11 min-w-0 flex-col rounded-executive border border-white/10 bg-white/[0.045] p-5",
        "transition-[border-color,background-color] duration-200",
        "hover:border-nexus-cyan/25 hover:bg-white/[0.06]",
        "motion-reduce:transition-none",
        EXECUTIVE_FOCUS_CYAN,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="np-type-meta min-w-0 break-words text-nexus-gold-bright">
          {rfq.category || "Procurement"}
        </p>

        <div className="shrink-0">
          <ExecutiveBadge tone={getStatusTone(rfq.status)}>
            {getStatusLabel(rfq.status)}
          </ExecutiveBadge>
        </div>
      </div>

      <h3 className="np-type-h3 mt-3 min-w-0 text-pretty break-words">
        {rfq.title || "Untitled RFQ"}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        <ExecutiveBadge tone="neutral" size="sm">
          {getScopeLabel(rfq.procurement_scope)}
        </ExecutiveBadge>

        <ExecutiveBadge tone="neutral" size="sm">
          {getSourcingLabel(rfq.sourcing_method)}
        </ExecutiveBadge>

        <ExecutiveBadge tone="neutral" size="sm">
          {getFrameworkLabel(rfq.contract_framework)}
        </ExecutiveBadge>
      </div>

      <p className="np-type-body mt-3 line-clamp-3 text-pretty text-nexus-text-muted">
        {rfq.description || "No description provided."}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-3">
          <p className="np-type-meta">Location</p>
          <p className="np-type-kpi mt-2 break-words text-sm">
            {rfq.location || "N/A"}
          </p>
        </div>

        <div className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-3">
          <p className="np-type-meta">Budget</p>
          <p className="np-type-kpi mt-2 break-words text-sm">
            {record.canViewBudget
              ? getBudgetLabel(rfq.budget)
              : "Commercially Sealed"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ExecutiveBadge
          tone={getParticipantRoleTone(
            record.participantRole,
          )}
        >
          {getParticipantRoleLabel(record.participantRole)}
        </ExecutiveBadge>

        <ExecutiveBadge tone="neutral" size="sm">
          {getAccessLabel(record.accessReason, mode)}
        </ExecutiveBadge>
      </div>

      <div className="mt-auto flex items-center justify-end pt-4">
        <span className="inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
          {canSelectForInvitation
            ? "Open RFQ workspace →"
            : getActionLabel(rfq.status)}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  canCreate,
}: {
  title: string;
  description: string;
  canCreate: boolean;
}) {
  return (
    <div
      className={EXECUTIVE_EMPTY_FULL}
      role={EXECUTIVE_EMPTY_ROLE}
      aria-live={EXECUTIVE_EMPTY_LIVE}
    >
      <p className={EXECUTIVE_EMPTY_EYEBROW}>
        Procurement Pipeline
      </p>

      <h3 className={EXECUTIVE_EMPTY_TITLE}>
        {title}
      </h3>

      <p className={EXECUTIVE_EMPTY_BODY}>
        {description}
      </p>

      {canCreate ? (
        <Link
          href="/rfq/new"
          className={EXECUTIVE_EMPTY_ACTION}
        >
          Create RFQ
        </Link>
      ) : null}
    </div>
  );
}
