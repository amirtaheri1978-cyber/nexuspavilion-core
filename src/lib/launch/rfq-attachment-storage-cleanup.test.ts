import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
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

import { DELETE, GET } from "@/app/api/rfq-attachments/route";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { createClient } from "@/lib/supabase/server";

const USER_ID = "22222222-2222-4222-8222-222222222222";
const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const RFQ_ID = "33333333-3333-4333-8333-333333333333";
const ATTACHMENT_ID = "44444444-4444-4444-8444-444444444444";
const PENDING_ATTACHMENT_ID = "77777777-7777-4777-8777-777777777777";
const ADDENDUM_ID = "55555555-5555-4555-8555-555555555555";
const FILE_PATH = `${COMPANY_ID}/${RFQ_ID}/drawing/test.pdf`;
const PENDING_FILE_PATH = `${COMPANY_ID}/${RFQ_ID}/drawing/pending.pdf`;
const AFFECTED_KEY = `attachment:${ATTACHMENT_ID}`;

const cleanupDiscoveryMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260914032500_list_pending_rfq_attachment_cleanups.sql",
  ),
  "utf8",
);

const createClientMock = vi.mocked(createClient);
const membershipMock = vi.mocked(getActiveMembershipForUserCompany);

type StorageError = { name?: string; status?: number; statusCode?: string };

type Harness = {
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  removedPaths: string[];
  dbDeletes: string[];
};

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/rfq-attachments", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest() {
  return new Request(
    `http://localhost/api/rfq-attachments?rfqId=${RFQ_ID}`,
  );
}

function removalEvidence(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: ADDENDUM_ID,
    rfq_id: RFQ_ID,
    company_id: COMPANY_ID,
    affected_fields: [AFFECTED_KEY],
    amendment_before: {
      [AFFECTED_KEY]: {
        id: ATTACHMENT_ID,
        rfq_id: RFQ_ID,
        company_id: COMPANY_ID,
        file_path: FILE_PATH,
      },
    },
    amendment_after: { [AFFECTED_KEY]: null },
    addendum_number: 4,
    ...overrides,
  };
}

function mockSupabase({
  user = { id: USER_ID },
  attachment = {
    id: ATTACHMENT_ID,
    rfq_id: RFQ_ID,
    file_path: FILE_PATH,
  },
  rfq = { id: RFQ_ID, company_id: COMPANY_ID, status: "open" },
  evidence = removalEvidence(),
  storageError = null,
  rpcError = null,
  rpcResult = { success: true, addendum_id: ADDENDUM_ID },
  pendingCleanupResult = [],
  pendingCleanupError = null,
}: {
  user?: { id: string } | null;
  attachment?: Record<string, unknown> | null;
  rfq?: Record<string, unknown> | null;
  evidence?: Record<string, unknown> | null;
  storageError?: StorageError | null;
  rpcError?: { message: string } | null;
  rpcResult?: Record<string, unknown> | null;
  pendingCleanupResult?: Array<Record<string, unknown>>;
  pendingCleanupError?: { message: string } | null;
} = {}): Harness {
  const harness: Harness = {
    rpcCalls: [],
    removedPaths: [],
    dbDeletes: [],
  };

  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user },
        error: null,
      }),
    },
    from(table: string) {
      if (table === "rfq_attachments") {
        const selectQuery = {
          select: () => selectQuery,
          eq: () => selectQuery,
          maybeSingle: async () => ({ data: attachment, error: null }),
          order: async () => ({
            data: attachment ? [attachment] : [],
            error: null,
          }),
          delete: () => ({
            eq: async (_column: string, value: string) => {
              harness.dbDeletes.push(value);
              return { error: null };
            },
          }),
        };

        return selectQuery;
      }

      if (table === "rfqs") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: rfq, error: null }),
        };

        return query;
      }

      if (table === "rfq_addenda") {
        const query = {
          select: () => query,
          contains: () => query,
          order: () => query,
          limit: () => query,
          maybeSingle: async () => ({ data: evidence, error: null }),
        };

        return query;
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      harness.rpcCalls.push({ fn, args });

      if (fn === "list_pending_rfq_attachment_cleanups") {
        return { data: pendingCleanupResult, error: pendingCleanupError };
      }

      return { data: rpcResult, error: rpcError };
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("rfq-attachments");

        return {
          remove: async (paths: string[]) => {
            harness.removedPaths.push(...paths);
            return { data: storageError ? null : [], error: storageError };
          },
        };
      },
    },
  } as never);

  return harness;
}

