import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveCommandStripCard } from "@/components/executive/workspace/executive-command-strip-card";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

type CommandStripMetric = {
  title: string;
  value: string;
};

type AwardDecision = {
  id: string;
  title: string;
  location: string;
  amount: string;
  status: string;
};

type HighestValueRfq = {
  id: string;
  title: string;
  href: string;
  location: string;
  scope: string;
  sourcingMethod: string;
  contractFramework: string;
  status: string;
  budget: string;
};

type ProcurementOperationsWorkspaceProps = {
  classification: {
    status: string;
    description: string;
    scopeMetrics: CommandStripMetric[];
    sourcingMetrics: CommandStripMetric[];
  };
  recentAwards: AwardDecision[];
  highestValueRfqs: HighestValueRfq[];
};

export function ProcurementOperationsWorkspace({
  classification,
  recentAwards,
  highestValueRfqs,
}: ProcurementOperationsWorkspaceProps) {
  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className="np-region-major"
      aria-labelledby="executive-pipeline-heading"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="np-type-eyebrow">Pipeline</p>
          <h2 id="executive-pipeline-heading" className="np-type-h2 mt-3">
            Portfolio execution
          </h2>
          <p className="np-type-body mt-3 max-w-4xl">
            Operational classification, recorded awards, and highest-value RFQs
            in the current workspace.
          </p>
        </div>

        <ExecutiveBadge tone="neutral" size="md">
          {classification.status}
        </ExecutiveBadge>
      </div>

      <div className="mt-6">
        <p className="np-type-meta text-nexus-cyan-bright">RFQ Classification</p>
        <p className="np-type-body mt-3 max-w-5xl">{classification.description}</p>

        <div className="mt-5 overflow-x-auto overflow-y-hidden rounded-executive border border-white/10 bg-white/[0.03]">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {classification.scopeMetrics.map((metric) => (
              <ExecutiveCommandStripCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto overflow-y-hidden rounded-executive border border-white/10 bg-white/[0.03]">
          <div className="grid sm:grid-cols-2 xl:grid-cols-5">
            {classification.sourcingMetrics.map((metric) => (
              <ExecutiveCommandStripCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 border-t border-white/10 pt-7 xl:grid-cols-2">
        <OperationalListSection
          eyebrow="Awards"
          title="Recent award decisions"
          headingId="executive-awards-heading"
          countLabel={`${recentAwards.length} Recorded`}
        >
          {recentAwards.length > 0 ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-executive border border-white/10 bg-black/15">
              {recentAwards.map((award) => (
                <div
                  key={award.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {award.title}
                    </p>
                    <p className="np-type-meta mt-1">{award.location}</p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <p className="np-type-kpi text-lg text-nexus-gold-bright">
                      {award.amount}
                    </p>
                    <ExecutiveBadge tone="awarded" size="sm">
                      {award.status}
                    </ExecutiveBadge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <OperationalEmptyState message="No award decisions have been recorded." />
          )}
        </OperationalListSection>

        <OperationalListSection
          eyebrow="RFQs"
          title="Highest-value RFQs"
          headingId="executive-rfqs-heading"
          countLabel={`${highestValueRfqs.length} Available`}
        >
          {highestValueRfqs.length > 0 ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-executive border border-white/10 bg-black/15">
              {highestValueRfqs.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={rfq.href}
                  className={`group block min-h-11 px-4 py-4 transition-colors hover:bg-white/[0.04] ${EXECUTIVE_FOCUS_CYAN}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white transition-colors group-hover:text-nexus-cyan-bright">
                        {rfq.title}
                      </p>
                      <p className="np-type-meta mt-1">
                        {rfq.scope} · {rfq.location}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ExecutiveBadge tone="neutral" size="sm">
                          {rfq.sourcingMethod}
                        </ExecutiveBadge>
                        <ExecutiveBadge tone="neutral" size="sm">
                          {rfq.contractFramework}
                        </ExecutiveBadge>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <ExecutiveBadge tone="neutral" size="sm">
                        {rfq.status}
                      </ExecutiveBadge>
                      <p className="np-type-kpi text-lg text-nexus-gold-bright">
                        {rfq.budget}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <OperationalEmptyState message="No RFQs are available for operational review." />
          )}
        </OperationalListSection>
      </div>
    </ExecutivePanel>
  );
}

function OperationalListSection({
  eyebrow,
  title,
  headingId,
  countLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  headingId: string;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="np-type-meta">{eyebrow}</p>
          <h3 id={headingId} className="mt-2 text-xl font-black text-white">
            {title}
          </h3>
        </div>
        <ExecutiveBadge tone="neutral" size="sm">
          {countLabel}
        </ExecutiveBadge>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OperationalEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-executive border border-dashed border-white/15 bg-white/[0.025] px-5 py-8 text-center">
      <p className="np-type-body">{message}</p>
    </div>
  );
}
