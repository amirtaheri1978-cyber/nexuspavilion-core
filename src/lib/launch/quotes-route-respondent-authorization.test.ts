import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  canCreateCompanyRfq,
  canInviteCompanySuppliers,
} from "@/lib/procurement/procurement-write-authorization";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/membership", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/membership")>();

  return {
    ...actual,
    getActiveMembershipForUserCompany: vi.fn(),
  };
});

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { createClient } from "@/lib/supabase/server";
import { POST as postQuotes } from "@/app/api/quotes/route";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const ISSUER_COMPANY_ID = "55555555-5555-5555-5555-555555555555";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const RFQ_ID = "33333333-3333-3333-3333-333333333333";
const QUOTE_ID = "44444444-4444-4444-4444-444444444444";

const createClientMock = vi.mocked(createClient);
const membershipMock = vi.mocked(getActiveMembershipForUserCompany);

type QuoteHarness = {
  user: { id: string; email: string } | null;
  membership: OrganizationMembership | null;
  rfq: Record<string, unknown> | null;
  existingQuote: { id: string } | null;
  hasRestrictedAccess: boolean;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  inserted: Record<string, unknown> | null;
};

function membership(
  overrides: Partial<OrganizationMembership> = {},
): OrganizationMembership {
  return {
    id: "membership-1",
    userId: USER_ID,
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

function openRfq(overrides: Record<string, unknown> = {}) {
  return {
    id: RFQ_ID,
    title: "Harbor Package",
    slug: "harbor-package",
    status: "open",
    company_id: ISSUER_COMPANY_ID,
    awarded_quote_id: null,
    awarded_at: null,
    deadline: "2099-09-01T12:00:00.000Z",
    sourcing_method: "open",
    ...overrides,
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validQuoteBody = {
  slug: "harbor-package",
  amount: "100000",
  timeline: "16 months",
  message: "Firm lump-sum proposal with documented delivery.",
};

async function readJson(response: Response) {
  return {
    status: response.status,
    body: (await response.json()) as {
      error?: string;
      success?: boolean;
      quote?: { id: string };
    },
  };
}

function mockQuoteClient({
  user = { id: USER_ID, email: "respondent@example.com" },
  rfq = openRfq(),
  existingQuote = null,
  hasRestrictedAccess = false,
}: {
  user?: { id: string; email: string } | null;
  rfq?: Record<string, unknown> | null;
  existingQuote?: { id: string } | null;
  hasRestrictedAccess?: boolean;
} = {}): QuoteHarness {
  const rpcCalls: QuoteHarness["rpcCalls"] = [];
  let inserted: Record<string, unknown> | null = null;

  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: "Auth session missing" },
      }),
    },
    from(table: string) {
      let mode: "select" | "insert" = "select";

      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        insert(row: Record<string, unknown>) {
          mode = "insert";
          inserted = row;
          return query;
        },
        async single() {
          if (table === "profiles") {
            return {
              data: user
                ? {
                    id: user.id,
                    company_id: COMPANY_ID,
                    email: user.email,
                  }
                : null,
              error: user ? null : { message: "No company linked to profile" },
            };
          }

          if (table === "rfqs") {
            return {
              data: rfq,
              error: rfq ? null : { message: "RFQ not found" },
            };
          }

          if (table === "quotes" && mode === "insert") {
            return {
              data: {
                id: QUOTE_ID,
                ...inserted,
              },
              error: null,
            };
          }

          return { data: null, error: { message: "unexpected single()" } };
        },
        async maybeSingle() {
          if (table === "quotes") {
            return { data: existingQuote, error: null };
          }

          return { data: null, error: null };
        },
      };

      return query;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });

      if (fn === "current_user_has_supplier_rfq_access") {
        return { data: hasRestrictedAccess, error: null };
      }

      if (fn === "record_procurement_activity") {
        return { data: { success: true }, error: null };
      }

      return { data: null, error: { message: `unexpected rpc ${fn}` } };
    },
  } as never);

  return {
    user,
    membership: null,
    rfq,
    existingQuote,
    hasRestrictedAccess,
    rpcCalls,
    get inserted() {
      return inserted;
    },
  };
}

