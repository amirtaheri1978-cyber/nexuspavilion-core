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
company_id: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

type Quote = {
id: string;
rfq_id: string;
company_id?: string | null;
amount: number | string | null;
timeline: string | null;
message: string | null;
decision: string | null;
created_at?: string | null;
validity_days?: number | null;
};

type ScoredQuote = Quote & {
amountNumber: number;
rank: number;
priceScore: number;
timelineScore: number;
performanceScore: number;
riskScore: number;
commercialScore: number;
technicalScore: number;
evaluationScore: number;
totalScore: number;
awardProbability: number;
riskLevel: string;
budgetVariance: number;
lowestBidVariance: number;
};

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) return "$0";

return `$${amount.toLocaleString()}`;
}

function formatDateTime(value: string | null | undefined) {
if (!value) return "N/A";

const date = new Date(value);

if (Number.isNaN(date.getTime())) return value;

return date.toLocaleString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
});
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

function getTimelineMonths(timeline: string | null) {
const value = String(timeline || "").toLowerCase();
const match = value.match(/\d+/);
const number = match ? Number(match[0]) : null;

if (!number) {
if (value.includes("q1")) return 3;
if (value.includes("q2")) return 6;
if (value.includes("q3")) return 9;
if (value.includes("q4")) return 12;
if (value.includes("fast") || value.includes("quick")) return 6;
return 18;
}

if (value.includes("week")) {
return Math.max(1, Math.round(number / 4.345));
}

return number;
}

function getTimelineScore(timeline: string | null) {
const months = getTimelineMonths(timeline);

if (months <= 6) return 100;
if (months <= 9) return 92;
if (months <= 12) return 84;
if (months <= 16) return 74;
if (months <= 20) return 62;
if (months <= 24) return 52;

return 40;
}

function getPerformanceScore(message: string | null) {
const value = String(message || "").toLowerCase();

let score = 55;

const signals = [
"healthcare",
"hospital",
"infection control",
"phased",
"occupied",
"quality assurance",
"project management",
"firestopping",
"commissioning",
"warranty",
"experience",
"certified",
"cor",
"wsib",
];

signals.forEach((signal) => {
if (value.includes(signal)) score += 4;
});

if (value.length > 500) score += 5;
if (value.length > 900) score += 5;

return Math.min(score, 100);
}

function getRiskScore({
amountNumber,
budget,
timeline,
message,
}: {
amountNumber: number;
budget: number;
timeline: string | null;
message: string | null;
}) {
let score = 85;

const months = getTimelineMonths(timeline);
const value = String(message || "").toLowerCase();

if (budget > 0 && amountNumber > budget) score -= 18;
if (budget > 0 && amountNumber < budget * 0.65) score -= 12;
if (months > 24) score -= 15;
if (!value.includes("warranty")) score -= 5;
if (!value.includes("quality")) score -= 5;
if (!value.includes("project management")) score -= 5;

return Math.max(20, Math.min(score, 100));
}

function getRiskLevel(score: number) {
if (score >= 80) return "Low Risk";
if (score >= 60) return "Medium Risk";
return "High Risk";
}

function getValidityScore(validityDays: number) {
if (validityDays >= 120) return 100;
if (validityDays >= 90) return 92;
if (validityDays >= 60) return 84;
return 72;
}

function getBudgetDisciplineScore({
amountNumber,
budget,
}: {
amountNumber: number;
budget: number;
}) {
if (budget <= 0 || amountNumber <= 0) return 70;

const variance = Math.abs(amountNumber - budget) / budget;

if (variance <= 0.05) return 100;
if (variance <= 0.1) return 92;
if (variance <= 0.2) return 80;
if (variance <= 0.35) return 62;

return 45;
}

function getCommercialScore({
priceScore,
validityScore,
budgetDisciplineScore,
}: {
priceScore: number;
validityScore: number;
budgetDisciplineScore: number;
}) {
return Math.min(
100,
Math.round(
priceScore * 0.6 + validityScore * 0.2 + budgetDisciplineScore * 0.2
)
);
}

