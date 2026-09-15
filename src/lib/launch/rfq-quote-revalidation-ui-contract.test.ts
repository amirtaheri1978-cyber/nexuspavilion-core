import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const quoteRoute = readSource("src/app/api/quotes/route.ts");
const submitPage = readSource("src/app/rfq/[slug]/submit/page.tsx");
const submitWorkspace = readSource(
  "src/components/rfq-workspace/rfq-submit-workspace.tsx",
);
const detailPage = readSource("src/app/rfq/[slug]/page.tsx");
const comparePage = readSource("src/app/rfq/[slug]/compare/page.tsx");
const supplierQuotes = readSource(
  "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
);
const executiveActions = readSource(
  "src/components/rfq-workspace/rfq-executive-actions.tsx",
);
const ownerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const intelligence = readSource(
  "src/lib/procurement/rfq-commercial-intelligence.ts",
);

describe("18-26B Quote revalidation application contract", () => {
  it("exposes only the bounded respondent revalidation RPC through PATCH", () => {
    expect(quoteRoute).toContain("export async function PATCH(request: Request)");
    expect(quoteRoute).toContain('supabase.rpc("revalidate_rfq_quote"');
    expect(quoteRoute).toContain("p_quote_id: quoteId");
    expect(quoteRoute).toContain("p_action: action");
    expect(quoteRoute).toContain("p_amount: amount");
    expect(quoteRoute).toContain("p_timeline: timeline");
    expect(quoteRoute).toContain("p_message: message");
    expect(quoteRoute).toContain("p_validity_days: validityDays");
    expect(quoteRoute).toContain('action === "reconfirmed"');
    expect(quoteRoute).toContain('action === "resubmitted"');

    const patchStart = quoteRoute.indexOf("export async function PATCH");
    const postStart = quoteRoute.indexOf("export async function POST", patchStart);
    const patch = quoteRoute.slice(patchStart, postStart);

    expect(patch).not.toContain("body.companyId");
    expect(patch).not.toContain("body.rfqId");
    expect(patch).not.toContain("body.addendumId");
    expect(patch).not.toContain("body.userId");
  });

  it("projects respondent stale/current state from exact 18-26A evidence", () => {
    expect(submitPage).toContain('from "@/lib/procurement/rfq-quote-revalidation-state"');
    expect(submitPage).toContain('.from("rfq_quote_revalidations")');
    expect(submitPage).toContain("affected_fields");
    expect(submitPage).toContain("amendment_before");
    expect(submitPage).toContain("amendment_after");
    expect(submitPage).toContain("amendment_reason");
    expect(submitPage).toContain("attachQuoteMaterialRevalidationState");
    expect(submitPage).toContain("hasOutstandingRequiredAcknowledgement");
  });

  it("provides explicit reconfirmation and revised-resubmission respondent actions", () => {
    expect(submitWorkspace).toContain('method: "PATCH"');
    expect(submitWorkspace).toContain('action: "reconfirmed"');
    expect(submitWorkspace).toContain('action: "resubmitted"');
    expect(submitWorkspace).toContain("Reconfirm existing quote");
    expect(submitWorkspace).toContain("Resubmit revised quote");
    expect(submitWorkspace).toContain("Quote validity");
    expect(submitWorkspace).toContain("validity_days: validityDays");
    expect(submitWorkspace).toContain("hasRevisedCommercialTerms");
    expect(submitWorkspace).toContain('replace(/[^\\d.]/g, "")');
    expect(submitWorkspace).toContain("decimalPart === undefined");
    expect(submitWorkspace).toContain("Requires Review");
    expect(submitWorkspace).toContain("Material amendment review required");
    expect(submitWorkspace).toContain("hasOutstandingRequiredAcknowledgement");
  });

  it("preserves R-50 by loading issuer-linked Quote evidence only after commercial opening", () => {
    expect(detailPage).toContain(
      "const loadIssuerQuoteGovernanceEvidence =\n    isOwner && commercialEvaluationUnlocked;",
    );
    expect(detailPage).toContain("loadIssuerQuoteGovernanceEvidence\n      ? supabase");
    expect(detailPage).toContain('.from("rfq_quote_revalidations")');
    expect(detailPage).toContain('.from("rfq_addendum_acknowledgements")');
    expect(detailPage).toContain(
      "const loadIssuerQuoteRows = isOwner && commercialEvaluationUnlocked;",
    );
    expect(detailPage).toContain(
      "const loadIssuerQuoteCount = isOwner && !commercialEvaluationUnlocked;",
    );

    const compareOpening = comparePage.indexOf(
      "if (commercialEvaluationUnlocked) {",
    );
    const compareCount = comparePage.indexOf(
      'supabase.rpc(\n      "count_rfq_quote_submissions"',
      compareOpening,
    );
    const compareEvidence = comparePage.indexOf(
      '.from("rfq_quote_revalidations")',
      compareOpening,
    );

    expect(compareOpening).toBeGreaterThan(-1);
    expect(compareEvidence).toBeGreaterThan(compareOpening);
    expect(compareCount).toBeGreaterThan(compareEvidence);
  });

  it("keeps stale commercial evidence visible but removes recommendation and award eligibility", () => {
    expect(intelligence).toContain("requiresMaterialRevalidation?: boolean");
    expect(intelligence).toContain(
      "quoteList.filter((quote) => !quote.requiresMaterialRevalidation)",
    );
    expect(intelligence).toContain(
      "quoteList.filter((quote) => quote.requiresMaterialRevalidation)",
    );
    expect(intelligence).toContain(
      "quoteList: decisionReadyQuoteList",
    );
    expect(intelligence).toContain(
      "const averageBid = getAverageBid(decisionReadyAmounts)",
    );
    expect(intelligence).toContain(
      "decisionReadyScoredQuotes[0]",
    );
    expect(detailPage).toContain(
      "const decisionReadyScoredQuotes = scoredQuotes.filter(",
    );
    expect(detailPage).toContain("scoredQuotes: decisionReadyScoredQuotes");
    expect(ownerQuotes).toContain("requiresMaterialRevalidation");
    expect(ownerQuotes).toContain("!requiresMaterialRevalidation");
    expect(comparePage).toContain("requiresMaterialRevalidation: Boolean(");
    expect(comparePage).toContain("!quote.requiresMaterialRevalidation");
    expect(comparePage).toContain("decisionReadyQuoteCount");
    expect(comparePage).toContain("Average decision-ready quote");
    expect(comparePage).toContain("Decision-ready quote spread");
    expect(comparison).toContain("Reconfirmation required");
    expect(comparison).toContain("Requires Review");
  });

  it("surfaces the stale state in respondent workspace navigation and quote evidence", () => {
    expect(executiveActions).toContain("quoteRequiresReview");
    expect(executiveActions).toContain("Review and reconfirm quote");
    expect(executiveActions).toContain("Quote Review & Reconfirmation");
    expect(supplierQuotes).toContain("requiresMaterialRevalidation");
    expect(supplierQuotes).toContain("Review and reconfirm quote");
    expect(supplierQuotes).toContain("Requires Review");
    expect(detailPage).toContain('"Requires Review"');
  });
});
