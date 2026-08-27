import { redirect } from "next/navigation";

import { ExecutiveAttentionStrip } from "@/components/dashboard/executive-attention-strip";
import { ExecutiveDecisionWorkspace } from "@/components/dashboard/executive-decision-workspace";
import { ExecutiveHero } from "@/components/dashboard/executive-hero";
import { ExecutiveKpiRow } from "@/components/dashboard/executive-kpi-row";
import { GovernanceReferenceWorkspace } from "@/components/dashboard/governance-reference-workspace";
import { ProcurementOperationsWorkspace } from "@/components/dashboard/procurement-operations-workspace";
import { StrategicIntelligenceWorkspace } from "@/components/dashboard/strategic-intelligence-workspace";
import { buildPortfolioIntelligence } from "@/lib/analytics/portfolio/portfolio-intelligence";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";

type ProcurementScope =
  | "material"
  | "subcontractor"
  | "equipment"
  | "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

type RFQ = {
  id: string;
  slug: string | null;
  title: string | null;
  category: string | null;
  location: string | null;
  budget: number | string | null;
  status: string | null;
  created_at: string | null;
  procurement_scope: ProcurementScope | null;
  sourcing_method: SourcingMethod | null;
  contract_framework: ContractFramework | null;
};

type Quote = {
  id: string;
  rfq_id: string;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
  created_at: string | null;
};

type Company = {
  id: string;
  name: string | null;
  slug: string | null;
  category: string | null;
  location: string | null;
  network_role: string | null;
  status: string | null;
  logo_url: string | null;
};

type WorkspaceAlert = {
  level: "healthy" | "opportunity" | "warning";
  title: string;
  message: string;
};

type ReadinessItem = {
  title: string;
  description: string;
  completed: boolean;
  href: string;
};

const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
  material: "Material RFQs",
  subcontractor: "Trade RFQs",
  equipment: "Equipment RFQs",
  professional_service: "Service RFQs",
};

const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
  open: "Open RFQs",
  invited: "Invited RFQs",
  sealed_bid: "Sealed Bid RFQs",
};

const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
  project_specific: "Project-Specific",
  framework: "Framework Agreement",
};

const DASHBOARD_COPY = {
  eyebrow: "Company Workspace",
  title: "Executive Overview",
  subtitle:
    "Current state of the company procurement portfolio: owned RFQs, supplier quotes received, awards, and budget utilization.",
  briefTitle: "Executive Decision Context",
  briefLabel: "Executive Overview",
  recommendation:
    "Review open RFQs, supplier quote coverage, and recorded award outcomes before expanding procurement activity.",
  companyLabel: "Company",
};

function getProcurementScope(value: ProcurementScope | null | undefined) {
  if (value && PROCUREMENT_SCOPE_LABELS[value]) return value;
  return "subcontractor";
}

function getSourcingMethod(value: SourcingMethod | null | undefined) {
  if (value && SOURCING_METHOD_LABELS[value]) return value;
  return "invited";
}

