import {
  calculateWeightedScore,
} from "@/lib/executive/executive-scoring";

const DIGITAL_MATURITY_WEIGHTS = {
  procurementMaturity: 0.45,
  dataQuality: 0.25,
  supplierEngagement: 0.2,
  classification: 0.1,
} as const;

export function calculateDigitalMaturity(
  procurementMaturityScore: number,
  dataQualityScore: number,
  supplierEngagementScore: number,
  constructionClassificationScore: number,
): number {
  return calculateWeightedScore([
    {
      value: procurementMaturityScore,
      weight: DIGITAL_MATURITY_WEIGHTS.procurementMaturity,
    },
    {
      value: dataQualityScore,
      weight: DIGITAL_MATURITY_WEIGHTS.dataQuality,
    },
    {
      value: supplierEngagementScore,
      weight: DIGITAL_MATURITY_WEIGHTS.supplierEngagement,
    },
    {
      value: constructionClassificationScore,
      weight: DIGITAL_MATURITY_WEIGHTS.classification,
    },
  ]);
}