import { describe, expect, it } from "vitest";

import { resolveEvaluationExceptionGuidance } from "@/lib/guidance/evaluation-exception-guidance";

describe("evaluation exception guidance", () => {
  it("prioritizes material revalidation exceptions over other evidence", () => {
    expect(
      resolveEvaluationExceptionGuidance({
        requiresMaterialRevalidationCount: 2,
        highRiskCount: 4,
        highestQuoteCount: 1,
      }),
    ).toMatchObject({
      kind: "material-revalidation",
    });

    const guidance = resolveEvaluationExceptionGuidance({
      requiresMaterialRevalidationCount: 1,
      highRiskCount: 0,
      highestQuoteCount: 0,
    });

    expect(guidance?.kind).toBe("material-revalidation");
    expect(guidance?.description).toContain("highlighted evidence below");
    expect(guidance?.description).not.toContain("winner");
    expect(guidance?.description.toLowerCase()).not.toContain("recommend award");
  });

  it("uses high-risk evidence when no revalidation exception exists", () => {
    expect(
      resolveEvaluationExceptionGuidance({
        requiresMaterialRevalidationCount: 0,
        highRiskCount: 3,
        highestQuoteCount: 2,
      }),
    ).toMatchObject({
      kind: "high-risk",
    });
  });

  it("uses highest-quote evidence when no higher-priority exception exists", () => {
    expect(
      resolveEvaluationExceptionGuidance({
        requiresMaterialRevalidationCount: 0,
        highRiskCount: 0,
        highestQuoteCount: 1,
      }),
    ).toMatchObject({
      kind: "highest-quote",
    });
  });

  it("returns exactly one priority-resolved item when multiple categories apply", () => {
    const guidance = resolveEvaluationExceptionGuidance({
      requiresMaterialRevalidationCount: 1,
      highRiskCount: 2,
      highestQuoteCount: 3,
    });

    expect(guidance).not.toBeNull();
    expect(guidance?.kind).toBe("material-revalidation");
  });

  it("returns null when no exception evidence applies", () => {
    expect(
      resolveEvaluationExceptionGuidance({
        requiresMaterialRevalidationCount: 0,
        highRiskCount: 0,
        highestQuoteCount: 0,
      }),
    ).toBeNull();
  });

  it("normalizes unsafe counts without inventing exceptions", () => {
    expect(
      resolveEvaluationExceptionGuidance({
        requiresMaterialRevalidationCount: Number.NaN,
        highRiskCount: Number.POSITIVE_INFINITY,
        highestQuoteCount: -3,
      }),
    ).toBeNull();

    expect(
      resolveEvaluationExceptionGuidance({
        requiresMaterialRevalidationCount: 1.8,
        highRiskCount: 0,
        highestQuoteCount: 0,
      })?.description,
    ).toContain("1 quotation requires");
  });
});