describe("Task 33E POST /api/quotes respondent authorization", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    membershipMock.mockReset();
  });

  async function submit(overrides: Partial<OrganizationMembership> = {}) {
    membershipMock.mockResolvedValue(membership(overrides));
    return readJson(await postQuotes(jsonRequest(validQuoteBody)));
  }

  it("CASE A — Building Material Supplier can submit on an open RFQ", async () => {
    const harness = mockQuoteClient();
    const result = await submit({ procurementFunction: "supplier" });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(harness.rpcCalls.map((call) => call.fn)).not.toContain(
      "current_user_has_supplier_rfq_access",
    );
    expect(harness.inserted?.company_id).toBe(COMPANY_ID);
  });

  it("CASE B — General Contractor can submit on an open RFQ", async () => {
    mockQuoteClient();
    const result = await submit({
      workspaceRole: "owner",
      procurementFunction: "none",
    });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
  });

  it("CASE C — Subcontractor / service provider can submit on an open RFQ", async () => {
    mockQuoteClient();
    const result = await submit({ procurementFunction: "none" });
    expect(result.status).toBe(200);
  });

  it("CASE D — Architect / consultant can submit on an open RFQ", async () => {
    mockQuoteClient();
    const result = await submit({ procurementFunction: "none" });
    expect(result.status).toBe(200);
  });

  it("CASE E — Engineer / consultant can submit on an open RFQ", async () => {
    mockQuoteClient();
    const result = await submit({ procurementFunction: "consultant" });
    expect(result.status).toBe(200);
  });

  it("CASE F — multidisciplinary non-supplier company can submit on an open RFQ", async () => {
    mockQuoteClient();
    const result = await submit({
      workspaceRole: "owner",
      procurementFunction: "buyer",
    });
    expect(result.status).toBe(200);
    expect(
      canCreateCompanyRfq(
        membership({
          workspaceRole: "owner",
          procurementFunction: "buyer",
        }),
        COMPANY_ID,
      ),
    ).toBe(true);
  });

  it("CASE G — invited Building Material Supplier can submit on a restricted RFQ", async () => {
    const harness = mockQuoteClient({
      rfq: openRfq({ sourcing_method: "invited" }),
      hasRestrictedAccess: true,
    });
    const result = await submit({ procurementFunction: "supplier" });

    expect(result.status).toBe(200);
    expect(harness.rpcCalls).toEqual(
      expect.arrayContaining([
        {
          fn: "current_user_has_supplier_rfq_access",
          args: { p_rfq_id: RFQ_ID },
        },
      ]),
    );
  });

  it("CASE H — invited General Contractor can submit on a restricted RFQ", async () => {
    mockQuoteClient({
      rfq: openRfq({ sourcing_method: "invited" }),
      hasRestrictedAccess: true,
    });
    const result = await submit({
      workspaceRole: "owner",
      procurementFunction: "none",
    });
    expect(result.status).toBe(200);
  });

  it("CASE I — invited service provider can submit on a restricted RFQ", async () => {
    mockQuoteClient({
      rfq: openRfq({ sourcing_method: "invited" }),
      hasRestrictedAccess: true,
    });
    const result = await submit({ procurementFunction: "none" });
    expect(result.status).toBe(200);
  });

  it("CASE J — invited architect/consultant can submit on a restricted RFQ", async () => {
    mockQuoteClient({
      rfq: openRfq({ sourcing_method: "invited" }),
      hasRestrictedAccess: true,
    });
    const result = await submit({ procurementFunction: "none" });
    expect(result.status).toBe(200);
  });

  it("CASE K — invited engineer can submit on a restricted RFQ", async () => {
    mockQuoteClient({
      rfq: openRfq({ sourcing_method: "sealed_bid" }),
      hasRestrictedAccess: true,
    });
    const result = await submit({ procurementFunction: "consultant" });
    expect(result.status).toBe(200);
  });

  it("CASE L — non-invited company is denied on a restricted RFQ", async () => {
    const harness = mockQuoteClient({
      rfq: openRfq({ sourcing_method: "invited" }),
      hasRestrictedAccess: false,
    });
    const result = await submit({ procurementFunction: "supplier" });

    expect(result.status).toBe(403);
    expect(result.body.error).toBe(
      "You do not have access to submit a quotation for this RFQ.",
    );
    expect(harness.inserted).toBeNull();
  });

  it("CASE M — somebody else's invite does not authorize quote submission", async () => {
    mockQuoteClient({
      rfq: openRfq({ sourcing_method: "invited" }),
      hasRestrictedAccess: false,
    });
    membershipMock.mockResolvedValue(membership());
    const result = await readJson(
      await postQuotes(
        jsonRequest({
          ...validQuoteBody,
          isInvited: true,
          inviteToken: "stolen-invitation-token",
          companyType: "supplier",
          canRespond: true,
        }),
      ),
    );

    expect(result.status).toBe(403);
    expect(result.body.error).toBe(
      "You do not have access to submit a quotation for this RFQ.",
    );
  });

  it("CASE N — anonymous users are denied before membership lookup", async () => {
    mockQuoteClient({ user: null });
    const result = await readJson(await postQuotes(jsonRequest(validQuoteBody)));

    expect(result.status).toBe(401);
    expect(result.body.error).toBe("Unauthorized");
    expect(membershipMock).not.toHaveBeenCalled();
  });

  it("CASE O — users without active acting-company membership are denied", async () => {
    mockQuoteClient();
    membershipMock.mockResolvedValue(null);
    const result = await readJson(await postQuotes(jsonRequest(validQuoteBody)));

    expect(result.status).toBe(403);
    expect(result.body.error).toBe(
      "You must belong to an active company to submit a quotation.",
    );
  });

  it("CASE P — issuer cannot quote its own RFQ", async () => {
    mockQuoteClient({
      rfq: openRfq({ company_id: COMPANY_ID }),
    });
    const result = await submit({ procurementFunction: "supplier" });

    expect(result.status).toBe(403);
    expect(result.body.error).toBe(
      "Your company cannot submit a quote to its own RFQ.",
    );
  });

  it("CASE Q — deadline expired submissions are denied", async () => {
    mockQuoteClient({
      rfq: openRfq({ deadline: "2020-01-01T00:00:00.000Z" }),
    });
    const result = await submit();

    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/deadline has passed/i);
  });

  it("CASE R — non-open RFQs are denied", async () => {
    mockQuoteClient({
      rfq: openRfq({ status: "closed" }),
    });
    const result = await submit();

    expect(result.status).toBe(400);
    expect(result.body.error).toBe("This RFQ is no longer accepting quotes.");
  });

  it("CASE S — duplicate company responses are denied", async () => {
    mockQuoteClient({
      existingQuote: { id: QUOTE_ID },
    });
    const result = await submit();

    expect(result.status).toBe(409);
    expect(result.body.error).toBe(
      "Your company has already submitted a quote for this RFQ.",
    );
  });

  it("CASE T — awarded/locked RFQs are denied", async () => {
    mockQuoteClient({
      rfq: openRfq({ awarded_quote_id: QUOTE_ID }),
    });
    const result = await submit();

    expect(result.status).toBe(400);
    expect(result.body.error).toBe("This RFQ is no longer accepting quotes.");
  });

  it("does not grant issuer writes to a respondent-only membership", () => {
    const respondent = membership({ procurementFunction: "none" });
    expect(canCreateCompanyRfq(respondent, COMPANY_ID)).toBe(false);
    expect(canInviteCompanySuppliers(respondent, COMPANY_ID)).toBe(false);
  });
});
