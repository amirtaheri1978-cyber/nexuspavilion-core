import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { OrganizationMembership } from "@/lib/auth/membership";

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
import { sendEmail } from "@/lib/email/send-email";
import { createClient } from "@/lib/supabase/server";
import { POST as postInvites } from "@/app/api/invites/route";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const RFQ_ID = "44444444-4444-4444-4444-444444444444";
const SUPPLIER_EMAIL = "supplier@example.test";
const PUBLIC_ORIGIN = "https://launch.nexuspavilion.com";
const EXISTING_TOKEN = "existingrfqinvitetokenvalue32ch";

const createClientMock = vi.mocked(createClient);
const membershipMock = vi.mocked(getActiveMembershipForUserCompany);
const sendEmailMock = vi.mocked(sendEmail);

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

type InviteJson = {
  success?: boolean;
  error?: string;
  inviteUrl?: string;
  absoluteInviteUrl?: string;
  message?: string;
  email?: {
    sent?: boolean;
    skipped?: boolean;
    id?: string | null;
    error?: string | null;
  };
};

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function membership(): OrganizationMembership {
  return {
    id: "membership-1",
    userId: USER_ID,
    companyId: COMPANY_ID,
    workspaceRole: "owner",
    procurementFunction: "buyer",
    membershipType: "founder",
    membershipStatus: "active",
    jobTitle: null,
    jobFunction: null,
    invitedBy: null,
    joinedAt: null,
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/invites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockClient({
  existingInvite = null,
}: {
  existingInvite?: {
    id: string;
    rfq_id: string;
    email: string;
    token: string;
    status: string;
    created_at: string;
  } | null;
} = {}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];

  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: {
          user: { id: USER_ID, email: "buyer@example.test" },
        },
        error: null,
      }),
    },
    from(table: string) {
      let insertedPayload: Record<string, unknown> | null = null;

      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        limit() {
          return query;
        },
        in() {
          return query;
        },
        insert(payload: Record<string, unknown>) {
          insertedPayload = payload;
          inserts.push({ table, payload });
          return query;
        },
        async maybeSingle() {
          if (table === "rfq_invites") {
            return { data: existingInvite, error: null };
          }

          return { data: null, error: null };
        },
        async single() {
          if (table === "profiles") {
            return {
              data: {
                id: USER_ID,
                email: "buyer@example.test",
                company_id: COMPANY_ID,
              },
              error: null,
            };
          }

          if (table === "rfqs") {
            return {
              data: {
                id: RFQ_ID,
                title: "Level 4 Electrical & Lighting Upgrade",
                slug: "level-4-electrical-lighting-upgrade",
                company_id: COMPANY_ID,
                status: "open",
                category: "Electrical",
                budget: "250000",
                deadline: "2026-12-31T17:00:00.000Z",
                procurement_scope: "subcontractor",
                sourcing_method: "invited",
                contract_framework: "project_specific",
              },
              error: null,
            };
          }

          if (table === "rfq_invites") {
            return {
              data: {
                id: "new-invite-row-id",
                rfq_id: RFQ_ID,
                email: SUPPLIER_EMAIL,
                token: insertedPayload?.token,
                status: insertedPayload?.status ?? "sent",
                created_at: "2026-08-25T00:00:00.000Z",
              },
              error: null,
            };
          }

          return { data: null, error: null };
        },
        then(
          onFulfilled: (value: { data: null; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return Promise.resolve({ data: null, error: null }).then(
            onFulfilled,
            onRejected,
          );
        },
      };

      return query;
    },
  } as never);

  return inserts;
}

