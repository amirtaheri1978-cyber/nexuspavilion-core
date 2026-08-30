import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_QUALIFICATION_TYPES = [
  "license",
  "certification",
  "accreditation",
  "registration",
] as const;

export type CompanyQualificationType =
  (typeof COMPANY_QUALIFICATION_TYPES)[number];

export type CompanyQualificationRecord = {
  id: string;
  company_id: string;
  qualification_type: CompanyQualificationType;
  name: string;
  issuer: string | null;
  credential_identifier: string | null;
  issued_on: string | null;
  expires_on: string | null;
  is_public: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PublicCompanyQualificationRecord = {
  id: string;
  company_id: string;
  qualification_type: CompanyQualificationType;
  name: string;
  issuer: string | null;
  issued_on: string | null;
  expires_on: string | null;
  sort_order: number;
};

export type CompanyQualificationInput = {
  name: string;
  issuer: string | null;
  credential_identifier: string | null;
  issued_on: string | null;
  expires_on: string | null;
  is_public: boolean;
};

export type GroupedCompanyQualifications = Record<
  CompanyQualificationType,
  CompanyQualificationInput[]
>;

export const COMPANY_QUALIFICATION_TYPE_LABELS: Record<
  CompanyQualificationType,
  string
> = {
  license: "Licenses",
  certification: "Certifications",
  accreditation: "Accreditations",
  registration: "Registrations",
};

export const COMPANY_QUALIFICATION_MAX_NAME_LENGTH = 160;
export const COMPANY_QUALIFICATION_MAX_ISSUER_LENGTH = 160;
export const COMPANY_QUALIFICATION_MAX_IDENTIFIER_LENGTH = 120;
export const COMPANY_QUALIFICATION_MAX_PER_TYPE = 40;

const QUALIFICATION_TYPE_SET = new Set<string>(COMPANY_QUALIFICATION_TYPES);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const COMPANY_QUALIFICATION_ITEM_FIELDS = [
  "name",
  "issuer",
  "credential_identifier",
  "issued_on",
  "expires_on",
  "is_public",
] as const;

const QUALIFICATION_ITEM_FIELD_SET = new Set<string>(
  COMPANY_QUALIFICATION_ITEM_FIELDS,
);

export function isCompanyQualificationType(
  value: string,
): value is CompanyQualificationType {
  return QUALIFICATION_TYPE_SET.has(value);
}

export function normalizeQualificationText(
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

export function normalizeNullableQualificationText(
  value: unknown,
  maxLength: number,
): { value: string | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string") {
    return {
      value: null,
      error: "Optional qualification text fields must be strings or null.",
    };
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return { value: null, error: null };
  }

  if (normalized.length > maxLength) {
    return {
      value: null,
      error: `Qualification text fields must be ${maxLength} characters or fewer.`,
    };
  }

  return { value: normalized, error: null };
}

export function normalizeQualificationDate(
  value: unknown,
): { value: string | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return {
      value: null,
      error: "Qualification dates must use YYYY-MM-DD format.",
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
      error: "Qualification dates must be valid calendar dates.",
    };
  }

  return { value, error: null };
}

export function normalizeQualificationBoolean(
  value: unknown,
): { value: boolean | null; error: string | null } {
  if (typeof value !== "boolean") {
    return {
      value: null,
      error: "Qualification visibility must be a boolean.",
    };
  }

  return { value, error: null };
}

export function buildQualificationDedupeKey(
  qualification: Pick<
    CompanyQualificationInput,
    "name" | "issuer" | "credential_identifier"
  >,
): string {
  return JSON.stringify([
    qualification.name.toLowerCase(),
    (qualification.issuer ?? "").toLowerCase(),
    (qualification.credential_identifier ?? "").toLowerCase(),
  ]);
}

