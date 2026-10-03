import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  RFQOwnerQuotes,
  getBidSetPosition,
  isOwnerQuoteAwardEligible,
  isRfqDetailAwardAvailable,
} from "@/components/rfq-workspace/rfq-owner-quotes";
import { canReadIssuerCommercialQuotes } from "@/lib/procurement/rfq-commercial-read-authorization";
import { canDecideCompanyQuotes } from "@/lib/procurement/procurement-write-authorization";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

function membership(
  overrides: Partial<OrganizationMembership> = {},
): OrganizationMembership {
  return {
    id: "membership-1",
    userId: "user-1",
    companyId: COMPANY_ID,
    workspaceRole: "member",
    procurementFunction: "none",
    membershipType: "employee",
    membershipStatus: "active",
    jobTitle: null,
    jobFunction: null,
    invitedBy: null,
    joinedAt: null,
    ...overrides,
  };
}

function resolveRfqAwardAvailable({
  issuerMembership,
  rfqStatus = "open",
  commercialEvaluationUnlocked = true,
  awardedQuoteId = null,
  awardedAt = null,
}: {
  issuerMembership: OrganizationMembership | null;
  rfqStatus?: string | null;
  commercialEvaluationUnlocked?: boolean;
  awardedQuoteId?: string | null;
  awardedAt?: string | null;
}) {
  return isRfqDetailAwardAvailable({
    issuerCanDecideQuotes: canDecideCompanyQuotes(
      issuerMembership,
      COMPANY_ID,
    ),
    rfqStatus,
    commercialEvaluationUnlocked,
    awardedQuoteId,
    awardedAt,
  });
}

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const ownerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const workspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const detail = readSource("src/app/rfq/[slug]/page.tsx");
const compare = readSource("src/app/rfq/[slug]/compare/page.tsx");
const identity = readSource(
  "src/lib/procurement/rfq-owner-supplier-identity.ts",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const award = readSource("src/components/award-contract-button.tsx");
const awardRoute = readSource("src/app/api/award-contract/route.ts");
const metric = readSource(
  "src/components/rfq-workspace/rfq-executive-metric-wrapping.test.ts",
);

describe("Task 24-RFQ-13 owner quote identity and readability", () => {
  it("uses the existing company_directory name instead of rank-derived supplier labels", () => {
    expect(detail).toContain(
      '.select("id, name, category, location, network_role")',
    );
    expect(detail).toContain('.from("company_directory")');
    expect(detail).toContain("supplierCompanies={supplierCompanies}");
    expect(detail).not.toContain(
      '.select("id, name, category, location, network_role, first_name',
    );
    expect(workspace).toContain("supplierCompanies={supplierCompanies}");
    expect(ownerQuotes).toContain("resolveRfqOwnerSupplierLabel");
    expect(ownerQuotes).toContain("quote.company_id");
    expect(ownerQuotes).toContain("rank: quote.rank");
    expect(ownerQuotes).not.toContain(
      "supplierLabel: `Supplier quote #${quote.rank}`",
    );
    expect(identity).toContain("company.name?.trim()");
    expect(identity).toContain("`Supplier quote #${rank}`");
    expect(identity).not.toContain("Named supplier");
    expect(identity).not.toContain("Unverified Supplier");
    expect(identity).not.toContain("first_name");
    expect(identity).not.toContain("last_name");
    expect(identity).not.toContain("user_id");
    expect(compare).toContain("supplierNames.get(quote.company_id)");
    expect(compare).toContain('.from("company_directory")');
  });

  it("does not change queries, award controls, scoring, or frozen RFQ regions", () => {
    expect(detail).toContain("buildCommercialIntelligence({");
    expect(detail).toContain("buildRfqSupplierRecommendationInput({");
    expect(detail).toContain("getRfqSupplierCompanyIds(scoredQuotes)");
    expect(comparison).toContain("AwardContractButton");
    expect(comparison).toContain("quoteId={quote.id}");
    expect(comparison).toContain("supplierLabel={quote.supplierLabel}");
    expect(comparison).toContain("{quote.rank}");
    expect(comparison).toContain('"Decision status · Requires Review"');
    expect(comparison).toContain("`Rank #${quote.rank}`");
    expect(award).toContain('fetch("/api/award-contract"');
    expect(ownerQuotes).not.toContain("award_rfq_quote");
    expect(ownerQuotes).not.toContain('.from("quotes")');
    expect(identity).not.toContain("createClient");
    expect(identity).not.toContain(".rpc(");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(metric).toContain("Task 24-RFQ-12 executive metric wrapping closeout");
  });

  it("separates post-deadline award availability from submission closure", () => {
    expect(detail).toContain(
      "const commercialEvaluationUnlocked = isRfqCommercialOpeningUnlocked({",
    );
    expect(detail).toContain("canDecideCompanyQuotes");
    expect(detail).toContain("sourcingMembership");
    expect(detail).toContain("issuerCanDecideQuotes:");
    expect(detail).toContain("isRfqDetailAwardAvailable({");
    expect(detail).toContain("rfqStatus: rfq.status,");
    expect(detail).toContain("rfqAwardAvailable={rfqAwardAvailable}");
    expect(detail).not.toContain("profile.role");
    expect(workspace).toContain("rfqAwardAvailable?: boolean;");
    expect(workspace).toContain("rfqAwardAvailable={rfqAwardAvailable}");
    expect(ownerQuotes).toContain("rfqAwardAvailable: boolean;");
    expect(ownerQuotes).toContain(
      'awarded={quotes.some((quote) => quote.decision === "awarded")}',
    );
    expect(ownerQuotes).toContain("isOwnerQuoteAwardEligible({");
    expect(ownerQuotes).not.toContain("awarded={!isOpen");
    expect(ownerQuotes).not.toContain("isOpen &&");
    expect(awardRoute).toContain("award_rfq_quote");
    expect(awardRoute).not.toContain("profile.role");
  });

  it.each([
    [false, "open", true, null, null],
    [true, null, true, null, null],
    [true, undefined, true, null, null],
    [true, "", true, null, null],
    [true, "   ", true, null, null],
    [true, "unknown", true, null, null],
    [true, "closed", true, null, null],
    [true, "cancelled", true, null, null],
    [true, "awarded", true, null, null],
    [true, "open", false, null, null],
    [true, "open", true, "quote-awarded", null],
    [true, "open", true, null, "2026-09-22T20:00:01.000Z"],
  ])(
    "fails award availability for decide=%s status=%s opening=%s quote=%s timestamp=%s",
    (
      issuerCanDecideQuotes,
      rfqStatus,
      commercialEvaluationUnlocked,
      awardedQuoteId,
      awardedAt,
    ) => {
      expect(
        isRfqDetailAwardAvailable({
          issuerCanDecideQuotes: Boolean(issuerCanDecideQuotes),
          rfqStatus,
          commercialEvaluationUnlocked: Boolean(commercialEvaluationUnlocked),
          awardedQuoteId: awardedQuoteId ? String(awardedQuoteId) : null,
          awardedAt: awardedAt ? String(awardedAt) : null,
        }),
      ).toBe(false);
    },
  );

  it("allows owner/admin decision permission with open, unlocked, unawarded RFQ", () => {
    expect(
      isRfqDetailAwardAvailable({
        issuerCanDecideQuotes: true,
        rfqStatus: "open",
        commercialEvaluationUnlocked: true,
        awardedQuoteId: null,
        awardedAt: null,
      }),
    ).toBe(true);
  });

  it("allows owner/admin issuer members and blocks buyer/viewer for post-opening award CTA", () => {
    expect(
      resolveRfqAwardAvailable({
        issuerMembership: membership({ workspaceRole: "owner" }),
      }),
    ).toBe(true);
    expect(
      resolveRfqAwardAvailable({
        issuerMembership: membership({ workspaceRole: "admin" }),
      }),
    ).toBe(true);
    expect(
      resolveRfqAwardAvailable({
        issuerMembership: membership({
          workspaceRole: "member",
          procurementFunction: "buyer",
        }),
      }),
    ).toBe(false);
    expect(
      resolveRfqAwardAvailable({
        issuerMembership: membership({
          workspaceRole: "viewer",
          procurementFunction: "buyer",
        }),
      }),
    ).toBe(false);
    expect(
      resolveRfqAwardAvailable({
        issuerMembership: membership({ workspaceRole: "owner" }),
        commercialEvaluationUnlocked: false,
      }),
    ).toBe(false);
    expect(
      resolveRfqAwardAvailable({
        issuerMembership: membership({ workspaceRole: "admin" }),
        awardedQuoteId: "quote-awarded",
      }),
    ).toBe(false);
  });

  it("preserves commercial-read vs award distinction for buyer and archived memberships", () => {
    const activeBuyer = membership({
      workspaceRole: "member",
      procurementFunction: "buyer",
    });
    const archivedOwner = membership({
      workspaceRole: "owner",
      membershipStatus: "archived",
    });
    const ordinaryMember = membership();

    expect(canReadIssuerCommercialQuotes(activeBuyer, COMPANY_ID)).toBe(true);
    expect(canDecideCompanyQuotes(activeBuyer, COMPANY_ID)).toBe(false);
    expect(
      resolveRfqAwardAvailable({ issuerMembership: activeBuyer }),
    ).toBe(false);

    expect(canReadIssuerCommercialQuotes(archivedOwner, COMPANY_ID)).toBe(true);
    expect(canDecideCompanyQuotes(archivedOwner, COMPANY_ID)).toBe(false);
    expect(
      resolveRfqAwardAvailable({ issuerMembership: archivedOwner }),
    ).toBe(false);

    expect(canReadIssuerCommercialQuotes(ordinaryMember, COMPANY_ID)).toBe(
      false,
    );
    expect(canDecideCompanyQuotes(ordinaryMember, COMPANY_ID)).toBe(false);

    expect(detail).toContain("canReadIssuerCommercialQuotes");
    expect(detail).toContain("getWorkspaceMembershipForUserCompany");
    expect(detail).toContain(
      "isOwner && commercialReadAuthorized && commercialEvaluationUnlocked",
    );
    expect(compare).toContain("canReadIssuerCommercialQuotes");
    expect(compare.indexOf("canReadIssuerCommercialQuotes")).toBeLessThan(
      compare.indexOf('.from("quotes")'),
    );
  });

  it.each([
    [true, null, false, true],
    [true, "approved", false, true],
    [false, "approved", false, false],
    [true, "rejected", false, false],
    [true, "awarded", false, false],
    [true, "approved", true, false],
  ])(
    "maps owner quote award eligibility from availability %s, decision %s, stale %s to %s",
    (
      rfqAwardAvailable,
      decision,
      requiresMaterialRevalidation,
      expected,
    ) => {
      expect(
        isOwnerQuoteAwardEligible({
          rfqAwardAvailable,
          decision,
          requiresMaterialRevalidation,
        }),
      ).toBe(expected);
    },
  );

  it("executes the owner quote mapping before passing comparison props", () => {
    type OwnerQuote = Parameters<typeof RFQOwnerQuotes>[0]["quotes"][number];
    type ComparisonProps = {
      awarded: boolean;
      quotes: Array<{
        id: string;
        canAward: boolean;
      }>;
    };

    const ownerQuote = (
      id: string,
      decision: string | null,
      requiresMaterialRevalidation = false,
    ): OwnerQuote => ({
      id,
      company_id: `company-${id}`,
      amountNumber: 100_000,
      timeline: "30 days",
      validity_days: 30,
      decision,
      rank: 1,
      priceScore: 90,
      timelineScore: 80,
      riskScore: 70,
      performanceScore: 75,
      totalScore: 82,
      awardConfidence: 82,
      riskLevel: "Low",
      budgetVariance: 0,
      lowestBidVariance: 0,
      requiresMaterialRevalidation,
    });
    const renderOwnerQuotes = (
      quotes: OwnerQuote[],
      rfqAwardAvailable: boolean,
    ) =>
      RFQOwnerQuotes({
        rfqTitle: "Award mapping contract",
        quotes,
        recommendedQuoteId: null,
        lowestAmount: 100_000,
        highestAmount: 100_000,
        averageBid: 100_000,
        rfqAwardAvailable,
      }).props as ComparisonProps;

    const eligibleProps = renderOwnerQuotes(
      [
        ownerQuote("pending", null),
        ownerQuote("approved", "approved"),
        ownerQuote("rejected", "rejected"),
        ownerQuote("stale", "approved", true),
      ],
      true,
    );
    const eligibilityById = new Map(
      eligibleProps.quotes.map((quote) => [quote.id, quote.canAward]),
    );

    expect(eligibleProps.awarded).toBe(false);
    expect(eligibilityById.get("pending")).toBe(true);
    expect(eligibilityById.get("approved")).toBe(true);
    expect(eligibilityById.get("rejected")).toBe(false);
    expect(eligibilityById.get("stale")).toBe(false);

    const unavailableProps = renderOwnerQuotes(
      [ownerQuote("closed-submission", "approved")],
      false,
    );

    expect(unavailableProps.quotes[0]?.canAward).toBe(false);
    expect(unavailableProps.awarded).toBe(false);

    const awardedProps = renderOwnerQuotes(
      [ownerQuote("awarded", "awarded")],
      true,
    );

    expect(awardedProps.quotes[0]?.canAward).toBe(false);
    expect(awardedProps.awarded).toBe(true);
  });

  it.each([
    [100_000, 100_000, "At decision-ready quote average"],
    [90_000, 100_000, "Strong relative quote position"],
    [95_000, 100_000, "Below decision-ready quote average"],
    [105_000, 100_000, "Above decision-ready quote average"],
    [111_000, 100_000, "High relative cost position"],
    [100_000, 0, "Quote-set position pending"],
    [0, 100_000, "Quote-set position pending"],
  ])(
    "classifies amount %s against average %s as %s",
    (recommendedAmount, averageBid, expected) => {
      expect(getBidSetPosition({ recommendedAmount, averageBid })).toBe(
        expected,
      );
    },
  );

  it("wraps canonical supplier identity at word boundaries without nested panels", () => {
    expect(comparison).toContain("whitespace-normal");
    expect(comparison).toContain("text-pretty");
    expect(comparison).toContain("min-w-0");
    expect(comparison).toContain("@container");
    expect(comparison).not.toContain("break-words");
    expect(comparison).not.toContain("break-all");
    expect(comparison).not.toContain("overflow-wrap:anywhere");
    expect(comparison).not.toContain("[overflow-wrap:anywhere]");
    expect(ownerQuotes).not.toContain("ExecutivePanel");
    expect(ownerQuotes).toContain("embedded");
    expect(visualQa).toContain('data-rfq-owner-quote-identity-shell-width="1110"');
    expect(visualQa).toContain("owner quote identity wrapping");
    expect(visualQa).toContain(
      "Harbor Steel Co. North American Refrigeration Division",
    );
    expect(visualQa).toContain("supplierCompanies={ownerSupplierCompanies}");
    expect(visualQa).toContain("scoredQuotes={ownerIdentityQuotes}");
    expect(visualQa).toContain("isOwner");
    expect(visualQa).toContain('company_id: "harbor-steel"');
  });
});
