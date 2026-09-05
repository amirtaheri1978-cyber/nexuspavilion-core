import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveCommandMetric } from "@/components/executive/workspace/executive-command-metric";
import { ExecutiveCommandStripCard } from "@/components/executive/workspace/executive-command-strip-card";

type SupplierCommandMetric = {
  title: string;
  value: string;
  detail: string;
  accentClassName: string;
};

type SupplierCommandStripItem = {
  title: string;
  value: string;
};

type SupplierCommandCenterProps = {
  historyStatus: string;
  submittedQuotes: number;
  awardedQuotes: number;
  pendingDecisions: number;
  winRate: number;
  executiveBrief: string;
  nextBestAction: string;
  commandMetrics: SupplierCommandMetric[];
  stripItems: SupplierCommandStripItem[];
};

function getHistoryTone(
  status: string,
): "success" | "blue" | "gold" | "warning" {
  if (status === "Established Quote History") {
    return "success";
  }

  if (status === "Limited Quote History") {
    return "blue";
  }

  if (status === "No Award History") {
    return "gold";
  }

  return "warning";
}

export function SupplierCommandCenter({
  historyStatus,
  submittedQuotes,
  awardedQuotes,
  pendingDecisions,
  winRate,
  executiveBrief,
  nextBestAction,
  commandMetrics,
  stripItems,
}: SupplierCommandCenterProps) {
  return (
    <section className="overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-nexus-white shadow-[0_30px_100px_rgba(2,6,23,0.28)]">
      <div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-nexus-gold">
              Supplier Command Center
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ExecutiveBadge tone={getHistoryTone(historyStatus)} size="md">
                {historyStatus}
              </ExecutiveBadge>

              <ExecutiveBadge tone="blue" size="md">
                {submittedQuotes} Submitted
              </ExecutiveBadge>

              <ExecutiveBadge
                tone={awardedQuotes > 0 ? "success" : "warning"}
                size="md"
              >
                {awardedQuotes} Awarded
              </ExecutiveBadge>
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight text-nexus-white sm:text-5xl lg:text-6xl">
              Supplier Performance Workspace
            </h1>

            <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Monitor quotation activity, award outcomes, pending decisions,
              open RFQ coverage, and commercial participation from one
              controlled workspace.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {commandMetrics.map((metric) => (
                <ExecutiveCommandMetric
                  key={metric.title}
                  title={metric.title}
                  value={metric.value}
                  detail={metric.detail}
                  accentClassName={metric.accentClassName}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/rfq"
                className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-6 py-3 text-sm font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15"
              >
                Explore RFQ Opportunities
              </Link>

              <Link
                href="/directory"
                className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-black text-nexus-white transition hover:bg-white/15"
              >
                Review Supplier Network
              </Link>
            </div>
          </div>

          <div className="relative min-w-0 rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
              Executive Supplier Brief
            </p>

            <h2 className="mt-4 text-2xl font-black text-nexus-white">
              Quotation Activity Summary
            </h2>

            <p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
              {executiveBrief}
            </p>

            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
                Recommended Executive Action
              </p>

              <p className="mt-3 text-sm font-bold leading-6 text-nexus-white">
                {nextBestAction}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <SupplierSignal
                label="Submitted Quotes"
                value={String(submittedQuotes)}
              />

              <SupplierSignal
                label="Awarded Quotes"
                value={String(awardedQuotes)}
              />

              <SupplierSignal
                label="Win Rate"
                value={submittedQuotes > 0 ? `${winRate}%` : "—"}
              />
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                Workflow Status
              </p>

              <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white">
                {pendingDecisions > 0
                  ? `${pendingDecisions} open RFQ${pendingDecisions === 1 ? "" : "s"} with quotations awaiting buyer decision.`
                  : submittedQuotes === 0
                    ? "No quotations submitted. Explore open RFQ opportunities to begin participation."
                    : "No pending buyer decisions on submitted quotations."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid border-t border-white/10 bg-white/[0.03] sm:grid-cols-2 xl:grid-cols-4">
        {stripItems.map((item) => (
          <ExecutiveCommandStripCard
            key={item.title}
            title={item.title}
            value={item.value}
          />
        ))}
      </div>
    </section>
  );
}

function SupplierSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black text-nexus-white">
        {value}
      </p>
    </div>
  );
}
