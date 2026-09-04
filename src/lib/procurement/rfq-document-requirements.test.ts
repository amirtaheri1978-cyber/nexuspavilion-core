import { describe, expect, it } from "vitest";

import {
  buildRfqDocumentCoverageState,
  evaluateRfqDocumentCoverage,
  type RfqDocumentAttachmentEvidence,
  type RfqDocumentRequirementRecord,
} from "@/lib/procurement/rfq-document-requirements";

function requirement(
  id: string,
  attachmentType: string,
): RfqDocumentRequirementRecord {
  return {
    id,
    rfq_id: "rfq-1",
    attachment_type: attachmentType,
    created_by: "buyer-1",
    created_at: "2026-09-04T05:00:00.000Z",
  };
}

function attachment(
  id: string,
  attachmentType: string,
  fileName = `${id}.pdf`,
): RfqDocumentAttachmentEvidence {
  return {
    id,
    file_name: fileName,
    attachment_type: attachmentType,
    revision_label: "Rev 0",
    created_at: "2026-09-04T05:00:00.000Z",
  };
}

describe("8-08 RFQ document requirement coverage", () => {
  it("returns not_declared when the issuer has declared no requirements", () => {
    expect(evaluateRfqDocumentCoverage([], [])).toEqual({
      coverageStatus: "not_declared",
      requiredCount: 0,
      presentCount: 0,
      missingCount: 0,
      signals: [],
      missingSignals: [],
    });
  });

  it("marks an exact required attachment type present when current evidence exists", () => {
    const result = evaluateRfqDocumentCoverage(
      [requirement("req-drawing", "drawing")],
      [attachment("doc-drawing", "drawing", "issued-drawing.pdf")],
    );

    expect(result.coverageStatus).toBe("complete");
    expect(result.requiredCount).toBe(1);
    expect(result.presentCount).toBe(1);
    expect(result.missingCount).toBe(0);
    expect(result.signals[0]).toMatchObject({
      key: "drawing",
      label: "Drawing",
      state: "present",
      required: true,
      requirementId: "req-drawing",
      source: "RFQ Document Requirements · Drawing",
    });
    expect(result.signals[0].matchingAttachments).toHaveLength(1);
  });

  it("marks a required type missing when no exact current attachment exists", () => {
    const result = evaluateRfqDocumentCoverage(
      [requirement("req-boq", "boq")],
      [attachment("doc-drawing", "drawing")],
    );

    expect(result.coverageStatus).toBe("incomplete");
    expect(result.presentCount).toBe(0);
    expect(result.missingCount).toBe(1);
    expect(result.missingSignals[0]).toMatchObject({
      key: "boq",
      state: "missing",
      requirementId: "req-boq",
    });
  });

  it("keeps deterministic canonical ordering regardless of input order", () => {
    const result = evaluateRfqDocumentCoverage(
      [
        requirement("req-supporting", "supporting"),
        requirement("req-drawing", "drawing"),
        requirement("req-boq", "boq"),
      ],
      [],
    );

    expect(result.signals.map((signal) => signal.key)).toEqual([
      "drawing",
      "boq",
      "supporting",
    ]);
  });

  it("counts multiple same-type attachments as one present requirement while retaining all evidence", () => {
    const result = evaluateRfqDocumentCoverage(
      [requirement("req-spec", "specification")],
      [
        attachment("spec-1", "specification"),
        attachment("spec-2", "specification"),
      ],
    );

    expect(result.requiredCount).toBe(1);
    expect(result.presentCount).toBe(1);
    expect(result.signals[0].matchingAttachments).toHaveLength(2);
  });

  it("ignores unsupported requirement and attachment types", () => {
    const result = evaluateRfqDocumentCoverage(
      [
        requirement("legacy-requirement", "insurance_certificate"),
        requirement("req-photo", "photo"),
      ],
      [
        attachment("legacy-document", "contract"),
        attachment("photo-1", "photo"),
      ],
    );

    expect(result.requiredCount).toBe(1);
    expect(result.signals.map((signal) => signal.key)).toEqual(["photo"]);
    expect(result.coverageStatus).toBe("complete");
  });

  it("does not infer supersession from revision labels", () => {
    const result = evaluateRfqDocumentCoverage(
      [requirement("req-drawing", "drawing")],
      [
        {
          ...attachment("drawing-a", "drawing"),
          revision_label: "Rev A",
        },
        {
          ...attachment("drawing-c", "drawing"),
          revision_label: "Rev C",
        },
      ],
    );

    expect(result.signals[0].state).toBe("present");
    expect(result.signals[0].matchingAttachments).toHaveLength(2);
  });

  it("keeps query failure distinct from zero declared requirements", () => {
    expect(
      buildRfqDocumentCoverageState({
        requirements: [],
        attachments: [],
        unavailableReason: "requirements_query_failed",
      }),
    ).toEqual({
      kind: "unavailable",
      reason: "requirements_query_failed",
    });

    expect(
      buildRfqDocumentCoverageState({
        requirements: [],
        attachments: [],
      }),
    ).toMatchObject({
      kind: "available",
      evaluation: { coverageStatus: "not_declared" },
    });
  });

  it("keeps attachment-load failure distinct from all required documents missing", () => {
    expect(
      buildRfqDocumentCoverageState({
        requirements: [requirement("req-drawing", "drawing")],
        attachments: [],
        unavailableReason: "attachments_query_failed",
      }),
    ).toEqual({
      kind: "unavailable",
      reason: "attachments_query_failed",
    });
  });
});