async function responseJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("18-24 persistent attachment cleanup discovery migration", () => {
  it("keeps orphan discovery purpose-bound, issuer-authorized, and read-only", () => {
    expect(cleanupDiscoveryMigration).toContain(
      "create or replace function public.list_pending_rfq_attachment_cleanups(",
    );
    expect(cleanupDiscoveryMigration).toContain("security definer");
    expect(cleanupDiscoveryMigration).toContain("set search_path = ''");
    expect(cleanupDiscoveryMigration).toContain(
      "from storage.objects as stored_object",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "from public.organization_memberships as om",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "or om.procurement_function = 'buyer'",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "from public.rfq_attachments as attachment",
    );
    expect(cleanupDiscoveryMigration).toContain("where auth.uid() is not null");
    expect(cleanupDiscoveryMigration).toContain("r.status <> 'draft'");
    expect(cleanupDiscoveryMigration).toContain(
      "evidence.key = any (addendum.affected_fields)",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "evidence.value ->> 'id' = substring(evidence.key from 12)",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "evidence.value ->> 'rfq_id' = r.id::text",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "evidence.value ->> 'company_id' = r.company_id::text",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "coalesce(evidence.value ->> 'file_name', '') <> ''",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "coalesce(evidence.value ->> 'file_path', '') <> ''",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "jsonb_typeof(addendum.amendment_after -> evidence.key) = 'null'",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "attachment.id = (substring(evidence.key from 12))::uuid",
    );
    expect(cleanupDiscoveryMigration).toContain("attachment.rfq_id = r.id");
    expect(cleanupDiscoveryMigration).toContain(
      "stored_object.bucket_id = 'rfq-attachments'",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "stored_object.name = evidence.value ->> 'file_path'",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "(storage.foldername(stored_object.name))[1] = r.company_id::text",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "(storage.foldername(stored_object.name))[2] = r.id::text",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "revoke all\non function public.list_pending_rfq_attachment_cleanups(uuid)\nfrom public;",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "revoke all\non function public.list_pending_rfq_attachment_cleanups(uuid)\nfrom anon;",
    );
    expect(cleanupDiscoveryMigration).toContain(
      "grant execute\non function public.list_pending_rfq_attachment_cleanups(uuid)\nto authenticated;",
    );
    expect(cleanupDiscoveryMigration).not.toMatch(
      /(?:delete\s+from|update|insert\s+into)\s+storage\.objects/i,
    );
    expect(cleanupDiscoveryMigration).not.toContain("service_role");
  });
});