describe("RFQ invitation email delivery", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    membershipMock.mockReset();
    sendEmailMock.mockReset();
    membershipMock.mockResolvedValue(membership());
    process.env.NEXT_PUBLIC_SITE_URL = PUBLIC_ORIGIN;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
    }
    vi.mocked(console.warn).mockRestore();
    vi.mocked(console.error).mockRestore();
  });

  it("invokes sendEmail with the supplier recipient and canonical invite URL", async () => {
    const inserts = mockClient();
    sendEmailMock.mockResolvedValue({
      success: true,
      skipped: false,
      id: "re_test_message_id",
      error: null,
    });

    const response = await postInvites(
      jsonRequest({
        rfqId: RFQ_ID,
        email: SUPPLIER_EMAIL,
      }),
    );
    const body = (await response.json()) as InviteJson;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const payload = sendEmailMock.mock.calls[0]?.[0];
    expect(payload?.to).toBe(SUPPLIER_EMAIL);
    expect(payload?.subject).toBe(
      "RFQ Invitation: Level 4 Electrical & Lighting Upgrade",
    );
    expect(payload?.html).toContain(`${PUBLIC_ORIGIN}/rfq/invite/`);
    expect(payload?.html).not.toContain("/submit");
    expect(payload?.text).toContain(`${PUBLIC_ORIGIN}/rfq/invite/`);
    expect(body.inviteUrl).toMatch(/^\/rfq\/invite\/[a-z0-9]+$/);
    expect(body.absoluteInviteUrl).toBe(
      `${PUBLIC_ORIGIN}${body.inviteUrl}`,
    );
    expect(body.email).toEqual({
      sent: true,
      skipped: false,
      id: "re_test_message_id",
      error: null,
    });

    const inviteInsert = inserts.find((entry) => entry.table === "rfq_invites");
    expect(inviteInsert?.payload).toMatchObject({
      rfq_id: RFQ_ID,
      email: SUPPLIER_EMAIL,
      status: "sent",
    });
  });

  it("resends through sendEmail when an existing invite is reused", async () => {
    mockClient({
      existingInvite: {
        id: "existing-invite-row-id",
        rfq_id: RFQ_ID,
        email: SUPPLIER_EMAIL,
        token: EXISTING_TOKEN,
        status: "sent",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    });
    sendEmailMock.mockResolvedValue({
      success: true,
      skipped: false,
      id: "re_resend_message_id",
      error: null,
    });

    const response = await postInvites(
      jsonRequest({
        rfqId: RFQ_ID,
        email: SUPPLIER_EMAIL,
      }),
    );
    const body = (await response.json()) as InviteJson;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Supplier has already been invited to this RFQ.");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]?.[0]?.to).toBe(SUPPLIER_EMAIL);
    expect(sendEmailMock.mock.calls[0]?.[0]?.html).toContain(
      `${PUBLIC_ORIGIN}/rfq/invite/${EXISTING_TOKEN}`,
    );
    expect(body.inviteUrl).toBe(`/rfq/invite/${EXISTING_TOKEN}`);
    expect(body.absoluteInviteUrl).toBe(
      `${PUBLIC_ORIGIN}/rfq/invite/${EXISTING_TOKEN}`,
    );
    expect(body.email?.sent).toBe(true);
  });

  it("skips the provider when the public site URL is unset and does not claim email sent", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    mockClient();
    sendEmailMock.mockResolvedValue({
      success: true,
      skipped: false,
      id: "should-not-send",
      error: null,
    });

    const response = await postInvites(
      jsonRequest({
        rfqId: RFQ_ID,
        email: SUPPLIER_EMAIL,
      }),
    );
    const body = (await response.json()) as InviteJson;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(body.email).toEqual({
      sent: false,
      skipped: true,
      id: null,
      error: "Public site URL is not configured.",
    });
    expect(body.absoluteInviteUrl).toMatch(/^\/rfq\/invite\//);
  });

  it("returns invitation success with email.sent false when the provider rejects the message", async () => {
    mockClient();
    sendEmailMock.mockResolvedValue({
      success: false,
      skipped: false,
      id: null,
      error: "The from address is not verified.",
    });

    const response = await postInvites(
      jsonRequest({
        rfqId: RFQ_ID,
        email: SUPPLIER_EMAIL,
      }),
    );
    const body = (await response.json()) as InviteJson;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(body.email).toEqual({
      sent: false,
      skipped: false,
      id: null,
      error: "The from address is not verified.",
    });
  });

  it("requires buyer authorization before any mail send", async () => {
    mockClient();
    membershipMock.mockResolvedValue({
      ...membership(),
      workspaceRole: "member",
      procurementFunction: "supplier",
    });

    const response = await postInvites(
      jsonRequest({
        rfqId: RFQ_ID,
        email: SUPPLIER_EMAIL,
      }),
    );
    const body = (await response.json()) as InviteJson;

    expect(response.status).toBe(403);
    expect(body.error).toBe(
      "Only organization owners, administrators, or buyers can invite suppliers.",
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("keeps invitation tokens as landing credentials and does not log them", () => {
    const invitesRoute = readSource("src/app/api/invites/route.ts");
    const invitePage = readSource("src/app/rfq/invite/[token]/page.tsx");
    const inviteForm = readSource("src/components/invite-vendor-form.tsx");
    const result = readSource(
      "src/components/rfq-workspace/supplier-invitation-result.tsx",
    );
    const companyInvites = readSource(
      "src/app/api/company-invitations/route.ts",
    );

    expect(invitesRoute).toContain('`${publicSiteUrl}/rfq/invite/${token}`');
    expect(invitesRoute).not.toContain("console.log(token");
    expect(invitesRoute).not.toContain("console.error(token");
    expect(invitesRoute).not.toContain("console.warn(token");
    expect(invitePage).toContain('rpc("get_rfq_invitation_context"');
    expect(invitePage).not.toContain('fetch("/api/quotes"');
    expect(inviteForm).toContain("setEmailResult(data.email || null)");
    expect(result).toContain("Invitation Email Sent");
    expect(result).toContain("Invitation Created, Email Failed");
    expect(companyInvites).toContain("await sendEmail({");
    expect(companyInvites).toContain("to: email");
  });
});
