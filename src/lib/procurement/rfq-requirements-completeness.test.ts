import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  evaluateRfqRequirements,
  isRfqPublicationAcknowledged,
} from "@/lib/procurement/rfq-requirements-completeness";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const newRfqPage = readSource("src/app/rfq/new/page.tsx");
const rfqsRoute = readSource("src/app/api/rfqs/route.ts");
const publicationReview = readSource(
  "src/components/rfq-workspace/rfq-publication-readiness-review.tsx",
);

const readyInput = {
  title: "RFQ",
  description: "123456789",
  category: "HV",
  location: "ON",
  deadline: "2026-09-30T17:00",
  deadline_timezone: "America/Toronto",
  procurement_scope: "subcontractor",
  sourcing_method: "invited",
  contract_framework: "project_specific",
  bid_model: "lump_sum",
};

describe("RFQ publication readiness", () => {
  it("marks the canonical project and strategy requirements ready at their current boundaries", () => {
    const result = evaluateRfqRequirements(readyInput);

    expect(result.status).toBe("ready");
    expect(result.completedCount).toBe(9);
    expect(result.totalCount).toBe(9);
    expect(result.completionPercent).toBe(100);
    expect(result.missingSignals).toEqual([]);
    expect(result.blockingIssues).toEqual([]);
  });

  it("normalizes whitespace and keeps each blocking field independently reviewable", () => {
    const result = evaluateRfqRequirements({
      title: "  AB  ",
      description: "  12345678  ",
      category: " A ",
      location: " O ",
      deadline: "   ",
      procurement_scope: "unknown",
      sourcing_method: "rolling",
      contract_framework: "",
      bid_model: "",
    });

    expect(result.status).toBe("incomplete");
    expect(result.completedCount).toBe(0);
    expect(result.completionPercent).toBe(0);
    expect(result.missingSignals.map((signal) => signal.key)).toEqual([
      "title",
      "description",
      "category",
      "location",
      "submission_deadline",
      "procurement_scope",
      "sourcing_method",
      "contract_framework",
      "bid_model",
    ]);
  });

  it("keeps budget, documents, enterprise controls, and optional project identifiers non-blocking", () => {
    const result = evaluateRfqRequirements(readyInput);

    expect(JSON.stringify(result)).not.toContain("budget");
    expect(JSON.stringify(result)).not.toContain("document");
    expect(JSON.stringify(result)).not.toContain("nda_required");
    expect(JSON.stringify(result)).not.toContain("insurance_required");
    expect(JSON.stringify(result)).not.toContain("owner_client");
    expect(JSON.stringify(result)).not.toContain("internal_project_id");
    expect(result.status).toBe("ready");
  });

  it("fails closed for an invalid submission deadline or timezone", () => {
    const invalidDeadline = evaluateRfqRequirements({
      ...readyInput,
      deadline: "not-a-date",
    });
    const invalidTimezone = evaluateRfqRequirements({
      ...readyInput,
      deadline_timezone: "Mars/Olympus",
    });

    expect(invalidDeadline.status).toBe("incomplete");
    expect(
      invalidDeadline.missingSignals.find(
        (signal) => signal.key === "submission_deadline",
      )?.complete,
    ).toBe(false);
    expect(invalidTimezone.status).toBe("incomplete");
  });

  it("allows an optional RFI deadline only when valid and at or before submission closing", () => {
    const equalDeadline = evaluateRfqRequirements({
      ...readyInput,
      rfi_deadline: "2026-09-30T17:00",
      rfi_deadline_timezone: "America/Toronto",
    });
    const earlierDeadline = evaluateRfqRequirements({
      ...readyInput,
      rfi_deadline: "2026-09-29T17:00",
      rfi_deadline_timezone: "America/Toronto",
    });
    const laterDeadline = evaluateRfqRequirements({
      ...readyInput,
      rfi_deadline: "2026-10-01T09:00",
      rfi_deadline_timezone: "America/Toronto",
    });
    const invalidDeadline = evaluateRfqRequirements({
      ...readyInput,
      rfi_deadline: "2026-09-31T12:00",
      rfi_deadline_timezone: "America/Toronto",
    });

    expect(equalDeadline.status).toBe("ready");
    expect(earlierDeadline.status).toBe("ready");
    expect(laterDeadline.status).toBe("incomplete");
    expect(laterDeadline.blockingIssues[0]?.key).toBe("rfi_deadline");
    expect(invalidDeadline.status).toBe("incomplete");
    expect(invalidDeadline.blockingIssues[0]?.key).toBe("rfi_deadline");
  });

  it("blocks invalid or contradictory project schedule dates", () => {
    const ordered = evaluateRfqRequirements({
      ...readyInput,
      mobilization_date: "2026-10-15",
      substantial_completion_date: "2027-04-30",
    });
    const reversed = evaluateRfqRequirements({
      ...readyInput,
      mobilization_date: "2027-05-01",
      substantial_completion_date: "2027-04-30",
    });
    const invalid = evaluateRfqRequirements({
      ...readyInput,
      mobilization_date: "2026-02-30",
    });

    expect(ordered.status).toBe("ready");
    expect(reversed.status).toBe("incomplete");
    expect(reversed.blockingIssues[0]?.key).toBe("project_schedule");
    expect(invalid.status).toBe("incomplete");
    expect(invalid.blockingIssues[0]?.key).toBe("project_schedule");
  });

  it("treats Ready to Publish acknowledgement as an explicit boolean confirmation", () => {
    expect(isRfqPublicationAcknowledged(true)).toBe(true);
    expect(isRfqPublicationAcknowledged(false)).toBe(false);
    expect(isRfqPublicationAcknowledged("true")).toBe(false);
    expect(isRfqPublicationAcknowledged(1)).toBe(false);
    expect(isRfqPublicationAcknowledged(undefined)).toBe(false);
  });

  it("preserves server defaults for omitted strategy inputs while rejecting explicit invalid strategy values", () => {
    expect(rfqsRoute).toContain(
      'procurement_scope: normalizeText(body.procurement_scope) || "subcontractor"',
    );
    expect(rfqsRoute).toContain(
      'sourcing_method: normalizeText(body.sourcing_method) || "invited"',
    );
    expect(rfqsRoute).toContain(
      'contract_framework: normalizeText(body.contract_framework) || "project_specific"',
    );
    expect(rfqsRoute).toContain(
      'bid_model: normalizeText(body.bid_model) || "lump_sum"',
    );

    const invalidExplicitStrategy = evaluateRfqRequirements({
      ...readyInput,
      sourcing_method: "rolling",
    });

    expect(invalidExplicitStrategy.status).toBe("incomplete");
    expect(
      invalidExplicitStrategy.missingSignals.map((signal) => signal.key),
    ).toContain("sourcing_method");
  });

  it("provides actionable source and step context for every blocker", () => {
    const result = evaluateRfqRequirements({});

    expect(result.missingSignals).toHaveLength(9);

    for (const signal of result.missingSignals) {
      expect(signal.source).toMatch(/^(Project|Strategy) · /);
      expect(signal.context.length).toBeGreaterThan(10);
      expect(signal.label.length).toBeGreaterThan(3);
      expect([0, 1]).toContain(signal.step);
    }
  });

  it("keeps RFQ New and POST /api/rfqs on the same readiness authority and server-enforces sign-off", () => {
    expect(newRfqPage).toContain(
      'import { evaluateRfqRequirements } from "@/lib/procurement/rfq-requirements-completeness";',
    );
    expect(newRfqPage).toContain("const rfqRequirements = useMemo(");
    expect(newRfqPage).toContain("deadline_timezone: formData.deadline_timezone");
    expect(newRfqPage).toContain("procurement_scope: formData.procurement_scope");
    expect(newRfqPage).toContain("bid_model: formData.bid_model");
    expect(newRfqPage).toContain("setReadyToPublishAcknowledged(false)");
    expect(newRfqPage).toContain(
      "ready_to_publish_acknowledged: readyToPublishAcknowledged",
    );
    expect(newRfqPage).toContain("<RfqPublicationReadinessReview");

    expect(rfqsRoute).toContain("evaluateRfqRequirements({");
    expect(rfqsRoute).toContain("deadline_timezone: body.deadline_timezone");
    expect(rfqsRoute).toContain(
      'procurement_scope: normalizeText(body.procurement_scope) || "subcontractor"',
    );
    expect(rfqsRoute).toContain(
      'bid_model: normalizeText(body.bid_model) || "lump_sum"',
    );
    expect(rfqsRoute).toContain(
      "!isRfqPublicationAcknowledged(body.ready_to_publish_acknowledged)",
    );
    expect(rfqsRoute).toContain("missing: requirementsCompleteness.missingSignals");
    expect(rfqsRoute).toContain("issues: requirementsCompleteness.blockingIssues");
  });

  it("states the deadline-locked commercial-opening policy without making documents a blocker", () => {
    expect(publicationReview).toContain(
      "Commercial submissions remain confidential until the submission deadline has passed.",
    );
    expect(publicationReview).toContain(
      "Open sourcing controls market access; it does not enable rolling commercial evaluation.",
    );
    expect(publicationReview).toContain(
      "Configured from the RFQ workspace after publication",
    );
    expect(publicationReview).toContain("non-blocking at creation time");
  });
});
