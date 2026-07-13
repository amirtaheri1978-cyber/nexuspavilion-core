import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import type { ExecutiveIntelligence } from "@/lib/executive/executive-types";
import type { ExecutiveQuote } from "@/types/executive";

type ExecutiveAIExplainabilityProps = {
  isOwner: boolean;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: ExecutiveQuote | null;
   quoteCount: number;
   executive: ExecutiveIntelligence;
};

type DriverState = {
  label: string;
  tone: "success" | "info" | "warning" | "risk";
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "$0";

  return `$${Math.round(value).toLocaleString()}`;
}

function normalizeScore(score: number) {
  if (!Number.isFinite(score)) return 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getDriverState(score: number): DriverState {
  if (score >= 88) {
    return {
      label: "Strong",
      tone: "success",
    };
  }

  if (score >= 72) {
    return {
      label: "Healthy",
      tone: "info",
    };
  }

  if (score >= 56) {
    return {
      label: "Monitor",
      tone: "warning",
    };
  }

  return {
    label: "Attention Required",
    tone: "risk",
  };
}

export function ExecutiveAIExplainability({
  isOwner,
  commercialEvaluationUnlocked,
  recommendedQuote,
    quoteCount,
     executive,
}: ExecutiveAIExplainabilityProps) {
  if (!isOwner) return null;

  if (!commercialEvaluationUnlocked || !recommendedQuote) {
    return (
      <ExecutivePanel className="mt-8" padding="lg" tone="gold">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              AI Explainability Layer
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
              Commercial Opening Required
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Executive award reasoning becomes available after commercial
              opening and once sufficient supplier intelligence supports a
              defensible recommended award path.
            </p>
          </div>

          <div className="shrink-0">
            <ExecutiveStatusBadge tone="warning">
              Not Operational
            </ExecutiveStatusBadge>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <LockedRequirement
            label="Commercial evaluation opened"
            ready={commercialEvaluationUnlocked}
          />

          <LockedRequirement
            label="Supplier intelligence available"
            ready={quoteCount > 0}
          />

          <LockedRequirement
            label="Recommended award path established"
            ready={Boolean(recommendedQuote)}
          />
        </div>
      </ExecutivePanel>
    );
  }

  
  const drivers = [
    {
      label: "Price",
      score: normalizeScore(recommendedQuote.priceScore),
    },
    {
      label: "Timeline",
      score: normalizeScore(recommendedQuote.timelineScore),
    },
    {
      label: "Performance",
      score: normalizeScore(recommendedQuote.performanceScore),
    },
    {
      label: "Risk",
      score: normalizeScore(recommendedQuote.riskScore),
    },
    {
      label: "Overall",
      score: normalizeScore(recommendedQuote.totalScore),
    },
  ];

  const reasonSignals = executive.risks.map((risk) => ({
    label: risk.title,
    value: risk.summary,
    strong: risk.severity === "success" || risk.severity === "info",
  }));

  const awardConfidence = normalizeScore(executive.recommendation.score);

  return (
    <ExecutivePanel
      className="mt-8 overflow-hidden p-0"
      tone="gold"
    >
      <section aria-labelledby="executive-ai-explainability-title">
        <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-white/10 p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                  AI Explainability Layer
                </p>

                <h2
                  id="executive-ai-explainability-title"
                  className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
                >
                  Recommended Award Rationale
                </h2>
              </div>

              <div className="shrink-0">
                <ExecutiveStatusBadge tone="success">
                  Operational
                </ExecutiveStatusBadge>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              This decision-support view explains the factors behind the
              recommended supplier path using commercial value, delivery,
              performance, risk, procurement health, and comparative bid
              signals.
            </p>

            <div className="mt-8 rounded-[32px] border border-nexus-gold/20 bg-black/25 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                    Recommendation Rationale
                  </p>

                  <p className="mt-4 break-words text-sm font-bold leading-7 text-nexus-white">
                    {executive.recommendation.recommendation}{" "}
                    {executive.board.boardRecommendation}
                  </p>
                </div>

                <ExecutiveStatusBadge
                  tone={getDriverState(awardConfidence).tone}
                >
                  {awardConfidence}% Confidence
                </ExecutiveStatusBadge>
              </div>

              <p className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold leading-5 text-nexus-muted">
                This recommendation supports executive review and does not
                replace authorized procurement approval, governance review, or
                final award accountability.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MiniMetric
                title="Recommended Rank"
                value={`#${recommendedQuote.rank}`}
              />

              <MiniMetric
                title="Award Confidence"
                value={`${awardConfidence}%`}
              />

              <MiniMetric
                title="Recommended Bid"
                value={formatMoney(recommendedQuote.amountNumber)}
              />

              <MiniMetric
                title="Risk Classification"
                value={recommendedQuote.riskLevel}
              />
            </div>
          </div>

          <div className="min-w-0 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Confidence Drivers
            </p>

            <h3 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
              Decision Factors Behind the Score
            </h3>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              Each driver shows how the recommended supplier performs across
              the commercial and execution factors used in the current award
              assessment.
            </p>

            <div className="mt-6 grid gap-4">
              {drivers.map((driver) => {
                const driverState = getDriverState(driver.score);
                const driverId = `explainability-driver-${driver.label.toLowerCase()}`;

                return (
                  <article
                    key={driver.label}
                    className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.06]"
                    aria-labelledby={`${driverId}-title`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4
                            id={`${driverId}-title`}
                            className="text-sm font-black text-nexus-white"
                          >
                            {driver.label}
                          </h4>

                          <ExecutiveStatusBadge tone={driverState.tone}>
                            {driverState.label}
                          </ExecutiveStatusBadge>
                        </div>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="text-2xl font-black tracking-tight text-nexus-white">
                          {driver.score}
                        </p>

                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                          Score
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-4"
                      role="progressbar"
                      aria-label={`${driver.label} decision factor score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={driver.score}
                      aria-valuetext={`${driver.score} out of 100`}
                    >
                      <ExecutiveProgress
                        value={driver.score}
                        className="bg-white/10"
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-[32px] border border-white/10 bg-black/20 p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                Supporting Decision Signals
              </p>

              {reasonSignals.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {reasonSignals.map((reason) => (
                    <article
                      key={reason.label}
                      className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="shrink-0 pt-0.5">
                        <ExecutiveSignal positive={reason.strong} />
                      </div>

                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-nexus-white">
                          {reason.label}
                        </p>

                        <p className="mt-1 break-words text-xs font-bold leading-5 text-nexus-muted">
                          {reason.value}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black text-nexus-white">
                    No Additional Decision Signals
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-nexus-muted">
                    The current recommendation does not include additional risk
                    or opportunity signals requiring executive review.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function LockedRequirement({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <ExecutivePanel
      variant="operational"
      padding="sm"
      tone={ready ? "success" : "neutral"}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <ExecutiveSignal positive={ready} />
        </div>

        <p className="break-words text-sm font-bold leading-6 text-nexus-muted">
          {label}
        </p>
      </div>
    </ExecutivePanel>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
        {title}
      </p>

      <p className="mt-auto break-words pt-3 text-xl font-black leading-tight text-nexus-white sm:text-2xl">
        {value}
      </p>
    </div>
  );
}