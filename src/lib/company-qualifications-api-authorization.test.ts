import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

vi.mock("@/lib/auth/workspace-context", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/auth/workspace-context")>();

  return {
    ...actual,
    getCurrentWorkspaceContext: vi.fn(),
  };
});

import { GET, PUT } from "@/app/api/companies/[id]/qualifications/route";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { createClient } from "@/lib/supabase/server";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_COMPANY_ID = "99999999-9999-9999-9999-999999999999";
const USER_ID = "22222222-2222-2222-2222-222222222222";

const createClientMock = vi.mocked(createClient);
const workspaceContextMock = vi.mocked(getCurrentWorkspaceContext);

const sampleQualification = {
  name: "Electrical License",
  issuer: "State Board",
  credential_identifier: "EL-SECRET-100",
  issued_on: "2024-01-01",
  expires_on: "2028-01-01",
  is_public: false,
};

const invalidQualificationsPayload = {
  qualifications: {
    license: [
      {
        name: 4711,
        is_public: "yes",
        unexpected_field: true,
      },
    ],
  },
};

function jsonRequest(url: string, body: unknown, method = "PUT") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(companyId = COMPANY_ID) {
  return {
    params: Promise.resolve({ id: companyId }),
  };
}

function workspaceContext(
  overrides: Partial<Awaited<ReturnType<typeof getCurrentWorkspaceContext>>> = {},
) {
  return {
    user: { id: USER_ID, email: "owner@example.com" } as never,
    userId: USER_ID,
    email: "owner@example.com",
    companyId: COMPANY_ID,
    workspaceRole: "owner" as const,
    procurementFunction: "none" as const,
    membershipType: "founder" as const,
    membershipStatus: "active" as const,
    membership: {
      id: "membership-1",
      userId: USER_ID,
      companyId: COMPANY_ID,
      workspaceRole: "owner" as const,
      procurementFunction: "none" as const,
      membershipType: "founder" as const,
      membershipStatus: "active" as const,
      jobTitle: null,
      jobFunction: null,
      invitedBy: null,
      joinedAt: null,
    },
    migration: {
      source: "membership" as const,
      hasLegacyCompany: false,
      hasActiveMembership: true,
      companyMatchesLegacyProfile: true,
      isConsistent: true,
    },
    ...overrides,
  };
}

function mockSupabaseForQualifications({
  rpcResult,
  rpcError = null,
  selectData = [],
  auditError = null,
}: {
  rpcResult?: Record<string, unknown>;
  rpcError?: Record<string, unknown> | null;
  selectData?: Array<Record<string, unknown>>;
  auditError?: { message: string } | null;
}) {
  let auditInsertPayload: Record<string, unknown> | null = null;
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  createClientMock.mockResolvedValue({
    from(table: string) {
      if (table === "company_qualifications") {
        let orderCallCount = 0;
        const query = {
          select: () => query,
          eq: () => query,
          order: () => {
            orderCallCount += 1;

            if (orderCallCount >= 2) {
              return Promise.resolve({
                data: selectData,
                error: null,
              });
            }

            return query;
          },
        };

        return query;
      }

      if (table === "audit_logs") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            auditInsertPayload = payload;
            return {
              error: auditError,
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });

      return {
        data: rpcResult ?? { success: true, qualification_count: 1 },
        error: rpcError,
      };
    },
  } as never);

  return {
    getLastAuditInsertPayload: () => auditInsertPayload,
    getRpcCalls: () => rpcCalls,
  };
}

