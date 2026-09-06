import { ExecutivePanel } from "@/components/executive/executive-panel";
import type { ProcurementInsightMetrics as ProcurementInsightMetricsModel } from "@/lib/analytics/portfolio/portfolio-intelligence";

type ProcurementInsightMetricsProps = {
  metrics: ProcurementInsightMetricsModel;
};

function formatPercentage(value: number | null): string {
  return value == null ? "Insufficient Data" : `${value}%`;
}

function formatAverage(
  value: number | null,
  unit: "days" | "quotations",
): string {
  if (value == null) {
    return "Insufficient Data";
  }

  return unit === "days" ? `${value} days` : value.toFixed(1);
}

function EvidenceMetric({
  label,
  value,
  definition,
  evidence,
}: {
  label: string;
  value: string;
  definition: string;
  evidence: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black tabular-nums text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>
      <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
        {definition}
      </p>
      <p className="mt-4 border-t border-white/10 pt-3 text-[11px] font-bold leading-5 text-slate-300">
        {evidence}
      </p>
    </article>
  );
}

export function ProcurementInsightMetrics({
  metrics,
}: ProcurementInsightMetricsProps) {
  const activeAge = metrics.averageActiveRfqAge;
  const submissionCoverage = metrics.rfqSubmissionCoverage;
  const decisionCoverage = metrics.quotationDecisionCoverage;
  const quotationAwardRate = metrics.quotationAwardRate;
  const averageQuotations = metrics.averageQuotationsPerRfq;

  return (
    <ExecutivePanel
      id="procurement-denominator-evidence"
      padding="lg"
    >
      <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
        Procurement Evidence Metrics
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">
        Cycle, Participation, and Evaluation Evidence
      </h2>

      <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
        Each ratio states its observed numerator and denominator. These metrics
        describe recorded procurement activity and do not represent RFQ
        invitation response rates or completed-cycle duration unless the
        required source evidence exists.
      </p>

      <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EvidenceMetric
          label="Average Active RFQ Age"
          value={formatAverage(activeAge.value, "days")}
          definition="Elapsed age of active RFQs with valid creation timestamps."
          evidence={`${activeAge.numerator} observed age-days / ${activeAge.denominator} eligible active RFQs`}
        />

        <EvidenceMetric
          label="RFQ Submission Coverage"
          value={formatPercentage(submissionCoverage.percentage)}
          definition="RFQs with at least one submitted quotation across the company-scoped RFQ population."
          evidence={`${submissionCoverage.numerator} RFQs with submissions / ${submissionCoverage.denominator} total RFQs`}
        />

        <EvidenceMetric
          label="Quotation Decision Coverage"
          value={formatPercentage(decisionCoverage.percentage)}
          definition="Submitted quotation rows with a recorded non-empty decision."
          evidence={`${decisionCoverage.numerator} quotations with decisions / ${decisionCoverage.denominator} submitted quotations`}
        />

        <EvidenceMetric
          label="Quotation Award Rate"
          value={formatPercentage(quotationAwardRate.percentage)}
          definition="Awarded quotation rows across all submitted quotation rows."
          evidence={`${quotationAwardRate.numerator} awarded quotations / ${quotationAwardRate.denominator} submitted quotations`}
        />

        <EvidenceMetric
          label="Average Quotations per RFQ"
          value={formatAverage(averageQuotations.value, "quotations")}
          definition="Submitted quotation rows distributed across all company-scoped RFQs."
          evidence={`${averageQuotations.numerator} submitted quotations / ${averageQuotations.denominator} total RFQs`}
        />

        <article className="min-w-0 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
            Completed Cycle Duration
          </p>
          <p className="mt-3 text-2xl font-black text-nexus-white">
            Insufficient Data
          </p>
          <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
            {metrics.completedCycleDuration.limitation}
          </p>
          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] font-bold leading-5 text-slate-300">
            A mutable RFQ status is not used as a substitute for a trusted
            awarded or closed timestamp.
          </p>
        </article>
      </div>

      <p className="mt-5 text-[11px] font-semibold leading-5 text-nexus-muted">
        Evidence as of {metrics.asOf}. RFQ Submission Coverage is not an
        invitation response rate because this analytics source does not load an
        RFQ-invitation denominator.
      </p>
    </ExecutivePanel>
  );
}
