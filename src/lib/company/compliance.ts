import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_COMPLIANCE_TYPES = [
  "insurance",
  "workers_compensation",
  "safety",
] as const;

export type CompanyComplianceType = (typeof COMPANY_COMPLIANCE_TYPES)[number];

export type CompanyComplianceRecord = {
  id: string;
  company_id: string;
  compliance_type: CompanyComplianceType;
  name: string;
  provider: string | null;
  effective_on: string | null;
  expires_on: string | null;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CompanyComplianceInput = {
  name: string;
  provider: string | null;
  effective_on: string | null;
  expires_on: string | null;
};

export type GroupedCompanyCompliance = Record<
  CompanyComplianceType,
  CompanyComplianceInput[]
>;

export const COMPANY_COMPLIANCE_TYPE_LABELS: Record<
  CompanyComplianceType,
  string
> = {
  insurance: "Insurance",
  workers_compensation: "Workers' Compensation",
  safety: "Safety",
};

export const COMPANY_COMPLIANCE_MAX_NAME_LENGTH = 160;
export const COMPANY_COMPLIANCE_MAX_PROVIDER_LENGTH = 160;
export const COMPANY_COMPLIANCE_MAX_PER_TYPE = 40;

export const COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE =
  "Compliance information is maintained by this organization and has not been independently verified by Nexus Pavilion.";

const COMPLIANCE_TYPE_SET = new Set<string>(COMPANY_COMPLIANCE_TYPES);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const COMPANY_COMPLIANCE_ITEM_FIELDS = [
  "name",
  "provider",
  "effective_on",
  "expires_on",
] as const;

const COMPLIANCE_ITEM_FIELD_SET = new Set<string>(
  COMPANY_COMPLIANCE_ITEM_FIELDS,
);

export function isCompanyComplianceType(
  value: string,
): value is CompanyComplianceType {
  return COMPLIANCE_TYPE_SET.has(value);
}

export function normalizeComplianceText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

export function normalizeNullableComplianceText(
  value: unknown,
  maxLength: number,
): { value: string | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string") {
    return {
      value: null,
      error: "Optional compliance text fields must be strings or null.",
    };
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return { value: null, error: null };
  }

  if (normalized.length > maxLength) {
    return {
      value: null,
      error: `Compliance text fields must be ${maxLength} characters or fewer.`,
    };
  }

  return { value: normalized, error: null };
}

export function normalizeComplianceDate(
  value: unknown,
): { value: string | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return {
      value: null,
      error: "Compliance dates must use YYYY-MM-DD format.",
    };
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return {
      value: null,
      error: "Compliance dates must be valid calendar dates.",
    };
  }

  return { value, error: null };
}

// Structural serialization keeps the key unambiguous when a name or provider
// contains the characters a delimiter-joined key would rely on.
export function buildComplianceDedupeKey(
  compliance: Pick<CompanyComplianceInput, "name" | "provider">,
): string {
  return JSON.stringify([
    compliance.name.toLowerCase(),
    (compliance.provider ?? "").toLowerCase(),
  ]);
}

export function normalizeComplianceItem(
  value: unknown,
): { item: CompanyComplianceInput | null; error: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      item: null,
      error: "Each compliance record must be an object.",
    };
  }

  const source = value as Record<string, unknown>;

  for (const field of Object.keys(source)) {
    if (!COMPLIANCE_ITEM_FIELD_SET.has(field)) {
      return {
        item: null,
        error: `Compliance field "${field}" is not supported.`,
      };
    }
  }

  if (!("name" in source)) {
    return {
      item: null,
      error: "Compliance name is required.",
    };
  }

  const name = normalizeComplianceText(
    source.name,
    COMPANY_COMPLIANCE_MAX_NAME_LENGTH,
  );

  if (!name) {
    return {
      item: null,
      error:
        typeof source.name === "string"
          ? "Compliance name must be non-empty and 160 characters or fewer."
          : "Compliance name must be a string.",
    };
  }

  const provider = normalizeNullableComplianceText(
    source.provider,
    COMPANY_COMPLIANCE_MAX_PROVIDER_LENGTH,
  );

  if (provider.error) {
    return { item: null, error: provider.error };
  }

  const effectiveOn = normalizeComplianceDate(source.effective_on);

  if (effectiveOn.error) {
    return { item: null, error: effectiveOn.error };
  }

  const expiresOn = normalizeComplianceDate(source.expires_on);

  if (expiresOn.error) {
    return { item: null, error: expiresOn.error };
  }

  if (
    effectiveOn.value &&
    expiresOn.value &&
    expiresOn.value < effectiveOn.value
  ) {
    return {
      item: null,
      error: "Expiry date must be on or after the effective date.",
    };
  }

  return {
    item: {
      name,
      provider: provider.value,
      effective_on: effectiveOn.value,
      expires_on: expiresOn.value,
    },
    error: null,
  };
}

