import { describe, expect, it } from "vitest";

import {
  buildComplianceDedupeKey,
  COMPANY_COMPLIANCE_ITEM_FIELDS,
  COMPANY_COMPLIANCE_MAX_PER_TYPE,
  COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE,
  COMPANY_COMPLIANCE_TYPES,
  COMPANY_COMPLIANCE_TYPE_LABELS,
  countGroupedCompliance,
  countGroupedComplianceByType,
  createEmptyGroupedCompliance,
  deriveCompliancePresentation,
  formatComplianceDate,
  formatComplianceExpiry,
  groupCompanyCompliance,
  hasAnyGroupedCompliance,
  isCompanyComplianceType,
  normalizeComplianceDate,
  normalizeComplianceItem,
  normalizeGroupedCompliance,
  type CompanyComplianceRecord,
} from "@/lib/company/compliance";

const REFERENCE_DATE = new Date("2026-06-15T12:00:00Z");

describe("company compliance domain shape", () => {
  it("exposes exactly the three approved compliance types", () => {
    expect(COMPANY_COMPLIANCE_TYPES).toEqual([
      "insurance",
      "workers_compensation",
      "safety",
    ]);
    expect(Object.keys(COMPANY_COMPLIANCE_TYPE_LABELS)).toEqual([
      "insurance",
      "workers_compensation",
      "safety",
    ]);
    expect(isCompanyComplianceType("insurance")).toBe(true);
    expect(isCompanyComplianceType("license")).toBe(false);
    expect(isCompanyComplianceType("certification")).toBe(false);
  });

  it("exposes exactly the four approved item fields", () => {
    expect(COMPANY_COMPLIANCE_ITEM_FIELDS).toEqual([
      "name",
      "provider",
      "effective_on",
      "expires_on",
    ]);
  });

  it("states that compliance is self-declared rather than platform verified", () => {
    expect(COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE).toBe(
      "Compliance information is maintained by this organization and has not been independently verified by Nexus Pavilion.",
    );
    expect(COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE).not.toMatch(
      /\b(verified by us|approved|validated|certified by)\b/i,
    );
  });
});

describe("company compliance item normalization", () => {
  it("collapses whitespace then trims text values", () => {
    const result = normalizeComplianceItem({
      name: "  General   Liability\n Coverage  ",
      provider: "  Northbridge   Insurance ",
    });

    expect(result.error).toBeNull();
    expect(result.item).toEqual({
      name: "General Liability Coverage",
      provider: "Northbridge Insurance",
      effective_on: null,
      expires_on: null,
    });
  });

  it("rejects a missing name key", () => {
    const result = normalizeComplianceItem({ provider: "Acme" });

    expect(result.item).toBeNull();
    expect(result.error).toBe("Compliance name is required.");
  });

  it("rejects a non-string name", () => {
    for (const name of [null, 42, true, {}, []]) {
      const result = normalizeComplianceItem({ name });

      expect(result.item).toBeNull();
      expect(result.error).toBe("Compliance name must be a string.");
    }
  });

  it("rejects a blank name", () => {
    const result = normalizeComplianceItem({ name: "   \n  " });

    expect(result.item).toBeNull();
    expect(result.error).toBe(
      "Compliance name must be non-empty and 160 characters or fewer.",
    );
  });

  it("rejects a name longer than 160 characters", () => {
    const result = normalizeComplianceItem({ name: "a".repeat(161) });

    expect(result.item).toBeNull();
    expect(result.error).toBe(
      "Compliance name must be non-empty and 160 characters or fewer.",
    );
  });

  it("normalizes a blank provider to NULL", () => {
    for (const provider of ["", "   ", null, undefined]) {
      const result = normalizeComplianceItem({
        name: "Commercial General Liability",
        provider,
      });

      expect(result.error).toBeNull();
      expect(result.item?.provider).toBeNull();
    }
  });

  it("rejects unsupported item fields", () => {
    for (const field of [
      "policy_identifier",
      "coverage_limit",
      "notes",
      "is_public",
      "status",
      "document_id",
    ]) {
      const result = normalizeComplianceItem({
        name: "Commercial General Liability",
        [field]: "value",
      });

      expect(result.item).toBeNull();
      expect(result.error).toBe(
        `Compliance field "${field}" is not supported.`,
      );
    }
  });

  it("accepts only strict YYYY-MM-DD dates", () => {
    for (const value of [
      "2026-6-15",
      "06-15-2026",
      "2026/06/15",
      "2026-06-15T00:00:00Z",
      "20260615",
    ]) {
      expect(normalizeComplianceDate(value).error).toBe(
        "Compliance dates must use YYYY-MM-DD format.",
      );
    }

    expect(normalizeComplianceDate("2026-06-15")).toEqual({
      value: "2026-06-15",
      error: null,
    });
  });

  it("rejects invalid calendar dates that match the ISO shape", () => {
    for (const value of ["2026-02-30", "2026-13-01", "2025-02-29"]) {
      expect(normalizeComplianceDate(value).error).toBe(
        "Compliance dates must be valid calendar dates.",
      );
    }

    expect(normalizeComplianceDate("2024-02-29").error).toBeNull();
  });

  it("rejects an expiry date before the effective date", () => {
    const result = normalizeComplianceItem({
      name: "Commercial General Liability",
      effective_on: "2026-06-01",
      expires_on: "2026-05-31",
    });

    expect(result.item).toBeNull();
    expect(result.error).toBe(
      "Expiry date must be on or after the effective date.",
    );
  });

  it("accepts an expiry date equal to the effective date", () => {
    const result = normalizeComplianceItem({
      name: "Commercial General Liability",
      effective_on: "2026-06-01",
      expires_on: "2026-06-01",
    });

    expect(result.error).toBeNull();
    expect(result.item?.expires_on).toBe("2026-06-01");
  });
});

