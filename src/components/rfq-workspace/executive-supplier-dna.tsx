import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
import { ExecutiveMiniTile } from "@/components/rfq-workspace/shared/executive-mini-tile";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveQuote } from "@/types/executive";

type ExecutiveSupplierDNAProps = {
  isOwner: boolean;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: ExecutiveQuote | null;
  averageBid: number;
  lowestAmount: number | null;
  quoteCount: number;
};

type ScoreState = {
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

function getScoreState(score: number): ScoreState {
  if (score >= 88) {
    return {
      label: "Excellent",
      tone: "success",
    };
  }

  if (score >= 74) {
    return {
      label: "Strong",
      tone: "info",
    };
  }

  if (score >= 58) {
    return {
      label: "Developing",
      tone: "warning",
    };
  }

  return {
    label: "Attention Required",
    tone: "risk",
  };
}

export function ExecutiveSupplierDNA({
  isOwner,
  commercialEvaluationUnlocked,
  recommendedQuote,
  averageBid,
  lowestAmount,
  quoteCount,
}: ExecutiveSupplierDNAProps) {
  if (!isOwner) return null;

  if (!commercialEvaluationUnlocked || !recommendedQuote) {
    return (
      <ExecutivePanel className="mt-8" padding="lg" tone="gold">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Executive Supplier DNA
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
              Supplier Intelligence Awaiting Activation
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Supplier DNA becomes available after commercial opening and once
              Nexus Pavilion has sufficient quote intelligence to evaluate the
              recommended supplier profile.
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
            label="Supplier quote intelligence available"
            ready={quoteCount > 0}
          />

          <LockedRequirement
            label="Recommended supplier identified"
            ready={Boolean(recommendedQuote)}
          />
        </div>
      </ExecutivePanel>
    );
  }

  const budget =
    recommendedQuote.amountNumber + recommendedQuote.budgetVariance;

  const savingsVsAverage =
    averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0;

  const executive = buildExecutiveIntelligence({
    rfqSlug: "",
    isOwner,
    isOpen: true,
    commercialEvaluationUnlocked,
    healthScore: recommendedQuote.totalScore,
    quoteCount,
    documentCount: 1,
    addendaCount: 0,
    averageBid,
    lowestAmount,
    budget,
    potentialSavings: savingsVsAverage,
    recommendedQuote,
    awardedQuote: null,
  });

  const dnaScores = [
    {
      label: "Commercial",
      score: normalizeScore(executive.recommendation.score),
      detail: executive.recommendation.status,
    },
    {
      label: "Delivery",
      score: normalizeScore(recommendedQuote.timelineScore),
      detail: getScoreState(
        normalizeScore(recommendedQuote.timelineScore),
      ).label,
    },
    {
      label: "Performance",
      score: normalizeScore(recommendedQuote.performanceScore),
      detail: getScoreState(
        normalizeScore(recommendedQuote.performanceScore),
      ).label,
    },
    {
      label: "Risk Control",
      score: normalizeScore(recommendedQuote.riskScore),
      detail: `${recommendedQuote.riskLevel} risk`,
    },
    {
      label: "Supplier Reliability",
      score: normalizeScore(executive.board.confidence),
      detail: executive.board.status,
    },
  ];

  const supplierConfidence = normalizeScore(
    executive.recommendation.score,
  );

  return (
    <ExecutivePanel
      className="mt-8 overflow-hidden p-0"
      tone="gold"
    >
      <section aria-labelledby="executive-supplier-dna-title">
        <div className="grid gap-0 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="border-b border-white/10 p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                  Executive Supplier DNA
                </p>

                <h2
                  id="executive-supplier-dna-title"
                  className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
                >
                  Recommended Supplier Profile
                </h2>
              </div>

              <div className="shrink-0">
                <ExecutiveStatusBadge tone="success">
                  Operational
                </ExecutiveStatusBadge>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              This decision-support profile summarizes the recommended
              supplier across commercial position, delivery capability,
              performance signals, risk control, and executive award
              confidence.
            </p>

            <div className="mt-8 rounded-[34px] border border-nexus-gold/20 bg-black/25 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                    Recommended Supplier Position
                  </p>

                  <p className="mt-4 text-3xl font-black tracking-tight text-nexus-white sm:text-4xl">
                    Rank #{recommendedQuote.rank}
                  </p>
                </div>

                <ExecutiveStatusBadge
                  tone={getScoreState(supplierConfidence).tone}
                >
                  {supplierConfidence}% Confidence
                </ExecutiveStatusBadge>
              </div>

              <p className="mt-4 break-words text-sm font-bold leading-7 text-nexus-white">
                {executive.board.boardRecommendation}
              </p>

              <p className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold leading-5 text-nexus-muted">
                This supplier profile supports executive review and does not
                replace authorized procurement approval, due diligence,
                governance review, or final award accountability.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ExecutiveMiniTile
                title="Recommended Bid"
                value={formatMoney(recommendedQuote.amountNumber)}
              />

              <ExecutiveMiniTile
                title="Competitive Responses"
                value={`${quoteCount} quote${quoteCount === 1 ? "" : "s"}`}
              />

              <ExecutiveMiniTile
                title="Savings Signal"
                value={
                  savingsVsAverage > 0
                    ? formatMoney(savingsVsAverage)
                    : "Pending"
                }
              />

              <ExecutiveMiniTile
                title="Risk Classification"
                value={recommendedQuote.riskLevel}
              />
            </div>
          </div>

          <div className="min-w-0 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Supplier Intelligence Scorecard
            </p>

            <h3 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
              Supplier Assessment Signals
            </h3>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              These indicators show how the recommended supplier performs
              across the commercial, delivery, execution, risk, and
              reliability factors used in the current award assessment.
            </p>

            <div className="mt-6 grid gap-4">
              {dnaScores.map((item) => {
                const scoreState = getScoreState(item.score);
                const itemId = `supplier-dna-${item.label
                  .toLowerCase()
                  .replaceAll(" ", "-")}`;

                return (
                  <article
                    key={item.label}
                    className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.06]"
                    aria-labelledby={`${itemId}-title`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4
                            id={`${itemId}-title`}
                            className="break-words text-sm font-black text-nexus-white"
                          >
                            {item.label}
                          </h4>

                          <ExecutiveStatusBadge tone={scoreState.tone}>
                            {scoreState.label}
                          </ExecutiveStatusBadge>
                        </div>

                        <p className="mt-2 break-words text-xs font-bold leading-5 text-nexus-muted">
                          {item.detail}
                        </p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="text-2xl font-black tracking-tight text-nexus-white">
                          {item.score}
                        </p>

                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                          Score
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-4"
                      role="progressbar"
                      aria-label={`${item.label} supplier assessment score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.score}
                      aria-valuetext={`${item.score} out of 100`}
                    >
                      <ExecutiveProgress
                        value={item.score}
                        className="bg-white/10"
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-[32px] border border-nexus-gold/20 bg-black/20 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                    Executive Assessment Summary
                  </p>

                  <p className="mt-4 break-words text-sm font-bold leading-7 text-nexus-white">
                    {executive.summary.recommendation}{" "}
                    {executive.summary.nextStep}
                  </p>
                </div>

                <ExecutiveStatusBadge
                  tone={getScoreState(
                    normalizeScore(executive.board.confidence),
                  ).tone}
                >
                  {normalizeScore(executive.board.confidence)}% Reliability
                </ExecutiveStatusBadge>
              </div>
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