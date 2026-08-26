import type {
  AccessibleRfq,
  ProcurementRfq,
  RfqAccessReason,
  RfqParticipantRole,
} from "@/lib/procurement/rfq-access-contract";
import type { ProcurementContext } from "@/lib/procurement/procurement-context-repository";

export type MarketplaceMode = "buyer" | "supplier";

export type MarketplaceRecord = {
  rfq: ProcurementRfq;
  participantRole: RfqParticipantRole;
  accessReason: RfqAccessReason;
  canManage: boolean;
  canSubmitQuote: boolean;
  canViewBudget: boolean;
};

export type MarketplaceMetric = {
  label: string;
  value: number;
};

export type ProcurementMarketplaceViewModel = {
  mode: MarketplaceMode;
  title: string;
  description: string;
  experienceLabel: string;
  contextLabel: string;
  pipelineTitle: string;
  pipelineDescription: string;
  availabilityLabel: "Available" | "Insufficient Data";
  records: MarketplaceRecord[];
  hero: {
    primaryLabel: string;
    primaryValue: string;
    health: string;
    openLabel: string;
    openValue: string;
    budgetLabel: string;
    budgetValue: string;
  };
  statusMetrics: MarketplaceMetric[];
  scopeMetrics: MarketplaceMetric[];
  sourcingMetrics: MarketplaceMetric[];
  canCreateRfq: boolean;
  emptyState: {
    title: string;
    description: string;
  };
};

type ProcurementScope =
  | "material"
  | "subcontractor"
  | "equipment"
  | "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

const BUYER_CREATION_ROLES = new Set([
  "owner",
  "admin",
  "buyer",
  "procurement",
  "procurement_manager",
]);

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getProcurementScope(
  value: ProcurementRfq["procurement_scope"],
): ProcurementScope {
  const normalized = normalize(value);

  if (
    normalized === "material" ||
    normalized === "equipment" ||
    normalized === "professional_service"
  ) {
    return normalized;
  }

  return "subcontractor";
}

function getSourcingMethod(
  value: ProcurementRfq["sourcing_method"],
): SourcingMethod {
  const normalized = normalize(value);

  if (normalized === "open" || normalized === "sealed_bid") {
    return normalized;
  }

  return "invited";
}

function getContractFramework(
  value: ProcurementRfq["contract_framework"],
): ContractFramework {
  return normalize(value) === "framework"
    ? "framework"
    : "project_specific";
}

