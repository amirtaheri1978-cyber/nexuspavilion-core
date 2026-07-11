import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RFQRecommendedAward = {
  rank: number;
  totalScore: number;
  riskLevel: string;
  awardConfidence: number;
  priceScore: number;
  timelineScore: number;
  performanceScore: number;
  riskScore: number;
};

type RFQRecommendedAwardPathProps = {
  recommendation: RFQRecommendedAward;
  scopeLabel: string;
};

export function RFQRecommendedAwardPath({
  recommendation,
  scopeLabel,
}: RFQRecommendedAwardPathProps) {
  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
        Decision Intelligence Layer
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <h2 className="text-3xl font-black text-nexus-white sm:text-4xl">
            Recommended Award Path: Rank #{recommendation.rank}
          </h2>

          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Nexus Pavilion recommends this supplier based on weighted analysis
            of price competitiveness, delivery timeline, proposal strength,
            procurement risk, proposal validity, and RFQ classification.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ExecutiveBadge tone="gold">
              Overall {recommendation.totalScore}/100
            </ExecutiveBadge>

            <ExecutiveBadge tone="risk">
              Risk {recommendation.riskLevel}
            </ExecutiveBadge>

            <ExecutiveBadge tone="blue">
              Confidence {recommendation.awardConfidence}%
            </ExecutiveBadge>

            <ExecutiveBadge tone="neutral">
              {scopeLabel}
            </ExecutiveBadge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ExecutiveMetricCard
            label="Price Score"
            value={`${recommendation.priceScore}/100`}
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Timeline Score"
            value={`${recommendation.timelineScore}/100`}
            tone="gold"
          />

          <ExecutiveMetricCard
            label="Performance"
            value={`${recommendation.performanceScore}/100`}
            tone="success"
          />

          <ExecutiveMetricCard
            label="Risk Score"
            value={`${recommendation.riskScore}/100`}
            tone="risk"
          />
        </div>
      </div>
    </ExecutivePanel>
  );
}