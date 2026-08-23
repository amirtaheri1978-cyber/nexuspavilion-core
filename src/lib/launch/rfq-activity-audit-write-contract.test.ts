import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
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
import { createClient } from "@/lib/supabase/server";
import { POST as postRfqs } from "@/app/api/rfqs/route";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const RFQ_ID = "33333333-3333-3333-3333-333333333333";

const createClientMock = vi.mocked(createClient);
const membershipMock = vi.mocked(getActiveMembershipForUserCompany);
let errorSpy: MockInstance<(typeof console)["error"]>;
const routeSource = readFileSync(
  resolve(process.cwd(), "src/app/api/rfqs/route.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const helperSource = readFileSync(
  resolve(process.cwd(), "src/lib/procurement/record-procurement-activity.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

type RpcCall = {
  fn: string;
  args: Record<string, unknown>;
};

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
  return new Request("http://localhost/api/rfqs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockClient({
  rpcError = null,
  rpcData = { success: true },
}: {
  rpcError?: { code: string; message: string } | null;
  rpcData?: { success?: boolean; error_code?: string; error_message?: string };
} = {}) {
  const rpcCalls: RpcCall[] = [];

  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: {
          user: { id: USER_ID, email: "buyer@example.com" },
        },
        error: null,
      }),
    },
    from(table: string) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        insert() {
          return query;
        },
        async single() {
          if (table === "profiles") {
            return {
              data: {
                id: USER_ID,
                email: "buyer@example.com",
                company_id: COMPANY_ID,
              },
              error: null,
            };
          }

          if (table === "rfqs") {
            return {
              data: {
                id: RFQ_ID,
                title: "Harbor Package",
                slug: "harbor-package",
                budget: "100000",
                category: "Materials",
                location: "Toronto",
                deadline: "2026-09-01T12:00:00.000Z",
                company_id: COMPANY_ID,
              },
              error: null,
            };
          }

          return { data: null, error: null };
        },
      };

      return query;
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      return { data: rpcData, error: rpcError };
    },
  } as never);

  return rpcCalls;
}

describe("RFQ create activity and audit write contract", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    membershipMock.mockReset();
    membershipMock.mockResolvedValue(membership());
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("records RFQ_CREATED through the trusted activity RPC and still returns RFQ success", async () => {
    const rpcCalls = mockClient();

    const response = await postRfqs(
      jsonRequest({
        title: "Harbor Package",
        deadline: "2026-09-01T12:00:00.000Z",
        procurement_scope: "material",
      }),
    );

    expect(response.status).toBe(200);
    expect(rpcCalls).toEqual([
      {
        fn: "record_procurement_activity",
        args: {
          p_activity_kind: "rfq_created",
          p_entity_id: RFQ_ID,
        },
      },
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs sanitized event-write failures and still returns RFQ success", async () => {
    mockClient({
      rpcError: {
        code: "42501",
        message: "permission denied for table audit_logs",
      },
    });

    const response = await postRfqs(
      jsonRequest({
        title: "Harbor Package",
        deadline: "2026-09-01T12:00:00.000Z",
      }),
    );
    const body = (await response.json()) as { success?: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      "Procurement activity was not recorded.",
      expect.objectContaining({
        userId: USER_ID,
        companyId: COMPANY_ID,
        entityId: RFQ_ID,
        activityKind: "rfq_created",
        error: {
          code: "42501",
          message: "permission denied for table audit_logs",
        },
      }),
    );

    const errorPayloads = errorSpy.mock.calls.map((call) =>
      JSON.stringify(call[1]),
    );
    expect(errorPayloads.join("\n")).not.toContain("invite");
    expect(errorPayloads.join("\n")).not.toContain("token");
    expect(errorPayloads.join("\n")).not.toContain("cookie");
    expect(errorPayloads.join("\n")).not.toContain("jwt");
  });

  it("does not silently discard unsuccessful trusted-writer payloads", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        success: false,
        error_code: "INVALID_ACTIVITY_KIND",
        error_message: "Unsupported procurement activity.",
      },
      error: null,
    });

    await recordTrustedProcurementActivity(
      { rpc },
      "rfq_created",
      RFQ_ID,
      { userId: USER_ID, companyId: COMPANY_ID },
    );

    expect(rpc).toHaveBeenCalledWith("record_procurement_activity", {
      p_activity_kind: "rfq_created",
      p_entity_id: RFQ_ID,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Procurement activity was not recorded.",
      expect.objectContaining({
        activityKind: "rfq_created",
        error: {
          code: "INVALID_ACTIVITY_KIND",
          message: "Unsupported procurement activity.",
        },
      }),
    );
  });

  it("keeps RFQ create off direct audit_logs and notifications inserts", () => {
    expect(routeSource).toContain("recordTrustedProcurementActivity");
    expect(routeSource).toContain('"rfq_created"');
    expect(routeSource).not.toContain('.from("audit_logs")');
    expect(routeSource).not.toContain('.from("notifications")');
    expect(helperSource).toContain("if (error)");
    expect(helperSource).toContain("result.success === true");
    expect(helperSource).toContain("describeClientWriteError");
  });
});
