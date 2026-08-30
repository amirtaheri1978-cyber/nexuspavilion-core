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

import { GET as GET_COLLECTION, POST as POST_COLLECTION } from "@/app/api/companies/[id]/documents/route";
import { POST as POST_UPLOAD } from "@/app/api/companies/[id]/documents/upload/route";
import {
  DELETE as DELETE_ITEM,
  PATCH as PATCH_ITEM,
} from "@/app/api/companies/[id]/documents/[documentId]/route";
import { GET as GET_DOWNLOAD } from "@/app/api/companies/[id]/documents/[documentId]/download/route";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { createClient } from "@/lib/supabase/server";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_COMPANY_ID = "99999999-9999-9999-9999-999999999999";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const DOCUMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OBJECT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const FILE_PATH = `${COMPANY_ID}/${DOCUMENT_ID}/${OBJECT_ID}.pdf`;

const createClientMock = vi.mocked(createClient);
const workspaceContextMock = vi.mocked(getCurrentWorkspaceContext);

const validCreatePayload = {
  id: DOCUMENT_ID,
  document_type: "insurance",
  title: "QA Commercial General Liability",
  file_name: "certificate.pdf",
  file_path: FILE_PATH,
  file_type: "application/pdf",
  file_size: 4096,
  issued_on: "2026-01-01",
  expires_on: "2027-01-01",
};