function getTechnicalScore({
timelineScore,
performanceScore,
riskScore,
}: {
timelineScore: number;
performanceScore: number;
riskScore: number;
}) {
return Math.min(
100,
Math.round(timelineScore * 0.45 + performanceScore * 0.35 + riskScore * 0.2)
);
}

function getEvaluationScore({
commercialScore,
technicalScore,
riskScore,
}: {
commercialScore: number;
technicalScore: number;
riskScore: number;
}) {
return Math.min(
100,
Math.round(commercialScore * 0.45 + technicalScore * 0.4 + riskScore * 0.15)
);
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

function getBenchmarkPosition({
recommendedAmount,
averageBid,
}: {
recommendedAmount: number;
averageBid: number;
}) {
if (recommendedAmount <= 0 || averageBid <= 0) return "Benchmark pending";

const ratio = recommendedAmount / averageBid;

if (ratio <= 0.9) return "Top quartile";
if (ratio <= 1) return "Competitive";
if (ratio <= 1.1) return "Above average";
return "High cost position";
}

function getCompetitivenessIndex({
recommendedAmount,
averageBid,
evaluationScore,
}: {
recommendedAmount: number;
averageBid: number;
evaluationScore: number;
}) {
if (recommendedAmount <= 0 || averageBid <= 0) return evaluationScore;

const pricePosition = Math.max(
0,
Math.min(100, Math.round((averageBid / recommendedAmount) * 100))
);

return Math.min(
100,
Math.round(pricePosition * 0.45 + evaluationScore * 0.55)
);
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

const amounts = commercialEvaluationUnlocked
? quoteList
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount))
: [];

const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;
const highestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

const averageBid =
amounts.length > 0
? Math.round(
amounts.reduce((total, amount) => total + amount, 0) / amounts.length
)
: 0;

const scoredQuotesUnranked = commercialEvaluationUnlocked
? quoteList.map((quote) => {
const amount = Number(quote.amount);
const amountNumber = Number.isFinite(amount) ? amount : 0;

const priceScore =
lowestAmount && amountNumber > 0
? Math.min(100, Math.round((lowestAmount / amountNumber) * 100))
: 0;

const timelineScore = getTimelineScore(quote.timeline);
const performanceScore = getPerformanceScore(quote.message);
const riskScore = getRiskScore({
amountNumber,
budget,
timeline: quote.timeline,
message: quote.message,
});

const validityDays = Number(quote.validity_days || 30);
const validityScore = getValidityScore(validityDays);

const budgetDisciplineScore = getBudgetDisciplineScore({
amountNumber,
budget,
});

const commercialScore = getCommercialScore({
priceScore,
validityScore,
budgetDisciplineScore,
});

const technicalScore = getTechnicalScore({
timelineScore,
performanceScore,
riskScore,
});

const evaluationScore = getEvaluationScore({
commercialScore,
technicalScore,
riskScore,
});

const totalScore = evaluationScore;

const awardProbability = Math.min(
99,
Math.max(
35,
totalScore +
(amountNumber === lowestAmount ? 3 : 0) +
(timelineScore >= 84 ? 2 : 0) -
(averageBid > 0 && amountNumber > averageBid ? 4 : 0)
)
);

return {
...quote,
amountNumber,
rank: 0,
priceScore,
timelineScore,
performanceScore,
riskScore,
commercialScore,
technicalScore,
evaluationScore,
totalScore,
awardProbability,
riskLevel: getRiskLevel(riskScore),
budgetVariance: budget > 0 ? amountNumber - budget : 0,
lowestBidVariance:
lowestAmount && amountNumber > 0 ? amountNumber - lowestAmount : 0,
};
})
: [];

const scoredQuotes: ScoredQuote[] = scoredQuotesUnranked
.sort((a, b) => b.totalScore - a.totalScore)
.map((quote, index) => ({
...quote,
rank: index + 1,
}));

const recommendedQuote = scoredQuotes[0] || null;
const awardedQuote = scoredQuotes.find((quote) => quote.decision === "awarded");
const hasAwardedContract = !!awardedQuote;

const potentialSavings =
recommendedQuote && averageBid ? averageBid - recommendedQuote.amountNumber : 0;


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

