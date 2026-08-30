import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_CAPABILITY_TYPES = [
  "trade",
  "service",
  "product",
  "region",
] as const;

export type CompanyCapabilityType =
  (typeof COMPANY_CAPABILITY_TYPES)[number];

export type CompanyCapabilityRecord = {
  id: string;
  company_id: string;
  capability_type: CompanyCapabilityType;
  label: string;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GroupedCompanyCapabilities = Record<
  CompanyCapabilityType,
  string[]
>;

export const COMPANY_CAPABILITY_TYPE_LABELS: Record<
  CompanyCapabilityType,
  string
> = {
  trade: "Trades",
  service: "Services",
  product: "Products",
  region: "Regions Served",
};

export const COMPANY_CAPABILITY_MAX_LABEL_LENGTH = 120;
export const COMPANY_CAPABILITY_MAX_PER_TYPE = 40;

const CAPABILITY_TYPE_SET = new Set<string>(COMPANY_CAPABILITY_TYPES);

export function isCompanyCapabilityType(
  value: string,
): value is CompanyCapabilityType {
  return CAPABILITY_TYPE_SET.has(value);
}

export function normalizeCapabilityLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > COMPANY_CAPABILITY_MAX_LABEL_LENGTH) {
    return null;
  }

  return normalized;
}

export function normalizeCapabilityGroup(
  values: unknown,
): { labels: string[]; error: string | null } {
  if (!Array.isArray(values)) {
    return {
      labels: [],
      error: "Each capability group must be an array of labels.",
    };
  }

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeCapabilityLabel(value);

    if (!normalized) {
      return {
        labels: [],
        error:
          typeof value === "string"
            ? "Capability labels must be non-empty and 120 characters or fewer."
            : "Capability labels must be strings.",
      };
    }

    const dedupeKey = normalized.toLowerCase();

    if (seen.has(dedupeKey)) {
      return {
        labels: [],
        error: "Duplicate capability labels are not allowed within a group.",
      };
    }

    seen.add(dedupeKey);
    labels.push(normalized);
  }

  if (labels.length > COMPANY_CAPABILITY_MAX_PER_TYPE) {
    return {
      labels: [],
      error: `Each capability group supports up to ${COMPANY_CAPABILITY_MAX_PER_TYPE} entries.`,
    };
  }

  return {
    labels,
    error: null,
  };
}

export function createEmptyGroupedCapabilities(): GroupedCompanyCapabilities {
  return {
    trade: [],
    service: [],
    product: [],
    region: [],
  };
}

export function normalizeGroupedCapabilities(
  input: unknown,
): { capabilities: GroupedCompanyCapabilities; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      capabilities: createEmptyGroupedCapabilities(),
      error: "Capabilities payload must be an object.",
    };
  }

  const capabilities = createEmptyGroupedCapabilities();
  const source = input as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (!isCompanyCapabilityType(key)) {
      return {
        capabilities: createEmptyGroupedCapabilities(),
        error: "Capability type must be trade, service, product, or region.",
      };
    }

    const normalizedGroup = normalizeCapabilityGroup(value);

    if (normalizedGroup.error) {
      return {
        capabilities: createEmptyGroupedCapabilities(),
        error: normalizedGroup.error,
      };
    }

    capabilities[key] = normalizedGroup.labels;
  }

  return {
    capabilities,
    error: null,
  };
}

export function groupCompanyCapabilities(
  rows: CompanyCapabilityRecord[],
): GroupedCompanyCapabilities {
  const grouped = createEmptyGroupedCapabilities();

  const sortedRows = [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.label.localeCompare(right.label);
  });

  for (const row of sortedRows) {
    if (!isCompanyCapabilityType(row.capability_type)) {
      continue;
    }

    grouped[row.capability_type].push(row.label);
  }

  return grouped;
}

export function flattenGroupedCapabilities(
  grouped: GroupedCompanyCapabilities,
): CompanyCapabilityRecord[] {
  const rows: CompanyCapabilityRecord[] = [];

  for (const capabilityType of COMPANY_CAPABILITY_TYPES) {
    grouped[capabilityType].forEach((label, index) => {
      rows.push({
        id: `${capabilityType}-${index}`,
        company_id: "",
        capability_type: capabilityType,
        label,
        sort_order: index,
      });
    });
  }

  return rows;
}

export function countGroupedCapabilities(
  grouped: GroupedCompanyCapabilities,
): number {
  return COMPANY_CAPABILITY_TYPES.reduce(
    (total, capabilityType) => total + grouped[capabilityType].length,
    0,
  );
}

export function hasAnyGroupedCapabilities(
  grouped: GroupedCompanyCapabilities,
): boolean {
  return countGroupedCapabilities(grouped) > 0;
}

export async function loadCompanyCapabilities(
  supabase: SupabaseClient,
  companyId: string,
): Promise<GroupedCompanyCapabilities> {
  const { data, error } = await supabase
    .from("company_capabilities")
    .select(
      "id, company_id, capability_type, label, sort_order, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw error;
  }

  return groupCompanyCapabilities((data ?? []) as CompanyCapabilityRecord[]);
}
