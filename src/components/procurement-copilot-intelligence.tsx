import type { ExecutiveBrief } from "@/lib/analytics/executive/executive-brief";
import type { ExecutiveEvidence } from "@/lib/analytics/executive/executive-insight";
import type { ExecutiveNarrative } from "@/lib/analytics/executive/executive-narrative";

type ProcurementCopilotIntelligenceProps = {
  executiveBrief: ExecutiveBrief;
  executiveNarrative: ExecutiveNarrative;
};

type CopilotInsightTone =
  | "action"
  | "opportunity"
  | "risk";

export default function ProcurementCopilotIntelligence({
  executiveBrief,
  executiveNarrative,
}: ProcurementCopilotIntelligenceProps) {
  const {
    action,
    opportunity,
    risk,
    executiveConfidence,
  } = executiveBrief;

  return (
    <section
      aria-labelledby="procurement-copilot-title"
      className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-6 text-white sm:p-8"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Enterprise Procurement Copilot
          </p>

          <h2
            id="procurement-copilot-title"
            className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
          >
            Executive Decision Intelligence
          </h2>

          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
            Deterministic procurement guidance grounded in the
            current executive brief, supporting evidence, and
            portfolio confidence.
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Decision confidence
          </p>

          <p className="mt-1 text-sm font-black text-white">
            {executiveConfidence.score}/100 ·{" "}
            {formatConfidenceLevel(
              executiveConfidence.level,
            )}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
          Copilot Executive Brief
        </p>

        <h3 className="mt-3 text-xl font-black leading-8 text-white">
          {executiveNarrative.headline}
        </h3>

        <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
          {executiveNarrative.summary}
        </p>

        <div className="mt-5 rounded-2xl border border-orange-300/15 bg-orange-400/[0.045] px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
            Recommended leadership priority
          </p>

          <p className="mt-2 text-sm font-bold leading-6 text-white">
            {executiveNarrative.priority}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <CopilotInsightCard
          title={action.title}
          message={action.summary}
          recommendation={action.recommendation}
          confidence={action.confidence}
          evidence={action.evidence}
          tone="action"
        />

        <CopilotInsightCard
          title={opportunity.title}
          message={opportunity.summary}
          recommendation={opportunity.recommendation}
          confidence={opportunity.confidence}
          evidence={opportunity.evidence}
          tone="opportunity"
        />

        <CopilotInsightCard
          title={risk.title}
          message={risk.summary}
          recommendation={risk.recommendation}
          confidence={risk.confidence}
          evidence={risk.evidence}
          tone="risk"
        />
      </div>
    </section>
  );
}

function CopilotInsightCard({
  title,
  message,
  recommendation,
  confidence,
  evidence,
  tone,
}: {
  title: string;
  message: string;
  recommendation: string;
  confidence: number;
  evidence: ExecutiveEvidence[];
  tone: CopilotInsightTone;
}) {
  const toneClasses =
    tone === "action"
      ? {
          panel:
            "border-yellow-300/20 bg-yellow-400/[0.055]",
          dot: "bg-yellow-400",
          label: "text-yellow-300",
        }
      : tone === "opportunity"
        ? {
            panel:
              "border-emerald-300/20 bg-emerald-400/[0.055]",
            dot: "bg-emerald-400",
            label: "text-emerald-300",
          }
        : {
            panel: "border-red-300/20 bg-red-400/[0.055]",
            dot: "bg-red-400",
            label: "text-red-300",
          };

  return (
    <article
      className={[
        "flex min-w-0 flex-col rounded-3xl border p-5",
        toneClasses.panel,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={[
              "h-2.5 w-2.5 shrink-0 rounded-full",
              toneClasses.dot,
            ].join(" ")}
          />

          <p
            className={[
              "text-xs font-black uppercase tracking-[0.15em]",
              toneClasses.label,
            ].join(" ")}
          >
            {title}
          </p>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
          {confidence}/100
        </span>
      </div>

      <p className="mt-4 break-words text-sm font-bold leading-6 text-white [overflow-wrap:anywhere]">
        {message}
      </p>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Copilot recommendation
        </p>

        <p className="mt-2 text-xs font-semibold leading-6 text-slate-200">
          {recommendation}
        </p>
      </div>

      <div className="mt-auto pt-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Key evidence
        </p>

        <div className="mt-3 space-y-2">
          {evidence.slice(0, 2).map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </p>

                <p className="mt-1 break-words text-xs font-black text-white [overflow-wrap:anywhere]">
                  {item.value}
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

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