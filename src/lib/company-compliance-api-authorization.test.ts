import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET, PUT } from "@/app/api/companies/[id]/compliance/route";
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

const validCompliancePayload = {
  compliance: {
    insurance: [
      {
        name: "Commercial General Liability",
        provider: "Northbridge",
        effective_on: "2026-01-01",
        expires_on: "2027-01-01",
      },
    ],
    workers_compensation: [],
    safety: [],
  },
};

// Structurally invalid: an unsupported item field plus an unsupported group key.
const invalidCompliancePayload = {
  compliance: {
    insurance: [{ name: "Coverage", policy_identifier: "SECRET-123" }],
    license: [{ name: "Master Electrician" }],
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
  overrides: Partial<
    Awaited<ReturnType<typeof getCurrentWorkspaceContext>>
  > = {},
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

function withRole(role: "owner" | "admin" | "member" | "viewer") {
  return workspaceContext({
    workspaceRole: role,
    membership: {
      ...workspaceContext().membership!,
      workspaceRole: role,
    },
  });
}

type SupabaseHarness = {
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
  auditInserts: Array<Record<string, unknown>>;
  tablesTouched: string[];
};

function mockSupabaseForCompliance({
  rpcResult,
  rpcError = null,
  selectData = [],
}: {
  rpcResult?: Record<string, unknown>;
  rpcError?: { code?: string; message?: string } | null;
  selectData?: Array<Record<string, unknown>>;
} = {}): SupabaseHarness {
  const harness: SupabaseHarness = {
    rpcCalls: [],
    auditInserts: [],
    tablesTouched: [],
  };

  const finalSelectResult = Promise.resolve({
    data: selectData,
    error: null,
  });

  createClientMock.mockResolvedValue({
    from(table: string) {
      harness.tablesTouched.push(table);

      if (table === "company_compliance") {
        let orderCallCount = 0;
        const query = {
          select: () => query,
          eq: () => query,
          order: () => {
            orderCallCount += 1;

            if (orderCallCount >= 2) {
              return finalSelectResult;
            }

            return query;
          },
        };

        return query;
      }

      if (table === "audit_logs") {
        return {
          insert: async (row: Record<string, unknown>) => {
            harness.auditInserts.push(row);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      harness.rpcCalls.push({ fn, args });

      return {
        data:
          rpcResult ??
          {
            success: true,
            company_id: COMPANY_ID,
            compliance_count: 1,
            counts_by_type: {
              insurance: 1,
              workers_compensation: 0,
              safety: 0,
            },
            audited: true,
          },
        error: rpcError,
      };
    },
  } as never);

  return harness;
}

describe("company compliance API authorization", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    workspaceContextMock.mockReset();
  });

  it("returns 401 for a signed-out write even when the payload is invalid", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    const harness = mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        invalidCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(401);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 403 for a member write even when the payload is invalid", async () => {
    workspaceContextMock.mockResolvedValue(withRole("member"));
    const harness = mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        invalidCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(403);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 403 for a viewer write even when the payload is invalid", async () => {
    workspaceContextMock.mockResolvedValue(withRole("viewer"));
    const harness = mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        invalidCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(403);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 403 for a cross-company write before payload validation", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    const harness = mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        invalidCompliancePayload,
      ),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(response.status).toBe(403);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 400 only when an owner submits an invalid payload", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        invalidCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(400);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 400 when an admin submits an unsupported item field", async () => {
    workspaceContextMock.mockResolvedValue(withRole("admin"));
    mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/compliance", {
        compliance: {
          insurance: [{ name: "Coverage", coverage_limit: 5000000 }],
        },
      }),
      routeContext(),
    );

    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      'Compliance field "coverage_limit" is not supported.',
    );
  });

  it("allows owner writes and delegates to replace_company_compliance", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        validCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toHaveLength(1);
    expect(harness.rpcCalls[0].fn).toBe("replace_company_compliance");
    expect(harness.rpcCalls[0].args).toEqual({
      p_company_id: COMPANY_ID,
      p_compliance: {
        insurance: [
          {
            name: "Commercial General Liability",
            provider: "Northbridge",
            effective_on: "2026-01-01",
            expires_on: "2027-01-01",
          },
        ],
        workers_compensation: [],
        safety: [],
      },
    });
  });

  it("allows admin writes for the same company", async () => {
    workspaceContextMock.mockResolvedValue(withRole("admin"));
    mockSupabaseForCompliance();

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        validCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(200);
  });

  it("never inserts a COMPANY_COMPLIANCE_UPDATED row from the route", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForCompliance();

    await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        validCompliancePayload,
      ),
      routeContext(),
    );

    expect(harness.auditInserts).toHaveLength(0);
    expect(harness.tablesTouched).not.toContain("audit_logs");
  });

  it("maps an RPC FORBIDDEN result to 403", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    mockSupabaseForCompliance({
      rpcResult: {
        success: false,
        error_code: "FORBIDDEN",
        error_message: "An active workspace membership is required.",
      },
    });

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        validCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("requires an active membership for internal reads", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        membership: null,
        membershipStatus: "revoked",
      }),
    );
    mockSupabaseForCompliance();

    const response = await GET(
      new Request("http://localhost/api/companies/1/compliance"),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("returns 401 for signed-out reads", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    mockSupabaseForCompliance();

    const response = await GET(
      new Request("http://localhost/api/companies/1/compliance"),
      routeContext(),
    );

    expect(response.status).toBe(401);
  });

  it("denies cross-company reads", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForCompliance();

    const response = await GET(
      new Request("http://localhost/api/companies/1/compliance"),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(response.status).toBe(403);
  });

  it("allows active same-company members and viewers to read internally", async () => {
    for (const role of ["member", "viewer"] as const) {
      workspaceContextMock.mockResolvedValue(withRole(role));
      mockSupabaseForCompliance({
        selectData: [
          {
            id: "row-1",
            company_id: COMPANY_ID,
            compliance_type: "insurance",
            name: "Commercial General Liability",
            provider: "Northbridge",
            effective_on: "2026-01-01",
            expires_on: "2027-01-01",
            sort_order: 0,
          },
          {
            id: "row-2",
            company_id: COMPANY_ID,
            compliance_type: "safety",
            name: "COR Program",
            provider: null,
            effective_on: null,
            expires_on: null,
            sort_order: 0,
          },
        ],
      });

      const response = await GET(
        new Request("http://localhost/api/companies/1/compliance"),
        routeContext(),
      );

      const body = (await response.json()) as {
        success?: boolean;
        compliance?: Record<string, unknown[]>;
      };

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.compliance?.insurance).toHaveLength(1);
      expect(body.compliance?.safety).toHaveLength(1);
      expect(body.compliance?.workers_compensation).toHaveLength(0);
    }
  });
});

