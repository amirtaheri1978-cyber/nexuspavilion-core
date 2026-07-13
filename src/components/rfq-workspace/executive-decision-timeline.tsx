import { ExecutiveProgress } from "@/components/executive/executive-progress";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import type { ExecutiveIntelligence } from "@/lib/executive/executive-types";

type TimelineStatus = "complete" | "active" | "locked" | "pending" | "watch";

type TimelineStep = {
  title: string;
  status: TimelineStatus;
  detail: string;
  signal: string;
};

type TimelineStatusTone =
  | "success"
  | "info"
  | "warning"
  | "risk"
  | "neutral";

type ExecutiveDecisionTimelineProps = {
  isOwner: boolean;
  isOpen: boolean;
  commercialEvaluationUnlocked: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  recommendedQuote:
    | {
        awardConfidence: number;
        riskLevel: string;
      }
    | null;
  awardedQuote:
    | {
        amountNumber: number;
      }
    | null;

  executive: ExecutiveIntelligence;
};

function getStatusLabel(status: TimelineStatus) {
  if (status === "complete") return "Complete";
  if (status === "active") return "Active";
  if (status === "locked") return "Locked";
  if (status === "watch") return "Watch";

  return "Pending";
}

function mapTimelineStatusTone(
  status: TimelineStatus,
): TimelineStatusTone {
  if (status === "complete") return "success";
  if (status === "active") return "info";
  if (status === "locked") return "warning";
  if (status === "watch") return "warning";

  return "neutral";
}

function getMarkerClass(status: TimelineStatus) {
  if (status === "complete") {
    return "border-emerald-300/30 bg-emerald-300 text-slate-950";
  }

  if (status === "active") {
    return "border-cyan-300/30 bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(103,232,249,0.2)]";
  }

  if (status === "locked") {
    return "border-orange-300/30 bg-orange-300 text-slate-950";
  }

  if (status === "watch") {
    return "border-yellow-300/30 bg-yellow-300 text-slate-950";
  }

  return "border-white/10 bg-white/[0.08] text-nexus-muted";
}

export function ExecutiveDecisionTimeline({
  isOwner,
  isOpen,
  commercialEvaluationUnlocked,
  quoteCount,
  documentCount,
    recommendedQuote,
  awardedQuote,
  executive,
}: ExecutiveDecisionTimelineProps) {
  
  const steps: TimelineStep[] = [
    {
      title: "RFQ Workspace Published",
      status: "complete",
      detail:
        "The RFQ workspace is live and available for procurement execution.",
      signal: "Workspace active",
    },
    {
      title: "Document Package",
      status: documentCount > 0 ? "complete" : "watch",
      detail:
        documentCount > 0
          ? "Documents are available for RFQ review and supplier pricing."
          : "Upload RFQ documents to strengthen supplier clarity.",
      signal: documentCount > 0 ? `${documentCount} files` : "No files yet",
    },
    {
      title: "Supplier Engagement",
      status: quoteCount > 0 ? "complete" : isOpen ? "active" : "pending",
      detail:
        quoteCount > 0
          ? "Supplier participation has started."
          : isOpen
            ? "The RFQ is open for supplier submissions."
            : "Supplier engagement is not currently active.",
      signal: `${quoteCount} quote${quoteCount === 1 ? "" : "s"}`,
    },
    {
      title: "Commercial Opening",
      status: commercialEvaluationUnlocked ? "complete" : "locked",
      detail: commercialEvaluationUnlocked
        ? "Commercial evaluation is available for authorized review."
        : "Commercial submissions remain protected.",
      signal: commercialEvaluationUnlocked
        ? "Evaluation Open"
        : "Awaiting Commercial Opening",
    },
    {
      title: isOwner ? "Executive Review" : "Supplier Visibility",
      status: recommendedQuote
        ? "active"
        : commercialEvaluationUnlocked
          ? "watch"
          : "locked",
      detail: isOwner
        ? executive.recommendation.recommendation
        : "Supplier-side users can monitor their own submission while buyer-side award analysis remains confidential.",
      signal: recommendedQuote
        ? `${recommendedQuote.awardConfidence}% confidence`
        : "Awaiting intelligence",
    },
    {
      title: "Award Decision",
      status: awardedQuote
        ? "complete"
        : recommendedQuote
          ? "active"
          : "pending",
      detail: awardedQuote
        ? "The RFQ has an awarded supplier decision recorded."
        : executive.summary.nextStep,
      signal: awardedQuote
        ? "Awarded"
        : recommendedQuote
          ? "Ready"
          : "Pending",
    },
  ];

  const activeStep = steps.find((step) => step.status === "active");
  const progress = executive.readiness.score;

  return (
    <section
      className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-nexus-navy text-nexus-white shadow-[0_24px_80px_rgba(0,0,0,0.26)]"
      aria-labelledby="executive-decision-timeline-title"
    >
      <div className="border-b border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Executive Decision Timeline
            </p>

            <h2
              id="executive-decision-timeline-title"
              className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
            >
              Procurement Path to Award
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Track the RFQ from workspace publication through document
              readiness, supplier engagement, commercial opening, executive
              review, and award determination.
            </p>
          </div>

          <div className="min-w-0 rounded-3xl border border-nexus-gold/20 bg-black/25 px-5 py-5 sm:px-6 xl:min-w-64">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
              Timeline Progress
            </p>

            <p className="mt-2 text-3xl font-black tracking-tight text-nexus-white sm:text-4xl">
              {progress}%
            </p>

            <p className="mt-1 break-words text-xs font-bold leading-5 text-nexus-muted">
              {activeStep ? `Active: ${activeStep.title}` : "Monitoring"}
            </p>
          </div>
        </div>

        <div
          className="mt-5"
          role="progressbar"
          aria-label="RFQ procurement timeline progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% complete`}
        >
          <ExecutiveProgress value={progress} />
        </div>
      </div>

      <ol
        className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2 lg:p-8"
        aria-label="RFQ decision stages"
      >
        {steps.map((step, index) => {
          const statusLabel = getStatusLabel(step.status);

          return (
            <li
              key={step.title}
              className="relative min-w-0 rounded-[28px] border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.06] sm:p-6"
              aria-label={`Step ${index + 1}: ${step.title}. Status: ${statusLabel}.`}
            >
              <div className="flex min-w-0 gap-4 sm:gap-5">
                <div className="flex shrink-0 flex-col items-center">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black ${getMarkerClass(
                      step.status,
                    )}`}
                    aria-hidden="true"
                  >
                    {step.status === "complete" ? "✓" : index + 1}
                  </div>

                  <div
                    className="mt-3 h-full min-h-10 w-px bg-gradient-to-b from-white/15 to-transparent"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-nexus-muted">
                        Step {index + 1}
                      </p>

                      <h3 className="mt-2 break-words text-xl font-black leading-tight text-nexus-white sm:text-2xl">
                        {step.title}
                      </h3>
                    </div>

                    <div className="shrink-0 self-start">
                      <ExecutiveStatusBadge
                        tone={mapTimelineStatusTone(step.status)}
                      >
                        {statusLabel}
                      </ExecutiveStatusBadge>
                    </div>
                  </div>

                  <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted">
                    {step.detail}
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
                      Decision Signal
                    </p>

                    <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white">
                      {step.signal}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}