export function normalizeQualificationItem(
  value: unknown,
): { item: CompanyQualificationInput | null; error: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      item: null,
      error: "Each qualification must be an object.",
    };
  }

  const source = value as Record<string, unknown>;

  for (const field of Object.keys(source)) {
    if (!QUALIFICATION_ITEM_FIELD_SET.has(field)) {
      return {
        item: null,
        error: `Qualification field "${field}" is not supported.`,
      };
    }
  }

  if (!("name" in source)) {
    return {
      item: null,
      error: "Qualification name is required.",
    };
  }

  const name = normalizeQualificationText(
    source.name,
    COMPANY_QUALIFICATION_MAX_NAME_LENGTH,
  );

  if (!name) {
    return {
      item: null,
      error:
        typeof source.name === "string"
          ? "Qualification name must be non-empty and 160 characters or fewer."
          : "Qualification name must be a string.",
    };
  }

  const issuer = normalizeNullableQualificationText(
    source.issuer,
    COMPANY_QUALIFICATION_MAX_ISSUER_LENGTH,
  );

  if (issuer.error) {
    return { item: null, error: issuer.error };
  }

  const credentialIdentifier = normalizeNullableQualificationText(
    source.credential_identifier,
    COMPANY_QUALIFICATION_MAX_IDENTIFIER_LENGTH,
  );

  if (credentialIdentifier.error) {
    return { item: null, error: credentialIdentifier.error };
  }

  const issuedOn = normalizeQualificationDate(source.issued_on);

  if (issuedOn.error) {
    return { item: null, error: issuedOn.error };
  }

  const expiresOn = normalizeQualificationDate(source.expires_on);

  if (expiresOn.error) {
    return { item: null, error: expiresOn.error };
  }

  if (
    issuedOn.value &&
    expiresOn.value &&
    expiresOn.value < issuedOn.value
  ) {
    return {
      item: null,
      error: "Expiry date must be on or after the issued date.",
    };
  }

  const isPublic = normalizeQualificationBoolean(source.is_public);

  if (isPublic.error || isPublic.value === null) {
    return { item: null, error: isPublic.error };
  }

  return {
    item: {
      name,
      issuer: issuer.value,
      credential_identifier: credentialIdentifier.value,
      issued_on: issuedOn.value,
      expires_on: expiresOn.value,
      is_public: isPublic.value,
    },
    error: null,
  };
}

export function normalizeQualificationGroup(
  values: unknown,
): { items: CompanyQualificationInput[]; error: string | null } {
  if (!Array.isArray(values)) {
    return {
      items: [],
      error: "Each qualification group must be an array.",
    };
  }

  const items: CompanyQualificationInput[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeQualificationItem(value);

    if (normalized.error || !normalized.item) {
      return {
        items: [],
        error: normalized.error || "Qualification item is invalid.",
      };
    }

    const dedupeKey = buildQualificationDedupeKey(normalized.item);

    if (seen.has(dedupeKey)) {
      return {
        items: [],
        error: "Duplicate qualifications are not allowed within a group.",
      };
    }

    seen.add(dedupeKey);
    items.push(normalized.item);
  }

  if (items.length > COMPANY_QUALIFICATION_MAX_PER_TYPE) {
    return {
      items: [],
      error: `Each qualification group supports up to ${COMPANY_QUALIFICATION_MAX_PER_TYPE} entries.`,
    };
  }

  return { items, error: null };
}

export function createEmptyGroupedQualifications(): GroupedCompanyQualifications {
  return {
    license: [],
    certification: [],
    accreditation: [],
    registration: [],
  };
}

export function normalizeGroupedQualifications(
  input: unknown,
): { qualifications: GroupedCompanyQualifications; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      qualifications: createEmptyGroupedQualifications(),
      error: "Qualifications payload must be an object.",
    };
  }

  const qualifications = createEmptyGroupedQualifications();
  const source = input as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (!isCompanyQualificationType(key)) {
      return {
        qualifications: createEmptyGroupedQualifications(),
        error:
          "Qualification type must be license, certification, accreditation, or registration.",
      };
    }

    const normalizedGroup = normalizeQualificationGroup(value);

    if (normalizedGroup.error) {
      return {
        qualifications: createEmptyGroupedQualifications(),
        error: normalizedGroup.error,
      };
    }

    qualifications[key] = normalizedGroup.items;
  }

  return {
    qualifications,
    error: null,
  };
}

