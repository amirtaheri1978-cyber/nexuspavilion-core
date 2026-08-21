import { describe, expect, it } from "vitest";

import { getSafeNextPath } from "@/lib/auth/login-continuation";
import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_NAVY,
  EXECUTIVE_SIDEBAR_WIDTH_PX,
} from "@/lib/design-system/executive-contract";
import { resolveExecutiveScoreTone } from "@/lib/executive/executive-recommendation-policy";
import {
  getAppBreadcrumbs,
  getAppShellKind,
  flattenNavigation,
} from "@/lib/navigation/application-nav";
import {
  buildCommercialIntelligence,
  type Quote,
} from "@/lib/procurement/rfq-commercial-intelligence";
import {
  SUPPLIER_EVALUATION_WEIGHTS,
  getAwardConfidence,
} from "@/lib/procurement/rfq-commercial-scoring";
import { buildRfqExecutiveOpportunityIntelligence } from "@/lib/procurement/rfq-executive-opportunity-intelligence";
import { resolveRfqOwnerSupplierLabel } from "@/lib/procurement/rfq-owner-supplier-identity";
import {
  canAwardVerifiedCompanyContract,
  canCreateCompanyRfq,
  canInviteCompanySuppliers,
  canSubmitCompanyQuote,
} from "@/lib/procurement/procurement-write-authorization";
import { APPROVED_VENDOR_DOMAIN_AVAILABLE } from "@/lib/procurement/supplier-domain-availability";

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

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "quote-1",
    company_id: "supplier-1",
    user_id: "user-1",
    amount: 100_000,
    timeline: "6 months",
    message: "Healthcare experience with quality assurance coverage.",
    decision: null,
    validity_days: 120,
    ...overrides,
  };
}

