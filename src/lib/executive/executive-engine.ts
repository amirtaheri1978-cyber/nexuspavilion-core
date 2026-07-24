import { buildExecutiveActions } from "@/lib/executive/executive-actions";
import { buildExecutiveBoard } from "@/lib/executive/executive-board";
import { buildExecutiveNegotiation } from "@/lib/executive/executive-negotiation";
import { buildExecutiveReadiness } from "@/lib/executive/executive-readiness";
import {
  buildExecutiveRecommendation,
  buildExecutiveSupplierRecommendation,
  buildUnavailableSupplierRecommendation,
} from "@/lib/executive/executive-recommendation";
import { buildExecutiveRisks } from "@/lib/executive/executive-risk";
import { buildExecutiveScenarios } from "@/lib/executive/executive-scenarios";
import { buildExecutiveSummary } from "@/lib/executive/executive-summary";

import type {
  ExecutiveIntelligence,
  ExecutiveIntelligenceInput,
} from "@/lib/executive/executive-types";

export function buildExecutiveIntelligence(
  input: ExecutiveIntelligenceInput,
): ExecutiveIntelligence {
  const readiness = buildExecutiveReadiness(input);

  const recommendation =
    buildExecutiveRecommendation(input);

  const supplierRecommendation =
    input.supplierRecommendationInput
      ? buildExecutiveSupplierRecommendation(
          input.supplierRecommendationInput,
        )
      : buildUnavailableSupplierRecommendation();

  const negotiation =
    buildExecutiveNegotiation(input);

  const board = buildExecutiveBoard(
    input,
    readiness,
  );

  const risks = buildExecutiveRisks(
    input,
    readiness,
    supplierRecommendation,
  );

  const actions = buildExecutiveActions(
    input,
    readiness,
    recommendation,
    supplierRecommendation,
  );

  const scenarios = buildExecutiveScenarios(
    input,
    readiness,
    recommendation,
    supplierRecommendation,
    negotiation,
    board,
  );

  const summary = buildExecutiveSummary(
    input,
    readiness,
    board,
  );

  return {
    readiness,
    recommendation,
    supplierRecommendation,
    negotiation,
    risks,
    scenarios,
    actions,
    board,
    summary,
  };
}