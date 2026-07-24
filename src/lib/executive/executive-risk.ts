import type {
  ExecutiveIntelligenceInput,
  ExecutiveReadiness,
  ExecutiveRisk,
  ExecutiveSupplierRecommendationResult,
} from "@/lib/executive/executive-types";

function addUniqueRisk(
  risks: ExecutiveRisk[],
  risk: ExecutiveRisk,
): void {
  const alreadyExists = risks.some(
    (existingRisk) =>
      existingRisk.title === risk.title &&
      existingRisk.summary === risk.summary,
  );

  if (!alreadyExists) {
    risks.push(risk);
  }
}

export function buildExecutiveRisks(
  {
    recommendedQuote,
    quoteCount,
    documentCount,
    addendaCount,
  }: ExecutiveIntelligenceInput,
  readiness: ExecutiveReadiness,
  supplierRecommendation: ExecutiveSupplierRecommendationResult,
): ExecutiveRisk[] {
  const risks: ExecutiveRisk[] = [];

  if (readiness.tone !== "success") {
    addUniqueRisk(risks, {
      title: "Decision Readiness",
      severity: readiness.tone,
      summary: readiness.recommendation,
    });
  }

  if (quoteCount < 3) {
    addUniqueRisk(risks, {
      title: "Supplier Competition",
      severity: quoteCount === 0 ? "risk" : "warning",
      summary:
        quoteCount === 0
          ? "No supplier submissions are available, preventing credible commercial comparison and award validation."
          : "Supplier participation is limited and may constrain commercial leverage and comparative confidence.",
    });
  }

  if (documentCount === 0) {
    addUniqueRisk(risks, {
      title: "Documentation",
      severity: "risk",
      summary:
        "The RFQ document package is incomplete and may increase scope, commercial, and execution uncertainty.",
    });
  }

  if (addendaCount === 0) {
    addUniqueRisk(risks, {
      title: "Governance",
      severity: "info",
      summary:
        "No addenda have been issued. Confirm that supplier clarifications have either not been required or are fully governed through the RFQ workflow.",
    });
  }

  const recommendedSupplier =
    supplierRecommendation.recommendedSupplier;

  if (recommendedSupplier) {
    recommendedSupplier.risks.forEach((supplierRisk) => {
      addUniqueRisk(risks, supplierRisk);
    });
  } else if (
    recommendedQuote &&
    recommendedQuote.riskLevel.toLowerCase() !== "low"
  ) {
    addUniqueRisk(risks, {
      title: "Supplier Risk",
      severity: "warning",
      summary: `The current recommended quote is assessed as ${recommendedQuote.riskLevel.toLowerCase()} risk and requires executive validation.`,
    });
  }

  if (
    supplierRecommendation.availability ===
    "insufficient_data"
  ) {
    addUniqueRisk(risks, {
      title: "Supplier Evidence Coverage",
      severity: "warning",
      summary: supplierRecommendation.recommendation,
    });
  }

  if (
    supplierRecommendation.availability ===
    "not_operational"
  ) {
    addUniqueRisk(risks, {
      title: "Supplier Intelligence Availability",
      severity: "info",
      summary: supplierRecommendation.recommendation,
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: "Executive Assessment",
      severity: "success",
      summary:
        "No material executive procurement risks have been identified from the currently available evidence.",
    });
  }

  return risks;
}