describe("company compliance dedupe identity", () => {
  it("builds a structural key rather than a delimiter-joined string", () => {
    expect(
      buildComplianceDedupeKey({
        name: "General Liability",
        provider: "Northbridge",
      }),
    ).toBe(JSON.stringify(["general liability", "northbridge"]));
  });

  it("treats a null and a blank provider as the same identity", () => {
    expect(
      buildComplianceDedupeKey({ name: "Umbrella", provider: null }),
    ).toBe(buildComplianceDedupeKey({ name: "Umbrella", provider: "" }));
  });

  it("does not collide when a delimiter appears inside a value", () => {
    const left = buildComplianceDedupeKey({
      name: "Liability|Umbrella",
      provider: "Acme",
    });
    const right = buildComplianceDedupeKey({
      name: "Liability",
      provider: "Umbrella|Acme",
    });

    expect(left).not.toBe(right);
  });

  it("rejects duplicates within a group and allows them across groups", () => {
    const duplicate = normalizeGroupedCompliance({
      insurance: [
        { name: "General Liability", provider: "Acme" },
        { name: "  general   liability ", provider: "ACME" },
      ],
    });

    expect(duplicate.error).toBe(
      "Duplicate compliance records are not allowed within a group.",
    );

    const acrossGroups = normalizeGroupedCompliance({
      insurance: [{ name: "Coverage A", provider: "Acme" }],
      safety: [{ name: "Coverage A", provider: "Acme" }],
    });

    expect(acrossGroups.error).toBeNull();
    expect(countGroupedCompliance(acrossGroups.compliance)).toBe(2);
  });

  it("supports editing an existing record in place without a duplicate error", () => {
    const items = [
      { name: "General Liability", provider: "Acme", effective_on: null, expires_on: null },
      { name: "Umbrella", provider: "Acme", effective_on: null, expires_on: null },
    ];

    const editedKey = buildComplianceDedupeKey({
      name: "General Liability",
      provider: "Acme",
    });

    const collidesExcludingSelf = items.some(
      (item, index) => index !== 0 && buildComplianceDedupeKey(item) === editedKey,
    );

    expect(collidesExcludingSelf).toBe(false);
  });
});

