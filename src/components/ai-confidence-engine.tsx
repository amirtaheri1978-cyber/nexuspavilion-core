import { ExecutivePanel } from "@/components/executive/executive-panel";
import type { DecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";

type AIConfidenceEngineProps = {
  decisionSupportReadiness: DecisionSupportReadiness;
  supplierReliabilityScore: number;
};

type EvidenceAccent = "gold" | "blue" | "green" | "purple";

const accentStyles: Record<
  EvidenceAccent,
  { badge: string; progress: string; surface: string }
> = {
  gold: {
    badge: "border-nexus-gold/25 bg-nexus-gold/10 text-nexus-gold",
    progress: "bg-nexus-gold",
    surface: "border-nexus-gold/15 bg-nexus-gold/[0.04]",
  },
  blue: {
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    progress: "bg-sky-400",
    surface: "border-sky-400/15 bg-sky-400/[0.035]",
  },
  green: {
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    progress: "bg-emerald-400",
    surface: "border-emerald-400/15 bg-emerald-400/[0.035]",
  },
  purple: {
    badge: "border-violet-400/25 bg-violet-400/10 text-violet-300",
    progress: "bg-violet-400",
    surface: "border-violet-400/15 bg-violet-400/[0.035]",
  },
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function AIConfidenceEngine({
  decisionSupportReadiness,
  supplierReliabilityScore,
}: AIConfidenceEngineProps) {
  const accents: EvidenceAccent[] = ["blue", "green", "purple"];
  const evidenceMetrics = decisionSupportReadiness.factors.map(
    (factor, index) => ({
      title: factor.label,
      value: `${factor.score}/100`,
      score: factor.score,
      accent: accents[index] ?? "blue",
    }),
  );
  const supplierReliability = clampScore(supplierReliabilityScore);

  return (
    <ExecutivePanel
      aria-labelledby="decision-evidence-readiness-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
            Decision Evidence Readiness
          </p>
          <h2
            id="decision-evidence-readiness-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Executive Decision Evidence
          </h2>
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Readiness reflects the quality and completeness of current
            procurement evidence. It supports executive review without
            implying probability or statistical certainty.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-nexus-gold/25 bg-nexus-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-nexus-gold">
          {decisionSupportReadiness.label}
        </span>
      </header>

      <section className="mt-7 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.04] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
            Decision-Support Readiness
          </p>
          <div className="mt-4 flex items-end gap-3">
            <p className="text-5xl font-black leading-none text-nexus-white sm:text-6xl">
              {decisionSupportReadiness.score}
            </p>
            <p className="pb-1 text-sm font-black uppercase tracking-[0.14em] text-nexus-muted">
              / 100
            </p>
          </div>
          <p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
            {decisionSupportReadiness.summary}
          </p>
          <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
            {decisionSupportReadiness.guidance}
          </p>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {evidenceMetrics.map((metric) => (
            <EvidenceCard key={metric.title} {...metric} />
          ))}
          <EvidenceCard
            title="Supplier Reliability"
            value={`${supplierReliability}/100`}
            score={supplierReliability}
            accent="gold"
          />
        </div>
      </section>
    </ExecutivePanel>
  );
}

function EvidenceCard({
  title,
  value,
  score,
  accent,
}: {
  title: string;
  value: string;
  score: number;
  accent: EvidenceAccent;
}) {
  const styles = accentStyles[accent];

  return (
    <article className={`min-w-0 rounded-2xl border p-5 ${styles.surface}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-nexus-muted">
          {title}
        </p>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.progress}`} />
      </div>
      <p className="mt-3 text-2xl font-black text-nexus-white">{value}</p>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div
          className={`h-full rounded-full ${styles.progress}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${styles.badge}`}>
        Recorded evidence
      </span>
    </article>
  );
}
