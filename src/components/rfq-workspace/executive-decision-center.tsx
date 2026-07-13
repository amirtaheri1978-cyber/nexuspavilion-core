import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveActionAnchor } from "@/components/executive/actions/executive-action-anchor";
import { ExecutiveActionLink } from "@/components/executive/actions/executive-action-link";
import { ExecutiveMiniTile } from "@/components/rfq-workspace/shared/executive-mini-tile";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import type { ExecutiveIntelligence } from "@/lib/executive/executive-types";

type ExecutiveDecisionCenterProps = {
  rfqSlug: string;
  isOwner: boolean;
  isOpen: boolean;
  commercialEvaluationUnlocked: boolean;
  healthScore: number;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  potentialSavings: number;
  recommendedQuote:
    | {
        rank: number;
        amountNumber: number;
        awardConfidence: number;
        riskLevel: string;
        totalScore: number;
        timelineScore: number;
        priceScore: number;
        riskScore: number;
        performanceScore: number;
      }
    | null;
  executive: ExecutiveIntelligence;
};

type ChecklistItem = {
  label: string;
  complete: boolean;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return `$${Math.max(value, 0).toLocaleString()}`;
}

function getChecklist({
  commercialEvaluationUnlocked,
  recommendedQuote,
  quoteCount,
  documentCount,
  addendaCount,
  healthScore,
}: {
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: ExecutiveDecisionCenterProps["recommendedQuote"];
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  healthScore: number;
}): ChecklistItem[] {
  return [
    {
      label: "Comparative evaluation available",
      complete: commercialEvaluationUnlocked,
    },
    {
      label: "Supplier quotations received",
      complete: quoteCount > 0,
    },
    {
      label: "RFQ procurement package active",
      complete: documentCount > 0,
    },
    {
      label: "Governance and addenda trail established",
      complete: addendaCount > 0,
    },
    {
      label: "Award recommendation available",
      complete: Boolean(recommendedQuote),
    },
    {
      label: "Procurement health above executive threshold",
      complete: healthScore >= 72,
    },
  ];
}

