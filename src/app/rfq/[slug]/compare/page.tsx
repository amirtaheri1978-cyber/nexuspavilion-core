import Link from "next/link";
import { redirect } from "next/navigation";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { RfqQuoteComparison } from "@/components/rfq-workspace/rfq-quote-comparison";
import {
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import { formatRfqDeadlineForDisplay as formatDateTime } from "@/lib/datetime/format-rfq-deadline-display";
import {
  buildCommercialIntelligence,
  type Quote,
} from "@/lib/procurement/rfq-commercial-intelligence";
import { createClient } from "@/lib/supabase/server";
import {
  getBlindBiddingMessage,
  shouldEnforceBlindBidding,
  type ContractFramework,
  type ProcurementScope,
  type SourcingMethod,
} from "@/lib/procurement/rfq-metadata";

type PageProps = {
params: Promise<{ slug: string }>;
};

type RFQ = {
id: string;
slug: string;
title: string | null;
budget: number | string | null;
deadline: string | null;
deadline_timezone?: string | null;
company_id: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) return "$0";

return `$${amount.toLocaleString()}`;
}

function hasDeadlinePassed(deadline: string | null | undefined) {
if (!deadline) return false;

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) return false;

return new Date().getTime() > deadlineDate.getTime();
}

function readQuoteSubmissionCount(value: unknown) {
const count = Number(value);

if (!Number.isFinite(count) || count < 0) {
return 0;
}

return Math.trunc(count);
}

function getBidSpreadPercent({
lowestAmount,
highestAmount,
}: {
lowestAmount: number | null;
highestAmount: number | null;
}) {
if (!lowestAmount || !highestAmount || lowestAmount <= 0) return 0;

return Math.round(((highestAmount - lowestAmount) / lowestAmount) * 100);
}

function getBudgetPosition({
recommendedAmount,
budget,
}: {
recommendedAmount: number;
budget: number;
}) {
if (budget <= 0 || recommendedAmount <= 0) return "Budget unavailable";

if (recommendedAmount <= budget * 0.9) return "Strong savings position";
if (recommendedAmount <= budget) return "Within budget";
if (recommendedAmount <= budget * 1.1) return "Slightly over budget";
return "Over budget";
}

function getBidSetPosition({
recommendedAmount,
averageBid,
}: {
recommendedAmount: number;
averageBid: number;
}) {
if (recommendedAmount <= 0 || averageBid <= 0) return "Bid-set position pending";

const ratio = recommendedAmount / averageBid;

if (ratio <= 0.9) return "Strong relative bid position";
if (ratio <= 1) return "Below submitted-bid average";
if (ratio <= 1.1) return "Above submitted-bid average";
return "High relative cost position";
}

function formatRiskLevel(riskLevel: string) {
return `${riskLevel} Risk`;
}

export default async function CompareQuotesPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data: rfqData } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

const rfq = rfqData as RFQ | null;

