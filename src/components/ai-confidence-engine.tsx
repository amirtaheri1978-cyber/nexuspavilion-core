import { ExecutivePanel } from "@/components/executive/executive-panel";

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
    surface: string;
  }
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
  orange: {
    badge: "border-orange-400/25 bg-orange-400/10 text-orange-300",
    progress: "bg-orange-400",
    surface: "border-orange-400/15 bg-orange-400/[0.035]",
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
  const aiConfidenceMetric = confidenceMetrics[0];
  const evidenceFoundationMetrics = confidenceMetrics.slice(1, 3);
  const predictionAssuranceMetrics = confidenceMetrics.slice(3, 5);

  return (
    <ExecutivePanel
      aria-labelledby="ai-confidence-engine-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              AI Confidence Engine
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Decision assurance and evidence governance
            </p>
          </div>

          <h2
            id="ai-confidence-engine-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Executive Prediction Confidence
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Confidence indicators are generated only from validated procurement
            intelligence. Nexus Pavilion does not inflate decision confidence
            using placeholder metrics, simulated analytics, or unsupported
            prediction signals.
          </p>
        </div>

        <ConfidenceStatusBadge classification={trustClassification} />
      </header>

      <section
        aria-labelledby="decision-trust-position-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.04]"
      >
        <div className="grid min-w-0 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Decision trust position
            </p>

            <div className="mt-4 flex min-w-0 items-end gap-3">
              <p className="break-words text-5xl font-black leading-none text-nexus-white [overflow-wrap:anywhere] sm:text-6xl">
                {decisionTrustIndex}
              </p>

              <p className="pb-1 text-sm font-black uppercase tracking-[0.14em] text-nexus-muted">
                / 100
              </p>
            </div>

            <h3
              id="decision-trust-position-heading"
              className="mt-4 break-words text-xl font-black leading-7 text-nexus-white [overflow-wrap:anywhere] sm:text-2xl"
            >
              {trustClassification}
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Composite confidence position calculated across all five
              validated evidence and prediction dimensions.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              AI confidence position
            </p>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-3xl font-black leading-tight text-nexus-white [overflow-wrap:anywhere] sm:text-4xl">
                  {aiConfidenceMetric.value}
                </p>

                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-nexus-muted">
                  Validated AI evidence strength
                </p>
              </div>

              <p className="shrink-0 text-sm font-black text-nexus-white">
                {aiConfidenceMetric.score}/100
              </p>
            </div>

            <div className="mt-5">
              <ConfidenceProgress
                title={aiConfidenceMetric.title}
                score={aiConfidenceMetric.score}
                accent={aiConfidenceMetric.accent}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
                Governance interpretation
              </p>

              <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
                The AI confidence position should be interpreted together with
                data quality, supplier reliability, prediction accuracy, and
                award confidence before an executive recommendation is treated
                as decision-ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="confidence-foundation-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Evidence foundation
            </p>

            <h3
              id="confidence-foundation-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Procurement Intelligence Reliability
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            These dimensions measure whether the underlying procurement
            evidence is sufficiently complete and dependable for executive
            interpretation.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
          {evidenceFoundationMetrics.map((metric) => (
            <ConfidenceDimensionCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              score={metric.score}
              accent={metric.accent}
              context="Evidence Foundation"
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="prediction-assurance-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Prediction assurance
            </p>

            <h3
              id="prediction-assurance-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Forecast and Award Confidence
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            These dimensions measure the reliability of predictive outputs and
            the strength of evidence supporting anticipated procurement
            outcomes.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
          {predictionAssuranceMetrics.map((metric) => (
            <ConfidenceDimensionCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              score={metric.score}
              accent={metric.accent}
              context="Prediction Assurance"
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="executive-confidence-policy-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
      >
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive confidence policy
            </p>

            <h3
              id="executive-confidence-policy-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Decision Evidence Governance
            </h3>

            <p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
              Executive recommendations remain governed by the quality,
              completeness, and reliability of the evidence available to the
              platform.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <div className="rounded-2xl border border-nexus-gold/15 bg-nexus-gold/[0.04] p-5 sm:p-6">
              <p className="text-sm font-semibold leading-7 text-nexus-muted">
                AI confidence reflects procurement evidence, supplier
                participation, RFQ quality, award history, and validated
                operational intelligence. Executive recommendations are
                intentionally blocked whenever evidence quality is
                insufficient.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ConfidenceSignal
                label="Decision Trust Classification"
                value={trustClassification}
              />

              <ConfidenceSignal
                label="Composite Evidence Index"
                value={`${decisionTrustIndex}/100`}
              />
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function ConfidenceDimensionCard({
  title,
  value,
  score,
  accent,
  context,
}: ConfidenceCardProps & {
  context: string;
}) {
  const styles = accentStyles[accent];

  return (
    <article
      className={`flex min-w-0 flex-col rounded-3xl border p-5 sm:p-6 ${styles.surface}`}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div
          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${styles.badge}`}
        >
          {title}
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-nexus-muted">
          {context}
        </p>
      </div>

      <div className="mt-6 flex min-w-0 items-end justify-between gap-4">
        <p className="break-words text-3xl font-black leading-tight text-nexus-white [overflow-wrap:anywhere] sm:text-4xl">
          {value}
        </p>

        <p className="shrink-0 pb-1 text-xs font-black text-nexus-muted">
          {score}/100
        </p>
      </div>

      <div className="mt-6">
        <ConfidenceProgress title={title} score={score} accent={accent} />
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs font-semibold leading-6 text-nexus-muted">
          Validated contribution to the composite Decision Trust Index.
        </p>
      </div>
    </article>
  );
}

function ConfidenceProgress({
  title,
  score,
  accent,
}: {
  title: string;
  score: number;
  accent: ConfidenceAccent;
}) {
  const styles = accentStyles[accent];

  return (
    <div>
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
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
          Evidence Strength
        </span>

        <span className="text-xs font-black text-nexus-white">
          {score}/100
        </span>
      </div>
    </div>
  );
}

function ConfidenceSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function ConfidenceStatusBadge({
  classification,
}: {
  classification: string;
}) {
  const isDecisionReady = classification === "Decision Ready";
  const isValidated = classification === "Validated";
  const isConditional = classification === "Conditional";

  const styles = isDecisionReady
    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
    : isValidated
      ? "border-sky-300/20 bg-sky-400/10 text-sky-300"
      : isConditional
        ? "border-orange-300/20 bg-orange-400/10 text-orange-300"
        : "border-rose-300/20 bg-rose-400/10 text-rose-300";

  return (
    <div className="flex flex-col items-start gap-2 xl:items-end">
      <span
        className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${styles}`}
      >
        {classification}
      </span>

      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
        Confidence governance status
      </p>
    </div>
  );
}