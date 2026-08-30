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

import { GET, PUT } from "@/app/api/companies/[id]/capabilities/route";
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

function mockSupabaseForCapabilities({
  rpcResult,
  rpcError = null,
  selectData = [],
  auditError = null,
}: {
  rpcResult?: Record<string, unknown>;
  rpcError?: { message: string } | null;
  selectData?: Array<Record<string, unknown>>;
  auditError?: { message: string } | null;
}) {
  const finalSelectResult = Promise.resolve({
    data: selectData,
    error: null,
  });

  createClientMock.mockResolvedValue({
    from(table: string) {
      if (table === "company_capabilities") {
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
          insert: async () => ({
            error: auditError,
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async () => ({
      data: rpcResult ?? { success: true, capability_count: 1 },
      error: rpcError,
    }),
  } as never);
}

describe("company capabilities API authorization", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    workspaceContextMock.mockReset();
  });

  it("denies unauthenticated writes", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    mockSupabaseForCapabilities({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/capabilities", {
        capabilities: { trade: ["Electrical"] },
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
    mockSupabaseForCapabilities({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/capabilities", {
        capabilities: { trade: ["Electrical"] },
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
    mockSupabaseForCapabilities({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/capabilities", {
        capabilities: { trade: ["Electrical"] },
      }),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("allows owner writes for the same company", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForCapabilities({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/capabilities", {
        capabilities: {
          trade: ["Electrical"],
          service: [],
          product: [],
          region: [],
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
    mockSupabaseForCapabilities({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/capabilities", {
        capabilities: {
          trade: ["Electrical"],
          service: [],
          product: [],
          region: [],
        },
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
  });

  it("denies cross-company writes", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    mockSupabaseForCapabilities({});

    const response = await PUT(
      jsonRequest("http://localhost/api/companies/1/capabilities", {
        capabilities: { trade: ["Electrical"] },
      }),
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
    mockSupabaseForCapabilities({});

    const response = await GET(
      new Request("http://localhost/api/companies/1/capabilities"),
      routeContext(),
    );

    expect(response.status).toBe(403);
  });

  it("allows active same-company members to read grouped capabilities", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        workspaceRole: "member",
        membership: {
          ...workspaceContext().membership!,
          workspaceRole: "member",
        },
      }),
    );
    mockSupabaseForCapabilities({
      selectData: [
        {
          id: "cap-1",
          company_id: COMPANY_ID,
          capability_type: "trade",
          label: "Electrical",
          sort_order: 0,
        },
        {
          id: "cap-2",
          company_id: COMPANY_ID,
          capability_type: "region",
          label: "Ontario",
          sort_order: 0,
        },
        {
          id: "cap-3",
          company_id: COMPANY_ID,
          capability_type: "region",
          label: "Quebec",
          sort_order: 1,
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/companies/1/capabilities"),
      routeContext(),
    );

    const body = (await response.json()) as {
      success?: boolean;
      capabilities?: {
        trade: string[];
        service: string[];
        product: string[];
        region: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.capabilities).toEqual({
      trade: ["Electrical"],
      service: [],
      product: [],
      region: ["Ontario", "Quebec"],
    });
  });
});

describe("company capabilities API route contract", () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), "src/app/api/companies/[id]/capabilities/route.ts"),
    "utf8",
  );

  it("uses workspace context and management permission helpers", () => {
    expect(routeSource).toContain("getCurrentWorkspaceContext");
    expect(routeSource).toContain("canManageCompanyWorkspace");
    expect(routeSource).toContain('workspace.companyId !== id');
  });

  it("writes through replace_company_capabilities and audits updates", () => {
    expect(routeSource).toContain('"replace_company_capabilities"');
    expect(routeSource).toContain('"COMPANY_CAPABILITIES_UPDATED"');
    expect(routeSource).not.toContain('.from("companies").update');
  });
});
