import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveMembershipForUserCompany,
  MembershipLookupError,
} from "@/lib/auth/membership";
import { loadAnalyticsSourceData } from "@/lib/analytics/source-data/load-analytics-source-data";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const membership = readSource("src/lib/auth/membership.ts");
const analyticsSourceLoader = readSource(
  "src/lib/analytics/source-data/load-analytics-source-data.ts",
);
const analyticsVendors = readSource("src/app/analytics/vendors/page.tsx");
const vendorDashboard = readSource("src/app/vendor-dashboard/page.tsx");

type QueryResult = {
  data: unknown;
  error: unknown;
};

type QueryTrace = {
  table: string;
  selections: string[];
  equals: Array<[string, unknown]>;
  inclusions: Array<[string, readonly unknown[]]>;
  orders: Array<[string, { ascending?: boolean }]>;
};

type FakeQuery = {
  select(columns: string): FakeQuery;
  eq(column: string, value: unknown): FakeQuery;
  in(column: string, values: readonly unknown[]): FakeQuery;
  order(column: string, options: { ascending?: boolean }): FakeQuery;
  single(): Promise<QueryResult>;
  maybeSingle(): Promise<QueryResult>;
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2>;
};

type SupabaseHarnessOptions = {
  userId?: string | null;
  profileCompanyId?: string | null;
  membershipRow?: Record<string, unknown> | null;
  membershipError?: unknown;
  rfqs?: Array<Record<string, unknown>>;
  quotes?: Array<Record<string, unknown>>;
  companies?: Array<Record<string, unknown>>;
};

const defaultMembershipRow = {
  id: "membership-1",
  user_id: "user-1",
  company_id: "company-1",
  workspace_role: "owner",
  procurement_function: "buyer",
  membership_type: "founder",
  membership_status: "active",
  job_title: "Procurement Lead",
  job_function: "procurement",
  invited_by: null,
  joined_at: "2026-09-05T00:00:00.000Z",
};

function createSupabaseHarness(options: SupabaseHarnessOptions = {}) {
  const traces: QueryTrace[] = [];
  const userId = options.userId === undefined ? "user-1" : options.userId;
  const profileCompanyId =
    options.profileCompanyId === undefined
      ? "company-1"
      : options.profileCompanyId;
  const membershipRow =
    options.membershipRow === undefined
      ? defaultMembershipRow
      : options.membershipRow;
  const membershipError = options.membershipError ?? null;
  const rfqs = options.rfqs ?? [];
  const quotes = options.quotes ?? [];
  const companies = options.companies ?? [];

  function resolveResult(table: string): QueryResult {
    if (table === "profiles") {
      return {
        data: profileCompanyId ? { company_id: profileCompanyId } : null,
        error: null,
      };
    }

    if (table === "organization_memberships") {
      return {
        data: membershipRow,
        error: membershipError,
      };
    }

    if (table === "rfqs") {
      return { data: rfqs, error: null };
    }

    if (table === "quotes") {
      return { data: quotes, error: null };
    }

    if (table === "company_directory") {
      return { data: companies, error: null };
    }

    return { data: [], error: null };
  }

  const from = vi.fn((table: string) => {
    const trace: QueryTrace = {
      table,
      selections: [],
      equals: [],
      inclusions: [],
      orders: [],
    };

    traces.push(trace);

    const query: FakeQuery = {
      select(columns) {
        trace.selections.push(columns);
        return query;
      },

      eq(column, value) {
        trace.equals.push([column, value]);
        return query;
      },

      in(column, values) {
        trace.inclusions.push([column, values]);
        return query;
      },

      order(column, orderOptions) {
        trace.orders.push([column, orderOptions]);
        return query;
      },

      async single() {
        return resolveResult(table);
      },

      async maybeSingle() {
        return resolveResult(table);
      },

      then(onfulfilled, onrejected) {
        return Promise.resolve(resolveResult(table)).then(
          onfulfilled ?? undefined,
          onrejected ?? undefined,
        );
      },
    };

    return query;
  });

  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
      })),
    },
    from,
  } as unknown as SupabaseClient;

  return {
    supabase,
    from,
    traces,
  };
}

