import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/rfq-workspace/shared/executive-progress";

type SupplierScorecardProps = {
  commercialScore: number;
  deliveryScore: number;
  qualityScore: number;
  riskScore: number;
  supplierTier: string;
  supplierRecommendation: string;
  supplierRisk: string;
  supplierHealth: string;
  awardProbability: number;
  totalBidVolume: string;
  awardedRevenue: string;
  submittedQuotes: number;
};

export function SupplierScorecard({
  commercialScore,
  deliveryScore,
  qualityScore,
  riskScore,
  supplierTier,
  supplierRecommendation,
  supplierRisk,
  supplierHealth,
  awardProbability,
  totalBidVolume,
  awardedRevenue,
  submittedQuotes,
}: SupplierScorecardProps) {
  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Supplier Performance Scorecard
          </p>

          <h2 className="mt-3 text-3xl font-black text-nexus-white">
            Performance and Commercial Readiness
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Nexus Pavilion evaluates supplier performance using commercial
            results, delivery reliability, quality signals, quotation
            participation, award conversion, and procurement risk exposure.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <SupplierScoreBar
              title="Commercial Performance"
              value={commercialScore}
            />

            <SupplierScoreBar
              title="Delivery Reliability"
              value={deliveryScore}
            />

            <SupplierScoreBar
              title="Quality Performance"
              value={qualityScore}
            />

            <SupplierScoreBar
              title="Risk Resilience"
              value={riskScore}
            />
          </div>
        </div>

        <div className="min-w-0 rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            Supplier Classification
          </p>

          <h3 className="mt-3 text-2xl font-black text-nexus-white">
            Commercial Profile and Market Position
          </h3>

          <div className="mt-6 grid gap-3">
            <SupplierSignalRow
              label="Supplier Tier"
              value={supplierTier}
            />

            <SupplierSignalRow
              label="Strategic Recommendation"
              value={supplierRecommendation}
            />

            <SupplierSignalRow
              label="Risk Profile"
              value={supplierRisk}
            />

            <SupplierSignalRow
              label="Supplier Health"
              value={supplierHealth}
            />

            <SupplierSignalRow
              label="Award Probability"
              value={`${awardProbability}%`}
            />

            <SupplierSignalRow
              label="Total Quotation Volume"
              value={totalBidVolume}
            />

            <SupplierSignalRow
              label="Awarded Revenue"
              value={awardedRevenue}
            />

            <SupplierSignalRow
              label="Quotation Volume"
              value={String(submittedQuotes)}
            />
          </div>
        </div>
      </div>
    </ExecutivePanel>
  );
}

function SupplierScoreBar({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-black text-nexus-white">
          {title}
        </p>

        <p className="shrink-0 text-sm font-black text-nexus-gold">
          {normalizedValue}/100
        </p>
      </div>

      <ExecutiveProgress
        value={normalizedValue}
        className="mt-4 bg-white/10"
      />
    </div>
  );
}

function SupplierSignalRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="min-w-0 break-words text-sm font-black text-nexus-white sm:text-right">
        {value}
      </p>
    </div>
  );
}