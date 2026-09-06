import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { getSafeNextPath } from "@/lib/auth/login-continuation";
import {
  getActiveMembershipForUserCompany,
  type OrganizationMembership,
} from "@/lib/auth/membership";
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
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

      <div className="mx-auto w-full max-w-[1680px]">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
                Procurement Center
              </p>

              <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
                {marketplace.title}
              </h1>

              <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                {marketplace.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
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

            <div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[520px]">
              <HeroMetric
                title={marketplace.hero.primaryLabel}
                value={marketplace.hero.primaryValue}
              />

              <HeroMetric
                title="Procurement Health"
                value={marketplace.hero.health}
              />

              <HeroMetric
                title={marketplace.hero.openLabel}
                value={marketplace.hero.openValue}
              />

              <HeroMetric
                title={marketplace.hero.budgetLabel}
                value={marketplace.hero.budgetValue}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {marketplace.canCreateRfq ? (
              <Link
                href="/rfq/new"
                className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
              >
                Create RFQ
              </Link>
            ) : null}

            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-white/[0.055] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
            >
              Dashboard
            </Link>

            <Link
              href="/analytics"
              className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-6 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
            >
              Executive Analytics
            </Link>
          </div>
        </section>

        {invitationRoutingStatus ? (
          <section
            id="network-invitation-routing"
            className="mt-8 rounded-[30px] border border-[#2CC4E8]/20 bg-[#2CC4E8]/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-8"
            data-network-invitation-routing={invitationRoutingStatus}
          >
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
              Network Invitation Handoff
            </p>

            {invitationRoutingStatus === "ready" && invitationTarget ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-white sm:text-3xl">
                    Select a company-managed RFQ for {invitationTarget.name}
                  </h2>
                  <ExecutiveBadge tone="blue">
                    {invitationTarget.network_role || "Network Company"}
                  </ExecutiveBadge>
                </div>

                <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
                  Choose a company-managed RFQ below. Selecting an RFQ opens
                  its workspace; the existing secure email invitation form is
                  shown only while the RFQ remains open under its deadline and
                  governance controls. No invitation is sent from Company Network.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
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
                <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                  Sourcing authorization required
                </h2>
                <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
                  Supplier invitations are available only to active organization
                  owners, administrators, or non-viewer users assigned the buyer
                  procurement function.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                  Invitation target unavailable
                </h2>
                <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
                  The selected network company is unavailable for this handoff.
                  Return to Company Network and select another relevant company.
                </p>
              </>
            )}
          </section>
        ) : null}

        <MetricGrid metrics={marketplace.statusMetrics} />

        <MetricGrid
          metrics={marketplace.scopeMetrics}
          compact
        />

        <MetricGrid
          metrics={marketplace.sourcingMetrics}
          compact
        />

        <section className="mt-10 rounded-[36px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
                Procurement Pipeline
              </p>

              <h2 className="mt-3 text-3xl font-black text-white">
                {marketplace.pipelineTitle}
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
                {marketplace.pipelineDescription}
              </p>
            </div>

            <ExecutiveBadge tone="blue">
              {marketplace.records.length} Records
            </ExecutiveBadge>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
        </section>
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
      className={`group min-w-0 rounded-[30px] border border-white/10 bg-[#061426]/72 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition hover:border-[#2CC4E8]/25 hover:bg-[#07111F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 break-words text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
          {rfq.category || "Procurement"}
        </p>

        <div className="shrink-0">
          <ExecutiveBadge tone={getStatusTone(rfq.status)}>
            {getStatusLabel(rfq.status)}
          </ExecutiveBadge>
        </div>
      </div>

      <h2 className="mt-4 break-words text-2xl font-black leading-tight text-white">
        {rfq.title || "Untitled RFQ"}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{getScopeLabel(rfq.procurement_scope)}</Badge>

        <Badge>
          {getSourcingLabel(rfq.sourcing_method)}
        </Badge>

        <Badge>
          {getFrameworkLabel(rfq.contract_framework)}
        </Badge>
      </div>

      <p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-slate-400">
        {rfq.description || "No description provided."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <SignalBlock
          label="Location"
          value={rfq.location || "N/A"}
        />

        <SignalBlock
          label="Budget"
          value={
            record.canViewBudget
              ? getBudgetLabel(rfq.budget)
              : "Commercially Sealed"
          }
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ExecutiveBadge
          tone={getParticipantRoleTone(
            record.participantRole,
          )}
        >
          {getParticipantRoleLabel(record.participantRole)}
        </ExecutiveBadge>

        <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
          {getAccessLabel(record.accessReason, mode)}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <span className="text-sm font-black text-[#9BE8F8] transition group-hover:translate-x-1">
          {canSelectForInvitation
            ? "Open RFQ workspace →"
            : getActionLabel(rfq.status)}
        </span>
      </div>
    </Link>
  );
}

function MetricGrid({
  metrics,
  compact = false,
}: {
  metrics: {
    label: string;
    value: number;
  }[];
  compact?: boolean;
}) {
  return (
    <section
      className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${
        compact ? "mt-6" : "mt-8"
      }`}
    >
      {metrics.map((metric) => (
        <StatusCard
          key={metric.label}
          title={metric.label}
          value={metric.value}
        />
      ))}
    </section>
  );
}

function HeroMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#061426]/75 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className="mt-2 break-words text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function StatusCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
      {children}
    </span>
  );
}

function SignalBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-white">
        {value}
      </p>
    </div>
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
    <div className="rounded-[30px] border border-dashed border-white/15 bg-white/[0.035] p-10 text-center">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
        Procurement Pipeline
      </p>

      <h2 className="mt-4 text-3xl font-black text-white">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
        {description}
      </p>

      {canCreate ? (
        <Link
          href="/rfq/new"
          className="mt-7 inline-flex rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
        >
          Create RFQ
        </Link>
      ) : null}
    </div>
  );
}