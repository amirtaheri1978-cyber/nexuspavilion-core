import Link from "next/link";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveAction } from "@/lib/executive/executive-types";

type ExecutiveActionQueueProps = {
  rfqSlug: string;
  isOwner: boolean;
  isOpen: boolean;
  commercialEvaluationUnlocked: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  healthScore: number;
  recommendedQuote:
    | {
        awardConfidence: number;
        riskLevel: string;
      }
    | null;
};

type ExecutivePriorityTone = "success" | "info" | "warning" | "risk";

function mapPriorityTone(
  priority: ExecutiveAction["priority"],
): ExecutivePriorityTone {
  if (priority === "critical") return "risk";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";

  return "success";
}

export function ExecutiveActionQueue({
  rfqSlug,
  isOwner,
  isOpen,
  commercialEvaluationUnlocked,
  quoteCount,
  documentCount,
  addendaCount,
  healthScore,
  recommendedQuote,
}: ExecutiveActionQueueProps) {
  const executiveRecommendedQuote = recommendedQuote
    ? {
        rank: 1,
        amountNumber: 0,
        awardConfidence: recommendedQuote.awardConfidence,
        riskLevel: recommendedQuote.riskLevel,
        totalScore: recommendedQuote.awardConfidence,
        priceScore: recommendedQuote.awardConfidence,
        timelineScore: recommendedQuote.awardConfidence,
        riskScore: recommendedQuote.awardConfidence,
        performanceScore: recommendedQuote.awardConfidence,
        budgetVariance: 0,
        lowestBidVariance: 0,
      }
    : null;

  const executive = buildExecutiveIntelligence({
    rfqSlug,
    isOwner,
    isOpen,
    commercialEvaluationUnlocked,
    healthScore,
    quoteCount,
    documentCount,
    addendaCount,
    potentialSavings: 0,
    recommendedQuote: executiveRecommendedQuote,
    awardedQuote: null,
  });

  const actions = executive.actions;
  const primaryAction = actions[0];

  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Executive Action Queue
          </p>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
            Priority Next Steps
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Nexus Pavilion prioritizes the next actions based on document
            readiness, supplier competition, commercial access, governance
            controls, and award confidence.
          </p>
        </div>

        {primaryAction ? (
          <div className="min-w-0 rounded-3xl border border-nexus-gold/20 bg-black/25 px-5 py-5 sm:px-6 xl:max-w-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
              Top Priority
            </p>

            <p className="mt-2 break-words text-base font-black leading-6 text-nexus-white sm:text-lg">
              {primaryAction.title}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {actions.map((action, index) => (
          <ActionQueueCard
            key={`${action.title}-${index}`}
            action={action}
            index={index}
          />
        ))}
      </div>
    </ExecutivePanel>
  );
}

function ActionQueueCard({
  action,
  index,
}: {
  action: ExecutiveAction;
  index: number;
}) {
  const className =
    "group flex min-w-0 flex-col rounded-[32px] border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-nexus-gold/25 hover:bg-white/[0.065] hover:shadow-executive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy sm:p-6";

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.22em] text-nexus-muted">
            Priority {index + 1} · {action.category}
          </p>

          <h3 className="mt-3 break-words text-xl font-black leading-tight text-nexus-white sm:text-2xl">
            {action.title}
          </h3>
        </div>

        <div className="shrink-0">
          <ExecutiveStatusBadge tone={mapPriorityTone(action.priority)}>
            {action.priority}
          </ExecutiveStatusBadge>
        </div>
      </div>

      <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted">
        {action.rationale}
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
          Expected Outcome
        </p>

        <p className="mt-2 break-words text-sm font-bold leading-6 text-nexus-white">
          {action.outcome}
        </p>
      </div>

      <div className="mt-auto pt-5">
        <span className="inline-flex rounded-full border border-nexus-gold/25 bg-nexus-gold/10 px-5 py-3 text-sm font-black text-nexus-gold transition group-hover:border-nexus-gold/35 group-hover:bg-nexus-gold/15">
          {action.actionLabel}
        </span>
      </div>
    </>
  );

  const ariaLabel = `${action.actionLabel}: ${action.title}`;

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={action.anchorHref || "#"}
      className={className}
      aria-label={ariaLabel}
    >
      {content}
    </a>
  );
}