export function ExecutiveDecisionCenter({
  rfqSlug,
  isOwner,
  isOpen,
  commercialEvaluationUnlocked,
  healthScore,
  quoteCount,
  documentCount,
  addendaCount,
  potentialSavings,
  recommendedQuote,
  executive,
}: ExecutiveDecisionCenterProps) {
  const checklist = getChecklist({
    commercialEvaluationUnlocked,
    recommendedQuote,
    quoteCount,
    documentCount,
    addendaCount,
    healthScore,
  });

  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-nexus-gold">
            Executive Decision Center
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-nexus-white sm:text-4xl">
            Executive Award Path and Decision Readiness
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
            {executive.recommendation.recommendation}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 xl:max-w-sm xl:justify-end">
          <ExecutiveStatusBadge
            tone={
              executive.readiness.score >= 72
                ? "success"
                : executive.readiness.score >= 56
                  ? "warning"
                  : "risk"
            }
          >
            {executive.recommendation.status}
          </ExecutiveStatusBadge>

          <ExecutiveStatusBadge tone="info">
            Readiness {executive.readiness.score}%
          </ExecutiveStatusBadge>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetricCard
          label="Award Readiness"
          value={`${executive.readiness.score}%`}
          insight={`${executive.readiness.completedControls}/${executive.readiness.totalControls} controls complete`}
          tone={
            executive.readiness.score >= 72
              ? "success"
              : executive.readiness.score >= 56
                ? "gold"
                : "risk"
          }
        />

        <ExecutiveMetricCard
          label="Potential Savings"
          value={formatMoney(potentialSavings)}
          insight="Compared with the current average quotation"
          tone={potentialSavings > 0 ? "success" : "neutral"}
        />

        <ExecutiveMetricCard
          label="Supplier Coverage"
          value={String(quoteCount)}
          insight={
            quoteCount >= 3
              ? "Competitive coverage established"
              : "Additional supplier coverage recommended"
          }
          tone={quoteCount >= 3 ? "success" : "gold"}
        />

        <ExecutiveMetricCard
          label="Procurement Health"
          value={`${healthScore}/100`}
          insight={
            healthScore >= 72
              ? "Executive threshold achieved"
              : "Readiness improvement required"
          }
          tone={
            healthScore >= 72
              ? "success"
              : healthScore >= 56
                ? "gold"
                : "risk"
          }
        />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isOwner && commercialEvaluationUnlocked ? (
          <ExecutiveActionLink
            href={`/rfq/${rfqSlug}/compare`}
            label="Launch Comparative Evaluation"
          />
        ) : null}

        {!isOwner && isOpen ? (
          <ExecutiveActionLink
            href={`/rfq/${rfqSlug}/submit`}
            label="Submit Quote"
          />
        ) : null}

        <ExecutiveActionAnchor
          href="#document-center"
          label="Review Procurement Package"
        />
      </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ExecutivePanel variant="operational" padding="md" tone="blue">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
            Decision Rationale
          </p>

          <h3 className="mt-3 text-2xl font-black text-nexus-white">
            Decision Basis and Readiness Factors
          </h3>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Review the principal commercial, governance, competition, and
            documentation signals supporting the current executive
            recommendation.
          </p>

          <div className="mt-6 grid gap-3">
            <DecisionRationaleItem
              complete={Boolean(recommendedQuote)}
              label={
                recommendedQuote
                  ? `Recommended supplier ranked #${recommendedQuote.rank}`
                  : "Award recommendation not yet available"
              }
            />

            <DecisionRationaleItem
              complete={commercialEvaluationUnlocked}
              label={
                commercialEvaluationUnlocked
                  ? "Comparative evaluation is available"
                  : "Commercial submissions remain protected"
              }
            />

            <DecisionRationaleItem
              complete={quoteCount >= 3}
              label={
                quoteCount >= 3
                  ? "Competitive supplier coverage established"
                  : "Supplier competition requires improvement"
              }
            />

            <DecisionRationaleItem
              complete={documentCount > 0}
              label={
                documentCount > 0
                  ? "Procurement package supports supplier clarity"
                  : "Procurement package requires attention"
              }
            />
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="md"
          tone={recommendedQuote ? "success" : "gold"}
        >
          {recommendedQuote ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-nexus-gold">
                Recommended Supplier Evaluation
              </p>

              <h3 className="mt-3 text-2xl font-black text-nexus-white">
                Decision-Grade Supplier Signals
              </h3>

              <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
                The current recommendation is supported by normalized
                commercial, timeline, performance, and risk indicators.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <ExecutiveMiniTile
                  title="Overall"
                  value={`${recommendedQuote.totalScore}/100`}
                />

                <ExecutiveMiniTile
                  title="Risk"
                  value={recommendedQuote.riskLevel}
                />

                <ExecutiveMiniTile
                  title="Price"
                  value={`${recommendedQuote.priceScore}/100`}
                />

                <ExecutiveMiniTile
                  title="Timeline"
                  value={`${recommendedQuote.timelineScore}/100`}
                />

                <ExecutiveMiniTile
                  title="Performance"
                  value={`${recommendedQuote.performanceScore}/100`}
                />

                <ExecutiveMiniTile
                  title="Risk Score"
                  value={`${recommendedQuote.riskScore}/100`}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-nexus-gold">
                Recommendation Availability
              </p>

              <h3 className="mt-3 text-2xl font-black text-nexus-white">
                Commercial Evaluation Required
              </h3>

              <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
                Award recommendation intelligence becomes available after
                supplier quotations and comparative evaluation data are
                available.
              </p>

              <div className="mt-6">
                <ExecutiveStatusBadge tone="warning">
                  Awaiting Decision Inputs
                </ExecutiveStatusBadge>
              </div>
            </>
          )}
        </ExecutivePanel>
      </div>

      <ExecutivePanel
        className="mt-6"
        variant="operational"
        padding="md"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-nexus-gold">
              Award Readiness Checklist
            </p>

            <h3 className="mt-3 text-2xl font-black text-nexus-white">
              Executive Control Completion
            </h3>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              Confirm that the commercial, supplier, documentation, and
              governance controls required for a defensible award decision
              are active.
            </p>
          </div>

          <ExecutiveStatusBadge
            tone={
              executive.readiness.completedControls ===
              executive.readiness.totalControls
                ? "success"
                : "warning"
            }
          >
            {executive.readiness.completedControls}/
            {executive.readiness.totalControls} Complete
          </ExecutiveStatusBadge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {checklist.map((item) => (
            <DecisionRationaleItem
              key={item.label}
              complete={item.complete}
              label={item.label}
            />
          ))}
        </div>
      </ExecutivePanel>
    </ExecutivePanel>
  );
}

function DecisionRationaleItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <ExecutivePanel
      variant="operational"
      padding="sm"
      tone={complete ? "success" : "neutral"}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ExecutiveSignal positive={complete} />

        <p className="min-w-0 break-words text-sm font-bold leading-6 text-nexus-muted">
          {label}
        </p>
      </div>
    </ExecutivePanel>
  );
}