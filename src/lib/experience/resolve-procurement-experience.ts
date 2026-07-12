export type ProcurementExperience =
  | "buyer"
  | "supplier"
  | "consultant"
  | "hybrid";

export type ExplicitProcurementWorkspaceMode =
  | "buyer"
  | "supplier"
  | "consultant"
  | null
  | undefined;

export type ProcurementExperienceInput = {
  profileRole: string | null | undefined;
  companyNetworkRole: string | null | undefined;
  explicitWorkspaceMode?: ExplicitProcurementWorkspaceMode;
};

export type ProcurementExperienceResolution = {
  mode: ProcurementExperience;
  availableModes: Exclude<ProcurementExperience, "hybrid">[];
  isHybrid: boolean;
  reason:
    | "explicit_workspace_mode"
    | "buyer_company"
    | "supplier_company"
    | "consultant_company"
    | "hybrid_company"
    | "role_fallback"
    | "default_buyer";
};

const BUYER_PROFILE_ROLES = new Set([
  "buyer",
  "procurement",
  "procurement_manager",
  "purchasing",
]);

const SUPPLIER_PROFILE_ROLES = new Set([
  "vendor",
  "supplier",
  "manufacturer",
  "distributor",
  "trade",
  "subcontractor",
]);

const CONSULTANT_PROFILE_ROLES = new Set([
  "consultant",
  "advisor",
  "professional_service",
  "professional_services",
]);

const BUYER_COMPANY_TERMS = [
  "buyer",
  "client",
  "developer",
  "general contractor",
  "general_contractor",
  "procurement",
  "purchasing",
];

const SUPPLIER_COMPANY_TERMS = [
  "vendor",
  "supplier",
  "manufacturer",
  "distributor",
  "trade",
  "subcontractor",
  "fabricator",
  "material",
  "equipment",
];

const CONSULTANT_COMPANY_TERMS = [
  "consultant",
  "consulting",
  "advisor",
  "advisory",
  "architect",
  "engineer",
  "engineering",
  "professional service",
  "professional_service",
  "professional services",
];

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function uniqueModes(
  modes: Exclude<ProcurementExperience, "hybrid">[],
) {
  return Array.from(new Set(modes));
}

export function resolveProcurementExperience({
  profileRole,
  companyNetworkRole,
  explicitWorkspaceMode,
}: ProcurementExperienceInput): ProcurementExperienceResolution {
  const normalizedRole = normalize(profileRole);
  const normalizedNetworkRole = normalize(companyNetworkRole);

  const companySupportsBuyer = includesAny(
    normalizedNetworkRole,
    BUYER_COMPANY_TERMS,
  );

  const companySupportsSupplier = includesAny(
    normalizedNetworkRole,
    SUPPLIER_COMPANY_TERMS,
  );

  const companySupportsConsultant = includesAny(
    normalizedNetworkRole,
    CONSULTANT_COMPANY_TERMS,
  );

  const roleSupportsBuyer = BUYER_PROFILE_ROLES.has(normalizedRole);
  const roleSupportsSupplier = SUPPLIER_PROFILE_ROLES.has(normalizedRole);
  const roleSupportsConsultant =
    CONSULTANT_PROFILE_ROLES.has(normalizedRole);

  const availableModes = uniqueModes([
    ...(companySupportsBuyer || roleSupportsBuyer
      ? (["buyer"] as const)
      : []),
    ...(companySupportsSupplier || roleSupportsSupplier
      ? (["supplier"] as const)
      : []),
    ...(companySupportsConsultant || roleSupportsConsultant
      ? (["consultant"] as const)
      : []),
  ]);

  const explicitModeIsAvailable =
    explicitWorkspaceMode &&
    availableModes.includes(explicitWorkspaceMode);

  if (explicitModeIsAvailable) {
    return {
      mode: explicitWorkspaceMode,
      availableModes,
      isHybrid: availableModes.length > 1,
      reason: "explicit_workspace_mode",
    };
  }

  if (availableModes.length > 1) {
    return {
      mode: "hybrid",
      availableModes,
      isHybrid: true,
      reason: "hybrid_company",
    };
  }

  if (availableModes[0] === "supplier") {
    return {
      mode: "supplier",
      availableModes,
      isHybrid: false,
      reason: companySupportsSupplier
        ? "supplier_company"
        : "role_fallback",
    };
  }

  if (availableModes[0] === "consultant") {
    return {
      mode: "consultant",
      availableModes,
      isHybrid: false,
      reason: companySupportsConsultant
        ? "consultant_company"
        : "role_fallback",
    };
  }

  if (availableModes[0] === "buyer") {
    return {
      mode: "buyer",
      availableModes,
      isHybrid: false,
      reason: companySupportsBuyer ? "buyer_company" : "role_fallback",
    };
  }

  return {
    mode: "buyer",
    availableModes: ["buyer"],
    isHybrid: false,
    reason: "default_buyer",
  };
}

export function isBuyerExperience(
  resolution: ProcurementExperienceResolution,
) {
  return resolution.mode === "buyer";
}

export function isSupplierExperience(
  resolution: ProcurementExperienceResolution,
) {
  return resolution.mode === "supplier";
}

export function isConsultantExperience(
  resolution: ProcurementExperienceResolution,
) {
  return resolution.mode === "consultant";
}

export function requiresWorkspaceSelection(
  resolution: ProcurementExperienceResolution,
) {
  return resolution.mode === "hybrid";
}