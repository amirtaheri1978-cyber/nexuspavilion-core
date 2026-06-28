export type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

export type SourcingMethod = "open" | "invited" | "sealed_bid";

export type ContractFramework = "project_specific" | "framework";

export type AnalyticsRFQ = {
id: string;
title: string;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

export const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
material: "Material RFQs",
subcontractor: "Trade RFQs",
equipment: "Equipment RFQs",
professional_service: "Service RFQs",
};

export const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
open: "Open RFQs",
invited: "Invited RFQs",
sealed_bid: "Sealed Bid RFQs",
};

export const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
project_specific: "Project-Specific",
framework: "Framework Agreement",
};

export function getHealthLabel(score: number) {
if (score >= 85) return "Strong";
if (score >= 70) return "Healthy";
if (score >= 55) return "Moderate";

return "Needs Attention";
}

export function getCompetitionLabel(avgQuotesPerRfq: number) {
if (avgQuotesPerRfq >= 4) return "High Competition";
if (avgQuotesPerRfq >= 2) return "Healthy Competition";
if (avgQuotesPerRfq >= 1) return "Limited Competition";

return "No Competition Yet";
}

export function getProcurementScope(
value: ProcurementScope | null | undefined,
) {
if (value && PROCUREMENT_SCOPE_LABELS[value]) return value;

return "subcontractor";
}

export function getSourcingMethod(value: SourcingMethod | null | undefined) {
if (value && SOURCING_METHOD_LABELS[value]) return value;

return "invited";
}

export function getContractFramework(
value: ContractFramework | null | undefined,
) {
if (value && CONTRACT_FRAMEWORK_LABELS[value]) return value;

return "project_specific";
}

export function countByScope(rfqs: AnalyticsRFQ[], scope: ProcurementScope) {
return rfqs.filter((rfq) => getProcurementScope(rfq.procurement_scope) === scope)
.length;
}

export function countBySourcing(
rfqs: AnalyticsRFQ[],
method: SourcingMethod,
) {
return rfqs.filter((rfq) => getSourcingMethod(rfq.sourcing_method) === method)
.length;
}

export function countByFramework(
rfqs: AnalyticsRFQ[],
framework: ContractFramework,
) {
return rfqs.filter(
(rfq) => getContractFramework(rfq.contract_framework) === framework,
).length;
}
