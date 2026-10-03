import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_FEEDBACK_INFO } from "@/lib/design-system/executive-contract";

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
    <ExecutivePanel className="mt-8 min-w-0" padding="lg" tone="gold">
      <p className="np-type-eyebrow text-nexus-gold">
        Decision-support recommendation
      </p>

      <div className="mt-5 grid min-w-0 gap-8 @lg:grid-cols-[1fr_0.9fr] lg:grid-cols-[1fr_0.9fr]">
        <div className="min-w-0">
          <h2 className="np-type-h2 min-w-0 text-pretty">
            Recommended Award Path: Rank #{recommendation.rank}
          </h2>

          <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty text-nexus-text-secondary">
            Current recommended path based on weighted analysis of price
            competitiveness, delivery timeline, submission strength, procurement
            risk, quote validity, and RFQ classification. This is decision
            support for authorized procurement review — not an automatic
            selection and not a guaranteed award.
          </p>

          <div
            className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}
            role="note"
          >
            <p className="np-type-meta text-nexus-cyan-bright">
              Recommendation is not award
            </p>
            <p className="np-type-body mt-1 text-pretty text-nexus-text-primary">
              Confirm award only through the authorized Award contract action
              after reviewing commercial evidence, exceptions, and risk.
            </p>
          </div>

          <div className="mt-6 flex min-w-0 flex-wrap gap-3">
            <ExecutiveBadge tone="gold">
              Overall {recommendation.totalScore}/100
            </ExecutiveBadge>

            <ExecutiveBadge tone="risk">
              Risk {recommendation.riskLevel}
            </ExecutiveBadge>

            <ExecutiveBadge tone="blue">
              Confidence {recommendation.awardConfidence}%
            </ExecutiveBadge>

            <ExecutiveBadge tone="neutral">{scopeLabel}</ExecutiveBadge>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
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
