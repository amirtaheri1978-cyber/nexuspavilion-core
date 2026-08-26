import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

type ExecutiveMetricTone = "neutral" | "blue" | "gold" | "risk" | "success";

type StrategicIntelligenceWorkspaceProps = {
  narrative: string;
  availability: {
    label: string;
    tone: "board" | "warning";
  };
  primaryMetrics: {
    label: string;
    value: string;
    insight: string;
    tone: ExecutiveMetricTone;
  }[];
  operatingMetrics: {
    title: string;
    value: string;
    insight: string;
    tone: ExecutiveMetricTone;
  }[];
};

export function StrategicIntelligenceWorkspace({
  narrative,
  availability,
  primaryMetrics,
  operatingMetrics,
}: StrategicIntelligenceWorkspaceProps) {
  return (
    <ExecutivePanel
      variant="boardroom"
      padding="lg"
      tone="gold"
      className="np-region-major"
      aria-labelledby="portfolio-snapshot-heading"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="np-type-eyebrow">Portfolio</p>
          <h2 id="portfolio-snapshot-heading" className="np-type-h2 mt-3">
            Portfolio Snapshot
          </h2>
          <p className="np-type-body mt-4 max-w-4xl">
            Concise interpretation of the company&apos;s recorded procurement
            portfolio. Deeper benchmarks, forecasts, and board intelligence live
            in Strategic Insights.
          </p>
        </div>

        <ExecutiveBadge tone={availability.tone} size="md">
          {availability.label}
        </ExecutiveBadge>
      </div>

      <section className="mt-6 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.07] p-6 sm:p-7">
        <p className="np-type-meta text-nexus-gold-bright">Portfolio Summary</p>
        <p className="mt-4 text-base font-semibold leading-8 text-nexus-text-secondary">
          {narrative}
        </p>
      </section>

      <section
        className="mt-8 border-t border-white/10 pt-7"
        aria-labelledby="portfolio-evidence-heading"
      >
        <p className="np-type-eyebrow">Evidence</p>
        <h3
          id="portfolio-evidence-heading"
          className="mt-3 text-xl font-black text-white sm:text-2xl"
        >
          Recorded portfolio evidence
        </h3>
        <p className="np-type-body mt-3 max-w-4xl">
          Verified workspace totals supporting the portfolio summary. Values are
          not compared against prior periods.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {primaryMetrics.map((metric) => (
            <ExecutiveMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              insight={metric.insight}
              tone={metric.tone}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {operatingMetrics.map((metric) => (
            <ExecutiveMetricCard
              key={metric.title}
              label={metric.title}
              value={metric.value}
              insight={metric.insight}
              tone={metric.tone}
            />
          ))}
        </div>
      </section>

      <div className="mt-8 border-t border-white/10 pt-6">
        <Link
          href="/analytics"
          className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border border-nexus-gold/25 bg-nexus-gold/10 px-5 py-2.5 text-sm font-black text-nexus-gold-bright transition-colors hover:bg-nexus-gold/15 ${EXECUTIVE_FOCUS_CYAN}`}
        >
          Open Strategic Insights
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </ExecutivePanel>
  );
}
