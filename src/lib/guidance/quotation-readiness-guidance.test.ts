import { describe, expect, it } from "vitest";

import { resolveQuotationReadinessGuidance } from "@/lib/guidance/quotation-readiness-guidance";

describe("quotation readiness guidance", () => {
  it("prioritizes an outstanding required Addendum acknowledgement", () => {
    expect(
      resolveQuotationReadinessGuidance({
        missingRequirementKeys: ["amount", "timeline"],
        hasOutstandingRequiredAcknowledgement: true,
        complianceIncomplete: true,
        documentsIncomplete: true,
      }),
    ).toMatchObject({
      kind: "addendum-acknowledgement",
      title: "Acknowledge required Addenda before submitting",
    });
  });

  it.each([
    ["amount", "pricing and commercial value"],
    ["timeline", "delivery timeline"],
    ["proposal_note", "commercial note"],
  ] as const)("guides completion of missing %s evidence", (key, wording) => {
    const guidance = resolveQuotationReadinessGuidance({
      missingRequirementKeys: [key],
      hasOutstandingRequiredAcknowledgement: false,
    });

    expect(guidance?.kind).toBe("quotation-inputs");
    expect(guidance?.description).toContain(wording);
  });

  it("combines multiple missing quotation inputs into one truthful item", () => {
    const guidance = resolveQuotationReadinessGuidance({
      missingRequirementKeys: ["amount", "timeline", "proposal_note"],
      hasOutstandingRequiredAcknowledgement: false,
    });

    expect(guidance).toMatchObject({
      kind: "quotation-inputs",
      title: "Complete the remaining quotation inputs",
    });
    expect(guidance?.description).toContain("pricing and commercial value");
    expect(guidance?.description).toContain("delivery timeline");
    expect(guidance?.description).toContain("commercial note");
  });

  it("uses only explicit compliance and document signals", () => {
    expect(
      resolveQuotationReadinessGuidance({
        missingRequirementKeys: [],
        hasOutstandingRequiredAcknowledgement: false,
        complianceIncomplete: true,
      })?.kind,
    ).toBe("compliance");

    expect(
      resolveQuotationReadinessGuidance({
        missingRequirementKeys: [],
        hasOutstandingRequiredAcknowledgement: false,
        documentsIncomplete: true,
      })?.kind,
    ).toBe("documents");

    expect(
      resolveQuotationReadinessGuidance({
        missingRequirementKeys: [],
        hasOutstandingRequiredAcknowledgement: false,
        complianceIncomplete: false,
        documentsIncomplete: false,
      }),
    ).toBeNull();
  });

  it("returns null when the quotation is complete and no blocker is explicit", () => {
    expect(
      resolveQuotationReadinessGuidance({
        missingRequirementKeys: [],
        hasOutstandingRequiredAcknowledgement: false,
      }),
    ).toBeNull();
  });
});