describe("Task 25 launch-candidate cross-feature invariants", () => {
  it("keeps RFQ invite chromeless, RFQ workspace in the application shell, and submit breadcrumbs slug-safe", () => {
    expect(getAppShellKind("/rfq/invite/opaque-token")).toBe("chromeless");
    expect(getAppShellKind("/rfq/harbor-package")).toBe("application");
    expect(getAppShellKind("/rfq/harbor-package/submit")).toBe("application");
    expect(getAppShellKind("/rfq/harbor-package/compare")).toBe("application");
    expect(getAppShellKind("/login")).toBe("chromeless");
    expect(getAppShellKind("/")).toBe("public");

    const submit = getAppBreadcrumbs("/rfq/harbor-package/submit");
    expect(submit.map((crumb) => crumb.label)).toEqual([
      "RFQ & Sourcing",
      "Opportunity",
      "Submit Quote",
    ]);
    expect(submit.map((crumb) => crumb.href)).toEqual([
      "/rfq",
      "/rfq/harbor-package",
      "/rfq/harbor-package/submit",
    ]);
    expect(submit.map((crumb) => crumb.label).join(" ")).not.toContain(
      "harbor-package",
    );

    expect(getAppBreadcrumbs("/rfq/invite/opaque-token")).toEqual([]);
    expect(getAppBreadcrumbs("/company/harbor-steel/submit")).toEqual([]);

    const ownerHrefs = flattenNavigation("owner").map((item) => item.href);
    expect(ownerHrefs).toContain("/rfq");
    expect(ownerHrefs).toContain("/company/settings");
    expect(ownerHrefs).not.toContain("/company/harbor-steel/submit");
    expect(ownerHrefs.some((href) => href.endsWith("/submit"))).toBe(false);
    expect(ownerHrefs).not.toContain("/pricing");
  });

  it("continues login onto RFQ routes while rejecting open redirects", () => {
    expect(getSafeNextPath("/rfq/harbor-package/submit")).toBe(
      "/rfq/harbor-package/submit",
    );
    expect(getSafeNextPath("/rfq/invite/opaque-token")).toBe(
      "/rfq/invite/opaque-token",
    );
    expect(getSafeNextPath("/dashboard")).toBe("/dashboard");
    expect(getSafeNextPath("https://evil.example/phish")).toBe("/dashboard");
    expect(getSafeNextPath("//evil.example/login")).toBe("/dashboard");
  });

  it("separates buyer RFQ writes from supplier quote writes and keeps award behind verified ownership", () => {
    const buyer = membership({ procurementFunction: "buyer" });
    const supplier = membership({ procurementFunction: "supplier" });
    const owner = membership({
      workspaceRole: "owner",
      procurementFunction: "buyer",
    });

    expect(canCreateCompanyRfq(buyer, COMPANY_ID)).toBe(true);
    expect(canInviteCompanySuppliers(buyer, COMPANY_ID)).toBe(true);
    expect(canSubmitCompanyQuote(buyer, COMPANY_ID)).toBe(false);

    expect(canSubmitCompanyQuote(supplier, COMPANY_ID)).toBe(true);
    expect(canCreateCompanyRfq(supplier, COMPANY_ID)).toBe(false);
    expect(canInviteCompanySuppliers(supplier, COMPANY_ID)).toBe(false);

    expect(
      canAwardVerifiedCompanyContract({
        membership: owner,
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(true);
    expect(
      canAwardVerifiedCompanyContract({
        membership: owner,
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "provisional",
      }),
    ).toBe(false);
    expect(
      canAwardVerifiedCompanyContract({
        membership: supplier,
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(false);
  });

  it("ranks commercial quotes with canonical supplier identity and executive opportunity wrapping", () => {
    const intelligence = buildCommercialIntelligence({
      quoteList: [
        quote({
          id: "low",
          company_id: "company-harbor",
          amount: 90_000,
        }),
        quote({
          id: "high",
          company_id: "company-atlas",
          amount: 120_000,
          timeline: "24 months",
        }),
      ],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(intelligence.recommendedQuote?.id).toBe("low");
    expect(intelligence.lowestAmount).toBe(90_000);
    expect(intelligence.scoredQuotes[0]?.rank).toBe(1);
    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: "company-harbor",
        rank: intelligence.scoredQuotes[0]?.rank ?? 0,
        supplierNameById: new Map([
          ["company-harbor", "Harbor Steel Co."],
        ]),
      }),
    ).toBe("Harbor Steel Co.");
    expect(
      resolveRfqOwnerSupplierLabel({
        companyId: "missing",
        rank: 2,
        supplierNameById: new Map(),
      }),
    ).toBe("Supplier quote #2");

    const weightTotal = Object.values(SUPPLIER_EVALUATION_WEIGHTS).reduce(
      (total, weight) => total + weight,
      0,
    );
    expect(weightTotal).toBeCloseTo(1, 10);
    expect(getAwardConfidence(93)).toBe(93);
    expect(resolveExecutiveScoreTone(93)).toBe("success");

    const opportunities = buildRfqExecutiveOpportunityIntelligence({
      isOwner: true,
      potentialSavings: intelligence.potentialSavings,
      commercialEvaluationUnlocked: true,
      quoteCount: 2,
      documentCount: 4,
      recommendedAwardConfidence: intelligence.recommendedQuote
        ? getAwardConfidence(intelligence.recommendedQuote.totalScore)
        : null,
    });

    expect(opportunities.intelligence[0]?.rank).toBe(1);
    expect(opportunities.intelligence.some((item) => item.title === "Commercial Savings Opportunity")).toBe(
      true,
    );
  });

  it("keeps Task 22 CTA/shell tokens and carries Task 24 deferred flags without treating them as live launch routes", () => {
    expect(EXECUTIVE_NAVY).toBe("#07111F");
    expect(EXECUTIVE_SIDEBAR_WIDTH_PX).toBe(330);
    expect(EXECUTIVE_CTA_PRIMARY).toContain("min-h-14");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:scale");
    expect(EXECUTIVE_CTA_PRIMARY).toContain("focus-visible:ring-2");
    expect(APPROVED_VENDOR_DOMAIN_AVAILABLE).toBe(false);
  });
});