function getTrace(traces: QueryTrace[], table: string) {
  return traces.find((trace) => trace.table === table);
}

describe("analytics permission inheritance", () => {
  it("keeps exact-company active membership as the canonical tenancy helper", () => {
    expect(membership).toContain("getActiveMembershipForUserCompany");
    expect(membership).toContain('.eq("company_id", normalizedCompanyId)');
    expect(membership).toContain('.eq("membership_status", "active")');
  });

  it("derives analytics source tenancy from exact active membership only", () => {
    expect(analyticsSourceLoader).toContain(
      'from "@/lib/auth/membership"',
    );
    expect(analyticsSourceLoader).toContain(
      "getActiveMembershipForUserCompany",
    );
    expect(analyticsSourceLoader).toContain("user && profile?.company_id");
    expect(analyticsSourceLoader).toContain(
      "activeMembership?.companyId ?? null",
    );
    expect(analyticsSourceLoader).not.toContain(
      "const companyId = profile?.company_id ?? null",
    );
    expect(analyticsSourceLoader).not.toContain(
      "getActiveMembershipForUser(",
    );
    expect(analyticsSourceLoader).toContain(
      "canViewIssuerCommercialAnalytics",
    );
    expect(analyticsSourceLoader).toContain(
      "commercialAccess.canViewIssuerCommercialAnalytics &&",
    );
  });

  it("fails closed for vendor intelligence without exact active membership", () => {
    expect(analyticsVendors).toContain('from "@/lib/auth/membership"');
    expect(analyticsVendors).toContain("getActiveMembershipForUserCompany");
    expect(analyticsVendors).toContain("profile.company_id");
    expect(analyticsVendors).toContain("if (!activeMembership)");
    expect(analyticsVendors).toContain('redirect("/analytics")');
    expect(analyticsVendors).toContain(
      "const companyId = activeMembership.companyId",
    );
    expect(analyticsVendors).toContain('.eq("buyer_company_id", companyId)');
    expect(analyticsVendors).not.toContain(
      '.eq("buyer_company_id", profile.company_id)',
    );
  });

  it("scopes vendor dashboard quote intelligence to validated companyId only", () => {
    expect(vendorDashboard).toContain('from "@/lib/auth/membership"');
    expect(vendorDashboard).toContain("getActiveMembershipForUserCompany");
    expect(vendorDashboard).toContain("user && profile?.company_id");
    expect(vendorDashboard).toContain(
      "activeMembership?.companyId ?? null",
    );
    expect(vendorDashboard).not.toContain(
      "const companyId = profile?.company_id",
    );
    expect(vendorDashboard).toContain(
      '.eq("company_id", companyId)',
    );
  });
});