describe("18-24 governed RFQ attachment storage cleanup", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    membershipMock.mockReset();
    membershipMock.mockResolvedValue({
      id: "membership-1",
      userId: USER_ID,
      companyId: COMPANY_ID,
      workspaceRole: "owner",
      procurementFunction: "none",
      membershipType: "founder",
      membershipStatus: "active",
      jobTitle: null,
      jobFunction: null,
      invitedBy: null,
      joinedAt: null,
    });
  });

  it("discovers persistent cleanup records after the live attachment row is gone", async () => {
    const harness = mockSupabase({
      attachment: null,
      pendingCleanupResult: [
        {
          attachment_id: ATTACHMENT_ID,
          addendum_id: ADDENDUM_ID,
          rfq_id: RFQ_ID,
          company_id: COMPANY_ID,
          file_name: "test.pdf",
          file_path: FILE_PATH,
          file_size: 123,
          attachment_type: "drawing",
          revision_label: "Rev 0",
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
    });

    const response = await GET(getRequest());
    const body = await responseJson(response);

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toContainEqual({
      fn: "list_pending_rfq_attachment_cleanups",
      args: { p_rfq_id: RFQ_ID },
    });
    expect(body.attachments).toEqual([
      expect.objectContaining({
        id: ATTACHMENT_ID,
        cleanup_pending: true,
        cleanup_addendum_id: ADDENDUM_ID,
      }),
    ]);
  });

  it("does not invoke pending-cleanup discovery for an unauthenticated request", async () => {
    const harness = mockSupabase({
      user: null,
      pendingCleanupResult: [
        {
          attachment_id: PENDING_ATTACHMENT_ID,
          addendum_id: ADDENDUM_ID,
          rfq_id: RFQ_ID,
          company_id: COMPANY_ID,
          file_name: "pending.pdf",
          file_path: PENDING_FILE_PATH,
          file_size: 321,
          attachment_type: "drawing",
          revision_label: "Rev 0",
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
    });

    const response = await GET(getRequest());
    const body = await responseJson(response);

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toHaveLength(0);
    expect(body.attachments).toEqual([
      {
        id: ATTACHMENT_ID,
        rfq_id: RFQ_ID,
        file_path: FILE_PATH,
      },
    ]);
  });

  it("fails closed when pending-cleanup discovery RPC fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase({
      pendingCleanupError: { message: "permission denied: internal detail" },
    });

    const response = await GET(getRequest());
    const body = await responseJson(response);

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Unable to load pending attachment cleanup state.",
    });
    expect(JSON.stringify(body)).not.toContain("permission denied");
    expect(consoleError).toHaveBeenCalledWith(
      "Pending RFQ attachment cleanup discovery failed.",
      {
        rfqId: RFQ_ID,
        userId: USER_ID,
      },
    );
    consoleError.mockRestore();
  });

  it("rejects malformed pending-cleanup rows before exposing them to the UI", async () => {
    mockSupabase({
      attachment: null,
      pendingCleanupResult: [
        {
          attachment_id: PENDING_ATTACHMENT_ID,
          addendum_id: ADDENDUM_ID,
          rfq_id: RFQ_ID,
          company_id: COMPANY_ID,
          file_name: "forged.pdf",
          file_path: `${COMPANY_ID}/${RFQ_ID}/../forged.pdf`,
          file_size: 123,
          attachment_type: "drawing",
          revision_label: "Rev 0",
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
    });

    const response = await GET(getRequest());
    const body = await responseJson(response);

    expect(response.status).toBe(200);
    expect(body.attachments).toEqual([]);
  });

  it("preserves live attachment rows while appending validated pending cleanup rows", async () => {
    mockSupabase({
      pendingCleanupResult: [
        {
          attachment_id: PENDING_ATTACHMENT_ID,
          addendum_id: ADDENDUM_ID,
          rfq_id: RFQ_ID,
          company_id: COMPANY_ID,
          file_name: "pending.pdf",
          file_path: PENDING_FILE_PATH,
          file_size: 321,
          attachment_type: "drawing",
          revision_label: "Rev 0",
          created_at: "2026-09-14T00:00:00.000Z",
        },
      ],
    });

    const response = await GET(getRequest());
    const body = await responseJson(response);
    const attachments = body.attachments as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(attachments).toHaveLength(2);
    expect(attachments[0]).toEqual({
      id: ATTACHMENT_ID,
      rfq_id: RFQ_ID,
      file_path: FILE_PATH,
    });
    expect(attachments[1]).toMatchObject({
      id: PENDING_ATTACHMENT_ID,
      file_name: "pending.pdf",
      file_path: PENDING_FILE_PATH,
      cleanup_pending: true,
      cleanup_addendum_id: ADDENDUM_ID,
    });
  });

  it("removes governed storage after exactly one successful amendment RPC", async () => {
    const harness = mockSupabase();
    const response = await DELETE(
      request({
        attachmentId: ATTACHMENT_ID,
        addendumTitle: "Remove drawing",
        amendmentReason: "Replace obsolete drawing.",
      }),
    );

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toHaveLength(1);
    expect(harness.rpcCalls[0]?.fn).toBe("amend_published_rfq_package");
    expect(harness.removedPaths).toEqual([FILE_PATH]);
    expect(await responseJson(response)).toMatchObject({
      success: true,
      addendumId: ADDENDUM_ID,
      storageCleanupPending: false,
    });
  });

  it("returns non-2xx and sanitized retry guidance when governed cleanup fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = mockSupabase({
      storageError: { name: "StorageApiError", status: 403, statusCode: "403" },
    });
    const response = await DELETE(
      request({
        attachmentId: ATTACHMENT_ID,
        addendumTitle: "Remove drawing",
        amendmentReason: "Replace obsolete drawing.",
      }),
    );

    expect(response.status).toBe(502);
    expect(harness.rpcCalls).toHaveLength(1);
    expect(await responseJson(response)).toMatchObject({
      storageCleanupPending: true,
      retryable: true,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Governed RFQ attachment storage cleanup failed.",
      expect.objectContaining({
        attachmentId: ATTACHMENT_ID,
        rfqId: RFQ_ID,
        errorCode: "403",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(FILE_PATH);
    consoleError.mockRestore();
  });

  it("retries from immutable removal evidence without creating another Addendum", async () => {
    const harness = mockSupabase({ attachment: null });
    const response = await DELETE(
      request({
        attachmentId: ATTACHMENT_ID,
        filePath: "attacker-controlled/wrong.pdf",
        addendumTitle: "Forged duplicate",
      }),
    );

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toHaveLength(0);
    expect(harness.removedPaths).toEqual([FILE_PATH]);
    expect(await responseJson(response)).toMatchObject({
      success: true,
      attachmentId: ATTACHMENT_ID,
      addendumId: ADDENDUM_ID,
      storageCleanupRetried: true,
    });
  });

  it("treats an already-absent governed storage object as idempotent success", async () => {
    const harness = mockSupabase({ attachment: null, storageError: null });
    const response = await DELETE(request({ attachmentId: ATTACHMENT_ID }));

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toHaveLength(0);
    expect(harness.removedPaths).toEqual([FILE_PATH]);
  });

  it.each([
    {
      label: "attachment identity",
      evidence: removalEvidence({
        amendment_before: {
          [AFFECTED_KEY]: {
            id: "66666666-6666-4666-8666-666666666666",
            rfq_id: RFQ_ID,
            company_id: COMPANY_ID,
            file_path: FILE_PATH,
          },
        },
      }),
    },
    {
      label: "company path",
      evidence: removalEvidence({
        amendment_before: {
          [AFFECTED_KEY]: {
            id: ATTACHMENT_ID,
            rfq_id: RFQ_ID,
            company_id: COMPANY_ID,
            file_path: `99999999-9999-4999-8999-999999999999/${RFQ_ID}/drawing/wrong.pdf`,
          },
        },
      }),
    },
    {
      label: "null removal result",
      evidence: removalEvidence({
        amendment_after: {
          [AFFECTED_KEY]: { id: ATTACHMENT_ID },
        },
      }),
    },
  ])("denies forged immutable removal evidence: $label", async ({ evidence }) => {
    const harness = mockSupabase({ attachment: null, evidence });
    const response = await DELETE(request({ attachmentId: ATTACHMENT_ID }));

    expect(response.status).toBe(404);
    expect(harness.rpcCalls).toHaveLength(0);
    expect(harness.removedPaths).toHaveLength(0);
  });

  it("preserves the existing direct draft delete and cleanup behavior", async () => {
    const harness = mockSupabase({
      rfq: { id: RFQ_ID, company_id: COMPANY_ID, status: "draft" },
      storageError: { statusCode: "403" },
    });
    const response = await DELETE(request({ attachmentId: ATTACHMENT_ID }));

    expect(response.status).toBe(200);
    expect(harness.dbDeletes).toEqual([ATTACHMENT_ID]);
    expect(harness.rpcCalls).toHaveLength(0);
    expect(await responseJson(response)).toMatchObject({
      success: true,
      storageCleanupPending: true,
    });
  });
});