export function normalizeComplianceGroup(
  values: unknown,
): { items: CompanyComplianceInput[]; error: string | null } {
  if (!Array.isArray(values)) {
    return {
      items: [],
      error: "Each compliance group must be an array.",
    };
  }

  const items: CompanyComplianceInput[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeComplianceItem(value);

    if (normalized.error || !normalized.item) {
      return {
        items: [],
        error: normalized.error || "Compliance record is invalid.",
      };
    }

    const dedupeKey = buildComplianceDedupeKey(normalized.item);

    if (seen.has(dedupeKey)) {
      return {
        items: [],
        error: "Duplicate compliance records are not allowed within a group.",
      };
    }

    seen.add(dedupeKey);
    items.push(normalized.item);
  }

  if (items.length > COMPANY_COMPLIANCE_MAX_PER_TYPE) {
    return {
      items: [],
      error: `Each compliance group supports up to ${COMPANY_COMPLIANCE_MAX_PER_TYPE} entries.`,
    };
  }

  return { items, error: null };
}

export function createEmptyGroupedCompliance(): GroupedCompanyCompliance {
  return {
    insurance: [],
    workers_compensation: [],
    safety: [],
  };
}

export function normalizeGroupedCompliance(
  input: unknown,
): { compliance: GroupedCompanyCompliance; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      compliance: createEmptyGroupedCompliance(),
      error: "Compliance payload must be an object.",
    };
  }

  const compliance = createEmptyGroupedCompliance();
  const source = input as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (!isCompanyComplianceType(key)) {
      return {
        compliance: createEmptyGroupedCompliance(),
        error:
          "Compliance type must be insurance, workers_compensation, or safety.",
      };
    }

    const normalizedGroup = normalizeComplianceGroup(value);

    if (normalizedGroup.error) {
      return {
        compliance: createEmptyGroupedCompliance(),
        error: normalizedGroup.error,
      };
    }

    compliance[key] = normalizedGroup.items;
  }

  return {
    compliance,
    error: null,
  };
}

export function groupCompanyCompliance(
  rows: CompanyComplianceRecord[],
): GroupedCompanyCompliance {
  const grouped = createEmptyGroupedCompliance();

  const sortedRows = [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.name.localeCompare(right.name);
  });

  for (const row of sortedRows) {
    if (!isCompanyComplianceType(row.compliance_type)) {
      continue;
    }

    grouped[row.compliance_type].push({
      name: row.name,
      provider: row.provider,
      effective_on: row.effective_on,
      expires_on: row.expires_on,
    });
  }

  return grouped;
}

export function countGroupedCompliance(
  grouped: GroupedCompanyCompliance,
): number {
  return COMPANY_COMPLIANCE_TYPES.reduce(
    (total, complianceType) => total + grouped[complianceType].length,
    0,
  );
}

export function countGroupedComplianceByType(
  grouped: GroupedCompanyCompliance,
): Record<CompanyComplianceType, number> {
  return {
    insurance: grouped.insurance.length,
    workers_compensation: grouped.workers_compensation.length,
    safety: grouped.safety.length,
  };
}

export function hasAnyGroupedCompliance(
  grouped: GroupedCompanyCompliance,
): boolean {
  return countGroupedCompliance(grouped) > 0;
}

export type CompliancePresentation =
  | "No expiry recorded"
  | "Not yet effective"
  | "Current"
  | "Expiring soon"
  | "Expired";

export const COMPLIANCE_EXPIRING_SOON_DAYS = 30;

function toUtcDay(value: string): number | null {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

// Presentation is always derived at render time. No compliance status is ever
// persisted, and none of these states assert third-party verification.
export function deriveCompliancePresentation(
  effectiveOn: string | null | undefined,
  expiresOn: string | null | undefined,
  referenceDate = new Date(),
): CompliancePresentation {
  const today = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  if (effectiveOn) {
    const effective = toUtcDay(effectiveOn);

    if (effective !== null && effective > today) {
      return "Not yet effective";
    }
  }

  if (!expiresOn) {
    return "No expiry recorded";
  }

  const expiry = toUtcDay(expiresOn);

  if (expiry === null) {
    return "No expiry recorded";
  }

  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "Expired";
  }

  if (diffDays <= COMPLIANCE_EXPIRING_SOON_DAYS) {
    return "Expiring soon";
  }

  return "Current";
}

export function formatComplianceDate(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatComplianceExpiry(
  expiresOn: string | null | undefined,
): string {
  const formatted = formatComplianceDate(expiresOn);

  if (formatted === "Not provided") {
    return "No expiry recorded";
  }

  return formatted;
}

export async function loadCompanyCompliance(
  supabase: SupabaseClient,
  companyId: string,
): Promise<GroupedCompanyCompliance> {
  const { data, error } = await supabase
    .from("company_compliance")
    .select(
      "id, company_id, compliance_type, name, provider, effective_on, expires_on, sort_order, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return groupCompanyCompliance((data ?? []) as CompanyComplianceRecord[]);
}
