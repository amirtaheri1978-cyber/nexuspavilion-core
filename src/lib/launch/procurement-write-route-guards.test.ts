import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import { PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR } from "@/lib/auth/professional-names";

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
import { POST as postAward } from "@/app/api/award-contract/route";
import { POST as postCreateCompany } from "@/app/api/companies/create/route";
import { POST as postInvites } from "@/app/api/invites/route";
import { POST as postIdentity } from "@/app/api/profile/professional-identity/route";
import { POST as postQuoteDecision } from "@/app/api/quote-decision/route";
import { POST as postQuotes } from "@/app/api/quotes/route";
import { POST as postAddenda } from "@/app/api/rfq-addenda/route";
import { POST as postAcknowledgements } from "@/app/api/rfq-addendum-acknowledgements/route";
import { POST as postAttachments } from "@/app/api/rfq-attachments/route";
import { POST as postRfqs } from "@/app/api/rfqs/route";
import { POST as postVerificationSubmit } from "@/app/api/representative-verification/submit/route";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

const createClientMock = vi.mocked(createClient);
const membershipMock = vi.mocked(getActiveMembershipForUserCompany);

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return {
    status: response.status,
    body: (await response.json()) as { error?: string; errorCode?: string },
  };
}

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

function mockClient(user: { id: string; email?: string } | null) {
  const profile = user
    ? {
        id: user.id,
        company_id: COMPANY_ID,
        email: user.email ?? "buyer@example.com",
      }
    : null;

  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: "Auth session missing" },
      }),
    },
    from() {
      const result = {
        data: profile,
        error: profile ? null : { message: "No company linked to profile" },
      };

      const query = {
        select: () => query,
        eq: () => query,
        single: async () => result,
        maybeSingle: async () => result,
      };

      return query;
    },
  } as never);
}

describe("launch-critical write route guards", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    membershipMock.mockReset();
    mockClient(null);
  });

  it("rejects unauthenticated procurement and identity writes before any database mutation", async () => {
    const unauthenticated = await Promise.all([
      readJson(await postQuotes(new Request("http://localhost/api/quotes", { method: "POST" }))),
      readJson(await postRfqs(new Request("http://localhost/api/rfqs", { method: "POST" }))),
      readJson(
        await postAward(
          jsonRequest("http://localhost/api/award-contract", {
            quoteId: "33333333-3333-3333-3333-333333333333",
          }),
        ),
      ),
      readJson(
        await postQuoteDecision(
          jsonRequest("http://localhost/api/quote-decision", {
            quoteId: "33333333-3333-3333-3333-333333333333",
            decision: "approved",
          }),
        ),
      ),
      readJson(
        await postInvites(
          jsonRequest("http://localhost/api/invites", {
            rfqId: "44444444-4444-4444-4444-444444444444",
            email: "supplier@example.com",
          }),
        ),
      ),
      readJson(
        await postAddenda(new Request("http://localhost/api/rfq-addenda", { method: "POST" })),
      ),
      readJson(
        await postAttachments(
          new Request("http://localhost/api/rfq-attachments", { method: "POST" }),
        ),
      ),
      readJson(
        await postAcknowledgements(
          new Request("http://localhost/api/rfq-addendum-acknowledgements", {
            method: "POST",
          }),
        ),
      ),
      readJson(await postVerificationSubmit(new Request("http://localhost/api/representative-verification/submit", { method: "POST" }))),
      readJson(
        await postCreateCompany(
          jsonRequest("http://localhost/api/companies/create", {
            name: "Harbor Steel Co",
            location: "Toronto, Ontario",
            accountType: "buyer_owner",
          }),
        ),
      ),
      readJson(
        await postIdentity(
          jsonRequest("http://localhost/api/profile/professional-identity", {
            firstName: "Ada",
            lastName: "Lovelace",
            jobTitle: "Director",
          }),
        ),
      ),
    ]);

    for (const result of unauthenticated) {
      expect(result.status).toBe(401);
    }

    expect(unauthenticated[8]?.body.errorCode).toBe("AUTHENTICATION_REQUIRED");
    expect(unauthenticated[10]?.body.error).toBe(
      PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR,
    );
    expect(membershipMock).not.toHaveBeenCalled();
  });

  it("rejects a buyer membership on the canonical quote API and a supplier membership on RFQ create and invite", async () => {
    mockClient({ id: USER_ID, email: "workspace@example.com" });

    membershipMock.mockResolvedValueOnce(
      membership({ procurementFunction: "buyer" }),
    );
    const quoteAsBuyer = await readJson(
      await postQuotes(
        jsonRequest("http://localhost/api/quotes", {
          slug: "harbor-package",
          amount: "100000",
          timeline: "16 months",
          message: "Firm lump-sum proposal with documented delivery.",
        }),
      ),
    );

    membershipMock.mockResolvedValueOnce(
      membership({ procurementFunction: "supplier" }),
    );
    const rfqAsSupplier = await readJson(
      await postRfqs(new Request("http://localhost/api/rfqs", { method: "POST" })),
    );

    membershipMock.mockResolvedValueOnce(
      membership({ procurementFunction: "supplier" }),
    );
    const inviteAsSupplier = await readJson(
      await postInvites(
        jsonRequest("http://localhost/api/invites", {
          rfqId: "44444444-4444-4444-4444-444444444444",
          email: "supplier@example.com",
        }),
      ),
    );

    expect(quoteAsBuyer.status).toBe(403);
    expect(quoteAsBuyer.body.error).toBe(
      "Only authorized supplier accounts can submit quotations.",
    );
    expect(rfqAsSupplier.status).toBe(403);
    expect(rfqAsSupplier.body.error).toBe(
      "Only owners, admins, and buyers can create RFQs.",
    );
    expect(inviteAsSupplier.status).toBe(403);
    expect(inviteAsSupplier.body.error).toBe(
      "Only organization owners, administrators, or buyers can invite suppliers.",
    );
  });
});
