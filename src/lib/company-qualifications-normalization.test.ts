import { describe, expect, it } from "vitest";

import {
  buildQualificationDedupeKey,
  COMPANY_QUALIFICATION_MAX_IDENTIFIER_LENGTH,
  COMPANY_QUALIFICATION_MAX_ISSUER_LENGTH,
  COMPANY_QUALIFICATION_MAX_NAME_LENGTH,
  COMPANY_QUALIFICATION_MAX_PER_TYPE,
  createEmptyGroupedQualifications,
  formatQualificationExpiry,
  normalizeGroupedQualifications,
  normalizeQualificationBoolean,
  normalizeQualificationDate,
  normalizeQualificationGroup,
  normalizeQualificationItem,
  normalizeQualificationText,
} from "@/lib/company/qualifications";

describe("company qualifications normalization", () => {
  it("trims and collapses whitespace in qualification names", () => {
    expect(
      normalizeQualificationText(
        "  General   Contractor  ",
        COMPANY_QUALIFICATION_MAX_NAME_LENGTH,
      ),
    ).toBe("General Contractor");
  });

  it("rejects blank names and non-string values", () => {
    expect(
      normalizeQualificationText("   ", COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
    ).toBeNull();
    expect(
      normalizeQualificationText(123, COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
    ).toBeNull();
    expect(
      normalizeQualificationText(true, COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
    ).toBeNull();
    expect(
      normalizeQualificationText({}, COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
    ).toBeNull();
    expect(
      normalizeQualificationText([], COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
    ).toBeNull();
  });

  it("enforces enterprise text length limits", () => {
    const longName = "A".repeat(COMPANY_QUALIFICATION_MAX_NAME_LENGTH + 1);
    expect(
      normalizeQualificationText(longName, COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
    ).toBeNull();
    expect(
      normalizeQualificationText(
        "A".repeat(COMPANY_QUALIFICATION_MAX_NAME_LENGTH),
        COMPANY_QUALIFICATION_MAX_NAME_LENGTH,
      ),
    ).toHaveLength(COMPANY_QUALIFICATION_MAX_NAME_LENGTH);
  });

  it("validates ISO dates and rejects invalid values", () => {
    expect(normalizeQualificationDate("2026-01-15")).toEqual({
      value: "2026-01-15",
      error: null,
    });
    expect(normalizeQualificationDate("2026-02-30").error).toContain(
      "valid calendar dates",
    );
    expect(normalizeQualificationDate(123).error).toContain("YYYY-MM-DD");
    expect(normalizeQualificationDate(null)).toEqual({
      value: null,
      error: null,
    });
  });

  it("rejects expiry dates before issued dates", () => {
    const result = normalizeQualificationItem({
      name: "Electrical License",
      issuer: "State Board",
      credential_identifier: "EL-100",
      issued_on: "2026-06-01",
      expires_on: "2026-01-01",
      is_public: false,
    });

    expect(result.error).toContain("on or after");
    expect(result.item).toBeNull();
  });

  it("requires boolean visibility values", () => {
    expect(normalizeQualificationBoolean(true)).toEqual({
      value: true,
      error: null,
    });
    expect(normalizeQualificationBoolean("true").error).toContain("boolean");
    expect(normalizeQualificationBoolean(1).error).toContain("boolean");
  });

  it("handles duplicate qualifications case-insensitively within a group", () => {
    const result = normalizeQualificationGroup([
      {
        name: "ISO 9001",
        issuer: "ISO",
        credential_identifier: "A-1",
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
      {
        name: " iso 9001 ",
        issuer: "iso",
        credential_identifier: "a-1",
        issued_on: null,
        expires_on: null,
        is_public: true,
      },
    ]);

    expect(result.error).toContain("Duplicate");
    expect(result.items).toEqual([]);
  });

  it("documents the normalized dedupe key contract", () => {
    const key = buildQualificationDedupeKey({
      name: "ISO 9001",
      issuer: "ISO",
      credential_identifier: "A-1",
    });

    expect(key).toBe(JSON.stringify(["iso 9001", "iso", "a-1"]));
  });

  it("keeps dedupe keys distinct when values contain delimiter characters", () => {
    const shiftedLeft = buildQualificationDedupeKey({
      name: "Alpha|Beta",
      issuer: "Gamma",
      credential_identifier: null,
    });
    const shiftedRight = buildQualificationDedupeKey({
      name: "Alpha",
      issuer: "Beta|Gamma",
      credential_identifier: null,
    });

    expect(shiftedLeft).not.toBe(shiftedRight);

    const collisionCandidates = normalizeQualificationGroup([
      {
        name: "Alpha|Beta",
        issuer: "Gamma",
        credential_identifier: null,
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
      {
        name: "Alpha",
        issuer: "Beta|Gamma",
        credential_identifier: null,
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
    ]);

    expect(collisionCandidates.error).toBeNull();
    expect(collisionCandidates.items).toHaveLength(2);
  });

  it("treats issuer null and blank as duplicates within a group", () => {
    const nullIssuer = normalizeQualificationGroup([
      {
        name: "Electrical License",
        issuer: null,
        credential_identifier: "EL-100",
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
      {
        name: "Electrical License",
        issuer: "",
        credential_identifier: "EL-100",
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
    ]);

    expect(nullIssuer.error).toContain("Duplicate");
    expect(nullIssuer.items).toEqual([]);
  });

  it("treats credential_identifier null and blank as duplicates within a group", () => {
    const nullIdentifier = normalizeQualificationGroup([
      {
        name: "ISO 9001",
        issuer: "ISO",
        credential_identifier: null,
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
      {
        name: "ISO 9001",
        issuer: "ISO",
        credential_identifier: "",
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
    ]);

    expect(nullIdentifier.error).toContain("Duplicate");
    expect(nullIdentifier.items).toEqual([]);
  });

  it("treats same type and name with equivalent null/blank optional fields as duplicates", () => {
    const result = normalizeQualificationGroup([
      {
        name: "General Contractor",
        issuer: null,
        credential_identifier: null,
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
      {
        name: "general contractor",
        issuer: "   ",
        credential_identifier: "",
        issued_on: null,
        expires_on: null,
        is_public: true,
      },
    ]);

    expect(result.error).toContain("Duplicate");
    expect(result.items).toEqual([]);
    expect(
      buildQualificationDedupeKey({
        name: "General Contractor",
        issuer: null,
        credential_identifier: null,
      }),
    ).toBe(
      buildQualificationDedupeKey({
        name: "general contractor",
        issuer: null,
        credential_identifier: null,
      }),
    );
  });

  it("enforces per-group entry limits", () => {
    const items = Array.from(
      { length: COMPANY_QUALIFICATION_MAX_PER_TYPE + 1 },
      (_, index) => ({
        name: `Qualification ${index + 1}`,
        issuer: null,
        credential_identifier: null,
        issued_on: null,
        expires_on: null,
        is_public: false,
      }),
    );

    const result = normalizeQualificationGroup(items);

    expect(result.error).toContain(String(COMPANY_QUALIFICATION_MAX_PER_TYPE));
    expect(result.items).toEqual([]);
  });

  it("accepts only license, certification, accreditation, and registration groups", () => {
    const result = normalizeGroupedQualifications({
      license: [
        {
          name: "Electrical License",
          issuer: "State Board",
          credential_identifier: "EL-100",
          issued_on: "2024-01-01",
          expires_on: "2028-01-01",
          is_public: false,
        },
      ],
      buyer: [],
    });

    expect(result.error).toContain(
      "license, certification, accreditation, or registration",
    );
    expect(result.qualifications).toEqual(createEmptyGroupedQualifications());
  });

  it("normalizes all four qualification groups together", () => {
    const result = normalizeGroupedQualifications({
      license: [
        {
          name: " General Contractor ",
          issuer: " State Board ",
          credential_identifier: " GC-100 ",
          issued_on: "2024-01-01",
          expires_on: "2028-01-01",
          is_public: true,
        },
      ],
      certification: [
        {
          name: "ISO 9001",
          issuer: "ISO",
          credential_identifier: null,
          issued_on: null,
          expires_on: null,
          is_public: false,
        },
      ],
      accreditation: [],
      registration: [],
    });

    expect(result.error).toBeNull();
    expect(result.qualifications.license[0]).toEqual({
      name: "General Contractor",
      issuer: "State Board",
      credential_identifier: "GC-100",
      issued_on: "2024-01-01",
      expires_on: "2028-01-01",
      is_public: true,
    });
    expect(result.qualifications.certification[0].name).toBe("ISO 9001");
  });

  it("rejects non-string issuer and credential identifier values", () => {
    const issuerResult = normalizeQualificationItem({
      name: "ISO 9001",
      issuer: 123,
      credential_identifier: null,
      issued_on: null,
      expires_on: null,
      is_public: false,
    });

    expect(issuerResult.error).toContain("strings or null");

    const identifierResult = normalizeQualificationItem({
      name: "ISO 9001",
      issuer: "ISO",
      credential_identifier: ["A-1"],
      issued_on: null,
      expires_on: null,
      is_public: false,
    });

    expect(identifierResult.error).toContain("strings or null");
    expect(COMPANY_QUALIFICATION_MAX_ISSUER_LENGTH).toBeGreaterThan(0);
    expect(COMPANY_QUALIFICATION_MAX_IDENTIFIER_LENGTH).toBeGreaterThan(0);
  });

  it("normalizes blank issuer and credential identifier to null", () => {
    const result = normalizeQualificationItem({
      name: "ISO 9001",
      issuer: "   ",
      credential_identifier: "",
      issued_on: null,
      expires_on: null,
      is_public: false,
    });

    expect(result.error).toBeNull();
    expect(result.item?.issuer).toBeNull();
    expect(result.item?.credential_identifier).toBeNull();
  });

  it("requires an explicit name key", () => {
    const missing = normalizeQualificationItem({
      issuer: "ISO",
      credential_identifier: null,
      issued_on: null,
      expires_on: null,
      is_public: false,
    });

    expect(missing.error).toContain("name is required");
    expect(missing.item).toBeNull();
  });

  it("rejects null and non-string names", () => {
    const nullName = normalizeQualificationItem({
      name: null,
      issuer: null,
      credential_identifier: null,
      issued_on: null,
      expires_on: null,
      is_public: false,
    });

    expect(nullName.error).toContain("must be a string");
    expect(nullName.item).toBeNull();

    const numericName = normalizeQualificationItem({
      name: 9001,
      issuer: null,
      credential_identifier: null,
      issued_on: null,
      expires_on: null,
      is_public: false,
    });

    expect(numericName.error).toContain("must be a string");
    expect(numericName.item).toBeNull();
  });

  it("rejects unsupported qualification item keys", () => {
    const result = normalizeQualificationItem({
      name: "ISO 9001",
      issuer: "ISO",
      credential_identifier: null,
      issued_on: null,
      expires_on: null,
      is_public: false,
      is_verified: true,
    });

    expect(result.error).toContain("is_verified");
    expect(result.error).toContain("not supported");
    expect(result.item).toBeNull();

    const groupResult = normalizeGroupedQualifications({
      license: [
        {
          name: "Electrical License",
          issuer: null,
          credential_identifier: null,
          issued_on: null,
          expires_on: null,
          is_public: false,
          sort_order: 0,
        },
      ],
    });

    expect(groupResult.error).toContain("sort_order");
    expect(groupResult.qualifications).toEqual(
      createEmptyGroupedQualifications(),
    );
  });

  it("requires strict YYYY-MM-DD formatting for dates", () => {
    expect(normalizeQualificationDate("2026-1-5").error).toContain(
      "YYYY-MM-DD",
    );
    expect(normalizeQualificationDate("2026-01-15T00:00:00Z").error).toContain(
      "YYYY-MM-DD",
    );
    expect(normalizeQualificationDate("2026-13-01").error).toContain(
      "valid calendar dates",
    );
    expect(normalizeQualificationDate("2026-02-30").error).toContain(
      "valid calendar dates",
    );
  });

  it("supports editing an existing record in place without duplicate errors", () => {
    const existing = [
      {
        name: "General Contractor",
        issuer: "State Board",
        credential_identifier: "GC-100",
        issued_on: "2024-01-01",
        expires_on: null,
        is_public: true,
      },
      {
        name: "ISO 9001",
        issuer: "ISO",
        credential_identifier: null,
        issued_on: null,
        expires_on: null,
        is_public: false,
      },
    ];

    // Visibility is not part of identity, so a public <-> workspace-only flip
    // must survive an in-place edit without delete/re-enter.
    const toWorkspaceOnly = existing.map((item, index) =>
      index === 0 ? { ...item, is_public: false } : item,
    );
    const backToPublic = toWorkspaceOnly.map((item, index) =>
      index === 0 ? { ...item, is_public: true } : item,
    );

    for (const candidate of [toWorkspaceOnly, backToPublic]) {
      const result = normalizeQualificationGroup(candidate);

      expect(result.error).toBeNull();
      expect(result.items).toHaveLength(2);
    }

    expect(
      buildQualificationDedupeKey(toWorkspaceOnly[0]),
    ).toBe(buildQualificationDedupeKey(backToPublic[0]));

    const editedIdentity = existing.map((item, index) =>
      index === 1 ? { ...item, credential_identifier: "ISO-2026" } : item,
    );
    const editedResult = normalizeQualificationGroup(editedIdentity);

    expect(editedResult.error).toBeNull();
    expect(editedResult.items[1]?.credential_identifier).toBe("ISO-2026");

    const collidingEdit = existing.map((item, index) =>
      index === 1
        ? {
            ...item,
            name: "General Contractor",
            issuer: "State Board",
            credential_identifier: "GC-100",
          }
        : item,
    );

    expect(normalizeQualificationGroup(collidingEdit).error).toContain(
      "Duplicate",
    );
  });

  it("renders a single clean expiry state when no expiry is recorded", () => {
    expect(formatQualificationExpiry(null)).toBe("No expiry recorded");
    expect(formatQualificationExpiry("")).toBe("No expiry recorded");
    expect(formatQualificationExpiry(null)).not.toContain("Not provided");
    expect(
      formatQualificationExpiry("2030-01-15", new Date("2026-01-15T00:00:00Z")),
    ).toBe("Jan 15, 2030 · Current");
  });
});
