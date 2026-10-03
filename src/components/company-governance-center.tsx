import Link from "next/link";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_CYAN,
} from "@/lib/design-system/executive-contract";

type CompanyGovernanceCenterProps = {
  workspaceStage: string;
  governanceMessage: string;
  hasOwner: boolean;
  adminCount: number;
  pendingInviteCount: number;
  activityCount: number;
  rfqCount: number;
  companyStatus: string;
  category: string;
  location: string;
  networkRole: string;
};

export default function CompanyGovernanceCenter({
  workspaceStage,
  governanceMessage,
  hasOwner,
  adminCount,
  pendingInviteCount,
  activityCount,
  rfqCount,
  companyStatus,
  category,
  location,
  networkRole,
}: CompanyGovernanceCenterProps) {
  return (
    <>
      <ExecutivePanel
        variant="operational"
        padding="lg"
        tone="gold"
        className="mt-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="np-type-eyebrow text-nexus-gold">
              Governance & Access Center
            </p>

            <h2 className="np-type-h2 mt-3 text-nexus-white">
              Workspace Governance Overview
            </h2>

            <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
              Nexus Pavilion monitors ownership, admin coverage, invitations,
              audit activity, and procurement readiness without alarming new
              users with unnecessary critical warnings.
            </p>
          </div>

          <div className="shrink-0 rounded-executive border border-nexus-gold/20 bg-nexus-gold/10 px-6 py-5 text-nexus-white">
            <p className="np-type-meta text-nexus-gold">Workspace Stage</p>
            <p className="mt-2 text-3xl font-black">{workspaceStage}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SecurityCheck
            label="Owner"
            status={hasOwner ? "Active" : "Missing"}
          />

          <SecurityCheck
            label="Admin Coverage"
            status={
              adminCount >= 2
                ? "Strong"
                : adminCount === 1
                  ? "Healthy"
                  : "Owner Only"
            }
          />

          <SecurityCheck
            label="Audit Logging"
            status={activityCount > 0 ? "Active" : "Ready"}
          />

          <SecurityCheck
            label="Invitations"
            status={
              pendingInviteCount > 0
                ? `${pendingInviteCount} Pending`
                : "Clear"
            }
          />

          <SecurityCheck
            label="Procurement"
            status={rfqCount > 0 ? "Active" : "Ready"}
          />
        </div>

        <div className="mt-6 rounded-executive border border-white/10 bg-black/20 p-5">
          <p className="np-type-body text-nexus-text-secondary">
            {governanceMessage}
          </p>
        </div>
      </ExecutivePanel>

      <ExecutivePanel
        aria-labelledby="policies-approval-controls-heading"
        variant="operational"
        padding="lg"
        tone="gold"
        className="mt-8"
      >
        <p className="np-type-eyebrow text-nexus-gold">
          Policies & Approval Controls
        </p>

        <h2
          id="policies-approval-controls-heading"
          className="np-type-h2 mt-3 text-nexus-white"
        >
          Policies & Approval Controls
        </h2>

        <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
          Authority is enforced within each business workflow. This overview
          explains where governance decisions occur without creating a second
          approval layer.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PolicyControlCard
            title="Workspace Access & Invitations"
            authority="Owner / Admin"
            purpose="Workspace membership, Access Levels, and company workspace invitations. These are company workspace invitations. They do not grant RFQ access."
            href="#invite-users"
            linkLabel="Open workspace invitations"
          />

          <PolicyControlCard
            title="Ownership Governance"
            authority="Current owner requests transfer; the designated recipient accepts or rejects"
            purpose="Membership-based ownership transfer is managed from Company Ownership & Controls. Emergency recovery is not operational."
            href="#governance"
            linkLabel="Open ownership controls"
          />

          <PolicyControlCard
            title="RFQ Access & Supplier Invitations"
            authority="Existing procurement authorization"
            purpose="RFQ creation, sourcing access, supplier invitations, and respondent access. RFQ invitations are separate from company workspace invitations."
            href="/rfq"
            linkLabel="Open RFQ access"
          />

          <PolicyControlCard
            title="Commercial Visibility"
            authority="RFQ access and blind-bid unlock rules"
            purpose="Quote access and commercial visibility are governed by RFQ access and blind-bid unlock rules. Quotation is not contract award."
            href="/rfq"
            linkLabel="Open commercial visibility"
          />

          <PolicyControlCard
            title="Contract Award Authorization"
            authority="Issuer Owner / Admin under existing award integrity rules"
            purpose="Contract award occurs from the RFQ commercial evaluation workflow. Award is not performed from company settings."
            href="/rfq"
            linkLabel="Open contract award workflow"
          />

          <PolicyControlCard
            title="Organization Verification"
            authority="Informational only"
            purpose={`Current organization verification state: ${companyStatus || "Status not set"}. This is a governance dependency, not a company self-approval control.`}
          />

          <PolicyControlCard
            title="Audit Trail"
            authority="Company-scoped history"
            purpose="Governance and procurement activity already recorded for this workspace. This overview does not create a second approval-history store."
            href="#activity-history"
            linkLabel="Open activity history"
          />
        </div>

        <p className="np-type-body mt-6 text-nexus-muted">
          Platform-governed verification controls are managed outside company
          workspace settings.
        </p>
      </ExecutivePanel>

      <section className="mt-8 grid gap-6 md:grid-cols-4">
        <InfoCard title="Category" value={category || "Not specified"} />
        <InfoCard title="Regional Hub" value={location || "Location N/A"} />
        <InfoCard title="Network Role" value={networkRole || "Not specified"} />
        <InfoCard
          title="Company Status"
          value={companyStatus || "Status not set"}
        />
      </section>
    </>
  );
}

