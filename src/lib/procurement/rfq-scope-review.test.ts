import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateRfqScopeReview } from "@/lib/procurement/rfq-scope-review";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const newRfqPage = readSource("src/app/rfq/new/page.tsx");
const rfqDetailPage = readSource("src/app/rfq/[slug]/page.tsx");

describe("RFQ scope review", () => {
  it("waits for reviewable scope evidence instead of inventing ambiguity signals", () => {
    const result = evaluateRfqScopeReview({
      description: "12345678",
    });

    expect(result.status).toBe("insufficient-data");
    expect(result.reviewable).toBe(false);
    expect(result.signals).toEqual([]);
    expect(result.reviewSignals).toEqual([]);
  });

  it("surfaces explicit review prompts for unreferenced scope facets", () => {
    const result = evaluateRfqScopeReview({
      description: "Replace ceiling package in project area A.",
    });

    expect(result.status).toBe("review");
    expect(result.reviewable).toBe(true);
    expect(result.reviewSignals.map((signal) => signal.key)).toEqual([
      "scope_boundaries",
      "site_conditions",
      "technical_basis",
      "execution_timing",
    ]);
  });

  it("does not treat lexical substrings or generic procurement wording as explicit scope evidence", () => {
    const result = evaluateRfqScopeReview({
      description:
        "Provide ceiling accessories, detailed pricing, material supply, and completion of demolition in project area A.",
    });

    expect(
      result.signals.find((signal) => signal.key === "site_conditions")?.status,
    ).toBe("review");

    expect(
      result.signals.find((signal) => signal.key === "technical_basis")?.status,
    ).toBe("review");

    expect(
      result.signals.find((signal) => signal.key === "execution_timing")?.status,
    ).toBe("review");
  });

  it("keeps generic standard wording and finish schedules from falsely covering unrelated facets", () => {
    const standardHoursResult = evaluateRfqScopeReview({
      description:
        "Standard working hours apply to site access for the project area.",
    });

    expect(
      standardHoursResult.signals.find(
        (signal) => signal.key === "site_conditions",
      )?.status,
    ).toBe("covered");

    expect(
      standardHoursResult.signals.find(
        (signal) => signal.key === "technical_basis",
      )?.status,
    ).toBe("review");

    const finishScheduleResult = evaluateRfqScopeReview({
      description:
        "Coordinate the finish schedule and finish requirements for the ceiling package.",
    });

    expect(
      finishScheduleResult.signals.find(
        (signal) => signal.key === "technical_basis",
      )?.status,
    ).toBe("covered");

    expect(
      finishScheduleResult.signals.find(
        (signal) => signal.key === "execution_timing",
      )?.status,
    ).toBe("review");
  });

  it("does not claim document absence when RFQ document evidence was not supplied", () => {
    const prePublishResult = evaluateRfqScopeReview({
      description: "Provide the ceiling trade package for project area A.",
    });

    const technicalSignal = prePublishResult.signals.find(
      (signal) => signal.key === "technical_basis",
    );

    expect(technicalSignal?.source).toBe(
      "RFQ Details · Scope of Work Summary",
    );
    expect(technicalSignal?.evidence).toBe(
      "No explicit technical-basis language was detected in the current scope summary.",
    );
    expect(technicalSignal?.evidence).not.toContain(
      "no drawing or specification",
    );

    const issuedPackageResult = evaluateRfqScopeReview({
      description: "Provide the ceiling trade package for project area A.",
      attachmentTypes: [],
    });

    expect(
      issuedPackageResult.signals.find(
        (signal) => signal.key === "technical_basis",
      )?.evidence,
    ).toContain("no drawing or specification");
  });

  it("recognizes explicit scope evidence without asserting inferred facts", () => {
    const result = evaluateRfqScopeReview({
      description:
        "Inclusions include removal and replacement; exclusions are stated. Site access is after hours with occupied-area phasing. Work must follow drawings, specifications, materials, finishes, and testing requirements. Mobilization, schedule, sequencing, and completion milestones are defined.",
    });

    expect(result.status).toBe("clear");
    expect(result.coveredCount).toBe(4);
    expect(result.reviewCount).toBe(0);
    expect(result.reviewSignals).toEqual([]);
  });

  it("uses post-publication document and project-control evidence when available", () => {
    const result = evaluateRfqScopeReview({
      description: "Provide the trade package for project area A.",
      attachmentTypes: ["drawing"],
      mobilizationDate: "2026-10-01",
    });

    expect(
      result.signals.find((signal) => signal.key === "technical_basis")?.status,
    ).toBe("covered");

    expect(
      result.signals.find((signal) => signal.key === "execution_timing")?.status,
    ).toBe("covered");
  });

  it("keeps every review signal source-based, advisory, and action-oriented", () => {
    const result = evaluateRfqScopeReview({
      description: "Provide the trade package for project area A.",
    });

    expect(result.reviewSignals.length).toBeGreaterThan(0);

    for (const signal of result.reviewSignals) {
      expect(signal.source).toMatch(/^RFQ Details · /);
      expect(signal.evidence).toMatch(/^No explicit /);
      expect(signal.context).toMatch(/^Review whether /);
      expect(signal.context).not.toMatch(
        /definitely|authoritative|prediction|probability|AI-generated/i,
      );
    }
  });

  it("embeds the same non-blocking scope review on RFQ New and buyer RFQ detail", () => {
    expect(newRfqPage).toContain(
      'import { RFQScopeReview } from "@/components/rfq-workspace/rfq-scope-review";',
    );
    expect(newRfqPage).toContain(
      'import { evaluateRfqScopeReview } from "@/lib/procurement/rfq-scope-review";',
    );
    expect(newRfqPage).toContain("const scopeReview = useMemo(");
    expect(newRfqPage).toContain("<RFQScopeReview review={scopeReview} />");
    expect(newRfqPage).toContain(
      'const isFormReady = rfqRequirements.status === "ready";',
    );
    expect(newRfqPage).not.toContain('scopeReview.status === "clear"');

    expect(rfqDetailPage).toContain(
      'import { RFQScopeReview } from "@/components/rfq-workspace/rfq-scope-review";',
    );
    expect(rfqDetailPage).toContain(
      'import { evaluateRfqScopeReview } from "@/lib/procurement/rfq-scope-review";',
    );
    expect(rfqDetailPage).toContain(
      "const scopeReview = canViewBuyerExecutiveIntelligence",
    );
    expect(rfqDetailPage).toContain("<RFQScopeReview review={scopeReview} />");
  });
});
