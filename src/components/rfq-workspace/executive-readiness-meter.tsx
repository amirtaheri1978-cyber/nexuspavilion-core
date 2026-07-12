import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { calculateDecisionReadiness } from "@/lib/analytics/executive-intelligence";

type ReadinessFactor = {
  label: string;
  score: number;
  detail: string;
};

type ExecutiveReadinessMeterProps = {
  healthScore: number;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote:
    | {
        awardConfidence: number;
        riskLevel: string;
      }
    | null;
};

type ReadinessTone = "success" | "info" | "warning" | "risk";

function getReadinessFactors({
  healthScore,
  quoteCount,
  documentCount,
  addendaCount,
  commercialEvaluationUnlocked,
  recommendedQuote,
}: ExecutiveReadinessMeterProps): ReadinessFactor[] {
  return [
    {
      label: "Procurement Health",
      score: healthScore,
      detail:
        healthScore >= 72
          ? "Health score meets executive threshold."
          : "Health score needs stronger readiness signals.",
    },
    {
      label: "Supplier Competition",
      score: Math.min(100, quoteCount * 30 + (quoteCount >= 3 ? 10 : 0)),
      detail:
        quoteCount >= 3
          ? "Supplier coverage is strong."
          : "Additional supplier coverage is recommended.",
    },
    {
      label: "Document Readiness",
      score: Math.min(100, documentCount * 24),
      detail:
        documentCount > 0
          ? "RFQ package has active documents."
          : "Document package is missing.",
    },
    {
      label: "Governance Trail",
      score: Math.min(100, 52 + addendaCount * 16),
      detail:
        addendaCount > 0
          ? "Addenda and clarification governance is active."
          : "No addenda have been issued yet.",
    },
    {
      label: "Award Intelligence",
      score:
        commercialEvaluationUnlocked && recommendedQuote
          ? recommendedQuote.awardConfidence
          : commercialEvaluationUnlocked
            ? 58
            : 35,
      detail:
        commercialEvaluationUnlocked && recommendedQuote
          ? `Award intelligence available with ${recommendedQuote.awardConfidence}% confidence.`
          : commercialEvaluationUnlocked
            ? "Commercial evaluation is open, but recommendation data is limited."
            : "Award intelligence unlocks after commercial opening.",
    },
  ];
}

function getReadinessTone(score: number): ReadinessTone {
  if (score >= 80) return "success";
  if (score >= 65) return "info";
  if (score >= 50) return "warning";

  return "risk";
}

function getFactorState(score: number) {
  if (score >= 75) {
    return {
      label: "Ready",
      tone: "success" as const,
    };
  }

  if (score >= 60) {
    return {
      label: "Monitor",
      tone: "info" as const,
    };
  }

  return {
    label: "Attention Required",
    tone: "warning" as const,
  };
}

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function ExecutiveReadinessMeter(
  props: ExecutiveReadinessMeterProps,
) {
  const factors = getReadinessFactors(props).map((factor) => ({
    ...factor,
    score: normalizeScore(factor.score),
  }));

  const readiness = calculateDecisionReadiness({
    healthScore: props.healthScore,
    quoteCount: props.quoteCount,
    documentCount: props.documentCount,
    addendaCount: props.addendaCount,
    commercialEvaluationUnlocked: props.commercialEvaluationUnlocked,
    hasRecommendedQuote: Boolean(props.recommendedQuote),
  });

  const readinessScore = normalizeScore(readiness.score);
  const blockerCount = factors.filter((factor) => factor.score < 60).length;
  const readinessTone = getReadinessTone(readinessScore);

  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <div
        className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr]"
        aria-labelledby="executive-readiness-meter-title"
      >
        <div className="min-w-0 rounded-[34px] border border-nexus-gold/20 bg-black/25 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                Executive Readiness Meter
              </p>

              <h2
                id="executive-readiness-meter-title"
                className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
              >
                Award Decision Readiness
              </h2>
            </div>

            <ExecutiveStatusBadge tone={readinessTone}>
              {readiness.status}
            </ExecutiveStatusBadge>
          </div>

          <div className="mt-8 flex justify-center xl:justify-start">
            <div
              className="relative flex aspect-square w-full max-w-[280px] items-center justify-center rounded-full border-[16px] border-white/10 bg-white/[0.045] sm:border-[18px]"
              role="progressbar"
              aria-label="Executive award decision readiness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readinessScore}
              aria-valuetext={`${readinessScore} out of 100`}
            >
              <div className="absolute inset-3 rounded-full border border-white/10" />

              <div className="relative text-center">
                <p className="text-5xl font-black tracking-tight text-nexus-white sm:text-6xl">
                  {readinessScore}
                </p>

                <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                  Out of 100
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-nexus-muted">
                Decision Status
              </p>

              <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-nexus-white">
                {blockerCount} blocker{blockerCount === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted">
              {blockerCount > 0
                ? `${blockerCount} readiness factor${
                    blockerCount === 1 ? "" : "s"
                  } require attention before confident executive decision-making.`
                : readiness.recommendation}
            </p>
          </div>

          <div className="mt-6">
            <div
              role="progressbar"
              aria-label="Overall executive readiness score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readinessScore}
            >
              <ExecutiveProgress
                value={readinessScore}
                className="bg-white/10"
              />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Readiness Drivers
          </p>

          <h3 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
            What Affects Award Readiness
          </h3>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            These indicators reflect procurement health, competitive tension,
            document completeness, governance activity, and award intelligence
            availability.
          </p>

          <div className="mt-6 grid gap-4">
            {factors.map((factor) => {
              const factorState = getFactorState(factor.score);
              const factorId = factor.label
                .toLowerCase()
                .replaceAll(" ", "-");

              return (
                <article
                  key={factor.label}
                  className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.06]"
                  aria-labelledby={`${factorId}-title`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4
                          id={`${factorId}-title`}
                          className="break-words text-sm font-black text-nexus-white"
                        >
                          {factor.label}
                        </h4>

                        <ExecutiveStatusBadge tone={factorState.tone}>
                          {factorState.label}
                        </ExecutiveStatusBadge>
                      </div>

                      <p className="mt-2 break-words text-xs font-bold leading-5 text-nexus-muted">
                        {factor.detail}
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-2xl font-black tracking-tight text-nexus-white">
                        {factor.score}
                      </p>

                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                        Score
                      </p>
                    </div>
                  </div>

                  <div
                    className="mt-4"
                    role="progressbar"
                    aria-label={`${factor.label} readiness`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={factor.score}
                    aria-valuetext={`${factor.score} out of 100`}
                  >
                    <ExecutiveProgress
                      value={factor.score}
                      className="bg-white/10"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </ExecutivePanel>
  );
}