describe("company qualifications API authorization", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    workspaceContextMock.mockReset();
  });

  it("denies unauthenticated writes", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: { license: [sampleQualification] },
      }),
      routeContext(),
    );

    expect(response.status).toBe(401);
  });

  it("denies viewer writes", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "viewer",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "viewer",
        },
      }),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: { license: [sampleQualification] },
      }),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("denies member writes", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "member",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "member",
        },
      }),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: { license: [sampleQualification] },
      }),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("allows owner writes for the same company", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: {
          license: [sampleQualification],
          certification: [],
          accreditation: [],
          registration: [],
        },
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
  });

  it("allows admin writes for the same company", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "admin",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "admin",
        },
      }),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: {
          license: [sampleQualification],
          certification: [],
          accreditation: [],
          registration: [],
        },
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 for signed-out writes even when the payload is invalid", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/qualifications",
        invalidQualificationsPayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for inactive membership writes even when the payload is invalid", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        membership: null,
        membershipStatus: "revoked",
      }),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/qualifications",
        invalidQualificationsPayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 for member writes even when the payload is invalid", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "member",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "member",
        },
      }),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/qualifications",
        invalidQualificationsPayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 for viewer writes even when the payload is invalid", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "viewer",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "viewer",
        },
      }),
    );
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/qualifications",
        invalidQualificationsPayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 for cross-company writes even when the payload is invalid", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/qualifications",
        invalidQualificationsPayload,
      ),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for authorized writes with an invalid payload", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/qualifications",
        invalidQualificationsPayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects unsupported qualification item fields from authorized callers", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: {
          license: [{ ...sampleQualification, is_verified: true }],
        },
      }),
      routeContext(),
    );

    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("is_verified");
  });

  it("logs only safe context when the replace RPC fails", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({
      rpcError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint, Key (name)=(Electrical License)',
        details: "Key (credential_identifier)=(EL-SECRET-100) already exists.",
        hint: "Conflicting issuer State Board",
      },
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await PUT(
        jsonRequest("http://localhost/api/companies/1/qualifications", {
          qualifications: {
            license: [sampleQualification],
            certification: [],
            accreditation: [],
            registration: [],
          },
        }),
        routeContext(),
      );

      expect(response.status).toBe(500);
      expect(errorSpy).toHaveBeenCalledWith(
        "Company qualifications replacement failed.",
        {
          companyId: COMPANY_ID,
          userId: USER_ID,
          errorCode: "23505",
        },
      );

      const logged = JSON.stringify(errorSpy.mock.calls);

      expect(logged).not.toContain("EL-SECRET-100");
      expect(logged).not.toContain("State Board");
      expect(logged).not.toContain("Electrical License");
      expect(logged).not.toContain("duplicate key value");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("denies cross-company writes", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: { license: [sampleQualification] },
      }),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(response.status).toBe(403);
  });

  it("denies cross-company reads", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForQualifications({});

    const response = await GET(
      new Request("http://localhost/api/companies/1/qualifications"),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(response.status).toBe(403);
  });

  it("requires active membership for reads", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        membership: null,
        membershipStatus: "revoked",
      }),
    );
    mockSupabaseForQualifications({});

    const response = await GET(
      new Request("http://localhost/api/companies/1/qualifications"),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("allows active same-company members to read grouped qualifications", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "member",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "member",
        },
      }),
    );
    mockSupabaseForQualifications({
      selectData: [
        {
          id: "qual-1",
          company_id: COMPANY_ID,
          qualification_type: "license",
          name: "Electrical License",
          issuer: "State Board",
          credential_identifier: "EL-100",
          issued_on: "2024-01-01",
          expires_on: "2028-01-01",
          is_public: false,
          sort_order: 0,
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/companies/1/qualifications"),
      routeContext(),
    );

    const body = (await response.json()) as {
      success?: boolean;
      qualifications?: {
        license: Array<{ name: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.qualifications?.license[0]?.name).toBe("Electrical License");
  });

  it("delegates the write and its audit to replace_company_qualifications", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    const supabase = mockSupabaseForQualifications({
      rpcResult: {
        success: true,
        company_id: COMPANY_ID,
        qualification_count: 1,
        public_count: 0,
        counts_by_type: {
          license: 1,
          certification: 0,
          accreditation: 0,
          registration: 0,
        },
        audited: true,
      },
    });

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: {
          license: [sampleQualification],
          certification: [],
          accreditation: [],
          registration: [],
        },
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);

    const rpcCalls = supabase.getRpcCalls();

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]?.fn).toBe("replace_company_qualifications");
    expect(rpcCalls[0]?.args.p_company_id).toBe(COMPANY_ID);

    // The RPC owns the audit event; a second route-side insert would duplicate it.
    expect(supabase.getLastAuditInsertPayload()).toBeNull();

    const body = (await response.json()) as {
      qualificationCount?: number;
      publicCount?: number;
    };

    expect(body.qualificationCount).toBe(1);
    expect(body.publicCount).toBe(0);
  });

  it("never inserts a COMPANY_QUALIFICATIONS_UPDATED row from the route", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    const supabase = mockSupabaseForQualifications({});

    await PUT(
      jsonRequest("http://localhost/api/companies/1/qualifications", {
        qualifications: {
          license: [sampleQualification],
          certification: [],
          accreditation: [],
          registration: [],
        },
      }),
      routeContext(),
    );

    expect(supabase.getLastAuditInsertPayload()).toBeNull();
  });
});

