export type ProcurementRfqStatus =
  | "open"
  | "closed"
  | "awarded"
  | string
  | null;

export type ProcurementSourcingMethod =
  | "open"
  | "invited"
  | "sealed_bid"
  | string
  | null;

export type ProcurementContractFramework =
  | "project_specific"
  | "framework"
  | string
  | null;

export type RfqAccessReason =
  | "owned"
  | "public"
  | "direct_invitation"
  | "company_invitation"
  | "existing_participation";

export type RfqParticipantRole =
  | "issuer"
  | "respondent";

export type ProcurementRfq = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  budget: number | string | null;
  status: ProcurementRfqStatus;
  company_id: string | null;
  created_at: string | null;
  procurement_scope: string | null;
  sourcing_method: ProcurementSourcingMethod;
  contract_framework: ProcurementContractFramework;
};

export type ProcurementQuote = {
  id: string;
  rfq_id: string;
  company_id: string | null;
  amount: number | string | null;
  timeline: string | null;
  message: string | null;
  decision: string | null;
  created_at: string | null;
};

export type ProcurementRfqInvite = {
  rfq_id: string;
  email: string | null;
  status: string | null;
};

export type AccessibleRfq = {
  rfq: ProcurementRfq;
  participantRole: RfqParticipantRole;
  accessReason: RfqAccessReason;
  canView: boolean;
  canSubmitQuote: boolean;
  canViewBudget: boolean;
  canManage: boolean;
};

export type SupplierRfqAccessInput = {
  rfq: ProcurementRfq;
  currentCompanyId: string | null;
  directlyInvitedRfqIds: ReadonlySet<string>;
  companyInvitedRfqIds: ReadonlySet<string>;
  participatedRfqIds: ReadonlySet<string>;
};

export function normalizeProcurementValue(
  value: string | null | undefined,
) {
  return String(value ?? "").trim().toLowerCase();
}

export function isOpenRfqStatus(status: ProcurementRfqStatus) {
  const normalizedStatus = normalizeProcurementValue(status);

  return normalizedStatus === "" || normalizedStatus === "open";
}

export function isPublicSourcingMethod(
  sourcingMethod: ProcurementSourcingMethod,
) {
  return normalizeProcurementValue(sourcingMethod) === "open";
}

export function isRestrictedSourcingMethod(
  sourcingMethod: ProcurementSourcingMethod,
) {
  const normalizedMethod = normalizeProcurementValue(sourcingMethod);

  return (
    normalizedMethod === "invited" ||
    normalizedMethod === "sealed_bid"
  );
}

export function resolveSupplierRfqAccess({
  rfq,
  currentCompanyId,
  directlyInvitedRfqIds,
  companyInvitedRfqIds,
  participatedRfqIds,
}: SupplierRfqAccessInput): AccessibleRfq | null {
  if (!isOpenRfqStatus(rfq.status)) {
    return null;
  }

  if (currentCompanyId && rfq.company_id === currentCompanyId) {
    return {
      rfq,
      participantRole: "issuer",
      accessReason: "owned",
      canView: true,
      canSubmitQuote: false,
      canViewBudget: true,
      canManage: true,
    };
  }

  if (isPublicSourcingMethod(rfq.sourcing_method)) {
    return {
      rfq,
      participantRole: "respondent",
      accessReason: "public",
      canView: true,
      canSubmitQuote: true,
      canViewBudget: true,
      canManage: false,
    };
  }

  if (
    isRestrictedSourcingMethod(rfq.sourcing_method) &&
    directlyInvitedRfqIds.has(rfq.id)
  ) {
    return {
      rfq,
      participantRole: "respondent",
      accessReason: "direct_invitation",
      canView: true,
      canSubmitQuote: true,
      canViewBudget:
        normalizeProcurementValue(rfq.sourcing_method) !== "sealed_bid",
      canManage: false,
    };
  }

  if (
    isRestrictedSourcingMethod(rfq.sourcing_method) &&
    companyInvitedRfqIds.has(rfq.id)
  ) {
    return {
      rfq,
      participantRole: "respondent",
      accessReason: "company_invitation",
      canView: true,
      canSubmitQuote: true,
      canViewBudget:
        normalizeProcurementValue(rfq.sourcing_method) !== "sealed_bid",
      canManage: false,
    };
  }

  if (
    isRestrictedSourcingMethod(rfq.sourcing_method) &&
    participatedRfqIds.has(rfq.id)
  ) {
    return {
      rfq,
      participantRole: "respondent",
      accessReason: "existing_participation",
      canView: true,
      canSubmitQuote: true,
      canViewBudget:
        normalizeProcurementValue(rfq.sourcing_method) !== "sealed_bid",
      canManage: false,
    };
  }

  return null;
}