import { ExecutivePanel } from "@/components/executive/executive-panel";

type InsightTone = "neutral" | "blue" | "gold" | "risk" | "success";

type ExecutiveInsightCardProps = {
  title: string;
  insight: string;
  recommendation?: string;
  impact?: string;
  tone?: InsightTone;
  className?: string;
};

const toneClasses: Record<InsightTone, string> = {
  neutral: "text-nexus-text-primary",
  blue: "text-blue-300",
  gold: "text-yellow-300",
  risk: "text-red-300",
  success: "text-emerald-300",
};

const recommendationToneClasses: Record<InsightTone, string> = {
  neutral: "text-nexus-gold",
  blue: "text-[#9BE8F8]",
  gold: "text-yellow-300",
  risk: "text-red-300",
  success: "text-emerald-300",
};

export function ExecutiveInsightCard({
  title,
  insight,
  recommendation,
  impact,
  tone = "blue",
  className = "",
}: ExecutiveInsightCardProps) {
  return (
    <ExecutivePanel className={className} padding="md" tone={tone}>
      <p className="break-words text-xs font-semibold uppercase leading-4 tracking-[0.14em] text-nexus-text-muted [overflow-wrap:anywhere]">
        Executive Insight
      </p>

      <h3
        className={`mt-3 break-words text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] ${toneClasses[tone]}`}
      >
        {title}
      </h3>

      <p className="mt-4 break-words text-sm font-medium leading-7 text-nexus-text-muted [overflow-wrap:anywhere]">
        {insight}
      </p>

      {recommendation ? (
        <div className="mt-5 rounded-2xl border border-nexus-border-subtle bg-white/[0.045] p-4">
          <p
            className={`break-words text-xs font-semibold uppercase leading-4 tracking-[0.14em] [overflow-wrap:anywhere] ${recommendationToneClasses[tone]}`}
          >
            Recommendation
          </p>

          <p className="mt-2 break-words text-sm font-semibold leading-6 text-nexus-text-primary [overflow-wrap:anywhere]">
            {recommendation}
          </p>
        </div>
      ) : null}

      {impact ? (
        <div className="mt-4 rounded-2xl border border-nexus-border-subtle bg-white/[0.035] p-4">
          <p className="break-words text-xs font-semibold uppercase leading-4 tracking-[0.14em] text-nexus-text-secondary [overflow-wrap:anywhere]">
            Potential Impact
          </p>

          <p className="mt-2 break-words text-sm font-medium leading-6 text-nexus-text-primary [overflow-wrap:anywhere]">
            {impact}
          </p>
        </div>
      ) : null}
    </ExecutivePanel>
  );
}