const invalidCreatePayload = {
  id: DOCUMENT_ID,
  document_type: "insurance",
  title: "Secret",
  file_name: "certificate.pdf",
  file_path: FILE_PATH,
  file_type: "application/pdf",
  file_size: 4096,
  notes: "INTERNAL ONLY",
};

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeContext(companyId = COMPANY_ID, documentId = DOCUMENT_ID) {
  return {
    params: Promise.resolve({ id: companyId, documentId }),
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
  signedUploadCalls: string[];
  signedUrlCalls: Array<{ path: string; ttl: number }>;
  removedPaths: string[];
};

function mockSupabaseForDocuments({
  rpcResult,
  rpcError = null,
  selectData = [],
  documentRow = {
    id: DOCUMENT_ID,
    company_id: COMPANY_ID,
    file_path: FILE_PATH,
  },
}: {
  rpcResult?: Record<string, unknown>;
  rpcError?: { code?: string; message?: string } | null;
  selectData?: Array<Record<string, unknown>>;
  documentRow?: Record<string, unknown> | null;
} = {}): SupabaseHarness {
  const harness: SupabaseHarness = {
    rpcCalls: [],
    auditInserts: [],
    tablesTouched: [],
    signedUploadCalls: [],
    signedUrlCalls: [],
    removedPaths: [],
  };

  createClientMock.mockResolvedValue({
    from(table: string) {
      harness.tablesTouched.push(table);

      if (table === "company_documents") {
        const query = {
          select: () => query,
          eq: () => query,
          order: async () => ({ data: selectData, error: null }),
          maybeSingle: async () => ({ data: documentRow, error: null }),
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
          rpcResult ?? {
            success: true,
            company_id: COMPANY_ID,
            document_id: DOCUMENT_ID,
            document_count: 1,
            old_file_path: null,
            audited: true,
          },
        error: rpcError,
      };
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe("company-documents");

        return {
          createSignedUploadUrl: async (path: string) => {
            harness.signedUploadCalls.push(path);
            return {
              data: { token: "upload-token", path },
              error: null,
            };
          },
          createSignedUrl: async (path: string, ttl: number) => {
            harness.signedUrlCalls.push({ path, ttl });
            return {
              data: { signedUrl: `https://example.test/signed/${ttl}` },
              error: null,
            };
          },
          remove: async (paths: string[]) => {
            harness.removedPaths.push(...paths);
            return { error: null };
          },
        };
      },
    },
  } as never);

  return harness;
}

describe("company documents API authorization", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    workspaceContextMock.mockReset();
  });

  it("returns 401 for a signed-out create even when the payload is invalid", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    const harness = mockSupabaseForDocuments();

    const response = await POST_COLLECTION(
      jsonRequest(
        "http://localhost/api/companies/1/documents",
        invalidCreatePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(401);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 401 for a signed-out upload intent even when the payload is invalid", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    const harness = mockSupabaseForDocuments();

    const response = await POST_UPLOAD(
      jsonRequest("http://localhost/api/companies/1/documents/upload", {
        fileName: "malware.exe",
        fileType: "application/x-msdownload",
        fileSize: 12,
      }),
      routeContext(),
    );

    expect(response.status).toBe(401);
    expect(harness.signedUploadCalls).toHaveLength(0);
  });

  it("mints a replacement upload token only after the same-company document exists", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForDocuments();

    const response = await POST_UPLOAD(
      jsonRequest("http://localhost/api/companies/1/documents/upload", {
        fileName: "certificate.pdf",
        fileType: "application/pdf",
        fileSize: 4096,
        documentId: DOCUMENT_ID,
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(harness.tablesTouched).toContain("company_documents");
    expect(harness.signedUploadCalls).toHaveLength(1);
  });

  it("returns 404 and does not mint a token when the replacement target is missing", async () => {
    workspaceContextMock.mockResolvedValue(withRole("admin"));
    const harness = mockSupabaseForDocuments({ documentRow: null });

    const response = await POST_UPLOAD(
      jsonRequest("http://localhost/api/companies/1/documents/upload", {
        fileName: "certificate.pdf",
        fileType: "application/pdf",
        fileSize: 4096,
        documentId: DOCUMENT_ID,
      }),
      routeContext(),
    );

    expect(response.status).toBe(404);
    expect(harness.signedUploadCalls).toHaveLength(0);
  });

  it("returns 403 for member replacement upload intent before minting a token", async () => {
    workspaceContextMock.mockResolvedValue(withRole("member"));
    const harness = mockSupabaseForDocuments();

    const response = await POST_UPLOAD(
      jsonRequest("http://localhost/api/companies/1/documents/upload", {
        fileName: "certificate.pdf",
        fileType: "application/pdf",
        fileSize: 4096,
        documentId: DOCUMENT_ID,
      }),
      routeContext(),
    );

    expect(response.status).toBe(403);
    expect(harness.signedUploadCalls).toHaveLength(0);
  });

  it("returns 403 for member and viewer writes before payload validation", async () => {
    for (const role of ["member", "viewer"] as const) {
      workspaceContextMock.mockResolvedValue(withRole(role));
      const harness = mockSupabaseForDocuments();

      const response = await POST_COLLECTION(
        jsonRequest(
          "http://localhost/api/companies/1/documents",
          invalidCreatePayload,
        ),
        routeContext(),
      );

      expect(response.status).toBe(403);
      expect(harness.rpcCalls).toHaveLength(0);
    }
  });

  it("returns 403 for a cross-company write before payload validation", async () => {
    workspaceContextMock.mockResolvedValue(workspaceContext());
    const harness = mockSupabaseForDocuments();

    const response = await POST_COLLECTION(
      jsonRequest(
        "http://localhost/api/companies/1/documents",
        invalidCreatePayload,
      ),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(response.status).toBe(403);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("returns 400 only when an owner submits an invalid payload", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForDocuments();

    const response = await POST_COLLECTION(
      jsonRequest(
        "http://localhost/api/companies/1/documents",
        invalidCreatePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(400);
    expect(harness.rpcCalls).toHaveLength(0);
  });

  it("allows owner create and delegates to create_company_document", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForDocuments();

    const response = await POST_COLLECTION(
      jsonRequest(
        "http://localhost/api/companies/1/documents",
        validCreatePayload,
      ),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(harness.rpcCalls).toHaveLength(1);
    expect(harness.rpcCalls[0].fn).toBe("create_company_document");
    expect(harness.rpcCalls[0].args.p_company_id).toBe(COMPANY_ID);
    expect(harness.rpcCalls[0].args.p_document_id).toBe(DOCUMENT_ID);
    expect(harness.auditInserts).toHaveLength(0);
    expect(harness.tablesTouched).not.toContain("audit_logs");
  });

  it("allows admin metadata updates through update_company_document", async () => {
    workspaceContextMock.mockResolvedValue(withRole("admin"));
    const harness = mockSupabaseForDocuments();

    const response = await PATCH_ITEM(
      jsonRequest(
        "http://localhost/api/companies/1/documents/1",
        {
          document_type: "safety",
          title: "QA Safety Program",
          issued_on: "2026-01-01",
          expires_on: "2027-01-01",
        },
        "PATCH",
      ),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(harness.rpcCalls[0].fn).toBe("update_company_document");
  });

  it("allows owner delete and cleans the returned object path", async () => {
    workspaceContextMock.mockResolvedValue(withRole("owner"));
    const harness = mockSupabaseForDocuments({
      rpcResult: {
        success: true,
        document_id: DOCUMENT_ID,
        old_file_path: FILE_PATH,
        document_count: 0,
        audited: true,
      },
    });

    const response = await DELETE_ITEM(
      new Request("http://localhost/api/companies/1/documents/1", {
        method: "DELETE",
      }),
      routeContext(),
    );

    expect(response.status).toBe(200);
    expect(harness.rpcCalls[0].fn).toBe("delete_company_document");
    expect(harness.removedPaths).toEqual([FILE_PATH]);
  });

  it("allows active members and viewers to read metadata and download", async () => {
    for (const role of ["member", "viewer"] as const) {
      workspaceContextMock.mockResolvedValue(withRole(role));
      const harness = mockSupabaseForDocuments({
        selectData: [validCreatePayload],
      });

      const list = await GET_COLLECTION(
        new Request("http://localhost/api/companies/1/documents"),
        routeContext(),
      );
      const download = await GET_DOWNLOAD(
        new Request("http://localhost/api/companies/1/documents/1/download"),
        routeContext(),
      );
      const body = (await download.json()) as {
        expiresIn?: number;
        downloadUrl?: string;
      };

      expect(list.status).toBe(200);
      expect(download.status).toBe(200);
      expect(body.expiresIn).toBe(60);
      expect(harness.signedUrlCalls[0]?.ttl).toBe(60);
    }
  });

  it("returns 404 for a missing download target", async () => {
    workspaceContextMock.mockResolvedValue(withRole("member"));
    mockSupabaseForDocuments({ documentRow: null });

    const response = await GET_DOWNLOAD(
      new Request("http://localhost/api/companies/1/documents/1/download"),
      routeContext(),
    );

    expect(response.status).toBe(404);
  });

  it("returns 401 for signed-out reads and downloads", async () => {
    workspaceContextMock.mockRejectedValue(
      new WorkspaceContextError("Unauthorized.", "UNAUTHENTICATED"),
    );
    mockSupabaseForDocuments();

    const list = await GET_COLLECTION(
      new Request("http://localhost/api/companies/1/documents"),
      routeContext(),
    );
    const download = await GET_DOWNLOAD(
      new Request("http://localhost/api/companies/1/documents/1/download"),
      routeContext(),
    );

    expect(list.status).toBe(401);
    expect(download.status).toBe(401);
  });

  it("denies inactive and cross-company reads", async () => {
    workspaceContextMock.mockResolvedValue(
      workspaceContext({
        membership: null,
        membershipStatus: "revoked",
      }),
    );
    mockSupabaseForDocuments();

    const inactive = await GET_COLLECTION(
      new Request("http://localhost/api/companies/1/documents"),
      routeContext(),
    );

    workspaceContextMock.mockResolvedValue(workspaceContext());
    const cross = await GET_DOWNLOAD(
      new Request("http://localhost/api/companies/1/documents/1/download"),
      routeContext(OTHER_COMPANY_ID),
    );

    expect(inactive.status).toBe(403);
    expect(cross.status).toBe(403);
  });
});

describe("company documents API route contract", () => {
  const collection = readFileSync(
    resolve(process.cwd(), "src/app/api/companies/[id]/documents/route.ts"),
    "utf8",
  );
  const upload = readFileSync(
    resolve(
      process.cwd(),
      "src/app/api/companies/[id]/documents/upload/route.ts",
    ),
    "utf8",
  );
  const item = readFileSync(
    resolve(
      process.cwd(),
      "src/app/api/companies/[id]/documents/[documentId]/route.ts",
    ),
    "utf8",
  );
  const download = readFileSync(
    resolve(
      process.cwd(),
      "src/app/api/companies/[id]/documents/[documentId]/download/route.ts",
    ),
    "utf8",
  );

  it("resolves authorization before reading mutating request bodies", () => {
    for (const source of [collection, upload, item]) {
      const permissionGuard = source.indexOf("canManageCompanyWorkspace({");
      const bodyRead = source.indexOf("await request.json()");

      expect(permissionGuard).toBeGreaterThan(-1);
      expect(permissionGuard).toBeLessThan(bodyRead);
    }
  });

  it("writes exclusively through RPCs and never audits from the route", () => {
    const executable = [collection, upload, item, download]
      .map((source) => source.replace(/^\s*\/\/.*$/gm, ""))
      .join("\n");

    expect(collection).toContain('"create_company_document"');
    expect(item).toContain('"update_company_document"');
    expect(item).toContain('"delete_company_document"');
    expect(executable).not.toContain("COMPANY_DOCUMENT_UPLOADED");
    expect(executable).not.toContain("COMPANY_DOCUMENT_UPDATED");
    expect(executable).not.toContain("COMPANY_DOCUMENT_DELETED");
    expect(executable).not.toContain("audit_logs");
  });

  it("mints signed downloads server-side with a 60-second TTL", () => {
    expect(download).toContain("createSignedUrl");
    expect(download).toContain("COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS");
    expect(download).not.toContain("getPublicUrl");
  });

  it("logs through safe token helpers only", () => {
    for (const source of [collection, upload, item, download]) {
      expect(source).toContain("toSafeErrorCode");
      expect(source).toContain("toSafeErrorName");

      const logCalls = source.match(/console\.error\([\s\S]*?\}\);/g) ?? [];

      expect(logCalls.length).toBeGreaterThan(0);

      for (const call of logCalls) {
        expect(call).not.toMatch(/error\.message/);
        expect(call).not.toMatch(/error\.details/);
        expect(call).not.toMatch(/error\.hint/);
        expect(call).not.toMatch(/error\.stack/);
      }
    }
  });
});

describe("company documents leaves out-of-domain artifacts untouched", () => {
  it("keeps the supplier domains disabled and never references RFQ or branding primitives", async () => {
    const availability = await import(
      "@/lib/procurement/supplier-domain-availability"
    );

    expect(availability.SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE).toBe(false);
    expect(availability.APPROVED_VENDOR_DOMAIN_AVAILABLE).toBe(false);

    for (const relativePath of [
      "src/lib/company/documents.ts",
      "src/app/api/companies/[id]/documents/route.ts",
      "src/components/company-documents-editor.tsx",
      "src/components/company-documents-display.tsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

      expect(source).not.toContain("rfq_attachments");
      expect(source).not.toContain("rfq-attachments");
      expect(source).not.toContain("Company-logos");
      expect(source).not.toContain("supplier_compliance");
      expect(source).not.toContain("approved_vendors");
      expect(source).not.toContain("invitations");
    }
  });
});
