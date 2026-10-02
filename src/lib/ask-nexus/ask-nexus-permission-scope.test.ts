import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusRfqPermissionScope,
  type AskNexusRfqPermissionInput,
} from "@/lib/ask-nexus/ask-nexus-permission-scope";
import {
  buildRfqCapabilities,
  type RfqCapabilities,
} from "@/lib/procurement/rfq-access-contract";

const scopeSource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-permission-scope.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function assertIssuerOnlyScopesClosed(
  scope: NonNullable<ReturnType<typeof resolveAskNexusRfqPermissionScope>>,
) {
  expect(scope.canExplainExecutiveIntelligence).toBe(false);
  expect(scope.canExplainCommercialEvaluation).toBe(false);
  expect(scope.canExplainRecommendedAwardPath).toBe(false);
  expect(scope.canExplainCompetitorData).toBe(false);
}

describe("ask nexus rfq permission scope", () => {
  it("blocks issuer intelligence for respondent open RFQ with no quote", () => {
    const capabilities = buildRfqCapabilities({
      participantRole: "respondent",
      isOpen: true,
      blindBiddingEnabled: false,
      commercialEvaluationUnlocked: false,
      hasMyQuote: false,
      hasRecommendedQuote: false,
    });

    expect(capabilities.canSubmitQuote).toBe(true);

    const scope = resolveAskNexusRfqPermissionScope(capabilities);
    expect(scope).toMatchObject({
      participantRole: "respondent",
      canExplainRfq: true,
      canExplainOwnSubmission: true,
    });
    assertIssuerOnlyScopesClosed(scope!);
  });

  it("allows respondent own-submission explain when authoritative capability allows", () => {
    const capabilities = buildRfqCapabilities({
      participantRole: "respondent",
      isOpen: true,
      blindBiddingEnabled: false,
      commercialEvaluationUnlocked: false,
      hasMyQuote: true,
      hasRecommendedQuote: false,
    });

    expect(capabilities.canViewOwnSubmission).toBe(true);
    expect(capabilities.canSubmitQuote).toBe(false);

    const scope = resolveAskNexusRfqPermissionScope(capabilities);
    expect(scope?.canExplainOwnSubmission).toBe(true);
    assertIssuerOnlyScopesClosed(scope!);
  });

  it("fails closed when respondent capabilities include issuer-style flags", () => {
    const malformed: AskNexusRfqPermissionInput = {
      participantRole: "respondent",
      canManageRfq: true,
      canViewCommercialEvaluation: true,
      canSubmitQuote: true,
      canViewOwnSubmission: true,
      canViewExecutiveIntelligence: true,
      canViewRecommendedAwardPath: true,
    };

    const scope = resolveAskNexusRfqPermissionScope(malformed);
    expect(scope?.participantRole).toBe("respondent");
    expect(scope?.canExplainOwnSubmission).toBe(true);
    assertIssuerOnlyScopesClosed(scope!);
  });

  it("follows issuer executive capability before commercial opening", () => {
    const capabilities = buildRfqCapabilities({
      participantRole: "issuer",
      isOpen: true,
      blindBiddingEnabled: true,
      commercialEvaluationUnlocked: false,
      hasMyQuote: false,
      hasRecommendedQuote: false,
    });

    expect(capabilities.canViewExecutiveIntelligence).toBe(true);
    expect(capabilities.canViewCommercialEvaluation).toBe(false);
    expect(capabilities.canViewRecommendedAwardPath).toBe(false);

    const scope = resolveAskNexusRfqPermissionScope(capabilities);
    expect(scope).toMatchObject({
      participantRole: "issuer",
      canExplainRfq: true,
      canExplainOwnSubmission: false,
      canExplainExecutiveIntelligence: true,
      canExplainCommercialEvaluation: false,
      canExplainRecommendedAwardPath: false,
      canExplainCompetitorData: false,
    });
  });

  it("follows issuer commercial and recommendation capabilities after opening", () => {
    const capabilities = buildRfqCapabilities({
      participantRole: "issuer",
      isOpen: true,
      blindBiddingEnabled: true,
      commercialEvaluationUnlocked: true,
      hasMyQuote: false,
      hasRecommendedQuote: true,
    });

    expect(capabilities.canViewCommercialEvaluation).toBe(true);
    expect(capabilities.canViewRecommendedAwardPath).toBe(true);

    const scope = resolveAskNexusRfqPermissionScope(capabilities);
    expect(scope).toMatchObject({
      canExplainExecutiveIntelligence: true,
      canExplainCommercialEvaluation: true,
      canExplainRecommendedAwardPath: true,
      canExplainCompetitorData: false,
    });
  });

  it("keeps recommendation explain false when no recommended quote exists", () => {
    const capabilities = buildRfqCapabilities({
      participantRole: "issuer",
      isOpen: true,
      blindBiddingEnabled: false,
      commercialEvaluationUnlocked: true,
      hasMyQuote: false,
      hasRecommendedQuote: false,
    });

    expect(capabilities.canViewCommercialEvaluation).toBe(true);
    expect(capabilities.canViewRecommendedAwardPath).toBe(false);

    const scope = resolveAskNexusRfqPermissionScope(capabilities);
    expect(scope?.canExplainCommercialEvaluation).toBe(true);
    expect(scope?.canExplainRecommendedAwardPath).toBe(false);
    expect(scope?.canExplainCompetitorData).toBe(false);
  });

  it("never widens issuer scopes beyond authoritative false capabilities", () => {
    const capabilities: RfqCapabilities = {
      participantRole: "issuer",
      canManageRfq: true,
      canViewBlindBiddingControl: false,
      canViewCommercialEvaluation: false,
      canInviteSuppliers: true,
      canSubmitQuote: false,
      canViewOwnSubmission: false,
      canViewExecutiveIntelligence: false,
      canViewRecommendedAwardPath: false,
    };

    const scope = resolveAskNexusRfqPermissionScope(capabilities);
    expect(scope).toMatchObject({
      canExplainExecutiveIntelligence: false,
      canExplainCommercialEvaluation: false,
      canExplainRecommendedAwardPath: false,
      canExplainCompetitorData: false,
    });
  });

  it("keeps generic competitor-data scope false for every role", () => {
    const respondent = resolveAskNexusRfqPermissionScope(
      buildRfqCapabilities({
        participantRole: "respondent",
        isOpen: true,
        blindBiddingEnabled: false,
        commercialEvaluationUnlocked: true,
        hasMyQuote: true,
        hasRecommendedQuote: true,
      }),
    );
    const issuer = resolveAskNexusRfqPermissionScope(
      buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: true,
        blindBiddingEnabled: false,
        commercialEvaluationUnlocked: true,
        hasMyQuote: false,
        hasRecommendedQuote: true,
      }),
    );

    expect(respondent?.canExplainCompetitorData).toBe(false);
    expect(issuer?.canExplainCompetitorData).toBe(false);
  });

  it("does not import data loaders, auth wideners, AI, or navigation", () => {
    expect(scopeSource).toContain(
      'from "@/lib/procurement/rfq-access-contract"',
    );
    expect(scopeSource).toContain("import type { RfqCapabilities }");
    expect(scopeSource).not.toContain("resolveRfqParticipantRole");
    expect(scopeSource).not.toContain("buildRfqCapabilities");
    expect(scopeSource).not.toContain("procurement-context-repository");
    expect(scopeSource).not.toContain("@/lib/supabase");
    expect(scopeSource).not.toContain("createClient");
    expect(scopeSource).not.toContain("workspace-permissions");
    expect(scopeSource).not.toContain("procurement-write-authorization");
    expect(scopeSource).not.toContain("workspace-context");
    expect(scopeSource).not.toContain("application-nav");
    expect(scopeSource).not.toContain("@/lib/ai");
    expect(scopeSource).not.toContain("openai");
    expect(scopeSource).not.toContain("fetch(");
    expect(scopeSource).not.toContain("useRouter");
    expect(scopeSource).not.toContain("router.push");
  });

  it("does not infer access from labels, text, dates, or mutations", () => {
    expect(scopeSource).not.toContain("pageLabel");
    expect(scopeSource).not.toContain("workflowLabel");
    expect(scopeSource).not.toContain("workspaceRole");
    expect(scopeSource).not.toContain("procurementFunction");
    expect(scopeSource).not.toContain("companyId");
    expect(scopeSource).not.toContain("deadline");
    expect(scopeSource).not.toContain("Date");
    expect(scopeSource).not.toContain("includes(");
    expect(scopeSource).not.toContain(".match(");
    expect(scopeSource).not.toContain("toLowerCase(");
    expect(scopeSource).not.toContain("consequential_action");
    expect(scopeSource).not.toContain("execute(");
    expect(scopeSource).not.toContain("competitorQuotes");
    expect(scopeSource).not.toContain("supplierQuotes");
  });
});