function getTotalBudget(records: MarketplaceRecord[]) {
  return records.reduce((total, record) => {
    const amount = Number(record.rfq.budget ?? 0);

    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Not specified";
  }

  return `$${value.toLocaleString()}`;
}

function getHealthLabel({
  total,
  open,
  completed,
}: {
  total: number;
  open: number;
  completed: number;
}) {
  if (total === 0) return "Insufficient Data";
  if (open > 0 && completed > 0) return "Active";
  if (open > 0) return "Pipeline Active";
  if (completed > 0) return "Completed";

  return "Ready";
}

function toSupplierRecord(item: AccessibleRfq): MarketplaceRecord {
  return {
    rfq: item.rfq,
    participantRole: item.participantRole,
    accessReason: item.accessReason,
    canManage: item.canManage,
    canSubmitQuote: item.canSubmitQuote,
    canViewBudget: item.canViewBudget,
  };
}

function toBuyerRecord(rfq: ProcurementRfq): MarketplaceRecord {
  return {
    rfq,
    participantRole: "issuer",
    accessReason: "owned",
    canManage: true,
    canSubmitQuote: false,
    canViewBudget: true,
  };
}

function resolveMarketplaceMode(
  context: ProcurementContext,
): MarketplaceMode {
  if (
    context.experience.mode === "supplier" ||
    context.experience.mode === "consultant" ||
    context.experience.mode === "hybrid"
  ) {
    return "supplier";
  }

  return "buyer";
}

function buildScopeMetrics(records: MarketplaceRecord[]) {
  return [
    {
      label: "Material RFQs",
      value: records.filter(
        ({ rfq }) =>
          getProcurementScope(rfq.procurement_scope) === "material",
      ).length,
    },
    {
      label: "Trade RFQs",
      value: records.filter(
        ({ rfq }) =>
          getProcurementScope(rfq.procurement_scope) ===
          "subcontractor",
      ).length,
    },
    {
      label: "Equipment RFQs",
      value: records.filter(
        ({ rfq }) =>
          getProcurementScope(rfq.procurement_scope) === "equipment",
      ).length,
    },
    {
      label: "Service RFQs",
      value: records.filter(
        ({ rfq }) =>
          getProcurementScope(rfq.procurement_scope) ===
          "professional_service",
      ).length,
    },
  ];
}

function buildSourcingMetrics(records: MarketplaceRecord[]) {
  return [
    {
      label: "Open Tender",
      value: records.filter(
        ({ rfq }) => getSourcingMethod(rfq.sourcing_method) === "open",
      ).length,
    },
    {
      label: "Invited",
      value: records.filter(
        ({ rfq }) =>
          getSourcingMethod(rfq.sourcing_method) === "invited",
      ).length,
    },
    {
      label: "Sealed Bid",
      value: records.filter(
        ({ rfq }) =>
          getSourcingMethod(rfq.sourcing_method) === "sealed_bid",
      ).length,
    },
    {
      label: "Framework",
      value: records.filter(
        ({ rfq }) =>
          getContractFramework(rfq.contract_framework) ===
          "framework",
      ).length,
    },
  ];
}

export function buildProcurementMarketplaceViewModel(
  context: ProcurementContext,
): ProcurementMarketplaceViewModel {
  const mode = resolveMarketplaceMode(context);

  const records =
    mode === "supplier"
      ? context.supplier.openOpportunities.map(toSupplierRecord)
      : context.buyer.ownedRfqs.map(toBuyerRecord);

  const openCount =
    mode === "supplier"
      ? context.supplier.openOpportunities.length
      : context.buyer.openOwnedRfqs.length;

  const completedCount =
    mode === "supplier"
      ? 0
      : records.filter(({ rfq }) => {
          const status = normalize(rfq.status);

          return status === "awarded" || status === "closed";
        }).length;

  const awardedCount =
    mode === "buyer"
      ? records.filter(
          ({ rfq }) => normalize(rfq.status) === "awarded",
        ).length
      : context.supplier.awardedQuotes.length;

  const closedCount =
    mode === "buyer"
      ? records.filter(
          ({ rfq }) => normalize(rfq.status) === "closed",
        ).length
      : context.supplier.unsuccessfulQuotes.length;

  const totalBudget = getTotalBudget(records);

  const health = getHealthLabel({
    total: records.length,
    open: openCount,
    completed: completedCount,
  });

  const profileRole = normalize(context.identity.profileRole);

  const canCreateRfq =
    mode === "buyer" ||
    (context.experience.mode === "hybrid" &&
      BUYER_CREATION_ROLES.has(profileRole));

  const statusMetrics =
    mode === "supplier"
      ? [
          {
            label: "Open RFQs",
            value: openCount,
          },
          {
            label: "Submitted quotes",
            value: context.supplier.submittedQuotes.length,
          },
          {
            label: "Pending Decisions",
            value: context.supplier.pendingDecisions.length,
          },
          {
            label: "Awards",
            value: awardedCount,
          },
        ]
      : [
          {
            label: "Owned RFQs",
            value: records.length,
          },
          {
            label: "Open RFQs",
            value: openCount,
          },
          {
            label: "Awarded",
            value: awardedCount,
          },
          {
            label: "Closed",
            value: closedCount,
          },
        ];

  return {
    mode,
    title:
      mode === "supplier"
        ? "Open & Invited Opportunities"
        : "Company RFQs",
    description:
      mode === "supplier"
        ? "Review open public and authorized RFQs available to your company as a respondent."
        : "Create, classify, monitor, and manage RFQs issued by your company workspace.",
    experienceLabel: "Procurement Activity",
    contextLabel:
      mode === "supplier"
        ? "Respondent opportunities"
        : "Company-managed RFQs",
    pipelineTitle:
      mode === "supplier"
        ? "Accessible RFQ Records"
        : "Managed RFQ Records",
    pipelineDescription:
      mode === "supplier"
        ? "Review open public and invited RFQs your company can respond to."
        : "Review sourcing controls, contract framework, budget visibility, and governance status across company RFQs.",
    availabilityLabel:
      records.length > 0 ? "Available" : "Insufficient Data",
    records,
    hero: {
      primaryLabel:
        mode === "supplier"
          ? "Open RFQs"
          : "Company RFQs",
      primaryValue: String(
        mode === "supplier"
          ? openCount
          : records.length,
      ),
      health,
      openLabel:
        mode === "supplier"
          ? "Active procurement pipeline"
          : "Open RFQs",
      openValue: String(openCount),
      budgetLabel:
        mode === "supplier"
          ? "Accessible RFQ budget"
          : "Planned RFQ budget",
      budgetValue: formatMoney(totalBudget),
    },
    statusMetrics,
    scopeMetrics: buildScopeMetrics(records),
    sourcingMetrics: buildSourcingMetrics(records),
    canCreateRfq,
    emptyState: {
      title:
        mode === "supplier"
          ? "No open RFQs"
          : "No RFQs found",
      description:
        mode === "supplier"
          ? "No public or authorized RFQs are currently available for your company to respond to."
          : "Create the first classified procurement opportunity for this company workspace.",
    },
  };
}