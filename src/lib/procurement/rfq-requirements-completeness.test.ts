import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateRfqRequirements } from "@/lib/procurement/rfq-requirements-completeness";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const newRfqPage = readSource("src/app/rfq/new/page.tsx");
const rfqsRoute = readSource("src/app/api/rfqs/route.ts");

describe("RFQ requirements completeness", () => {
  it("marks the current five RFQ publish requirements ready at their existing boundaries", () => {
    const result = evaluateRfqRequirements({
      title: "RFQ",
      description: "123456789",
      category: "HV",
      location: "ON",
      deadline: "2026-09-30T17:00",
    });

    expect(result.status).toBe("ready");
    expect(result.completedCount).toBe(5);
    expect(result.totalCount).toBe(5);
    expect(result.completionPercent).toBe(100);
    expect(result.missingSignals).toEqual([]);
  });

  it("normalizes whitespace and keeps each blocking field independently reviewable", () => {
    const result = evaluateRfqRequirements({
      title: "  AB  ",
      description: "  12345678  ",
      category: " A ",
      location: " O ",
      deadline: "   ",
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
    ]);
  });

  it("does not treat procurement strategy or recommended evidence as publish blockers", () => {
    const result = evaluateRfqRequirements({
      title: "Valid RFQ",
      description: "Defined scope of work",
      category: "Electrical",
      location: "Toronto, ON",
      deadline: "2026-09-30T17:00",
    });

    expect(result.signals.map((signal) => signal.key)).toEqual([
      "title",
      "description",
      "category",
      "location",
      "submission_deadline",
    ]);

    expect(JSON.stringify(result)).not.toContain("procurement_strategy");
    expect(JSON.stringify(result)).not.toContain("budget");
    expect(JSON.stringify(result)).not.toContain("document");
    expect(result.status).toBe("ready");
  });

  it("provides factual source and action context for every missing requirement", () => {
    const result = evaluateRfqRequirements({});

    expect(result.missingSignals).toHaveLength(5);

    for (const signal of result.missingSignals) {
      expect(signal.source).toMatch(/^RFQ Details · /);
      expect(signal.context.length).toBeGreaterThan(10);
      expect(signal.context).not.toMatch(/boundary|implementation|converter/i);
      expect(signal.label.length).toBeGreaterThan(3);
    }

    expect(
      result.missingSignals.find(
        (signal) => signal.key === "submission_deadline",
      )?.context,
    ).toBe("Set the supplier submission closing date and time.");
  });

  it("keeps RFQ New and POST /api/rfqs on the same canonical requirements contract", () => {
    expect(newRfqPage).toContain(
      'import { evaluateRfqRequirements } from "@/lib/procurement/rfq-requirements-completeness";',
    );

    expect(newRfqPage).toContain("const rfqRequirements = useMemo(");
    expect(newRfqPage).toContain("evaluateRfqRequirements({");
    expect(newRfqPage).toContain(
      'const isFormReady = rfqRequirements.status === "ready";',
    );

    expect(newRfqPage).toContain("source={item.source}");
    expect(newRfqPage).toContain("context={item.context}");
    expect(newRfqPage).not.toContain(
      "formData.title.trim().length > 2 &&",
    );

    expect(rfqsRoute).toContain(
      'import { evaluateRfqRequirements } from "@/lib/procurement/rfq-requirements-completeness";',
    );

    expect(rfqsRoute).toContain(
      "const requirementsCompleteness = evaluateRfqRequirements({",
    );

    expect(rfqsRoute).toContain(
      'requirementsCompleteness.status === "incomplete"',
    );

    expect(rfqsRoute).toContain("missing: requirementsCompleteness.missingSignals");
    expect(rfqsRoute).not.toContain("if (!title) {");
  });
});
