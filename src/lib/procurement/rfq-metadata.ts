export type ProcurementScope =
  | "material"
  | "subcontractor"
  | "equipment"
  | "professional_service";

export type SourcingMethod = "open" | "invited" | "sealed_bid";

export type ContractFramework = "project_specific" | "framework";

export type RfqMetadata = {
  procurement_scope: ProcurementScope | null;
  sourcing_method: SourcingMethod | null;
  contract_framework: ContractFramework | null;
};

const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
  material: "Material / Product RFQ",
  subcontractor: "Subcontractor / Trade RFQ",
  equipment: "Equipment Rental RFQ",
  professional_service: "Professional Service RFQ",
};

const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
  open: "Open RFQ",
  invited: "Invited / Selective RFQ",
  sealed_bid: "Sealed Bid RFQ",
};

const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
  project_specific: "Project-Specific RFQ",
  framework: "Master / Framework RFQ",
};

export function getProcurementScope(
  value: ProcurementScope | null | undefined
): ProcurementScope {
  if (value && PROCUREMENT_SCOPE_LABELS[value]) return value;
  return "subcontractor";
}

export function getSourcingMethod(
  value: SourcingMethod | null | undefined
): SourcingMethod {
  if (value && SOURCING_METHOD_LABELS[value]) return value;
  return "invited";
}

export function getContractFramework(
  value: ContractFramework | null | undefined
): ContractFramework {
  if (value && CONTRACT_FRAMEWORK_LABELS[value]) return value;
  return "project_specific";
}

export function getScopeLabel(
  value: ProcurementScope | null | undefined
): string {
  return PROCUREMENT_SCOPE_LABELS[getProcurementScope(value)];
}

export function getSourcingLabel(
  value: SourcingMethod | null | undefined
): string {
  return SOURCING_METHOD_LABELS[getSourcingMethod(value)];
}

export function getFrameworkLabel(
  value: ContractFramework | null | undefined
): string {
  return CONTRACT_FRAMEWORK_LABELS[getContractFramework(value)];
}

export function shouldEnforceBlindBidding(rfq: RfqMetadata): boolean {
  const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
  const contractFramework = getContractFramework(rfq.contract_framework);

  return (
    sourcingMethod === "invited" ||
    sourcingMethod === "sealed_bid" ||
    contractFramework === "framework"
  );
}

export function getBlindBiddingMessage(rfq: RfqMetadata): string {
  const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
  const contractFramework = getContractFramework(rfq.contract_framework);

  if (sourcingMethod === "sealed_bid") {
    return "This sealed bid RFQ is under blind bidding control. Commercial submissions remain locked until the official closing deadline.";
  }

  if (contractFramework === "framework") {
    return "This framework RFQ uses controlled commercial access. Supplier pricing remains hidden until the RFQ deadline has passed.";
  }

  return "This invited RFQ uses blind bidding controls. Buyer-side users can see participation counts, but commercial pricing is locked until closing.";
}

export function getRFQStatusClass(status: string | null): string {
  if (status === "awarded") return "bg-green-100 text-green-700";
  if (status === "closed") return "bg-slate-200 text-slate-600";
  return "bg-orange-100 text-orange-700";
}

export function getRFQStatusLabel(status: string | null): string {
  if (status === "awarded") return "Awarded";
  if (status === "closed") return "Closed";
  return "Open";
}

export function getProcurementFitMessage(rfq: RfqMetadata): string {
  const scope = getProcurementScope(rfq.procurement_scope);
  const sourcing = getSourcingMethod(rfq.sourcing_method);
  const framework = getContractFramework(rfq.contract_framework);

  if (scope === "material" && framework === "framework") {
    return "This RFQ is structured for recurring material pricing, supplier capacity review, and long-term procurement control.";
  }

  if (scope === "subcontractor") {
    return "This RFQ is structured for trade package pricing, scope review, delivery capability, and subcontractor risk comparison.";
  }

  if (scope === "equipment") {
    return "This RFQ is structured for rental duration, equipment availability, logistics, maintenance terms, and site-readiness evaluation.";
  }

  if (scope === "professional_service") {
    return "This RFQ is structured for professional expertise, service capability, advisory fit, schedule alignment, and project requirements.";
  }

  if (sourcing === "sealed_bid") {
    return "This RFQ is configured for controlled bid submission and deadline-based evaluation.";
  }

  return "This RFQ is classified for construction procurement intelligence, supplier matching, quote comparison, and executive reporting.";
}