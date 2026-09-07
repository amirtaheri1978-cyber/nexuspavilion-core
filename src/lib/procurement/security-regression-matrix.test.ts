import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  canExposeRfqBuyerExecutiveIntelligence,
  selectRfqDetailCommandMetrics,
  serializeRfqBuyerExecutiveIntelligenceForViewer,
} from "@/lib/procurement/rfq-detail-intelligence-boundary";
import { buildCommercialIntelligence } from "@/lib/procurement/rfq-commercial-intelligence";
import {
  buildRfqCapabilities,
  canRespondToRfqSourcing,
  resolveRfqParticipantRole,
  resolveSupplierRfqAccess,
  type ProcurementRfq,
} from "@/lib/procurement/rfq-access-contract";
import {
  canCreateCompanyRfq,
  canInviteCompanySuppliers,
  canSubmitCompanyQuote,
} from "@/lib/procurement/procurement-write-authorization";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const QUOTE_SELECT_MIGRATION =
  "supabase/migrations/20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql";
const RFI_COLLABORATION_MIGRATION =
  "supabase/migrations/20260834000000_rfi_collaboration_persistence_foundation.sql";

function policyBlock(source: string, policyName: string) {
  const lowerSql = source.toLowerCase();
  const marker = `create policy "${policyName.toLowerCase()}"`;
  const start = lowerSql.indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = source.slice(start);
  const lowerRest = rest.toLowerCase();
  const candidates = [
    lowerRest.indexOf("\ndrop policy", marker.length),
    lowerRest.indexOf("\ncreate policy", marker.length),
    lowerRest.indexOf("\ncreate or replace function", marker.length),
    lowerRest.indexOf("\ncomment on function", marker.length),
    lowerRest.indexOf("\ngrant ", marker.length),
    lowerRest.indexOf("\nrevoke ", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

const COMPANY_A = "11111111-1111-1111-1111-111111111111";
const COMPANY_B = "22222222-2222-2222-2222-222222222222";
const RFQ_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function membership(
  overrides: Partial<OrganizationMembership> = {},
): OrganizationMembership {
  return {
    id: "membership-1",
    userId: "user-1",
    companyId: COMPANY_A,
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

function buildRfq(
  overrides: Partial<ProcurementRfq> = {},
): ProcurementRfq {
  return {
    id: RFQ_ID,
    slug: "security-matrix-rfq",
    title: "Security Matrix RFQ",
    description: null,
    category: null,
    location: null,
    budget: 100000,
    status: "open",
    company_id: COMPANY_A,
    created_at: "2026-09-01T00:00:00.000Z",
    procurement_scope: "subcontractor",
    sourcing_method: "invited",
    contract_framework: "project_specific",
    ...overrides,
  };
}

const quoteFixtures = [
  {
    id: "quote-1",
    company_id: COMPANY_B,
    user_id: "supplier-user-1",
    amount: 90000,
    timeline: "30 days",
    message: "Competitive bid",
    decision: null,
  },
  {
    id: "quote-2",
    company_id: "33333333-3333-3333-3333-333333333333",
    user_id: "supplier-user-2",
    amount: 110000,
    timeline: "45 days",
    message: "Alternate bid",
    decision: null,
  },
];

describe("Security Regression Matrix SEC-01..SEC-14", () => {
  describe("SEC-01 company/supplier classification is not procurement authorization", () => {
    it("does not grant issuer write authority from supplier classification alone", () => {
      const supplierMember = membership({
        procurementFunction: "supplier",
      });

      expect(canSubmitCompanyQuote(supplierMember, COMPANY_A)).toBe(true);
      expect(canCreateCompanyRfq(supplierMember, COMPANY_A)).toBe(false);
      expect(canInviteCompanySuppliers(supplierMember, COMPANY_A)).toBe(false);
    });

    it("keeps consultant/none classifications from becoming issuer create authority", () => {
      for (const procurementFunction of ["consultant", "none"] as const) {
        const member = membership({ procurementFunction });
        expect(canSubmitCompanyQuote(member, COMPANY_A)).toBe(true);
        expect(canCreateCompanyRfq(member, COMPANY_A)).toBe(false);
      }
    });
  });

  describe("SEC-02 eligible/invited supplier may participate per RFQ access contract", () => {
    it("allows restricted sourcing response when restricted access is proven", () => {
      expect(canRespondToRfqSourcing("invited", true)).toBe(true);
      expect(canRespondToRfqSourcing("sealed_bid", true)).toBe(true);
    });

    it("resolves invited company access to submittable respondent access", () => {
      const access = resolveSupplierRfqAccess({
        rfq: buildRfq({ sourcing_method: "invited", company_id: COMPANY_A }),
        currentCompanyId: COMPANY_B,
        directlyInvitedRfqIds: new Set(),
        companyInvitedRfqIds: new Set([RFQ_ID]),
        participatedRfqIds: new Set(),
      });

      expect(access).not.toBeNull();
      expect(access?.participantRole).toBe("respondent");
      expect(access?.accessReason).toBe("company_invitation");
      expect(access?.canSubmitQuote).toBe(true);
      expect(access?.canManage).toBe(false);
    });
  });

  describe("SEC-03 non-invited/non-eligible supplier cannot obtain selective privileges", () => {
    it("denies restricted sourcing response without restricted access", () => {
      expect(canRespondToRfqSourcing("invited", false)).toBe(false);
      expect(canRespondToRfqSourcing("sealed_bid", false)).toBe(false);
    });

    it("returns null supplier access when invite/participation is absent", () => {
      const access = resolveSupplierRfqAccess({
        rfq: buildRfq({ sourcing_method: "invited", company_id: COMPANY_A }),
        currentCompanyId: COMPANY_B,
        directlyInvitedRfqIds: new Set(),
        companyInvitedRfqIds: new Set(),
        participatedRfqIds: new Set(),
      });

      expect(access).toBeNull();
    });
  });

  describe("SEC-04 self-quote / self-dealing boundaries", () => {
    it("classifies the issuing company as issuer and blocks quote submission capability", () => {
      expect(
        resolveRfqParticipantRole({
          currentCompanyId: COMPANY_A,
          rfqCompanyId: COMPANY_A,
        }),
      ).toBe("issuer");

      const issuerCapabilities = buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: true,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: false,
        hasMyQuote: false,
        hasRecommendedQuote: false,
      });

      expect(issuerCapabilities.canSubmitQuote).toBe(false);
      expect(issuerCapabilities.canManageRfq).toBe(true);
    });

    it("enforces self-deal denial at the quotes route and quote INSERT RLS", () => {
      const quotesRoute = readSource("src/app/api/quotes/route.ts");
      const rfiCollaboration = readSource(RFI_COLLABORATION_MIGRATION);
      const quoteInsertPolicy = policyBlock(
        rfiCollaboration,
        "Supplier members can submit company quotes",
      );

      expect(quotesRoute).toContain("rfq.company_id === profile.company_id");
      expect(quoteInsertPolicy.toLowerCase()).toContain("for insert");
      expect(quoteInsertPolicy).toMatch(
        /r\.company_id\s*<>\s*quotes\.company_id/,
      );
      expect(quoteInsertPolicy).toContain("om.company_id = quotes.company_id");
      expect(quoteInsertPolicy).toContain("om.membership_status = 'active'");
    });
  });

  describe("SEC-05 RFQ submission write authority respects deadline state", () => {
    it("enforces deadline denial before quote insert on the quotes route", () => {
      const quotesRoute = readSource("src/app/api/quotes/route.ts");
      const deadlineGate = quotesRoute.indexOf("hasDeadlinePassed(rfq.deadline)");
      const insertMarker = quotesRoute.indexOf('.from("quotes")');

      expect(deadlineGate).toBeGreaterThan(-1);
      expect(insertMarker).toBeGreaterThan(deadlineGate);
      expect(quotesRoute).toContain("Late submissions are not accepted");
      expect(quotesRoute).toContain("status: 403");
    });

    it("keeps quote INSERT RLS late-submission protection", () => {
      const rfiCollaboration = readSource(RFI_COLLABORATION_MIGRATION);
      const quoteInsertPolicy = policyBlock(
        rfiCollaboration,
        "Supplier members can submit company quotes",
      );

      expect(quoteInsertPolicy).toContain("r.status = 'open'");
      expect(quoteInsertPolicy).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
      );
      expect(quoteInsertPolicy).toContain(
        "now() <= public.parse_rfq_deadline_timestamptz(r.deadline)",
      );
    });
  });

  describe("SEC-06 supplier commercial quote visibility stays own-permitted", () => {
    it("gives respondents own-submission visibility without commercial evaluation", () => {
      const respondent = buildRfqCapabilities({
        participantRole: "respondent",
        isOpen: true,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: false,
        hasMyQuote: true,
        hasRecommendedQuote: false,
      });

      expect(respondent.canViewOwnSubmission).toBe(true);
      expect(respondent.canViewCommercialEvaluation).toBe(false);
      expect(respondent.canViewExecutiveIntelligence).toBe(false);
    });

    it("keeps supplier quote SELECT RLS scoped to own-company quotes only", () => {
      const quoteSelectMigration = readSource(QUOTE_SELECT_MIGRATION);
      const ownCompanyPolicy = policyBlock(
        quoteSelectMigration,
        "Company members can read own company quotes",
      );

      expect(ownCompanyPolicy.toLowerCase()).toContain("for select");
      expect(ownCompanyPolicy).toContain("om.user_id = auth.uid()");
      expect(ownCompanyPolicy).toContain("om.membership_status = 'active'");
      expect(ownCompanyPolicy).toContain("om.company_id = quotes.company_id");
      expect(ownCompanyPolicy).not.toContain("om.company_id = r.company_id");
      expect(ownCompanyPolicy).not.toContain(
        "parse_rfq_deadline_timestamptz",
      );
    });
  });

  describe("SEC-07 issuer commercial quote data denied before unlock", () => {
    it("locks issuer commercial evaluation and commercial amounts before unlock", () => {
      const lockedIssuer = buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: true,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: false,
        hasMyQuote: false,
        hasRecommendedQuote: false,
      });

      expect(lockedIssuer.canViewCommercialEvaluation).toBe(false);

      const lockedIntelligence = buildCommercialIntelligence({
        quoteList: quoteFixtures,
        budget: 100000,
        commercialEvaluationUnlocked: false,
        isOwner: true,
      });

      expect(lockedIntelligence.scoredQuotes).toEqual([]);
      expect(lockedIntelligence.recommendedQuote).toBeNull();
      expect(lockedIntelligence.lowestAmount).toBeNull();
      expect(lockedIntelligence.highestAmount).toBeNull();
      expect(lockedIntelligence.averageBid).toBe(0);
    });

    it("does not grant issuers unconditional quote SELECT before commercial unlock", () => {
      const quoteSelectMigration = readSource(QUOTE_SELECT_MIGRATION);
      const issuerSelectPolicy = policyBlock(
        quoteSelectMigration,
        "Issuing buyers can read quotes after commercial unlock",
      );

      expect(issuerSelectPolicy.toLowerCase()).toContain("for select");
      expect(issuerSelectPolicy).toContain("om.company_id = r.company_id");
      expect(issuerSelectPolicy).toContain("r.id = quotes.rfq_id");
      expect(issuerSelectPolicy).toContain("om.membership_status = 'active'");
      expect(issuerSelectPolicy).toContain(
        "om.workspace_role in ('owner', 'admin')",
      );
      expect(issuerSelectPolicy).toContain(
        "om.procurement_function = 'buyer'",
      );
      expect(issuerSelectPolicy).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
      );
      expect(issuerSelectPolicy).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
      );
      expect(issuerSelectPolicy).toMatch(
        /om\.membership_status = 'active'[\s\S]*parse_rfq_deadline_timestamptz\(r\.deadline\) < now\(\)/,
      );
    });
  });

  describe("SEC-08 issuer commercial visibility only after valid unlock", () => {
    it("unlocks issuer commercial evaluation and recommendation after unlock", () => {
      const unlockedIssuer = buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: false,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: true,
        hasMyQuote: false,
        hasRecommendedQuote: true,
      });

      expect(unlockedIssuer.canViewCommercialEvaluation).toBe(true);
      expect(unlockedIssuer.canViewRecommendedAwardPath).toBe(true);

      const unlockedIntelligence = buildCommercialIntelligence({
        quoteList: quoteFixtures,
        budget: 100000,
        commercialEvaluationUnlocked: true,
        isOwner: true,
      });

      expect(unlockedIntelligence.scoredQuotes.length).toBe(2);
      expect(unlockedIntelligence.recommendedQuote).not.toBeNull();
      expect(unlockedIntelligence.lowestAmount).toBe(90000);
      expect(unlockedIntelligence.highestAmount).toBe(110000);
    });

    it("does not recommend an award path for a non-owner even when unlocked", () => {
      const unlockedNonOwner = buildCommercialIntelligence({
        quoteList: quoteFixtures,
        budget: 100000,
        commercialEvaluationUnlocked: true,
        isOwner: false,
      });

      expect(unlockedNonOwner.scoredQuotes.length).toBe(2);
      expect(unlockedNonOwner.recommendedQuote).toBeNull();
    });

    it("makes issuer quote SELECT conditional on the commercial-unlock contract", () => {
      const quoteSelectMigration = readSource(QUOTE_SELECT_MIGRATION);
      const issuerSelectPolicy = policyBlock(
        quoteSelectMigration,
        "Issuing buyers can read quotes after commercial unlock",
      );

      expect(issuerSelectPolicy).toContain(
        "coalesce(r.sourcing_method, 'invited') = 'open'",
      );
      expect(issuerSelectPolicy).toContain(
        "coalesce(r.contract_framework, 'project_specific') <> 'framework'",
      );
      expect(issuerSelectPolicy).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
      );
      expect(issuerSelectPolicy).toMatch(
        /om\.company_id = r\.company_id[\s\S]*om\.membership_status = 'active'[\s\S]*parse_rfq_deadline_timestamptz\(r\.deadline\) < now\(\)/,
      );
    });
  });

  describe("SEC-09 RFI visibility remains participant/tenant scoped", () => {
    it("keeps RFI GET on authenticated RLS-backed table access", () => {
      const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");

      expect(rfiRoute).toContain('.from("rfq_rfis")');
      expect(rfiRoute).toContain('.eq("rfq_id", rfqId)');
      expect(rfiRoute).not.toContain("SERVICE_ROLE");
      expect(rfiRoute).not.toContain("createAdminClient");
    });

    it("keeps RFI SELECT RLS participant-scoped in the authoritative migration", () => {
      const rfiCollaboration = readSource(RFI_COLLABORATION_MIGRATION);
      const issuerRead = policyBlock(
        rfiCollaboration,
        "Issuer procurement users can read RFQ RFIs",
      );
      const respondentRead = policyBlock(
        rfiCollaboration,
        "Respondent companies can read own RFQ RFIs",
      );

      expect(issuerRead.toLowerCase()).toContain("for select");
      expect(issuerRead).toContain("r.id = rfq_rfis.rfq_id");
      expect(issuerRead).toContain("om.user_id = auth.uid()");
      expect(issuerRead).toContain("om.company_id = r.company_id");
      expect(issuerRead).toContain("om.membership_status = 'active'");
      expect(issuerRead).toContain(
        "om.workspace_role in ('owner', 'admin')",
      );
      expect(issuerRead).toContain("om.procurement_function = 'buyer'");

      expect(respondentRead.toLowerCase()).toContain("for select");
      expect(respondentRead).toContain("om.user_id = auth.uid()");
      expect(respondentRead).toContain("r.id = rfq_rfis.rfq_id");
      expect(respondentRead).toContain(
        "om.company_id = rfq_rfis.respondent_company_id",
      );
      expect(respondentRead).toContain("om.membership_status = 'active'");
      expect(respondentRead).toContain(
        "r.company_id <> rfq_rfis.respondent_company_id",
      );
      expect(respondentRead).toContain(
        "public.current_user_has_supplier_rfq_access(r.id)",
      );
      expect(respondentRead).toContain("r.sourcing_method = 'open'");
    });
  });

  describe("SEC-10 RFI write operations preserve participant/role boundaries", () => {
    it("requires respondent write prerequisite and denies issuer self-RFI submission", () => {
      const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");

      expect(rfiRoute).toContain("canSubmitCompanyQuote(membership, profile.company_id)");
      expect(rfiRoute).toContain(
        "canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)",
      );
      expect(rfiRoute).toContain(
        "Issuing companies cannot submit private respondent RFIs on their own RFQ.",
      );
      expect(rfiRoute).toContain("canCreateCompanyRfq(membership, rfq.company_id)");
    });

    it("keeps RFI INSERT/UPDATE RLS participant and deadline boundaries", () => {
      const rfiCollaboration = readSource(RFI_COLLABORATION_MIGRATION);
      const respondentInsert = policyBlock(
        rfiCollaboration,
        "Respondent companies can submit RFQ RFIs",
      );
      const issuerAnswer = policyBlock(
        rfiCollaboration,
        "Issuer procurement users can answer open RFQ RFIs",
      );

      expect(respondentInsert.toLowerCase()).toContain("for insert");
      expect(respondentInsert).toContain("submitted_by = auth.uid()");
      expect(respondentInsert).toContain("om.user_id = auth.uid()");
      expect(respondentInsert).toContain("r.id = rfq_rfis.rfq_id");
      expect(respondentInsert).toContain(
        "om.company_id = rfq_rfis.respondent_company_id",
      );
      expect(respondentInsert).toContain("om.membership_status = 'active'");
      expect(respondentInsert).toContain("r.status = 'open'");
      expect(respondentInsert).toContain(
        "r.company_id <> rfq_rfis.respondent_company_id",
      );
      expect(respondentInsert).toContain(
        "public.current_user_has_supplier_rfq_access(r.id)",
      );
      expect(respondentInsert).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline)",
      );
      expect(respondentInsert).toMatch(
        /now\(\)\s*<=\s*coalesce\(\s*r\.rfi_deadline,\s*public\.parse_rfq_deadline_timestamptz\(r\.deadline\)\s*\)/,
      );

      expect(issuerAnswer.toLowerCase()).toContain("for update");
      expect(issuerAnswer).toContain("status = 'open'");
      expect(issuerAnswer).toContain("status = 'answered'");
      expect(issuerAnswer).toContain("r.id = rfq_rfis.rfq_id");
      expect(issuerAnswer).toContain("om.user_id = auth.uid()");
      expect(issuerAnswer).toContain("om.membership_status = 'active'");
      expect(issuerAnswer).toContain("responded_by = auth.uid()");
      expect(issuerAnswer).toContain("responded_at is not null");
      expect(issuerAnswer).toContain(
        "om.workspace_role in ('owner', 'admin')",
      );
      expect(issuerAnswer).toContain("om.procurement_function = 'buyer'");
      expect(issuerAnswer).toContain("om.company_id = r.company_id");
    });

    it("separates RFQ invitation eligibility from quotation membership authority", () => {
      expect(canRespondToRfqSourcing("invited", false)).toBe(false);
      expect(
        canSubmitCompanyQuote(
          membership({ procurementFunction: "supplier" }),
          COMPANY_A,
        ),
      ).toBe(true);
    });
  });

  describe("SEC-11 procurement activity/audit visibility remains tenant scoped", () => {
    it("writes activity through trusted RPC without client-supplied company override", async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await recordTrustedProcurementActivity(
        { rpc },
        "quote_submitted",
        RFQ_ID,
        { userId: "user-1", companyId: COMPANY_A },
      );

      expect(rpc).toHaveBeenCalledWith("record_procurement_activity", {
        p_activity_kind: "quote_submitted",
        p_entity_id: RFQ_ID,
      });
      expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_company_id");
      expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("company_id");
    });

    it("keeps authenticated activity read policies company-scoped", () => {
      const auditMigration = readSource(
        "supabase/migrations/20260828000000_enable_company_scoped_audit_and_notification_access.sql",
      );
      const notificationsPage = readSource("src/app/notifications/page.tsx");

      expect(auditMigration).toContain("om.company_id = notifications.company_id");
      expect(auditMigration).toContain("om.company_id = audit_logs.company_id");
      expect(notificationsPage).toContain('.eq("company_id", profile.company_id)');
    });
  });

  describe("SEC-12 service-role remains controlled and is not a client bypass", () => {
    it("keeps application Supabase clients on anon key only", () => {
      const browserClient = readSource("src/lib/supabase/client.ts");
      const serverClient = readSource("src/lib/supabase/server.ts");

      expect(browserClient).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(serverClient).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(browserClient).not.toMatch(/SERVICE_ROLE|createAdminClient|service_role/i);
      expect(serverClient).not.toMatch(/SERVICE_ROLE|createAdminClient|service_role/i);
    });

    it("keeps quote and RFI write routes free of service-role client bypass", () => {
      const quotesRoute = readSource("src/app/api/quotes/route.ts");
      const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");

      expect(quotesRoute).not.toMatch(/SERVICE_ROLE|createAdminClient|service_role/i);
      expect(rfiRoute).not.toMatch(/SERVICE_ROLE|createAdminClient|service_role/i);
    });
  });

  describe("SEC-13 AI/procurement intelligence inherits underlying authorization", () => {
    it("exposes buyer intelligence only when capabilities already authorize it", () => {
      const issuerCapabilities = buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: true,
        blindBiddingEnabled: false,
        commercialEvaluationUnlocked: true,
        hasMyQuote: false,
        hasRecommendedQuote: true,
      });
      const supplierCapabilities = buildRfqCapabilities({
        participantRole: "respondent",
        isOpen: true,
        blindBiddingEnabled: false,
        commercialEvaluationUnlocked: false,
        hasMyQuote: true,
        hasRecommendedQuote: false,
      });

      expect(canExposeRfqBuyerExecutiveIntelligence(issuerCapabilities)).toBe(
        true,
      );
      expect(
        canExposeRfqBuyerExecutiveIntelligence(supplierCapabilities),
      ).toBe(false);

      const payload = { awardReadiness: 91, potentialSavings: 12000 };
      expect(
        serializeRfqBuyerExecutiveIntelligenceForViewer(true, payload),
      ).toEqual(payload);
      expect(
        serializeRfqBuyerExecutiveIntelligenceForViewer(false, payload),
      ).toBeNull();
    });
  });

  describe("SEC-14 issuer-only executive intelligence unavailable to suppliers", () => {
    it("omits buyer executive metrics for supplier-side viewers", () => {
      const supplierCapabilities = buildRfqCapabilities({
        participantRole: "respondent",
        isOpen: true,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: false,
        hasMyQuote: true,
        hasRecommendedQuote: false,
      });

      expect(supplierCapabilities.canViewExecutiveIntelligence).toBe(false);
      expect(
        canExposeRfqBuyerExecutiveIntelligence(supplierCapabilities),
      ).toBe(false);

      const metrics = selectRfqDetailCommandMetrics({
        canViewExecutiveIntelligence: false,
        procurementHealthMetric: {
          title: "Procurement Health",
          value: "81/100",
          detail: "Healthy",
          accentClassName: "text-nexus-cyan-bright",
        },
        sharedMetrics: [
          {
            title: "Participation Status",
            value: "Quote Submitted",
            detail: "Organization-level confidential access",
            accentClassName: "text-[#C8A646]",
          },
        ],
      });

      expect(metrics.map((metric) => metric.title)).toEqual([
        "Participation Status",
      ]);
      expect(JSON.stringify(metrics)).not.toContain("Procurement Health");
    });
  });
});
