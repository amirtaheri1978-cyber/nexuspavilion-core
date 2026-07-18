import type { ExecutiveBrief } from "@/lib/analytics/executive/executive-brief";
import type { ExecutiveEvidence } from "@/lib/analytics/executive/executive-insight";
import type { ExecutiveNarrative } from "@/lib/analytics/executive/executive-narrative";

import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";

export type BoardroomSnapshotProps = {
  executiveBrief: ExecutiveBrief;
  executiveNarrative: ExecutiveNarrative;
  quotedPortfolioValue: number;
  estimatedSavingsOpportunity: number;
  enterpriseProcurementScore: number;
  constructionClassificationScore: number;
};

function formatConfidenceLevel(
  level: ExecutiveBrief["executiveConfidence"]["level"],
): string {
  switch (level) {
    case "high":
      return "High";

    case "moderate":
      return "Moderate";

    case "low":
      return "Low";

    case "insufficient":
      return "Insufficient";
  }
}

export function BoardroomSnapshot({
  executiveBrief,
  executiveNarrative,
  quotedPortfolioValue,
  estimatedSavingsOpportunity,
  enterpriseProcurementScore,
  constructionClassificationScore,
}: BoardroomSnapshotProps) {
  const { action, opportunity, risk, executiveConfidence } = executiveBrief;

  const confidenceTone =
    executiveConfidence.level === "high"
      ? "success"
      : executiveConfidence.level === "moderate"
        ? "info"
        : "warning";

  return (
    <ExecutivePanel
      aria-labelledby="analytics-command-center-title"
      variant="boardroom"
      padding="lg"
      tone="gold"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300 sm:text-xs">
              Executive Procurement Command Center
            </p>

            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Leadership decision briefing
            </p>
          </div>

          <h1
            id="analytics-command-center-title"
            className="mt-4 max-w-4xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            What requires leadership attention today?
          </h1>

          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            A decision-first view of the immediate leadership action,
            commercial opportunity, material portfolio risk, and the evidence
            supporting each recommendation.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 xl:items-end">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
            Decision assurance
          </p>

          <ExecutiveStatusBadge tone={confidenceTone}>
            {executiveConfidence.score}/100 ·{" "}
            {formatConfidenceLevel(executiveConfidence.level)} confidence
          </ExecutiveStatusBadge>
        </div>
      </header>

      <section
        aria-labelledby="executive-narrative-title"
        className="mt-6 grid min-w-0 gap-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
            Executive situation brief
          </p>

          <h2
            id="executive-narrative-title"
            className="mt-3 max-w-4xl text-xl font-black leading-8 text-white sm:text-2xl"
          >
            {executiveNarrative.headline}
          </h2>

          <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
            {executiveNarrative.summary}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-yellow-300/15 bg-yellow-400/[0.045] p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
            Leadership priority
          </p>

          <p className="mt-3 break-words text-sm font-bold leading-6 text-white [overflow-wrap:anywhere]">
            {executiveNarrative.priority}
          </p>
        </div>
      </section>

      <section
        aria-label="Executive decision signals"
        className="mt-6 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
      >
        <InsightSignal
          eyebrow={action.title}
          summary={action.summary}
          reason={action.reason}
          recommendation={action.recommendation}
          confidence={action.confidence}
          evidence={action.evidence}
          tone="action"
          emphasis="primary"
        />

        <div className="grid min-w-0 content-start gap-5">
          <InsightSignal
            eyebrow={opportunity.title}
            summary={opportunity.summary}
            reason={opportunity.reason}
            recommendation={opportunity.recommendation}
            confidence={opportunity.confidence}
            evidence={opportunity.evidence}
            tone="opportunity"
            emphasis="secondary"
          />

          <InsightSignal
            eyebrow={risk.title}
            summary={risk.summary}
            reason={risk.reason}
            recommendation={risk.recommendation}
            confidence={risk.confidence}
            evidence={risk.evidence}
            tone="risk"
            emphasis="secondary"
          />
        </div>
      </section>

      <section
        aria-labelledby="executive-evidence-summary-title"
        className="mt-6 border-t border-white/10 pt-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
              Supporting portfolio evidence
            </p>

            <h2
              id="executive-evidence-summary-title"
              className="mt-2 text-lg font-black text-white"
            >
              Decision context at a glance
            </h2>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Observed, estimated, and internally derived measures supporting the
            executive briefing.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>
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
  emphasis,
}: {
  eyebrow: string;
  summary: string;
  reason: string;
  recommendation: string;
  confidence: number;
  evidence: ExecutiveEvidence[];
  tone: "action" | "opportunity" | "risk";
  emphasis: "primary" | "secondary";
}) {
  const toneClasses =
    tone === "action"
      ? {
          panel: "border-yellow-300/20 bg-yellow-400/[0.055]",
          eyebrow: "text-yellow-300",
          accent: "bg-yellow-300",
          guidance: "border-yellow-300/15 bg-yellow-400/[0.04]",
          stepBorder: "border-yellow-300/15",
          stepBackground: "bg-yellow-400/[0.035]",
          stepNumber:
            "border-yellow-300/20 bg-yellow-400/[0.08] text-yellow-300",
        }
      : tone === "opportunity"
        ? {
            panel: "border-emerald-300/20 bg-emerald-400/[0.055]",
            eyebrow: "text-emerald-300",
            accent: "bg-emerald-300",
            guidance: "border-emerald-300/15 bg-emerald-400/[0.04]",
            stepBorder: "border-emerald-300/15",
            stepBackground: "bg-emerald-400/[0.035]",
            stepNumber:
              "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-300",
          }
        : {
            panel: "border-red-300/20 bg-red-400/[0.055]",
            eyebrow: "text-red-300",
            accent: "bg-red-300",
            guidance: "border-red-300/15 bg-red-400/[0.04]",
            stepBorder: "border-red-300/15",
            stepBackground: "bg-red-400/[0.035]",
            stepNumber: "border-red-300/20 bg-red-400/[0.08] text-red-300",
          };

  const isPrimary = emphasis === "primary";
  const visibleEvidence = evidence.slice(0, isPrimary ? 3 : 2);

  return (
    <article
      className={[
        "relative min-w-0 overflow-hidden rounded-3xl border",
        isPrimary ? "p-6 sm:p-7" : "p-5 sm:p-6",
        toneClasses.panel,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "absolute inset-y-0 left-0 w-1",
          toneClasses.accent,
        ].join(" ")}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={[
              "text-[10px] font-black uppercase tracking-[0.22em]",
              toneClasses.eyebrow,
            ].join(" ")}
          >
            {eyebrow}
          </p>

          {isPrimary ? (
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
              Immediate leadership action
            </p>
          ) : null}
        </div>

        <ExecutiveStatusBadge tone="neutral">
          {confidence}/100 confidence
        </ExecutiveStatusBadge>
      </div>

      <p
        className={[
          "break-words font-bold text-white [overflow-wrap:anywhere]",
          isPrimary
            ? "mt-5 max-w-4xl text-xl leading-8 sm:text-2xl sm:leading-9"
            : "mt-4 text-base leading-7",
        ].join(" ")}
      >
        {summary}
      </p>

      <div
        className={[
          "mt-5 grid min-w-0 gap-4",
          isPrimary ? "md:grid-cols-2" : "",
        ].join(" ")}
      >
        <SignalContext label="Why it matters" value={reason} />

        <div
          className={[
            "min-w-0 rounded-2xl border p-4",
            toneClasses.guidance,
          ].join(" ")}
        >
          <p
            className={[
              "text-[10px] font-black uppercase tracking-[0.18em]",
              toneClasses.eyebrow,
            ].join(" ")}
          >
            Recommended response
          </p>

          <p className="mt-2 break-words text-xs font-bold leading-5 text-white [overflow-wrap:anywhere]">
            {recommendation}
          </p>
        </div>
      </div>

      {isPrimary ? (
        <section
          aria-label="Leadership execution path"
          className={[
            "mt-5 min-w-0 rounded-2xl border p-4 sm:p-5",
            toneClasses.stepBorder,
            toneClasses.stepBackground,
          ].join(" ")}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className={[
                  "text-[10px] font-black uppercase tracking-[0.18em]",
                  toneClasses.eyebrow,
                ].join(" ")}
              >
                Leadership execution path
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-white">
                Convert the recommendation into an authorized and accountable
                executive action.
              </p>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
              Four-stage decision control
            </p>
          </div>

          <ol className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                step: "01",
                title: "Validate Evidence",
                description:
                  "Confirm the commercial, supplier, and portfolio signals supporting the recommendation.",
              },
              {
                step: "02",
                title: "Assign Ownership",
                description:
                  "Confirm the executive and procurement owners accountable for the response.",
              },
              {
                step: "03",
                title: "Authorize Action",
                description:
                  "Approve the decision path through the required governance controls.",
              },
              {
                step: "04",
                title: "Monitor Outcome",
                description:
                  "Track execution progress, risk movement, and realized commercial impact.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-black tabular-nums",
                      toneClasses.stepNumber,
                    ].join(" ")}
                  >
                    {item.step}
                  </span>

                  <p className="min-w-0 break-words text-xs font-black uppercase tracking-[0.12em] text-white [overflow-wrap:anywhere]">
                    {item.title}
                  </p>
                </div>

                <p className="mt-3 break-words text-xs font-semibold leading-5 text-nexus-muted [overflow-wrap:anywhere]">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
            Supporting evidence
          </p>

          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-nexus-muted">
            {visibleEvidence.length} signal
            {visibleEvidence.length === 1 ? "" : "s"}
          </p>
        </div>

        <div
          className={[
            "mt-3 grid min-w-0 gap-3",
            isPrimary && visibleEvidence.length > 1
              ? "md:grid-cols-2"
              : "",
          ].join(" ")}
        >
          {visibleEvidence.map((item) => (
            <EvidenceSignal
              key={`${item.label}-${item.value}`}
              evidence={item}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function SignalContext({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-xs font-semibold leading-5 text-nexus-muted [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function EvidenceSignal({
  evidence,
}: {
  evidence: ExecutiveEvidence;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-words text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted [overflow-wrap:anywhere]">
          {evidence.label}
        </p>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
          {evidence.status}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-black leading-5 text-white [overflow-wrap:anywhere]">
        {evidence.value}
      </p>

      {evidence.description ? (
        <p className="mt-2 break-words text-xs font-semibold leading-5 text-nexus-muted [overflow-wrap:anywhere]">
          {evidence.description}
        </p>
      ) : null}
    </div>
  );
}