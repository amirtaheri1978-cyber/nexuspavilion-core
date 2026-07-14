import type { ExecutiveBrief } from "@/lib/analytics/executive/executive-brief";

import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";

export type BoardroomSnapshotProps = {
  executiveBrief: ExecutiveBrief;
  quotedPortfolioValue: number;
  estimatedSavingsOpportunity: number;
  enterpriseProcurementScore: number;
  constructionClassificationScore: number;
};

function formatConfidenceLevel(
  level: ExecutiveBrief["confidence"]["level"],
): string {
  if (level === "high") {
    return "High";
  }

  if (level === "moderate") {
    return "Moderate";
  }

  return "Limited";
}

export function BoardroomSnapshot({
  executiveBrief,
  quotedPortfolioValue,
  estimatedSavingsOpportunity,
  enterpriseProcurementScore,
  constructionClassificationScore,
}: BoardroomSnapshotProps) {
  const { action, opportunity, risk, confidence } = executiveBrief;

  return (
    <ExecutivePanel
      aria-labelledby="analytics-command-center-title"
      variant="boardroom"
      padding="lg"
      tone="gold"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
            Executive Procurement Command Center
          </p>

          <h1
            id="analytics-command-center-title"
            className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl"
          >
            What requires leadership attention today?
          </h1>

          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            A decision-focused briefing covering immediate action,
            commercial opportunity, portfolio risk, and supporting
            evidence.
          </p>
        </div>

        <div className="shrink-0">
          <ExecutiveStatusBadge
            tone={
              confidence.level === "high"
                ? "success"
                : confidence.level === "moderate"
                  ? "info"
                  : "warning"
            }
          >
            Decision confidence: {confidence.score}/100 ·{" "}
            {formatConfidenceLevel(confidence.level)}
          </ExecutiveStatusBadge>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <ExecutiveInsightCard
          title={action.title}
          insight={action.summary}
          recommendation={action.recommendation}
          impact={action.reason}
          tone="gold"
        />

        <InsightSignal
          eyebrow={opportunity.title}
          summary={opportunity.summary}
          reason={opportunity.reason}
          recommendation={opportunity.recommendation}
          confidence={opportunity.confidence}
          evidence={opportunity.evidence}
          tone="opportunity"
        />

        <InsightSignal
          eyebrow={risk.title}
          summary={risk.summary}
          reason={risk.reason}
          recommendation={risk.recommendation}
          confidence={risk.confidence}
          evidence={risk.evidence}
          tone="risk"
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetricCard
          label="Quoted Portfolio Value"
          value={`$${quotedPortfolioValue.toLocaleString()}`}
          insight="Total value represented by recorded supplier quotations."
          impact="Observed quotation data"
          tone="gold"
        />

        <ExecutiveMetricCard
          label="Estimated Savings Opportunity"
          value={`$${estimatedSavingsOpportunity.toLocaleString()}`}
          insight="Estimated difference between current average and lowest recorded quotation."
          impact="Estimated — not realized"
          tone="success"
        />

        <ExecutiveMetricCard
          label="Portfolio Intelligence Score"
          value={`${enterpriseProcurementScore}/100`}
          insight="Derived internal decision-support score based on current procurement signals."
          impact="Internal score — not a peer benchmark"
          tone="blue"
        />

        <ExecutiveMetricCard
          label="RFQ Classification Maturity"
          value={`${constructionClassificationScore}/100`}
          insight="Current depth of procurement scope, sourcing, and framework classification."
          impact="Classification quality signal"
          tone="neutral"
        />
      </div>
    </ExecutivePanel>
  );
}

function InsightSignal({
  eyebrow,
  summary,
  reason,
  recommendation,
  confidence,
  evidence,
  tone,
}: {
  eyebrow: string;
  summary: string;
  reason: string;
  recommendation: string;
  confidence: number;
  evidence: string[];
  tone: "opportunity" | "risk";
}) {
  const toneClasses =
    tone === "opportunity"
      ? {
          panel:
            "border-emerald-300/20 bg-emerald-400/[0.06]",
          eyebrow: "text-emerald-300",
        }
      : {
          panel: "border-red-300/20 bg-red-400/[0.06]",
          eyebrow: "text-red-300",
        };

  return (
    <article
      className={[
        "flex min-w-0 flex-col rounded-3xl border p-6",
        toneClasses.panel,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p
          className={[
            "text-[10px] font-black uppercase tracking-[0.22em]",
            toneClasses.eyebrow,
          ].join(" ")}
        >
          {eyebrow}
        </p>

        <ExecutiveStatusBadge tone="neutral">
          {confidence}/100 confidence
        </ExecutiveStatusBadge>
      </div>

      <p className="mt-4 break-words text-base font-bold leading-7 text-white [overflow-wrap:anywhere]">
        {summary}
      </p>

      <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
            Why it matters
          </p>

          <p className="mt-2 text-xs font-semibold leading-5 text-nexus-muted">
            {reason}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
            Recommended response
          </p>

          <p className="mt-2 text-xs font-bold leading-5 text-white">
            {recommendation}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
          Supporting evidence
        </p>

        <ul className="mt-3 space-y-2">
          {evidence.slice(0, 3).map((item) => (
            <li
              key={item}
              className="text-xs font-semibold leading-5 text-nexus-muted"
            >
              • {item}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}