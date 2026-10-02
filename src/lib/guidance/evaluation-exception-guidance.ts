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
      title: "Review material reconfirmation exceptions",
      description: `${countLabel(
        requiresMaterialRevalidationCount,
        "quotation requires",
        "quotations require",
      )} material-amendment reconfirmation and ${
        requiresMaterialRevalidationCount === 1 ? "remains" : "remain"
      } excluded from award eligibility. Review the highlighted evidence below.`,
    };
  }

  if (highRiskCount > 0) {
    return {
      kind: "high-risk",
      title: "Review high-risk quotation evidence",
      description: `${countLabel(
        highRiskCount,
        "decision-ready quotation carries",
        "decision-ready quotations carry",
      )} high-risk evidence. Review the highlighted risk evidence below.`,
    };
  }

  if (highestQuoteCount > 0) {
    return {
      kind: "highest-quote",
      title: "Review highest-price quotation evidence",
      description: `${countLabel(
        highestQuoteCount,
        "quotation is marked",
        "quotations are marked",
      )} as the highest current commercial offer. Review the highlighted commercial evidence below.`,
    };
  }

  return null;
}
