import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_INTELLIGENCE_ACCENT_CLASS,
} from "@/lib/design-system/executive-contract";

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
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="np-type-eyebrow">Portfolio</p>
          <h2
            id="portfolio-snapshot-heading"
            className="np-type-h2 mt-2 text-pretty"
          >
            Portfolio Snapshot
          </h2>
          <p className="np-type-body mt-2 max-w-4xl text-pretty text-nexus-text-secondary">
            Concise interpretation of the company&apos;s recorded procurement
            portfolio. Deeper benchmarks, forecasts, and board intelligence live
            in Strategic Insights.
          </p>
        </div>

        <div className="shrink-0">
          <ExecutiveBadge tone={availability.tone} size="md">
            {availability.label}
          </ExecutiveBadge>
        </div>
      </div>

      <section
        aria-labelledby="portfolio-summary-heading"
        className="mt-5 rounded-executive border border-nexus-gold/25 bg-nexus-gold/[0.08] p-5 sm:p-6"
      >
        <p
          id="portfolio-summary-heading"
          className={`np-type-meta ${EXECUTIVE_INTELLIGENCE_ACCENT_CLASS}`}
        >
          Portfolio Summary
        </p>
        <p className="mt-3 max-w-5xl text-pretty text-base font-semibold leading-7 text-nexus-text-primary sm:leading-8">
          {narrative}
        </p>
      </section>

      <section
        className="mt-5 border-t border-white/10 pt-5"
        aria-labelledby="portfolio-evidence-heading"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="np-type-eyebrow">Evidence</p>
            <h3
              id="portfolio-evidence-heading"
              className="np-type-h3 mt-2 text-pretty"
            >
              Recorded portfolio evidence
            </h3>
          </div>
          <p className="np-type-meta max-w-xl text-pretty text-nexus-text-muted sm:text-right">
            Verified workspace totals supporting the portfolio summary. Values
            are not compared against prior periods.
          </p>
        </div>

        <div className="mt-4">
          <p className="np-type-meta text-nexus-text-muted">Primary metrics</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
        </div>

        <div className="mt-4">
          <p className="np-type-meta text-nexus-text-muted">Operating metrics</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
        </div>
      </section>

      <div className="mt-5 border-t border-white/10 pt-5">
        <Link href="/analytics" className={EXECUTIVE_BUTTON_TERTIARY}>
          Open Strategic Insights
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </div>
    </ExecutivePanel>
  );
}
