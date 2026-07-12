import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveCommandStripCard } from "@/components/executive/workspace/executive-command-strip-card";

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
      className="mt-8"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            Procurement Operations
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            Portfolio Execution Workspace
          </h2>

          <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
            Operational classification, award decisions, and highest-value RFQs
            supporting the current executive procurement position.
          </p>
        </div>

        <ExecutiveBadge tone="neutral" size="md">
          {classification.status}
        </ExecutiveBadge>
      </div>

      <div className="mt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9BE8F8]">
          RFQ Classification Intelligence
        </p>

        <p className="mt-3 max-w-5xl text-sm font-semibold leading-7 text-slate-400">
          {classification.description}
        </p>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
          <div className="grid md:grid-cols-2 xl:grid-cols-4">
            {classification.scopeMetrics.map((metric) => (
              <ExecutiveCommandStripCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
          <div className="grid md:grid-cols-2 xl:grid-cols-5">
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
          eyebrow="Award Decisions"
          title="Recent Award Decisions"
          countLabel={`${recentAwards.length} Recorded`}
        >
          {recentAwards.length > 0 ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-black/15">
              {recentAwards.map((award) => (
                <div
                  key={award.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {award.title}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {award.location}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <p className="text-base font-black tabular-nums text-[#F5D77B]">
                      {award.amount}
                    </p>

                    <ExecutiveBadge tone="success" size="sm">
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
          eyebrow="Portfolio Value"
          title="Highest-Value RFQs"
          countLabel={`${highestValueRfqs.length} Available`}
        >
          {highestValueRfqs.length > 0 ? (
            <div className="divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-black/15">
              {highestValueRfqs.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={rfq.href}
                  className="group block px-4 py-4 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2CC4E8]/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white transition-colors group-hover:text-[#9BE8F8]">
                        {rfq.title}
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
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

                      <p className="text-base font-black tabular-nums text-[#F5D77B]">
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
  countLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            {eyebrow}
          </p>

          <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
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
    <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.025] px-5 py-8 text-center">
      <p className="text-sm font-bold text-slate-500">{message}</p>
    </div>
  );
}