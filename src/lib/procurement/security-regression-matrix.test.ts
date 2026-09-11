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

function normalizeContractSql(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// FINAL ACTIVE SQL authority for RLS/policy/constraint contracts.
const BASELINE_V2_PATH =
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql";
const baselineSql = readSource(BASELINE_V2_PATH);
const sql = normalizeContractSql(baselineSql);

function policyBlock(policyName: string) {
  // Dump CREATE POLICY uses quoted identifiers; search the raw Baseline V2 text.
  const lowerSql = baselineSql.toLowerCase();
  const marker = `create policy "${policyName.toLowerCase()}"`;
  const start = lowerSql.indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = baselineSql.slice(start);
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
  return normalizeContractSql(rest.slice(0, Math.min(...candidates)));
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
  describe("SEC-01 Company type ≠ RFQ permission", () => {
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
        expect(canInviteCompanySuppliers(member, COMPANY_A)).toBe(false);
      }
    });
  });

  describe("SEC-02 RFQ relationship controls access", () => {
    it("grants restricted sourcing participation only when the RFQ relationship is proven", () => {
      expect(canRespondToRfqSourcing("invited", true)).toBe(true);
      expect(canRespondToRfqSourcing("sealed_bid", true)).toBe(true);

      const invitedAccess = resolveSupplierRfqAccess({
        rfq: buildRfq({ sourcing_method: "invited", company_id: COMPANY_A }),
        currentCompanyId: COMPANY_B,
        directlyInvitedRfqIds: new Set(),
        companyInvitedRfqIds: new Set([RFQ_ID]),
        participatedRfqIds: new Set(),
      });

      expect(invitedAccess).not.toBeNull();
      expect(invitedAccess?.participantRole).toBe("respondent");
      expect(invitedAccess?.accessReason).toBe("company_invitation");
      expect(invitedAccess?.canSubmitQuote).toBe(true);
      expect(invitedAccess?.canManage).toBe(false);
    });

    it("denies selective privileges when the RFQ relationship is absent", () => {
      expect(canRespondToRfqSourcing("invited", false)).toBe(false);
      expect(canRespondToRfqSourcing("sealed_bid", false)).toBe(false);

      const deniedAccess = resolveSupplierRfqAccess({
        rfq: buildRfq({ sourcing_method: "invited", company_id: COMPANY_A }),
        currentCompanyId: COMPANY_B,
        directlyInvitedRfqIds: new Set(),
        companyInvitedRfqIds: new Set(),
        participatedRfqIds: new Set(),
      });

      expect(deniedAccess).toBeNull();
    });
  });

  describe("SEC-03 Active membership required", () => {
    it("denies quote submit, RFQ create, and supplier invite for inactive membership", () => {
      for (const membershipStatus of [
        "pending",
        "suspended",
        "revoked",
        "archived",
      ] as const) {
        const inactive = membership({
          membershipStatus,
          procurementFunction: "buyer",
          workspaceRole: "owner",
        });

        expect(canSubmitCompanyQuote(inactive, COMPANY_A)).toBe(false);
        expect(canCreateCompanyRfq(inactive, COMPANY_A)).toBe(false);
        expect(canInviteCompanySuppliers(inactive, COMPANY_A)).toBe(false);
      }
    });

    it("denies missing membership and wrong-company membership for operational writes", () => {
      expect(canSubmitCompanyQuote(null, COMPANY_A)).toBe(false);
      expect(canCreateCompanyRfq(null, COMPANY_A)).toBe(false);
      expect(canInviteCompanySuppliers(null, COMPANY_A)).toBe(false);

      const foreign = membership({ companyId: COMPANY_B });
      expect(canSubmitCompanyQuote(foreign, COMPANY_A)).toBe(false);
      expect(canCreateCompanyRfq(foreign, COMPANY_A)).toBe(false);
      expect(canInviteCompanySuppliers(foreign, COMPANY_A)).toBe(false);
    });
  });

  describe("SEC-04 No self-quote", () => {
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
      const quoteInsertPolicy = policyBlock(
        "Supplier members can submit company quotes",
      );

      expect(quotesRoute).toContain("rfq.company_id === profile.company_id");
      expect(quotesRoute).toContain(
        "Your company cannot submit a quote to its own RFQ.",
      );
      expect(quoteInsertPolicy).toContain("for insert");
      expect(quoteInsertPolicy).toMatch(
        /r\.company_id\s*<>\s*quotes\.company_id/,
      );
      expect(quoteInsertPolicy).toContain("om.company_id = quotes.company_id");
      expect(quoteInsertPolicy).toContain("om.membership_status = 'active'");
    });
  });

  describe("SEC-05 No duplicate illegal submissions", () => {
    it("denies a second same-company quote on the quotes API before insert", () => {
      const quotesRoute = readSource("src/app/api/quotes/route.ts");
      const existingLookup = quotesRoute.indexOf(
        'const { data: existingQuote } = await supabase',
      );
      const rfqEq = quotesRoute.indexOf('.eq("rfq_id", rfq.id)', existingLookup);
      const companyEq = quotesRoute.indexOf(
        '.eq("company_id", profile.company_id)',
        rfqEq,
      );
      const duplicateDeny = quotesRoute.indexOf(
        "Your company has already submitted a quote for this RFQ.",
        companyEq,
      );
      const insertCall = quotesRoute.indexOf(".insert({", duplicateDeny);
      const quotesFromBeforeInsert = quotesRoute.lastIndexOf(
        '.from("quotes")',
        insertCall,
      );

      expect(existingLookup).toBeGreaterThan(-1);
      expect(rfqEq).toBeGreaterThan(existingLookup);
      expect(companyEq).toBeGreaterThan(rfqEq);
      expect(duplicateDeny).toBeGreaterThan(companyEq);
      expect(quotesRoute).toContain("status: 409");
      expect(quotesFromBeforeInsert).toBeGreaterThan(duplicateDeny);
      expect(insertCall).toBeGreaterThan(quotesFromBeforeInsert);
    });

    it("keeps DB unique constraint quotes_rfq_company_key as defense in depth", () => {
      expect(baselineSql).toContain('"quotes_rfq_company_key"');
      expect(baselineSql).toMatch(
        /ADD CONSTRAINT "quotes_rfq_company_key" UNIQUE \("rfq_id", "company_id"\)/,
      );
    });
  });

  describe("SEC-06 Competitor commercial isolation", () => {
    it("keeps supplier quote SELECT RLS scoped to own-company quotes only", () => {
      const ownCompanyPolicy = policyBlock(
        "Company members can read own company quotes",
      );

      expect(ownCompanyPolicy).toContain("for select");
      expect(ownCompanyPolicy).toContain("om.user_id = auth.uid()");
      expect(ownCompanyPolicy).toContain(
        "om.membership_status = any (array['active'::text, 'archived'::text])",
      );
      expect(ownCompanyPolicy).toContain("om.company_id = quotes.company_id");
      expect(ownCompanyPolicy).not.toContain("om.company_id = r.company_id");
    });

    it("denies supplier commercial evaluation and competitor quote scoring before unlock", () => {
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

      const lockedIntelligence = buildCommercialIntelligence({
        quoteList: quoteFixtures,
        budget: 100000,
        commercialEvaluationUnlocked: false,
        isOwner: false,
      });

      expect(lockedIntelligence.scoredQuotes).toEqual([]);
      expect(lockedIntelligence.recommendedQuote).toBeNull();
      expect(lockedIntelligence.lowestAmount).toBeNull();
      expect(lockedIntelligence.highestAmount).toBeNull();
    });

    it("gates issuer commercial quote SELECT behind the unlock contract", () => {
      const issuerSelectPolicy = policyBlock(
        "Issuing buyers can read quotes after commercial unlock",
      );

      expect(issuerSelectPolicy).toContain("for select");
      expect(issuerSelectPolicy).toContain("om.company_id = r.company_id");
      expect(issuerSelectPolicy).toContain(
        "om.membership_status = any (array['active'::text, 'archived'::text])",
      );
      expect(issuerSelectPolicy).toContain(
        "om.workspace_role = any (array['owner'::text, 'admin'::text])",
      );
      expect(issuerSelectPolicy).toContain(
        "om.procurement_function = 'buyer'",
      );
      expect(issuerSelectPolicy).toMatch(
        /workspace_role[\s\S]*or[\s\S]*procurement_function = 'buyer'/,
      );
      expect(issuerSelectPolicy).toContain(
        "coalesce(r.sourcing_method, 'invited'::text) = 'open'::text",
      );
      expect(issuerSelectPolicy).toContain(
        "coalesce(r.contract_framework, 'project_specific'::text) <> 'framework'::text",
      );
      expect(issuerSelectPolicy).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
      );
      expect(issuerSelectPolicy).toContain(
        "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
      );
      expect(issuerSelectPolicy).toMatch(
        /coalesce\(r\.sourcing_method, 'invited'::text\) = 'open'::text[\s\S]*coalesce\(r\.contract_framework, 'project_specific'::text\) <> 'framework'::text[\s\S]*or[\s\S]*parse_rfq_deadline_timestamptz\(r\.deadline\) is not null[\s\S]*parse_rfq_deadline_timestamptz\(r\.deadline\) < now\(\)/,
      );

      const lockedIssuer = buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: true,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: false,
        hasMyQuote: false,
        hasRecommendedQuote: false,
      });
      expect(lockedIssuer.canViewCommercialEvaluation).toBe(false);

      const unlockedIssuer = buildRfqCapabilities({
        participantRole: "issuer",
        isOpen: false,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: true,
        hasMyQuote: false,
        hasRecommendedQuote: true,
      });
      expect(unlockedIssuer.canViewCommercialEvaluation).toBe(true);
    });
  });

  describe("SEC-07 Issuer intelligence isolation", () => {
    it("keeps buyer executive intelligence unavailable to supplier/respondent viewers", () => {
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

      const payload = { awardReadiness: 91, potentialSavings: 12000 };
      expect(
        serializeRfqBuyerExecutiveIntelligenceForViewer(false, payload),
      ).toBeNull();

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

  describe("SEC-08 RFI participant visibility", () => {
    it("keeps RFI SELECT RLS issuer/respondent scoped in Baseline V2", () => {
      const issuerRead = policyBlock(
        "Issuer procurement users can read RFQ RFIs",
      );
      const respondentRead = policyBlock(
        "Respondent companies can read own RFQ RFIs",
      );

      expect(issuerRead).toContain("for select");
      expect(issuerRead).toContain("r.id = rfq_rfis.rfq_id");
      expect(issuerRead).toContain("om.user_id = auth.uid()");
      expect(issuerRead).toContain("om.company_id = r.company_id");
      expect(issuerRead).toContain(
        "om.membership_status = any (array['active'::text, 'archived'::text])",
      );
      expect(issuerRead).toContain(
        "om.workspace_role = any (array['owner'::text, 'admin'::text])",
      );
      expect(issuerRead).toContain("om.procurement_function = 'buyer'");
      expect(issuerRead).toMatch(
        /workspace_role[\s\S]*or[\s\S]*procurement_function = 'buyer'/,
      );

      expect(respondentRead).toContain("for select");
      expect(respondentRead).toContain("om.user_id = auth.uid()");
      expect(respondentRead).toContain("r.id = rfq_rfis.rfq_id");
      expect(respondentRead).toContain(
        "om.company_id = rfq_rfis.respondent_company_id",
      );
      expect(respondentRead).toContain(
        "om.membership_status = any (array['active'::text, 'archived'::text])",
      );
      expect(respondentRead).toContain(
        "r.company_id <> rfq_rfis.respondent_company_id",
      );
      expect(respondentRead).toContain(
        "public.current_user_has_supplier_rfq_access(r.id)",
      );
      expect(respondentRead).toContain("r.sourcing_method = 'open'");
    });

    it("keeps RFI GET on authenticated RLS-backed table access", () => {
      const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");
      expect(rfiRoute).toContain('.from("rfq_rfis")');
      expect(rfiRoute).toContain('.eq("rfq_id", rfqId)');
      expect(rfiRoute).not.toMatch(/SERVICE_ROLE|createAdminClient|service_role/i);
    });
  });

  describe("SEC-09 Server deadline enforcement", () => {
    it("enforces quote deadline denial on the API before insert", () => {
      const quotesRoute = readSource("src/app/api/quotes/route.ts");
      const deadlineGate = quotesRoute.indexOf(
        "if (hasDeadlinePassed(rfq.deadline))",
      );
      const deadlineDeny = quotesRoute.indexOf(
        "Late submissions are not accepted",
        deadlineGate,
      );
      const insertCall = quotesRoute.indexOf(".insert({", deadlineDeny);
      const quotesFromBeforeInsert = quotesRoute.lastIndexOf(
        '.from("quotes")',
        insertCall,
      );

      expect(deadlineGate).toBeGreaterThan(-1);
      expect(deadlineDeny).toBeGreaterThan(deadlineGate);
      expect(quotesRoute).toContain("status: 403");
      expect(quotesFromBeforeInsert).toBeGreaterThan(deadlineDeny);
      expect(insertCall).toBeGreaterThan(quotesFromBeforeInsert);
    });

    it("keeps quote INSERT RLS late-submission protection", () => {
      const quoteInsertPolicy = policyBlock(
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

    it("keeps RFI INSERT RLS deadline boundary", () => {
      const respondentInsert = policyBlock(
        "Respondent companies can submit RFQ RFIs",
      );

      expect(respondentInsert).toMatch(
        /now\(\)\s*<=\s*coalesce\(r\.rfi_deadline,\s*public\.parse_rfq_deadline_timestamptz\(r\.deadline\)\)/,
      );
    });
  });

  describe("SEC-10 RLS aligns with API auth", () => {
    it("aligns quote respondent API authorization with quote INSERT RLS", () => {
      const quotesRoute = readSource("src/app/api/quotes/route.ts");
      const quoteInsertPolicy = policyBlock(
        "Supplier members can submit company quotes",
      );

      expect(quotesRoute).toContain(
        "canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)",
      );
      expect(quotesRoute).toContain("canSubmitCompanyQuote");
      expect(quoteInsertPolicy).toContain(
        "public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
      );
      expect(quoteInsertPolicy).toContain("om.company_id = quotes.company_id");
      expect(quoteInsertPolicy).toMatch(
        /r\.company_id\s*<>\s*quotes\.company_id/,
      );
    });

    it("aligns RFI respondent/issuer API authorization with RFI INSERT/UPDATE RLS", () => {
      const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");
      const respondentInsert = policyBlock(
        "Respondent companies can submit RFQ RFIs",
      );
      const issuerAnswer = policyBlock(
        "Issuer procurement users can answer open RFQ RFIs",
      );

      expect(rfiRoute).toContain(
        "canSubmitCompanyQuote(membership, profile.company_id)",
      );
      expect(rfiRoute).toContain(
        "canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)",
      );
      expect(rfiRoute).toContain("canCreateCompanyRfq(membership, rfq.company_id)");

      expect(respondentInsert).toContain("submitted_by = auth.uid()");
      expect(respondentInsert).toContain("om.user_id = auth.uid()");
      expect(respondentInsert).toContain(
        "om.company_id = rfq_rfis.respondent_company_id",
      );
      expect(respondentInsert).toContain("om.membership_status = 'active'");
      expect(respondentInsert).toContain("r.id = rfq_rfis.rfq_id");
      expect(respondentInsert).toContain("r.status = 'open'");
      expect(respondentInsert).toContain(
        "r.company_id <> rfq_rfis.respondent_company_id",
      );
      expect(respondentInsert).toContain("r.sourcing_method = 'open'");
      expect(respondentInsert).toContain(
        "public.current_user_has_supplier_rfq_access(r.id)",
      );
      expect(respondentInsert).toContain(
        "coalesce(r.rfi_deadline, public.parse_rfq_deadline_timestamptz(r.deadline)) is not null",
      );
      expect(respondentInsert).toContain(
        "now() <= coalesce(r.rfi_deadline, public.parse_rfq_deadline_timestamptz(r.deadline))",
      );

      expect(issuerAnswer).toContain("status = 'open'");
      expect(issuerAnswer).toContain("status = 'answered'");
      expect(issuerAnswer).toContain("r.id = rfq_rfis.rfq_id");
      expect(issuerAnswer).toContain("om.user_id = auth.uid()");
      expect(issuerAnswer).toContain("om.membership_status = 'active'");
      expect(issuerAnswer).toContain("responded_by = auth.uid()");
      expect(issuerAnswer).toContain("responded_at is not null");
      expect(issuerAnswer).toContain(
        "nullif(btrim(coalesce(response_text, ''::text)), ''::text) is not null",
      );
      expect(issuerAnswer).toContain("om.company_id = r.company_id");
      expect(issuerAnswer).toContain(
        "om.workspace_role = any (array['owner'::text, 'admin'::text])",
      );
      expect(issuerAnswer).toContain("om.procurement_function = 'buyer'");
      expect(issuerAnswer).toMatch(
        /workspace_role[\s\S]*or[\s\S]*procurement_function = 'buyer'/,
      );
    });
  });

  describe("SEC-11 Activity company/RFQ scope", () => {
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
      const notificationsPage = readSource("src/app/notifications/page.tsx");

      expect(sql).toContain("om.company_id = notifications.company_id");
      expect(sql).toContain("om.company_id = audit_logs.company_id");
      expect(notificationsPage).toContain(
        '.eq("company_id", profile.company_id)',
      );
    });
  });

  describe("SEC-12 AI permission inheritance", () => {
    it("exposes AI/procurement intelligence only when RFQ capabilities already authorize it", () => {
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

  describe("SEC-13 Invitation email binding", () => {
    it("binds RFQ invitation create to rfq_id + normalized email + unique token", () => {
      const invitesRoute = readSource("src/app/api/invites/route.ts");

      expect(invitesRoute).toContain("function normalizeEmail(value: string)");
      expect(invitesRoute).toContain("return value.trim().toLowerCase();");
      expect(invitesRoute).toContain(
        'const email = normalizeEmail(String(body.email || ""));',
      );
      expect(invitesRoute).toContain('.from("rfq_invites")');
      expect(invitesRoute).toContain('.eq("email", email)');
      expect(invitesRoute).toMatch(/rfq_id[\s\S]*email[\s\S]*token/);
      expect(invitesRoute).toContain("/rfq/invite/${token}");
      expect(invitesRoute).not.toContain("company_invitations");

      expect(baselineSql).toContain('"rfq_invites_token_key"');
      expect(baselineSql).toContain('"rfq_invites_rfq_email_key"');
      expect(baselineSql).toMatch(
        /CREATE UNIQUE INDEX "rfq_invites_rfq_email_key"[\s\S]*\("rfq_id", "lower"\("email"\)\)/,
      );
    });

    it("resolves invitation tokens to a specific RFQ invite and binds access to authenticated email", () => {
      expect(sql).toContain(
        "create or replace function public.get_rfq_invitation_context(p_token text)",
      );
      expect(sql).toContain("i.token = p_token");
      expect(sql).toContain("on r.id = i.rfq_id");

      expect(sql).toContain(
        "create or replace function public.current_user_has_supplier_rfq_access(p_rfq_id uuid)",
      );
      expect(sql).toContain("from public.rfq_invites i");
      expect(sql).toContain("i.rfq_id = p_rfq_id");
      expect(sql).toContain("i.email = v_email");
      expect(sql).toContain(
        "access is bound to the authenticated email, not an invitation url.",
      );
    });
  });

  describe("SEC-14 No-company path", () => {
    it("redirects authenticated users without company_id through company onboarding before RFQ submit entitlement", () => {
      const submitPage = readSource("src/app/rfq/[slug]/submit/page.tsx");
      const onboardingGate = submitPage.indexOf("if (!profile?.company_id)");
      const onboardingRedirect = submitPage.indexOf(
        "redirect(getCompanyOnboardingPath(submitPath))",
      );
      const rfqLookup = submitPage.indexOf('.from("rfqs")');
      const sourcingCheck = submitPage.indexOf(
        "current_user_has_supplier_rfq_access",
      );

      expect(submitPage).toContain(
        'from "@/lib/auth/login-continuation"',
      );
      expect(submitPage).toContain("getCompanyOnboardingPath");
      expect(submitPage).toContain(
        "const submitPath = getSafeNextPath(`/rfq/${slug}/submit`)",
      );
      expect(onboardingGate).toBeGreaterThan(-1);
      expect(onboardingRedirect).toBeGreaterThan(onboardingGate);
      expect(rfqLookup).toBeGreaterThan(onboardingRedirect);
      expect(sourcingCheck).toBeGreaterThan(rfqLookup);
    });
  });
});

describe("Supplemental service-role boundary", () => {
  it("keeps application Supabase clients on anon key only", () => {
    const browserClient = readSource("src/lib/supabase/client.ts");
    const serverClient = readSource("src/lib/supabase/server.ts");

    expect(browserClient).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(serverClient).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(browserClient).not.toMatch(
      /SERVICE_ROLE|createAdminClient|service_role/i,
    );
    expect(serverClient).not.toMatch(
      /SERVICE_ROLE|createAdminClient|service_role/i,
    );
  });

  it("keeps quote and RFI write routes free of service-role client bypass", () => {
    const quotesRoute = readSource("src/app/api/quotes/route.ts");
    const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");

    expect(quotesRoute).not.toMatch(
      /SERVICE_ROLE|createAdminClient|service_role/i,
    );
    expect(rfiRoute).not.toMatch(
      /SERVICE_ROLE|createAdminClient|service_role/i,
    );
  });
});