function getContractFramework(value: ContractFramework | null | undefined) {
  if (value && CONTRACT_FRAMEWORK_LABELS[value]) return value;
  return "project_specific";
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString()}`;
}

function buildReadinessItems({
  company,
  totalRfqs,
  supplierQuotes,
}: {
  company: Company | null;
  totalRfqs: number;
  supplierQuotes: number;
}): ReadinessItem[] {
  return [
    {
      title: "Company Created",
      description: "Your company workspace has been activated.",
      completed: Boolean(company?.id),
      href: "/company/settings",
    },
    {
      title: "Company Logo",
      description: "Upload an official company logo for marketplace trust.",
      completed: Boolean(company?.logo_url),
      href: "/company/settings",
    },
    {
      title: "Regional Hub",
      description: "Confirm market presence and regional context.",
      completed: Boolean(company?.location),
      href: "/company/settings",
    },
    {
      title: "Organization Role",
      description: "Confirm the company role recorded in the workspace.",
      completed: Boolean(company?.network_role),
      href: "/company/settings",
    },
    {
      title: "First RFQ",
      description: "Create the first procurement opportunity.",
      completed: totalRfqs > 0,
      href: "/rfq/new",
    },
    {
      title: "Quote Activity",
      description: "Receive supplier quotes on company-owned RFQs.",
      completed: supplierQuotes > 0,
      href: "/rfq",
    },
  ];
}

function calculateReadinessScore(items: ReadinessItem[]) {
  if (items.length === 0) return 0;

  const completed = items.filter((item) => item.completed).length;

  return Math.round((completed / items.length) * 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, email, company_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  if (!profile?.company_id) {
    redirect("/create-company");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, category, location, network_role, status, logo_url")
    .eq("id", profile.company_id)
    .single();

  const currentCompany = company as Company | null;

  const [rfqResult] = await Promise.all([
    supabase
      .from("rfqs")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, is_read")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rfqList = (rfqResult.data ?? []) as RFQ[];
  const rfqIds = rfqList.map((rfq) => rfq.id);

  const { data: quotes } =
    rfqIds.length > 0
      ? await supabase
          .from("quotes")
          .select("*")
          .in("rfq_id", rfqIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const quoteList = (quotes ?? []) as Quote[];

  const portfolio = buildPortfolioIntelligence({
    rfqList,
    quoteList,
  });

  const awardedQuotes = quoteList.filter((quote) => quote.decision === "awarded");
  const awardedRfqs = rfqList.filter((rfq) => rfq.status === "awarded").length;

  const hasProcurementData =
    portfolio.totalRfqs > 0 ||
    portfolio.supplierQuotes > 0 ||
    portfolio.awardedContracts > 0;

  const budgetVariance = Math.max(
    portfolio.budgetTotal - portfolio.awardedVolume,
    0,
  );

  const readinessItems = buildReadinessItems({
    company: currentCompany,
    totalRfqs: portfolio.totalRfqs,
    supplierQuotes: portfolio.supplierQuotes,
  });
  const readinessScore = calculateReadinessScore(readinessItems);

  const materialRfqs = rfqList.filter(
    (rfq) => getProcurementScope(rfq.procurement_scope) === "material",
  ).length;
  const tradeRfqs = rfqList.filter(
    (rfq) => getProcurementScope(rfq.procurement_scope) === "subcontractor",
  ).length;
  const equipmentRfqs = rfqList.filter(
    (rfq) => getProcurementScope(rfq.procurement_scope) === "equipment",
  ).length;
  const serviceRfqs = rfqList.filter(
    (rfq) => getProcurementScope(rfq.procurement_scope) === "professional_service",
  ).length;

  const openMarketRfqs = rfqList.filter(
    (rfq) => getSourcingMethod(rfq.sourcing_method) === "open",
  ).length;
  const invitedRfqs = rfqList.filter(
    (rfq) => getSourcingMethod(rfq.sourcing_method) === "invited",
  ).length;
  const sealedBidRfqs = rfqList.filter(
    (rfq) => getSourcingMethod(rfq.sourcing_method) === "sealed_bid",
  ).length;

  const frameworkRfqs = rfqList.filter(
    (rfq) => getContractFramework(rfq.contract_framework) === "framework",
  ).length;
  const projectSpecificRfqs = rfqList.filter(
    (rfq) =>
      getContractFramework(rfq.contract_framework) === "project_specific",
  ).length;

  const constructionClassificationScore = Math.min(
    100,
    Math.round(
      (portfolio.totalRfqs > 0 ? 35 : 0) +
        (materialRfqs > 0 ? 10 : 0) +
        (tradeRfqs > 0 ? 10 : 0) +
        (equipmentRfqs > 0 ? 10 : 0) +
        (serviceRfqs > 0 ? 10 : 0) +
        (openMarketRfqs > 0 ? 8 : 0) +
        (invitedRfqs > 0 ? 8 : 0) +
        (sealedBidRfqs > 0 ? 9 : 0),
    ),
  );

  const procurementMixStatus =
    constructionClassificationScore >= 80
      ? "Mature RFQ Mix"
      : constructionClassificationScore >= 60
        ? "Developing RFQ Mix"
        : constructionClassificationScore >= 35
          ? "Early RFQ Mix"
          : "Insufficient Data";

  const dominantScope =
    [
      { label: "Material", value: materialRfqs },
      { label: "Trade", value: tradeRfqs },
      { label: "Equipment", value: equipmentRfqs },
      { label: "Service", value: serviceRfqs },
    ].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

  const dominantSourcing =
    [
      { label: "Open", value: openMarketRfqs },
      { label: "Invited", value: invitedRfqs },
      { label: "Sealed Bid", value: sealedBidRfqs },
    ].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

  const alerts: WorkspaceAlert[] = [];

  if (!hasProcurementData) {
    alerts.push({
      level: "warning",
      title: "Insufficient Procurement Data",
      message:
        "Create RFQs and record supplier quote or award activity before relying on executive overview signals.",
    });
  }

  if (constructionClassificationScore < 60 && hasProcurementData) {
    alerts.push({
      level: "warning",
      title: "RFQ Classification Maturity Is Low",
      message:
        "Improve material, trade, equipment, service, sourcing, and framework classification to strengthen portfolio interpretation.",
    });
  }

  if (portfolio.supplierQuotes < 3 && hasProcurementData) {
    alerts.push({
      level: "warning",
      title: "Supplier Quote Coverage Is Limited",
      message:
        "Few supplier quotes have been received on company-owned RFQs. Invite additional suppliers to improve coverage.",
    });
  }

  if (budgetVariance > 0 && hasProcurementData) {
    alerts.push({
      level: "opportunity",
      title: "Budget-to-Award Variance Recorded",
      message:
        "Planned budget exceeds awarded spend on recorded RFQs. Review open RFQs before treating this as validated savings.",
    });
  }

  const decisionSignals = [
    {
      title: "Supplier Quote Coverage",
      value: portfolio.supplierQuotes < 3 ? "Limited" : "Active",
      detail:
        portfolio.supplierQuotes < 3
          ? "Few supplier quotes have been received on company-owned RFQs."
          : "Supplier quotes have been received across the current RFQ portfolio.",
    },
    {
      title: "RFQ Classification",
      value:
        constructionClassificationScore >= 80
          ? "Mature"
          : constructionClassificationScore >= 60
            ? "Developing"
            : "Needs Work",
      detail:
        "Classification quality affects portfolio structure interpretation. Deeper analysis is available in Strategic Insights.",
    },
    {
      title: "Budget-to-Award Variance",
      value: budgetVariance > 0 ? formatMoney(budgetVariance) : "None Recorded",
      detail:
        budgetVariance > 0
          ? "Difference between planned budget and awarded spend on recorded RFQs; not a validated savings measure."
          : "No budget-to-award variance is currently recorded across the portfolio.",
    },
  ];

  const executiveBriefSummary = hasProcurementData
    ? `${portfolio.totalRfqs} company-owned RFQs, ${portfolio.supplierQuotes} supplier quotes received, ${portfolio.awardedContracts} awarded quotes, and ${formatMoney(portfolio.awardedVolume)} in awarded spend are currently recorded.`
    : "Procurement overview is available, but more company-owned RFQ, quote, and award data is required before portfolio signals can be interpreted.";

  const executiveDecisionStatus = {
    label: hasProcurementData ? "Portfolio Recorded" : "Insufficient Data",
    tone: hasProcurementData ? ("success" as const) : ("warning" as const),
  };

  const executiveKpiMetrics = [
    {
      label: "Active RFQs",
      value: hasProcurementData
        ? String(portfolio.activeRfqs)
        : "Insufficient Data",
      tone: "blue" as const,
      insight: "Company-owned RFQs currently open for procurement activity.",
    },
    {
      label: "Supplier Quotes Received",
      value: hasProcurementData
        ? String(portfolio.supplierQuotes)
        : "Insufficient Data",
      tone: "neutral" as const,
      insight:
        "Quotes received on company-owned RFQs across the current portfolio.",
    },
    {
      label: "Award Rate",
      value:
        hasProcurementData && portfolio.supplierQuotes > 0
          ? `${portfolio.awardRate}%`
          : "Insufficient Data",
      tone:
        hasProcurementData && portfolio.supplierQuotes > 0
          ? ("success" as const)
          : ("risk" as const),
      insight: "Awarded quotes relative to quotes received on company RFQs.",
    },
    {
      label: "Budget Utilization",
      value:
        hasProcurementData && portfolio.budgetTotal > 0
          ? `${portfolio.budgetUtilization}%`
          : "Insufficient Data",
      tone: "gold" as const,
      insight: "Awarded spend relative to planned budget on company-owned RFQs.",
    },
  ];

  const portfolioNarrative = hasProcurementData
    ? `The company portfolio includes ${portfolio.totalRfqs} owned RFQs (${portfolio.activeRfqs} active), ${portfolio.supplierQuotes} supplier quotes received, ${awardedRfqs} awarded RFQs, and ${formatMoney(portfolio.awardedVolume)} in awarded spend against ${formatMoney(portfolio.budgetTotal)} in planned budget.`
    : "Insufficient Data. Create company-owned RFQs and record supplier quote or award activity to populate the portfolio snapshot.";

  const portfolioAvailability = {
    label: hasProcurementData ? "Portfolio Recorded" : "Insufficient Data",
    tone: hasProcurementData ? ("board" as const) : ("warning" as const),
  };

  const portfolioPrimaryMetrics = [
    {
      label: "Awarded Spend",
      value: hasProcurementData
        ? formatMoney(portfolio.awardedVolume)
        : "Insufficient Data",
      insight: "Awarded quote amounts recorded on company-owned RFQs.",
      tone: "gold" as const,
    },
    {
      label: "Potential Budget Variance",
      value: hasProcurementData ? formatMoney(budgetVariance) : "Pending",
      insight:
        "Planned budget minus awarded spend on recorded RFQs; not a validated savings measure.",
      tone: "gold" as const,
    },
  ];

  const portfolioOperatingMetrics = [
    {
      title: "Awarded RFQs",
      value: hasProcurementData ? String(awardedRfqs) : "Insufficient Data",
      insight: "Company-owned RFQs with awarded status.",
      tone: "success" as const,
    },
    {
      title: "Avg Quotes per RFQ",
      value: hasProcurementData
        ? String(portfolio.avgQuotesPerRfq)
        : "Insufficient Data",
      insight: "Supplier quotes received divided by company-owned RFQs.",
      tone: "blue" as const,
    },
    {
      title: "Planned Budget",
      value:
        hasProcurementData && portfolio.budgetTotal > 0
          ? formatMoney(portfolio.budgetTotal)
          : "Insufficient Data",
      insight: "Sum of budget values recorded on company-owned RFQs.",
      tone: "neutral" as const,
    },
  ];

  const strategicRecommendations = decisionSignals.map((item, index) => ({
    id: `${item.title}-${index}`,
    rank: index + 1,
    title: item.title,
    value: item.value,
    detail: item.detail,
  }));

  const readinessTone =
    readinessScore >= 85 ? "success" : readinessScore >= 55 ? "warning" : "blue";

  const topRfqsByBudget = [...rfqList]
    .sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))
    .slice(0, 5);

  const recentAwards = awardedQuotes.slice(0, 5);

  const procurementOperationsClassification = {
    status: procurementMixStatus,
    description: `${procurementMixStatus}. Dominant procurement scope is ${
      hasProcurementData ? dominantScope : "Pending"
    }. Dominant sourcing method is ${
      hasProcurementData ? dominantSourcing : "Pending"
    }. Classification maturity score is ${constructionClassificationScore}/100.`,
    scopeMetrics: [
      { title: "Material RFQs", value: String(materialRfqs) },
      { title: "Trade RFQs", value: String(tradeRfqs) },
      { title: "Equipment RFQs", value: String(equipmentRfqs) },
      { title: "Service RFQs", value: String(serviceRfqs) },
    ],
    sourcingMetrics: [
      { title: "Open Market", value: String(openMarketRfqs) },
      { title: "Invited", value: String(invitedRfqs) },
      { title: "Sealed Bids", value: String(sealedBidRfqs) },
      { title: "Project Specific", value: String(projectSpecificRfqs) },
      { title: "Framework", value: String(frameworkRfqs) },
    ],
  };

  const recentAwardDecisions = recentAwards.map((quote) => {
    const relatedRfq = rfqList.find((rfq) => rfq.id === quote.rfq_id);

    return {
      id: quote.id,
      title: relatedRfq?.title || "Awarded RFQ",
      location: relatedRfq?.location || "Location N/A",
      amount: formatMoney(quote.amount),
      status: "Awarded",
    };
  });

  const highestValueRfqs = topRfqsByBudget.map((rfq) => ({
    id: rfq.id,
    title: rfq.title || "Untitled RFQ",
    href: rfq.slug ? `/rfq/${rfq.slug}` : "/rfq",
    location: rfq.location || "Location N/A",
    scope:
      PROCUREMENT_SCOPE_LABELS[getProcurementScope(rfq.procurement_scope)],
    sourcingMethod:
      SOURCING_METHOD_LABELS[getSourcingMethod(rfq.sourcing_method)],
    contractFramework:
      CONTRACT_FRAMEWORK_LABELS[
        getContractFramework(rfq.contract_framework)
      ],
    status: rfq.status || "open",
    budget: formatMoney(rfq.budget),
  }));

  const governanceCompany = {
    label: DASHBOARD_COPY.companyLabel,
    name: currentCompany?.name || "Company Workspace",
    logoUrl: currentCompany?.logo_url || null,
    category: currentCompany?.category || "Category N/A",
    location: currentCompany?.location || "Location N/A",
    networkRole: currentCompany?.network_role || "Company Workspace",
    href: currentCompany?.slug
      ? `/company/${currentCompany.slug}`
      : "/company/settings",
  };

  const incompleteGovernanceTasks = readinessItems
    .filter((item) => !item.completed)
    .map((item, index) => ({
      id: `${item.href}-${index}`,
      title: item.title,
      description: item.description,
      href: item.href,
    }));

  const governanceReadiness = {
    score: readinessScore,
    status:
      incompleteGovernanceTasks.length === 0
        ? "Workspace Setup Complete"
        : `${incompleteGovernanceTasks.length} Setup Requirement${
            incompleteGovernanceTasks.length === 1 ? "" : "s"
          }`,
    incompleteTasksCount: incompleteGovernanceTasks.length,
    tasks: incompleteGovernanceTasks,
  };

  const governanceNavigation = [
    {
      title: "Procurement Center",
      description: "Create, manage, and review procurement opportunities.",
      href: "/rfq",
    },
    {
      title: "Strategic Insights",
      description: "Review board reporting, risk, and procurement intelligence.",
      href: "/analytics",
    },
    {
      title: "Company Governance",
      description: "Manage company profile, access, and visibility.",
      href: "/company/settings",
    },
    {
      title: "Activity Center",
      description: "Review alerts, workflow signals, and procurement events.",
      href: "/notifications",
    },
  ];

  const setupIncomplete = readinessScore < 100;
  const primaryAction = setupIncomplete
    ? { href: "/company/settings", label: "Continue Setup" }
    : { href: "/rfq/new", label: "Create RFQ" };
  const secondaryAction = setupIncomplete
    ? { href: "/rfq/new", label: "Create RFQ" }
    : { href: "/rfq", label: "Review RFQs" };

  const attentionItems = [
    ...alerts
      .filter(
        (alert) => alert.level === "warning" || alert.level === "opportunity",
      )
      .map((alert, index) => ({
        id: `alert-${alert.title}-${index}`,
        kind: alert.level as "warning" | "opportunity",
        title: alert.title,
        description: alert.message,
      })),
    ...incompleteGovernanceTasks.map((task) => ({
      id: task.id,
      kind: "warning" as const,
      title: task.title,
      description: task.description,
      href: task.href,
      hrefLabel: "Resolve",
    })),
  ].slice(0, 4);

  return (
    <main className="min-h-screen bg-nexus-navy text-white">
      <div className={EXECUTIVE_PAGE_CLASS}>
        <ExecutiveHero
          eyebrow={DASHBOARD_COPY.eyebrow}
          welcomeTitle={DASHBOARD_COPY.title}
          welcomeDescription={DASHBOARD_COPY.subtitle}
          briefLabel={DASHBOARD_COPY.briefLabel}
          companyName={currentCompany?.name || "Company Workspace"}
          readinessScore={readinessScore}
          readinessTone={readinessTone}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
        />

        <ExecutiveKpiRow
          metrics={executiveKpiMetrics}
          insufficientData={!hasProcurementData}
        />

        <ExecutiveDecisionWorkspace
          title={DASHBOARD_COPY.briefTitle}
          summary={executiveBriefSummary}
          recommendedAction={DASHBOARD_COPY.recommendation}
          status={executiveDecisionStatus}
          recommendations={strategicRecommendations}
        />

        <ExecutiveAttentionStrip items={attentionItems} />

        <StrategicIntelligenceWorkspace
          narrative={portfolioNarrative}
          availability={portfolioAvailability}
          primaryMetrics={portfolioPrimaryMetrics}
          operatingMetrics={portfolioOperatingMetrics}
        />

        <ProcurementOperationsWorkspace
          classification={procurementOperationsClassification}
          recentAwards={recentAwardDecisions}
          highestValueRfqs={highestValueRfqs}
        />

        <GovernanceReferenceWorkspace
          company={governanceCompany}
          readiness={governanceReadiness}
          navigation={governanceNavigation}
        />
      </div>
    </main>
  );
}
