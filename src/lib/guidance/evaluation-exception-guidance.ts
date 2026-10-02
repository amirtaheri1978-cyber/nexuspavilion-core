export type EvaluationExceptionGuidanceKind =
  | "material-revalidation"
  | "high-risk"
  | "highest-quote";

export type EvaluationExceptionGuidanceInput = {
  requiresMaterialRevalidationCount: number;
  highRiskCount: number;
  highestQuoteCount: number;
};

export type EvaluationExceptionGuidance = {
  kind: EvaluationExceptionGuidanceKind;
  title: string;
  description: string;
};

function normalizedCount(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Resolves at most one evaluation-exception guidance item from caller counts.
 * Priority: material revalidation, then high risk, then highest quote.
 */
export function resolveEvaluationExceptionGuidance(
  input: EvaluationExceptionGuidanceInput,
): EvaluationExceptionGuidance | null {
  const requiresMaterialRevalidationCount = normalizedCount(
    input.requiresMaterialRevalidationCount,
  );
  const highRiskCount = normalizedCount(input.highRiskCount);
  const highestQuoteCount = normalizedCount(input.highestQuoteCount);

  if (requiresMaterialRevalidationCount > 0) {
    return {
      kind: "material-revalidation",
      title: "Material reconfirmation exceptions need review",
      description: `${countLabel(
        requiresMaterialRevalidationCount,
        "quotation requires",
        "quotations require",
      )} material-amendment reconfirmation and ${
        requiresMaterialRevalidationCount === 1 ? "remains" : "remain"
      } excluded from award eligibility. Review the highlighted evidence below before advancing any award decision.`,
    };
  }

  if (highRiskCount > 0) {
    return {
      kind: "high-risk",
      title: "High-risk quotation evidence needs review",
      description: `${countLabel(
        highRiskCount,
        "decision-ready quotation carries",
        "decision-ready quotations carry",
      )} high-risk evidence in the comparison. Review the highlighted risk evidence below before advancing any award decision.`,
    };
  }

  if (highestQuoteCount > 0) {
    return {
      kind: "highest-quote",
      title: "Highest-price quotation evidence needs review",
      description: `${countLabel(
        highestQuoteCount,
        "quotation is marked",
        "quotations are marked",
      )} as the highest current commercial offer. Review the highlighted commercial evidence below before advancing any award decision.`,
    };
  }

  return null;
}