if (!rfq) {
return (
<div className="min-h-full bg-nexus-navy text-white">
<div className={EXECUTIVE_PAGE_CLASS}>
<ExecutivePanel padding="lg" tone="risk" className="text-center">
<p className="np-type-eyebrow">RFQ comparison</p>
<h1 className="np-type-h1 mt-3">RFQ not found</h1>
<p className="np-type-body mt-3">This comparison workspace could not be found.</p>
<Link href="/rfq" className={`mt-6 inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}>
Back to RFQ marketplace
</Link>
</ExecutivePanel>
</div>
</div>
);
}

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login");
}

const { data: profile } = await supabase
.from("profiles")
.select("id, company_id, role")
.eq("id", user.id)
.single();

if (!profile?.company_id || profile.company_id !== rfq.company_id) {
redirect("/rfq");
}

const deadlinePassed = hasDeadlinePassed(rfq.deadline);
const blindBiddingEnabled = shouldEnforceBlindBidding(rfq);
const commercialEvaluationUnlocked = !blindBiddingEnabled || deadlinePassed;

let quoteList: Quote[] = [];
let quoteCount = 0;

if (commercialEvaluationUnlocked) {
const { data: quotes } = await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("amount", { ascending: true });

quoteList = (quotes ?? []) as Quote[];
quoteCount = quoteList.length;
} else {
const { data: submissionCount } = await supabase.rpc(
"count_rfq_quote_submissions",
{ p_rfq_id: rfq.id },
);

quoteCount = readQuoteSubmissionCount(submissionCount);
}
const supplierCompanyIds = [
  ...new Set(
    quoteList
      .map((quote) => quote.company_id)
      .filter((companyId): companyId is string => Boolean(companyId)),
  ),
];
const { data: supplierCompanyData } =
  supplierCompanyIds.length > 0
    ? await supabase
        .from("company_directory")
        .select("id, name")
        .in("id", supplierCompanyIds)
    : { data: [] };
const supplierNames = new Map(
  ((supplierCompanyData ?? []) as { id: string; name: string | null }[]).map(
    (company) => [company.id, company.name || "Named supplier"],
  ),
);
const budget = Number(rfq.budget || 0);

const {
scoredQuotes,
recommendedQuote,
awardedQuote,
lowestAmount,
highestAmount,
averageBid,
potentialSavings,
} = buildCommercialIntelligence({
quoteList,
budget,
commercialEvaluationUnlocked,
isOwner: true,
});
const hasAwardedContract = !!awardedQuote;


const bidSpreadPercent = getBidSpreadPercent({
lowestAmount,
highestAmount,
});

const budgetPosition =
recommendedQuote && commercialEvaluationUnlocked
? getBudgetPosition({
recommendedAmount: recommendedQuote.amountNumber,
budget,
})
: "Locked";

const bidSetPosition =
recommendedQuote && commercialEvaluationUnlocked
? getBidSetPosition({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
})
: "Locked";

const executiveSummary =
commercialEvaluationUnlocked && recommendedQuote
? `${formatMoney(
recommendedQuote.amountNumber
)} is the current rank #${recommendedQuote.rank} recommendation with an evaluation score of ${recommendedQuote.totalScore}/100 and ${formatRiskLevel(recommendedQuote.riskLevel).toLowerCase()}. It reflects the highest current weighted evaluation across submitted quotes, not a guaranteed award.`
: commercialEvaluationUnlocked
? "Submit supplier quotes to activate procurement intelligence."
: "Commercial evaluation is locked until the RFQ deadline. Participation is visible, but pricing, ranking, and award controls remain sealed.";

const decisionDrivers =
commercialEvaluationUnlocked && recommendedQuote
? [
`Current evaluation rank #${recommendedQuote.rank}`,
recommendedQuote.amountNumber === lowestAmount
? "Lowest submitted bid"
: "Relative submitted-bid price position",
`Price score ${recommendedQuote.priceScore}/100`,
`Timeline score ${recommendedQuote.timelineScore}/100`,
`Performance score ${recommendedQuote.performanceScore}/100`,
`Risk readiness ${recommendedQuote.riskScore}/100 (${formatRiskLevel(recommendedQuote.riskLevel)})`,
potentialSavings > 0
? `${formatMoney(
Math.max(potentialSavings, 0)
)} potential savings versus average submitted bid`
: "At or above the average submitted bid",
]
: [];

const comparisonQuotes = scoredQuotes.map((quote) => {
  const isLowest =
    lowestAmount !== null && quote.amountNumber === lowestAmount;
  const isHighest =
    highestAmount !== null &&
    highestAmount !== lowestAmount &&
    quote.amountNumber === highestAmount;

  return {
    id: quote.id,
    supplierLabel:
      (quote.company_id && supplierNames.get(quote.company_id)) ||
      `Supplier quote #${quote.rank}`,
    amountLabel: formatMoney(quote.amountNumber),
    amountNumber: quote.amountNumber,
    timeline: quote.timeline,
    validityDays: Number(quote.validity_days || 30),
    decision: quote.decision,
    rank: quote.rank,
    priceScore: quote.priceScore,
    timelineScore: quote.timelineScore,
    performanceScore: quote.performanceScore,
    riskScore: quote.riskScore,
    evaluationScore: quote.totalScore,
    riskLevel: formatRiskLevel(quote.riskLevel),
    budgetVarianceLabel: formatMoney(quote.budgetVariance),
    lowestBidVarianceLabel: formatMoney(quote.lowestBidVariance),
    isRecommended: recommendedQuote?.id === quote.id,
    isLowest,
    isHighest,
    isBelowAverage: averageBid > 0 && quote.amountNumber <= averageBid,
    canAward: !hasAwardedContract && quote.decision !== "awarded",
  };
});

const rfqTitle = rfq.title || "Untitled RFQ";

return (
  <div className="min-h-full bg-nexus-navy text-white">
    <div className={EXECUTIVE_PAGE_CLASS}>
      <Link
        href={`/rfq/${rfq.slug}`}
        className={`inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
      >
        Back to RFQ
      </Link>

      <ExecutivePanel variant="executive" padding="lg" tone="gold" className="np-region">
        <p className="np-type-eyebrow">Quote comparison</p>
        <h1 className="np-type-h1 mt-4">{rfqTitle}</h1>
        <p className="np-type-body mt-4 max-w-4xl">
          Compare submitted quotes using the recorded commercial values and the
          existing evaluation scores. Recommendation is decision evidence, not a
          guaranteed outcome.
        </p>
        {blindBiddingEnabled ? (
          <div className="mt-6 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.08] p-5">
            <ExecutiveBadge tone="warning">
              {commercialEvaluationUnlocked ? "Commercial opening complete" : "Blind bidding active"}
            </ExecutiveBadge>
            <p className="np-type-body mt-3">{getBlindBiddingMessage(rfq)}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <ExecutiveMetricCard label="RFQ deadline" value={formatDateTime(rfq.deadline, rfq.deadline_timezone)} />
              <ExecutiveMetricCard label="Submissions" value={`${quoteCount} received`} />
              <ExecutiveMetricCard
                label="Commercial opening"
                value={commercialEvaluationUnlocked ? "Unlocked" : "Locked"}
                tone={commercialEvaluationUnlocked ? "success" : "gold"}
              />
            </div>
          </div>
        ) : null}
      </ExecutivePanel>

      <section className="np-region" aria-labelledby="compare-position-heading">
        <p className="np-type-eyebrow">Position</p>
        <h2 id="compare-position-heading" className="np-type-h2 mt-3">
          Current award position
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetricCard
            label="Recommended bid"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? formatMoney(recommendedQuote.amountNumber)
                : commercialEvaluationUnlocked
                  ? "No bids"
                  : "Locked"
            }
            insight={
              commercialEvaluationUnlocked
                ? "Highest current evaluation score"
                : "Hidden until deadline"
            }
            tone="gold"
          />
          <ExecutiveMetricCard
            label="Decision basis"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${recommendedQuote.totalScore}/100`
                : "Locked"
            }
            insight="Highest current weighted evaluation"
            tone="blue"
          />
          <ExecutiveMetricCard
            label="Risk level"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? formatRiskLevel(recommendedQuote.riskLevel)
                : "Locked"
            }
            insight="Procurement risk signal"
            tone={
              recommendedQuote?.riskLevel === "High"
                ? "risk"
                : recommendedQuote?.riskLevel === "Low"
                  ? "success"
                  : "neutral"
            }
          />
          <ExecutiveMetricCard
            label="Potential savings"
            value={
              commercialEvaluationUnlocked
                ? formatMoney(Math.max(potentialSavings, 0))
                : "Locked"
            }
            insight="Compared to average bid"
            tone="gold"
          />
        </div>
      </section>

      <ExecutivePanel variant="boardroom" padding="lg" className="np-region-major">
        <p className="np-type-eyebrow">Submitted bid set</p>
        <h2 className="np-type-h2 mt-3">Budget and submitted-bid distribution</h2>
        <p className="np-type-body mt-3 max-w-4xl">
          This position uses only quotes submitted for this RFQ, their average
          submitted bid, and the approved RFQ budget. No synthetic market or
          external benchmark data is used.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ExecutiveBadge tone="neutral">{bidSetPosition}</ExecutiveBadge>
          <ExecutiveBadge tone="neutral">{budgetPosition}</ExecutiveBadge>
          <ExecutiveBadge tone="blue">{bidSpreadPercent}% bid spread</ExecutiveBadge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetricCard
            label="Evaluation position"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${recommendedQuote.totalScore}/100`
                : "Locked"
            }
            insight="Canonical evaluation score within this RFQ bid set"
          />
          <ExecutiveMetricCard
            label="Average bid"
            value={
              commercialEvaluationUnlocked && averageBid
                ? formatMoney(averageBid)
                : "Locked"
            }
          />
          <ExecutiveMetricCard
            label="Budget position"
            value={commercialEvaluationUnlocked ? budgetPosition : "Locked"}
          />
          <ExecutiveMetricCard
            label="Bid spread"
            value={commercialEvaluationUnlocked ? `${bidSpreadPercent}%` : "Locked"}
          />
        </div>
      </ExecutivePanel>

      <ExecutivePanel variant="operational" padding="lg" className="np-region-major">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
          <div>
            <p className="np-type-eyebrow">Next action</p>
            <h2 className="np-type-h2 mt-3">
              {commercialEvaluationUnlocked && recommendedQuote
                ? `Recommended supplier rank #${recommendedQuote.rank}`
                : commercialEvaluationUnlocked
                  ? "Awaiting supplier quotes"
                  : "Commercial evaluation locked"}
            </h2>
            <p className="np-type-body mt-4 max-w-4xl">{executiveSummary}</p>
          </div>
          <ExecutiveBadge tone={hasAwardedContract ? "awarded" : commercialEvaluationUnlocked ? "gold" : "locked"}>
            {hasAwardedContract
              ? "Awarded"
              : commercialEvaluationUnlocked
                ? "Decision ready"
                : "Locked"}
          </ExecutiveBadge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetricCard
            label="Evaluation strength"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${recommendedQuote.totalScore}/100`
                : "Locked"
            }
          />
          <ExecutiveMetricCard
            label="Evaluation"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${recommendedQuote.totalScore}/100`
                : "Locked"
            }
          />
          <ExecutiveMetricCard
            label="Recommended"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? formatMoney(recommendedQuote.amountNumber)
                : "Locked"
            }
            tone="gold"
          />
          <ExecutiveMetricCard
            label="Risk"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? formatRiskLevel(recommendedQuote.riskLevel)
                : "Locked"
            }
          />
        </div>
        <div className="mt-6 rounded-executive border border-white/10 bg-black/20 p-5">
          <p className="np-type-meta">Decision drivers</p>
          {decisionDrivers.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {decisionDrivers.map((reason) => (
                <li key={reason} className="np-type-body">
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="np-type-body mt-3">
              {commercialEvaluationUnlocked
                ? "Supplier quotes are required before an executive award recommendation can be generated."
                : "Decision drivers remain locked until commercial opening."}
            </p>
          )}
        </div>
      </ExecutivePanel>

      {!commercialEvaluationUnlocked ? (
        <ExecutivePanel variant="operational" padding="lg" className="np-region">
          <p className="np-type-eyebrow">Participation</p>
          <h2 className="np-type-h2 mt-3">Commercial data remains sealed</h2>
          <p className="np-type-body mt-3">
            {quoteCount} quote{quoteCount === 1 ? "" : "s"} received.
            Pricing, ranking, and award controls remain locked until the RFQ
            deadline.
          </p>
        </ExecutivePanel>
      ) : (
        <RfqQuoteComparison
          rfqTitle={rfqTitle}
          quotes={comparisonQuotes}
          awarded={hasAwardedContract}
        />
      )}
    </div>
  </div>
);
}
