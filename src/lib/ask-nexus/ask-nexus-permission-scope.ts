/**
 * Ask Nexus RFQ permission scope — narrow projection of authoritative capabilities.
 *
 * Inherits caller-supplied RfqCapabilities and may only narrow them.
 * Never widens access, never recomputes roles, and never loads RFQ data.
 */

import type { RfqCapabilities } from "@/lib/procurement/rfq-access-contract";

export type AskNexusRfqPermissionInput = Pick<
  RfqCapabilities,
  | "participantRole"
  | "canManageRfq"
  | "canViewCommercialEvaluation"
  | "canSubmitQuote"
  | "canViewOwnSubmission"
  | "canViewExecutiveIntelligence"
  | "canViewRecommendedAwardPath"
>;

export type AskNexusRfqPermissionScope = {
  participantRole: "issuer" | "respondent";
  canExplainRfq: true;
  canExplainOwnSubmission: boolean;
  canExplainExecutiveIntelligence: boolean;
  canExplainCommercialEvaluation: boolean;
  canExplainRecommendedAwardPath: boolean;
  canExplainCompetitorData: false;
};

/**
 * Project Ask Nexus RFQ help scopes from authoritative RFQ capabilities.
 * Respondent issuer-style flags fail closed. Competitor-data scope is never granted.
 */
export function resolveAskNexusRfqPermissionScope(
  capabilities: AskNexusRfqPermissionInput,
): AskNexusRfqPermissionScope | null {
  const participantRole = capabilities.participantRole;
  if (participantRole !== "issuer" && participantRole !== "respondent") {
    return null;
  }

  const isIssuer = participantRole === "issuer";
  const isRespondent = participantRole === "respondent";

  return {
    participantRole,
    canExplainRfq: true,
    canExplainOwnSubmission:
      isRespondent && capabilities.canViewOwnSubmission === true,
    canExplainExecutiveIntelligence:
      isIssuer && capabilities.canViewExecutiveIntelligence === true,
    canExplainCommercialEvaluation:
      isIssuer && capabilities.canViewCommercialEvaluation === true,
    canExplainRecommendedAwardPath:
      isIssuer && capabilities.canViewRecommendedAwardPath === true,
    canExplainCompetitorData: false,
  };
}
