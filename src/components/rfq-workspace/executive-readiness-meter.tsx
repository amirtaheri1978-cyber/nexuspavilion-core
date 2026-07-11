import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
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

export function ExecutiveReadinessMeter(
  props: ExecutiveReadinessMeterProps,
) {
  const factors = getReadinessFactors(props);

  const readiness = calculateDecisionReadiness({
    healthScore: props.healthScore,
    quoteCount: props.quoteCount,
    documentCount: props.documentCount,
    addendaCount: props.addendaCount,
    commercialEvaluationUnlocked: props.commercialEvaluationUnlocked,
    hasRecommendedQuote: Boolean(props.recommendedQuote),
  });

  const blockerCount = factors.filter((factor) => factor.score < 60).length;

  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[34px] border border-white/10 bg-black/25 p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Executive Readiness Meter
          </p>

          <div className="mt-8 flex aspect-square max-w-[280px] items-center justify-center rounded-full border-[18px] border-white/10 bg-white/[0.045]">
            <div className="text-center">
              <p className="text-6xl font-black text-nexus-white">
                {readiness.score}
              </p>

              <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                Out of 100
              </p>
            </div>
          </div>

          <h2 className="mt-8 text-3xl font-black text-nexus-white">
            {readiness.status}
          </h2>

          <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
            {blockerCount > 0
              ? `${blockerCount} readiness factor${
                  blockerCount === 1 ? "" : "s"
                } require attention before confident executive decision-making.`
              : readiness.recommendation}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Readiness Drivers
          </p>

          <h3 className="mt-3 text-3xl font-black text-nexus-white">
            What Affects Award Readiness
          </h3>

          <div className="mt-6 grid gap-4">
            {factors.map((factor) => (
              <div
                key={factor.label}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-nexus-white">
                      {factor.label}
                    </p>

                    <p className="mt-1 text-xs font-bold leading-5 text-nexus-muted">
                      {factor.detail}
                    </p>
                  </div>

                  <p className="shrink-0 text-2xl font-black text-nexus-white">
                    {factor.score}
                  </p>
                </div>

                <ExecutiveProgress
                  value={factor.score}
                  className="mt-4 bg-white/10"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ExecutivePanel>
  );
}