describe("company qualifications API route contract", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/companies/[id]/qualifications/route.ts"),
    "utf8",
  );

  it("uses workspace context and management permission helpers", () => {
    expect(routeSource).toContain("getCurrentWorkspaceContext");
    expect(routeSource).toContain("canManageCompanyWorkspace");
    expect(routeSource).toContain("workspace.companyId !== id");
  });

  it("writes through replace_company_qualifications", () => {
    expect(routeSource).toContain('"replace_company_qualifications"');
    expect(routeSource).not.toContain('.from("companies").update');
    expect(routeSource).not.toContain("metadata:");
  });

  it("delegates the audit event to the RPC instead of inserting it directly", () => {
    // Executable statements only; the route may still describe RPC ownership
    // of the audit event in a comment.
    const routeCode = routeSource.replace(/^\s*\/\/.*$/gm, "");

    expect(routeCode).not.toContain("COMPANY_QUALIFICATIONS_UPDATED");
    expect(routeCode).not.toContain("audit_logs");
    expect(routeCode).not.toContain(".insert(");
    expect(routeCode).toContain('"replace_company_qualifications"');
  });

  it("resolves authorization before qualification payload validation", () => {
    const putBody = routeSource.slice(
      routeSource.indexOf("export async function PUT"),
    );

    expect(putBody.indexOf("canManageCompanyWorkspace({")).toBeLessThan(
      putBody.indexOf("await request.json()"),
    );
    expect(putBody.indexOf("workspace.companyId !== id")).toBeLessThan(
      putBody.indexOf("normalizeGroupedQualifications("),
    );
  });

  it("never passes a raw error object to any console.error call", () => {
    const logCalls = [
      ...routeSource.matchAll(/console\.error\(([\s\S]*?)\n\s*\}?\);/g),
    ].map((match) => match[1]);

    expect(logCalls).toHaveLength(
      routeSource.split("console.error(").length - 1,
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(4);

    for (const call of logCalls) {
      // A sanitized call passes a structured object literal, never a bare binding.
      expect(call, `unsanitized console.error argument: ${call}`).toMatch(
        /",\s*\{/,
      );

      // Everything after the human-readable message must be safe context only.
      const args = call.slice(call.indexOf('",') + 2);

      expect(args).not.toMatch(/^\s*(error|rpcError|auditError)\s*,?\s*$/);
      expect(args).not.toMatch(/\berror:\s*(error|rpcError|auditError)\b/);

      for (const leak of [
        ".message",
        ".details",
        ".hint",
        ".stack",
        "JSON.stringify",
        "qualifications",
        "normalized",
        "credential_identifier",
        "issuer",
        "name:",
        "body",
        "payload",
      ]) {
        expect(args, `console.error must not log ${leak}`).not.toContain(leak);
      }
    }
  });

  it("sanitizes every qualifications-route log through the safe token helpers", () => {
    for (const message of [
      "Company qualifications workspace context lookup failed.",
      "Company qualifications replacement failed.",
      "Unexpected company qualifications read failure.",
      "Unexpected company qualifications update failure.",
    ]) {
      const start = routeSource.indexOf(`console.error("${message}"`);

      expect(start, `missing log call for ${message}`).toBeGreaterThan(-1);

      const block = routeSource.slice(
        start,
        routeSource.indexOf("});", start) + 3,
      );

      expect(block).toMatch(/toSafeError(Code|Name)\(/);
    }

    expect(routeSource).toContain("errorCode: toSafeErrorCode(rpcError)");
    expect(routeSource).not.toContain("rpcError.message");
    expect(routeSource).not.toContain("rpcError.details");
    expect(routeSource).not.toContain("rpcError.hint");
  });

  it("keeps membership_type out of the route entirely", () => {
    expect(routeSource).not.toContain("membership_type");
  });
});