const benchmarkPosition =
recommendedQuote && commercialEvaluationUnlocked
? getBenchmarkPosition({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
})
: "Locked";

const competitivenessIndex =
recommendedQuote && commercialEvaluationUnlocked
? getCompetitivenessIndex({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
evaluationScore: recommendedQuote.evaluationScore,
})
: 0;

const confidenceScore = recommendedQuote
? Math.min(
99,
Math.max(
70,
recommendedQuote.totalScore +
(recommendedQuote.amountNumber === lowestAmount ? 3 : 0) +
(recommendedQuote.riskScore >= 80 ? 2 : 0)
)
)
: 0;

const executiveSummary =
commercialEvaluationUnlocked && recommendedQuote
? `${formatMoney(
recommendedQuote.amountNumber
)} is currently the strongest award path with ${confidenceScore}% confidence, ${recommendedQuote.riskLevel.toLowerCase()}, with commercial score of ${recommendedQuote.commercialScore}/100 and technical score of ${recommendedQuote.technicalScore}/100, and final evaluation score of ${recommendedQuote.evaluationScore}/100.`
: commercialEvaluationUnlocked
? "Submit supplier quotes to activate procurement intelligence."
: "Commercial evaluation is locked until the RFQ deadline. Participation is visible, but pricing, ranking, and award controls remain sealed.";

const aiReasons =
commercialEvaluationUnlocked && recommendedQuote
? [
recommendedQuote.amountNumber === lowestAmount
? "Lowest submitted bid"
: "Competitive pricing profile",
`Price score ${recommendedQuote.priceScore}/100`,
`Timeline score ${recommendedQuote.timelineScore}/100`,
`Performance score ${recommendedQuote.performanceScore}/100`,
`Risk score ${recommendedQuote.riskScore}/100`,
potentialSavings > 0
? `${formatMoney(
Math.max(potentialSavings, 0)
)} estimated savings versus average bid`
: "Comparable to average bid",
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
    commercialScore: quote.commercialScore,
    technicalScore: quote.technicalScore,
    evaluationScore: quote.evaluationScore,
    awardProbability: quote.awardProbability,
    riskLevel: quote.riskLevel,
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
              <ExecutiveMetricCard label="RFQ deadline" value={formatDateTime(rfq.deadline)} />
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
            label="Award probability"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${recommendedQuote.awardProbability}%`
                : "Locked"
            }
            insight="Predicted award strength from recorded scores"
            tone="blue"
          />
          <ExecutiveMetricCard
            label="Risk level"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? recommendedQuote.riskLevel
                : "Locked"
            }
            insight="Procurement risk signal"
            tone={
              recommendedQuote?.riskLevel === "High Risk"
                ? "risk"
                : recommendedQuote?.riskLevel === "Low Risk"
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
        <p className="np-type-eyebrow">Benchmarks</p>
        <h2 className="np-type-h2 mt-3">Budget and bid distribution</h2>
        <p className="np-type-body mt-3 max-w-4xl">
          Benchmarks use submitted bid distribution, average bid position, and
          approved budget. No synthetic market data is used.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ExecutiveBadge tone="neutral">{benchmarkPosition}</ExecutiveBadge>
          <ExecutiveBadge tone="neutral">{budgetPosition}</ExecutiveBadge>
          <ExecutiveBadge tone="blue">{bidSpreadPercent}% bid spread</ExecutiveBadge>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetricCard
            label="Competitiveness"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${competitivenessIndex}/100`
                : "Locked"
            }
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
            label="Confidence"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${confidenceScore}%`
                : "Locked"
            }
          />
          <ExecutiveMetricCard
            label="Evaluation"
            value={
              commercialEvaluationUnlocked && recommendedQuote
                ? `${recommendedQuote.evaluationScore}/100`
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
                ? recommendedQuote.riskLevel
                : "Locked"
            }
          />
        </div>
        <div className="mt-6 rounded-executive border border-white/10 bg-black/20 p-5">
          <p className="np-type-meta">Decision drivers</p>
          {aiReasons.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {aiReasons.map((reason) => (
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