export function groupCompanyQualifications(
  rows: CompanyQualificationRecord[],
): GroupedCompanyQualifications {
  const grouped = createEmptyGroupedQualifications();

  const sortedRows = [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.name.localeCompare(right.name);
  });

  for (const row of sortedRows) {
    if (!isCompanyQualificationType(row.qualification_type)) {
      continue;
    }

    grouped[row.qualification_type].push({
      name: row.name,
      issuer: row.issuer,
      credential_identifier: row.credential_identifier,
      issued_on: row.issued_on,
      expires_on: row.expires_on,
      is_public: row.is_public,
    });
  }

  return grouped;
}

export function groupPublicCompanyQualifications(
  rows: PublicCompanyQualificationRecord[],
): GroupedCompanyQualifications {
  const grouped = createEmptyGroupedQualifications();

  const sortedRows = [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.name.localeCompare(right.name);
  });

  for (const row of sortedRows) {
    if (!isCompanyQualificationType(row.qualification_type)) {
      continue;
    }

    grouped[row.qualification_type].push({
      name: row.name,
      issuer: row.issuer,
      credential_identifier: null,
      issued_on: row.issued_on,
      expires_on: row.expires_on,
      is_public: true,
    });
  }

  return grouped;
}

export function countGroupedQualifications(
  grouped: GroupedCompanyQualifications,
): number {
  return COMPANY_QUALIFICATION_TYPES.reduce(
    (total, qualificationType) => total + grouped[qualificationType].length,
    0,
  );
}

export function countPublicGroupedQualifications(
  grouped: GroupedCompanyQualifications,
): number {
  return COMPANY_QUALIFICATION_TYPES.reduce(
    (total, qualificationType) =>
      total +
      grouped[qualificationType].filter((item) => item.is_public).length,
    0,
  );
}

export function countGroupedQualificationsByType(
  grouped: GroupedCompanyQualifications,
): Record<CompanyQualificationType, number> {
  return {
    license: grouped.license.length,
    certification: grouped.certification.length,
    accreditation: grouped.accreditation.length,
    registration: grouped.registration.length,
  };
}

export function hasAnyGroupedQualifications(
  grouped: GroupedCompanyQualifications,
): boolean {
  return countGroupedQualifications(grouped) > 0;
}

export function hasAnyPublicGroupedQualifications(
  grouped: GroupedCompanyQualifications,
): boolean {
  return countPublicGroupedQualifications(grouped) > 0;
}

export type QualificationDatePresentation =
  | "No expiry recorded"
  | "Current"
  | "Expiring soon"
  | "Expired";

export function deriveQualificationDatePresentation(
  expiresOn: string | null | undefined,
  referenceDate = new Date(),
): QualificationDatePresentation {
  if (!expiresOn) {
    return "No expiry recorded";
  }

  const expiry = new Date(`${expiresOn}T00:00:00Z`);

  if (Number.isNaN(expiry.getTime())) {
    return "No expiry recorded";
  }

  const today = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  );

  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return "Expired";
  }

  if (diffDays <= 30) {
    return "Expiring soon";
  }

  return "Current";
}

export function formatQualificationDate(value: string | null | undefined) {
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

export function formatQualificationExpiry(
  expiresOn: string | null | undefined,
  referenceDate = new Date(),
): string {
  const formatted = formatQualificationDate(expiresOn);

  if (formatted === "Not provided") {
    return "No expiry recorded";
  }

  return `${formatted} · ${deriveQualificationDatePresentation(
    expiresOn,
    referenceDate,
  )}`;
}

export async function loadCompanyQualifications(
  supabase: SupabaseClient,
  companyId: string,
): Promise<GroupedCompanyQualifications> {
  const { data, error } = await supabase
    .from("company_qualifications")
    .select(
      "id, company_id, qualification_type, name, issuer, credential_identifier, issued_on, expires_on, is_public, sort_order, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return groupCompanyQualifications(
    (data ?? []) as CompanyQualificationRecord[],
  );
}

export async function loadPublicCompanyQualifications(
  supabase: SupabaseClient,
  companyId: string,
): Promise<GroupedCompanyQualifications> {
  const { data, error } = await supabase
    .from("company_qualifications_public")
    .select(
      "id, company_id, qualification_type, name, issuer, issued_on, expires_on, sort_order",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return groupPublicCompanyQualifications(
    (data ?? []) as PublicCompanyQualificationRecord[],
  );
}
