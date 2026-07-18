type AIConfidenceEngineProps = {
  aiConfidenceScore: string;
  dataQualityScore: number;
  supplierReliabilityScore: number;
  predictionAccuracy: number;
  awardPredictionConfidence: string;
};

type ConfidenceAccent =
  | "gold"
  | "blue"
  | "green"
  | "purple"
  | "orange";

type ConfidenceCardProps = {
  title: string;
  value: string;
  score: number;
  accent: ConfidenceAccent;
};

const accentStyles: Record<
  ConfidenceAccent,
  {
    badge: string;
    progress: string;
  }
> = {
  gold: {
    badge: "border-[#C8A646]/25 bg-[#C8A646]/10 text-[#F4D67A]",
    progress: "bg-[#C8A646]",
  },
  blue: {
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    progress: "bg-sky-400",
  },
  green: {
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    progress: "bg-emerald-400",
  },
  purple: {
    badge: "border-violet-400/25 bg-violet-400/10 text-violet-300",
    progress: "bg-violet-400",
  },
  orange: {
    badge: "border-orange-400/25 bg-orange-400/10 text-orange-300",
    progress: "bg-orange-400",
  },
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function confidenceLabelToScore(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  const numericMatch = normalizedValue.match(/-?\d+(\.\d+)?/);

  if (numericMatch) {
    return clampScore(Number(numericMatch[0]));
  }

  if (
    normalizedValue.includes("very high") ||
    normalizedValue.includes("excellent")
  ) {
    return 95;
  }

  if (
    normalizedValue.includes("high") ||
    normalizedValue.includes("strong")
  ) {
    return 85;
  }

  if (
    normalizedValue.includes("moderate") ||
    normalizedValue.includes("medium")
  ) {
    return 65;
  }

  if (
    normalizedValue.includes("low") ||
    normalizedValue.includes("limited")
  ) {
    return 35;
  }

  if (
    normalizedValue.includes("insufficient") ||
    normalizedValue.includes("unavailable") ||
    normalizedValue.includes("not available")
  ) {
    return 0;
  }

  return 0;
}

function getTrustClassification(score: number) {
  if (score >= 85) {
    return "Decision Ready";
  }

  if (score >= 70) {
    return "Validated";
  }

  if (score >= 50) {
    return "Conditional";
  }

  return "Insufficient Evidence";
}

export default function AIConfidenceEngine({
  aiConfidenceScore,
  dataQualityScore,
  supplierReliabilityScore,
  predictionAccuracy,
  awardPredictionConfidence,
}: AIConfidenceEngineProps) {
  const aiConfidenceNumeric = confidenceLabelToScore(aiConfidenceScore);
  const dataQualityNumeric = clampScore(dataQualityScore);
  const supplierReliabilityNumeric = clampScore(supplierReliabilityScore);
  const predictionAccuracyNumeric = clampScore(predictionAccuracy);
  const awardPredictionNumeric = confidenceLabelToScore(
    awardPredictionConfidence,
  );

  const confidenceMetrics: ConfidenceCardProps[] = [
    {
      title: "AI Confidence",
      value: aiConfidenceScore,
      score: aiConfidenceNumeric,
      accent: "gold",
    },
    {
      title: "Data Quality",
      value: `${dataQualityScore}/100`,
      score: dataQualityNumeric,
      accent: "blue",
    },
    {
      title: "Supplier Reliability",
      value: `${supplierReliabilityScore}/100`,
      score: supplierReliabilityNumeric,
      accent: "green",
    },
    {
      title: "Prediction Accuracy",
      value: `${predictionAccuracy}%`,
      score: predictionAccuracyNumeric,
      accent: "purple",
    },
    {
      title: "Award Confidence",
      value: awardPredictionConfidence,
      score: awardPredictionNumeric,
      accent: "orange",
    },
  ];

  const decisionTrustIndex = Math.round(
    confidenceMetrics.reduce((total, metric) => total + metric.score, 0) /
      confidenceMetrics.length,
  );

  const trustClassification = getTrustClassification(decisionTrustIndex);

  return (
    <section
      aria-labelledby="ai-confidence-engine-heading"
      className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
            AI Confidence Engine
          </p>

          <h2
            id="ai-confidence-engine-heading"
            className="mt-4 text-3xl font-black tracking-tight sm:text-4xl"
          >
            Executive Prediction Confidence
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
            Confidence indicators are generated only from validated procurement
            intelligence. Nexus Pavilion never inflates confidence using
            placeholder AI metrics or simulated analytics.
          </p>
        </div>

        <div className="min-w-[190px] rounded-[24px] border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8FE6FF]">
            Decision Trust Index
          </p>

          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-black text-white">
              {decisionTrustIndex}
            </p>

            <p className="pb-1 text-sm font-black text-slate-400">/100</p>
          </div>

          <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#8FE6FF]">
            {trustClassification}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {confidenceMetrics.map((metric) => (
          <ConfidenceCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            score={metric.score}
            accent={metric.accent}
          />
        ))}
      </div>

      <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.05] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
          Executive Confidence Policy
        </p>

        <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
          AI confidence reflects procurement evidence, supplier participation,
          RFQ quality, award history, and validated operational intelligence.
          Executive recommendations are intentionally blocked whenever evidence
          quality is insufficient.
        </p>
      </div>
    </section>
  );
}

function ConfidenceCard({
  title,
  value,
  score,
  accent,
}: ConfidenceCardProps) {
  const styles = accentStyles[accent];

  return (
    <article className="rounded-[28px] border border-white/10 bg-[#071A2C] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:shadow-[0_0_40px_rgba(44,196,232,.12)]">
      <div
        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles.badge}`}
      >
        {title}
      </div>

      <p className="mt-6 break-words text-3xl font-black text-white sm:text-4xl">
        {value}
      </p>

      <div className="mt-6">
        <div
          aria-label={`${title}: ${score} out of 100`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={score}
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${styles.progress}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Evidence Strength
          </span>

          <span className="text-xs font-black text-slate-300">
            {score}/100
          </span>
        </div>
      </div>
    </article>
  );
}