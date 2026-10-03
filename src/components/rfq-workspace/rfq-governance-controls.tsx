import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_WARNING,
} from "@/lib/design-system/executive-contract";

type RFQBlindBiddingNoticeProps = {
  message: string;
  quoteCount: number;
};

type RFQGovernanceNoticeProps = {
  reservationNotice: string;
};

export function RFQBlindBiddingNotice({
  message,
  quoteCount,
}: RFQBlindBiddingNoticeProps) {
  return (
    <ExecutivePanel className="min-w-0" padding="lg" tone="gold">
      <p className="np-type-eyebrow text-nexus-gold">
        Blind Bidding Enforcement
      </p>

      <h3 className="np-type-h2 mt-3 min-w-0 text-pretty">
        Commercial bids are locked until closing
      </h3>

      <p className="np-type-body mt-3 max-w-4xl min-w-0 text-pretty text-nexus-text-secondary">
        {message}
      </p>

      <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-3">
        <BlindBiddingMetric
          title="Submissions"
          value={`${quoteCount} received`}
        />

        <BlindBiddingMetric title="Commercial Pricing" value="Locked" />

        <BlindBiddingMetric title="Evaluation Room" value="Closed" />
      </div>
    </ExecutivePanel>
  );
}

export function RFQGovernanceNotice({
  reservationNotice,
}: RFQGovernanceNoticeProps) {
  return (
    <ExecutivePanel className="min-w-0" padding="lg" tone="risk">
      <p className="np-type-eyebrow text-status-risk">
        Governance &amp; confidentiality
      </p>
      <h3 className="np-type-h2 mt-3 min-w-0 text-pretty">
        Respondent operating conditions
      </h3>
      <p className="np-type-body mt-3 max-w-4xl min-w-0 text-pretty text-nexus-text-secondary">
        Review issuer reservation rights and confidentiality controls before
        preparing a quotation. These conditions remain binding for all
        respondents.
      </p>

      <div
        className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_WARNING}`}
        role="status"
      >
        <p className="np-type-meta text-status-warning">
          Buyer Reservation Rights
        </p>
        <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-primary">
          {reservationNotice}
        </p>
      </div>

      <div
        className={`mt-4 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}
        role="status"
      >
        <p className="np-type-meta text-nexus-cyan-bright">
          Confidentiality &amp; Anti-Collusion
        </p>
        <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-primary">
          Supplier submissions are confidential. Competing suppliers cannot
          view each other’s pricing, commercial notes, validity periods, or
          commercial submission data.
        </p>
      </div>
    </ExecutivePanel>
  );
}

function BlindBiddingMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return <ExecutiveMetricCard label={title} value={value} tone="gold" />;
}