describe("company compliance API safe logging", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    workspaceContextMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only safe tokens when the RPC fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    workspaceContextMock.mockResolvedValue(withRole("owner"));
    mockSupabaseForCompliance({
      rpcError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint, Key (name)=(Commercial General Liability)',
      },
    });

    const response = await PUT(
      jsonRequest(
        "http://localhost/api/companies/1/compliance",
        validCompliancePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();

    const serializedLogs = consoleSpy.mock.calls
      .map((call) => JSON.stringify(call))
      .join("\n");

    expect(serializedLogs).not.toContain("Commercial General Liability");
    expect(serializedLogs).not.toContain("duplicate key value");
    expect(serializedLogs).not.toContain("Northbridge");

    for (const call of consoleSpy.mock.calls) {
      const [, context] = call as [string, Record<string, unknown> | undefined];

      if (!context) {
        continue;
      }

      expect(Object.keys(context).sort()).not.toContain("message");
      expect(Object.keys(context).sort()).not.toContain("details");
      expect(Object.keys(context).sort()).not.toContain("hint");
      expect(Object.keys(context).sort()).not.toContain("stack");
      expect(Object.keys(context).sort()).not.toContain("payload");
    }
  });
});

describe("company compliance API route contract", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/companies/[id]/compliance/route.ts"),
    "utf8",
  );

  const executableRouteSource = routeSource.replace(/^\s*\/\/.*$/gm, "");

  it("uses workspace context and management permission helpers", () => {
    expect(routeSource).toContain("getCurrentWorkspaceContext");
    expect(routeSource).toContain("canManageCompanyWorkspace");
    expect(routeSource).toContain("workspace.companyId !== id");
  });

  it("resolves authorization before reading the request body", () => {
    const permissionGuard = routeSource.indexOf("canManageCompanyWorkspace({");
    const tenancyGuard = routeSource.lastIndexOf("workspace.companyId !== id");
    const bodyRead = routeSource.indexOf("await request.json()");
    const normalization = routeSource.indexOf("normalizeGroupedCompliance(");

    expect(permissionGuard).toBeGreaterThan(-1);
    expect(permissionGuard).toBeLessThan(tenancyGuard);
    expect(tenancyGuard).toBeLessThan(bodyRead);
    expect(bodyRead).toBeLessThan(normalization);
  });

  it("writes exclusively through the atomic RPC and never audits from the route", () => {
    expect(routeSource).toContain('"replace_company_compliance"');
    expect(executableRouteSource).not.toContain("COMPANY_COMPLIANCE_UPDATED");
    expect(executableRouteSource).not.toContain("audit_logs");
    expect(executableRouteSource).not.toContain(".insert(");
    expect(executableRouteSource).not.toContain(".update(");
    expect(executableRouteSource).not.toContain(".delete(");
  });

  it("logs through safe token helpers only", () => {
    expect(routeSource).toContain("toSafeErrorCode");
    expect(routeSource).toContain("toSafeErrorName");

    // Each call is bounded at its own `});` so the match cannot run past the
    // end of the log statement and pick up unrelated code.
    const logCalls = routeSource.match(/console\.error\([\s\S]*?\}\);/g) ?? [];

    expect(logCalls).toHaveLength(4);

    for (const call of logCalls) {
      expect(call).not.toMatch(/error\.message/);
      expect(call).not.toMatch(/error\.details/);
      expect(call).not.toMatch(/error\.hint/);
      expect(call).not.toMatch(/error\.stack/);
      expect(call).not.toMatch(/\bbody\b/);
      expect(call).not.toMatch(/normalized\./);
    }
  });

  it("never exposes compliance to anonymous or public surfaces", () => {
    expect(routeSource).not.toContain("company_compliance_public");
    expect(routeSource).not.toContain("anon");
    expect(routeSource).not.toContain("is_public");
  });
});

describe("company compliance leaves out-of-domain procurement artifacts untouched", () => {
  it("keeps the supplier compliance and approved vendor domains disabled", async () => {
    const availability = await import(
      "@/lib/procurement/supplier-domain-availability"
    );

    expect(availability.SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE).toBe(false);
    expect(availability.APPROVED_VENDOR_DOMAIN_AVAILABLE).toBe(false);
  });

  it("never references buyer-to-vendor procurement tables from the company domain", () => {
    for (const relativePath of [
      "src/lib/company/compliance.ts",
      "src/app/api/companies/[id]/compliance/route.ts",
      "src/components/company-compliance-editor.tsx",
      "src/components/company-compliance-display.tsx",
    ]) {
      const source = readFileSync(
        resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source).not.toContain("supplier_compliance");
      expect(source).not.toContain("approved_vendors");
      expect(source).not.toContain("buyer_company_id");
      expect(source).not.toContain("vendor_company_id");
    }
  });
});