describe("analytics permission inheritance behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for blank membership identifiers without issuing a membership query", async () => {
    const harness = createSupabaseHarness();

    await expect(
      getActiveMembershipForUserCompany(harness.supabase, "   ", "company-1"),
    ).resolves.toBeNull();

    await expect(
      getActiveMembershipForUserCompany(harness.supabase, "user-1", "   "),
    ).resolves.toBeNull();

    expect(harness.from).not.toHaveBeenCalled();
  });

  it("uses trimmed exact-company active-membership filters and maps the resolved membership", async () => {
    const harness = createSupabaseHarness();

    const resolvedMembership = await getActiveMembershipForUserCompany(
      harness.supabase,
      "  user-1  ",
      "  company-1  ",
    );

    const membershipTrace = getTrace(
      harness.traces,
      "organization_memberships",
    );

    expect(membershipTrace?.equals).toEqual([
      ["user_id", "user-1"],
      ["company_id", "company-1"],
      ["membership_status", "active"],
    ]);
    expect(resolvedMembership).toMatchObject({
      id: "membership-1",
      userId: "user-1",
      companyId: "company-1",
      workspaceRole: "owner",
      procurementFunction: "buyer",
      membershipType: "founder",
      membershipStatus: "active",
    });
  });

  it("fails closed when exact-company active-membership lookup errors", async () => {
    const membershipError = new Error("membership lookup denied");
    const harness = createSupabaseHarness({ membershipError });

    await expect(
      getActiveMembershipForUserCompany(
        harness.supabase,
        "user-1",
        "company-1",
      ),
    ).rejects.toBeInstanceOf(MembershipLookupError);
  });

  it("does not read private RFQ or quote data when active membership is absent", async () => {
    const harness = createSupabaseHarness({
      membershipRow: null,
      companies: [{ id: "company-directory-1", name: "Directory Supplier" }],
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    expect(result.companyId).toBeNull();
    expect(result.commercialAccess).toEqual({
      canViewIssuerCommercialAnalytics: false,
    });
    expect(result.rfqList).toEqual([]);
    expect(result.quoteList).toEqual([]);
    expect(getTrace(harness.traces, "rfqs")).toBeUndefined();
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
    expect(getTrace(harness.traces, "company_directory")).toBeDefined();
  });

  it("scopes RFQs to active membership company and quotes to the returned RFQ ids", async () => {
    const harness = createSupabaseHarness({
      rfqs: [
        { id: "rfq-1", company_id: "company-1" },
        { id: "rfq-2", company_id: "company-1" },
      ],
      quotes: [
        {
          id: "quote-1",
          rfq_id: "rfq-1",
          company_id: "supplier-1",
          amount: 1000,
          decision: null,
        },
        {
          id: "quote-2",
          rfq_id: "rfq-2",
          company_id: "supplier-2",
          amount: 1200,
          decision: "awarded",
        },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    const rfqTrace = getTrace(harness.traces, "rfqs");
    const quoteTrace = getTrace(harness.traces, "quotes");

    expect(result.companyId).toBe("company-1");
    expect(result.commercialAccess).toEqual({
      canViewIssuerCommercialAnalytics: true,
    });
    expect(rfqTrace?.equals).toContainEqual(["company_id", "company-1"]);
    expect(quoteTrace?.inclusions).toEqual([
      ["rfq_id", ["rfq-1", "rfq-2"]],
    ]);
    expect(result.rfqList.map((rfq) => rfq.id)).toEqual([
      "rfq-1",
      "rfq-2",
    ]);
    expect(result.quoteList.map((quote) => quote.id)).toEqual([
      "quote-1",
      "quote-2",
    ]);
  });

  it("keeps issuer commercial quote rows unavailable for active members without owner, admin, or buyer access", async () => {
    const harness = createSupabaseHarness({
      membershipRow: {
        ...defaultMembershipRow,
        workspace_role: "member",
        procurement_function: "supplier",
      },
      rfqs: [{ id: "rfq-1", company_id: "company-1" }],
      quotes: [
        {
          id: "quote-1",
          rfq_id: "rfq-1",
          company_id: "supplier-1",
          amount: 1000,
          decision: null,
        },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    expect(result.companyId).toBe("company-1");
    expect(result.commercialAccess).toEqual({
      canViewIssuerCommercialAnalytics: false,
    });
    expect(result.rfqList.map((rfq) => rfq.id)).toEqual(["rfq-1"]);
    expect(result.quoteList).toEqual([]);
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
  });

  it("does not read quotes when the scoped company has no RFQ ids", async () => {
    const harness = createSupabaseHarness({ rfqs: [] });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    expect(result.companyId).toBe("company-1");
    expect(getTrace(harness.traces, "rfqs")?.equals).toContainEqual([
      "company_id",
      "company-1",
    ]);
    expect(result.rfqList).toEqual([]);
    expect(result.quoteList).toEqual([]);
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
  });
});