function SecurityCheck({ label, status }: { label: string; status: string }) {
  return (
    <div className="rounded-executive border border-white/10 bg-black/20 p-5">
      <p className="np-type-meta text-nexus-muted">{label}</p>
      <p className="np-type-body mt-2 font-black text-nexus-white">{status}</p>
    </div>
  );
}

function PolicyControlCard({
  title,
  authority,
  purpose,
  href,
  linkLabel,
}: {
  title: string;
  authority: string;
  purpose: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-executive border border-white/10 bg-black/20 p-5">
      <h3 className="np-type-h3 min-w-0 break-words text-nexus-white">
        {title}
      </h3>

      <div className="mt-4 min-w-0">
        <p className="np-type-meta text-nexus-muted">Authority</p>
        <p className="np-type-body mt-2 min-w-0 break-words font-black text-nexus-text-secondary">
          {authority}
        </p>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <p className="np-type-meta text-nexus-muted">Governs</p>
        <p className="np-type-body mt-2 min-w-0 break-words text-pretty text-nexus-muted">
          {purpose}
        </p>
      </div>

      {href && linkLabel ? (
        <div className="mt-5">
          <p className="np-type-meta text-nexus-muted">
            Existing operational destination
          </p>
          <Link
            href={href}
            className={`mt-3 inline-flex min-h-11 items-center ${EXECUTIVE_CTA_SECONDARY} px-4 py-2 text-xs ${EXECUTIVE_FOCUS_CYAN}`}
          >
            {linkLabel}
          </Link>
        </div>
      ) : (
        <div className="mt-5">
          <p className="np-type-meta text-nexus-muted">
            Existing operational destination
          </p>
          <p className="np-type-body mt-2 text-nexus-text-secondary">
            No company-settings action. Platform-governed only.
          </p>
        </div>
      )}
    </article>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-panel border border-white/10 bg-white/[0.045] p-6 shadow-inner-executive backdrop-blur-xl">
      <p className="np-type-meta text-nexus-muted">{title}</p>
      <p className="np-type-body mt-3 min-w-0 break-words font-black text-nexus-white">
        {value}
      </p>
    </div>
  );
}