describe("company compliance group normalization", () => {
  it("rejects unsupported group keys", () => {
    for (const key of ["license", "certification", "supplier_compliance", "bond"]) {
      const result = normalizeGroupedCompliance({ [key]: [] });

      expect(result.error).toBe(
        "Compliance type must be insurance, workers_compensation, or safety.",
      );
    }
  });

  it("requires each group to be an array", () => {
    expect(normalizeGroupedCompliance({ insurance: {} }).error).toBe(
      "Each compliance group must be an array.",
    );
  });

  it("requires the payload root to be an object", () => {
    for (const payload of [null, undefined, [], "insurance", 7]) {
      expect(normalizeGroupedCompliance(payload).error).toBe(
        "Compliance payload must be an object.",
      );
    }
  });

  it("caps each group at 40 records", () => {
    const atLimit = Array.from(
      { length: COMPANY_COMPLIANCE_MAX_PER_TYPE },
      (_, index) => ({ name: `Policy ${index}` }),
    );

    expect(normalizeGroupedCompliance({ insurance: atLimit }).error).toBeNull();

    const overLimit = [...atLimit, { name: "Policy 40" }];

    expect(normalizeGroupedCompliance({ insurance: overLimit }).error).toBe(
      "Each compliance group supports up to 40 entries.",
    );
  });

  it("produces an empty grouped shape with all three keys", () => {
    const empty = createEmptyGroupedCompliance();

    expect(empty).toEqual({
      insurance: [],
      workers_compensation: [],
      safety: [],
    });
    expect(hasAnyGroupedCompliance(empty)).toBe(false);
    expect(countGroupedComplianceByType(empty)).toEqual({
      insurance: 0,
      workers_compensation: 0,
      safety: 0,
    });
  });

  it("groups database rows by type and sort order", () => {
    const rows: CompanyComplianceRecord[] = [
      {
        id: "row-2",
        company_id: "company-1",
        compliance_type: "insurance",
        name: "Umbrella",
        provider: null,
        effective_on: null,
        expires_on: null,
        sort_order: 1,
      },
      {
        id: "row-1",
        company_id: "company-1",
        compliance_type: "insurance",
        name: "General Liability",
        provider: "Acme",
        effective_on: "2026-01-01",
        expires_on: "2027-01-01",
        sort_order: 0,
      },
      {
        id: "row-3",
        company_id: "company-1",
        compliance_type: "safety",
        name: "COR Program",
        provider: "IHSA",
        effective_on: null,
        expires_on: null,
        sort_order: 0,
      },
    ];

    const grouped = groupCompanyCompliance(rows);

    expect(grouped.insurance.map((item) => item.name)).toEqual([
      "General Liability",
      "Umbrella",
    ]);
    expect(grouped.safety).toHaveLength(1);
    expect(grouped.workers_compensation).toHaveLength(0);
    expect(hasAnyGroupedCompliance(grouped)).toBe(true);
    expect(countGroupedCompliance(grouped)).toBe(3);
  });
});

describe("company compliance derived presentation", () => {
  it("derives Not yet effective when the effective date is in the future", () => {
    expect(
      deriveCompliancePresentation("2026-07-01", "2027-07-01", REFERENCE_DATE),
    ).toBe("Not yet effective");
  });

  it("prefers Not yet effective even when no expiry is recorded", () => {
    expect(deriveCompliancePresentation("2026-07-01", null, REFERENCE_DATE)).toBe(
      "Not yet effective",
    );
  });

  it("derives Current for an expiry beyond the 30 day threshold", () => {
    expect(
      deriveCompliancePresentation("2026-01-01", "2026-12-31", REFERENCE_DATE),
    ).toBe("Current");
    expect(
      deriveCompliancePresentation(null, "2026-07-16", REFERENCE_DATE),
    ).toBe("Current");
  });

  it("derives Expiring soon within the next 30 days inclusive", () => {
    expect(
      deriveCompliancePresentation(null, "2026-07-15", REFERENCE_DATE),
    ).toBe("Expiring soon");
    expect(
      deriveCompliancePresentation(null, "2026-06-15", REFERENCE_DATE),
    ).toBe("Expiring soon");
  });

  it("derives Expired once the expiry date has passed", () => {
    expect(
      deriveCompliancePresentation("2025-01-01", "2026-06-14", REFERENCE_DATE),
    ).toBe("Expired");
  });

  it("derives No expiry recorded when no expiry exists", () => {
    expect(deriveCompliancePresentation(null, null, REFERENCE_DATE)).toBe(
      "No expiry recorded",
    );
    expect(
      deriveCompliancePresentation("2026-01-01", null, REFERENCE_DATE),
    ).toBe("No expiry recorded");
  });

  it("formats dates and expiry without asserting verification", () => {
    expect(formatComplianceDate("2026-06-15")).toBe("Jun 15, 2026");
    expect(formatComplianceDate(null)).toBe("Not provided");
    expect(formatComplianceExpiry(null)).toBe("No expiry recorded");
    expect(formatComplianceExpiry("2026-06-15")).toBe("Jun 15, 2026");
  });

  it("never produces a verification-implying presentation state", () => {
    const states = [
      deriveCompliancePresentation("2026-07-01", null, REFERENCE_DATE),
      deriveCompliancePresentation(null, "2026-12-31", REFERENCE_DATE),
      deriveCompliancePresentation(null, "2026-07-01", REFERENCE_DATE),
      deriveCompliancePresentation(null, "2026-01-01", REFERENCE_DATE),
      deriveCompliancePresentation(null, null, REFERENCE_DATE),
    ];

    expect(states).toEqual([
      "Not yet effective",
      "Current",
      "Expiring soon",
      "Expired",
      "No expiry recorded",
    ]);

    for (const state of states) {
      expect(state).not.toMatch(
        /verified|approved|validated|certified|compliant/i,
      );
    }
  });
});
