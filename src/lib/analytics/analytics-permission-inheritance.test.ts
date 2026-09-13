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
const analyticsPage = readSource("src/app/analytics/page.tsx");
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

type RpcTrace = {
  functionName: string;
  args: Record<string, unknown>;
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
  compliance?: Array<Record<string, unknown>>;
  submissionCountsByRfqId?: Record<string, unknown>;
  submissionCountErrorsByRfqId?: Record<string, unknown>;
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
  const rpcTraces: RpcTrace[] = [];
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
  const compliance = options.compliance ?? [];
  const submissionCountsByRfqId = options.submissionCountsByRfqId ?? {};
  const submissionCountErrorsByRfqId =
    options.submissionCountErrorsByRfqId ?? {};

  function applyFilters(
    rows: Array<Record<string, unknown>>,
    trace: QueryTrace,
  ) {
    return rows.filter(
      (row) =>
        trace.equals.every(([column, value]) => row[column] === value) &&
        trace.inclusions.every(([column, values]) =>
          values.includes(row[column]),
        ),
    );
  }

  function resolveResult(table: string, trace: QueryTrace): QueryResult {
    if (table === "profiles") {
      const rows = profileCompanyId
        ? [{ id: userId, company_id: profileCompanyId }]
        : [];
      return {
        data: applyFilters(rows, trace)[0] ?? null,
        error: null,
      };
    }

    if (table === "organization_memberships") {
      return {
        data: membershipRow
          ? applyFilters([membershipRow], trace)[0] ?? null
          : null,
        error: membershipError,
      };
    }

    if (table === "rfqs") {
      return { data: applyFilters(rfqs, trace), error: null };
    }

    if (table === "quotes") {
      return { data: applyFilters(quotes, trace), error: null };
    }

    if (table === "company_directory") {
      return { data: applyFilters(companies, trace), error: null };
    }

    if (table === "company_compliance") {
      return { data: applyFilters(compliance, trace), error: null };
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
        return resolveResult(table, trace);
      },

      async maybeSingle() {
        return resolveResult(table, trace);
      },

      then(onfulfilled, onrejected) {
        return Promise.resolve(resolveResult(table, trace)).then(
          onfulfilled ?? undefined,
          onrejected ?? undefined,
        );
      },
    };

    return query;
  });

  const rpc = vi.fn(
    async (functionName: string, args: Record<string, unknown>) => {
      rpcTraces.push({ functionName, args });

      if (functionName !== "count_rfq_quote_submissions") {
        return { data: null, error: new Error("Unexpected RPC") };
      }

      const rfqId = String(args.p_rfq_id ?? "");
      const hasConfiguredCount = Object.prototype.hasOwnProperty.call(
        submissionCountsByRfqId,
        rfqId,
      );

      return {
        data: hasConfiguredCount ? submissionCountsByRfqId[rfqId] : 0,
        error: submissionCountErrorsByRfqId[rfqId] ?? null,
      };
    },
  );

  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
      })),
    },
    from,
    rpc,
  } as unknown as SupabaseClient;

  return {
    supabase,
    from,
    traces,
    rpc,
    rpcTraces,
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
    expect(analyticsSourceLoader).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(analyticsSourceLoader).toContain("commerciallyOpenRfqIds");
    expect(analyticsSourceLoader).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );
    expect(analyticsSourceLoader).toContain("loadCompanyCompliance");
    expect(analyticsSourceLoader).toContain("companyCompliance");
    expect(analyticsPage).toContain("buildExecutiveHistoricalPatterns");
    expect(analyticsPage).toContain(
      "canViewQuoteHistory: commercialAccess.canViewIssuerCommercialAnalytics",
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
    expect(analyticsVendors).toContain("isRfqCommercialOpeningUnlocked");
    expect(analyticsVendors).toContain('.from("rfqs")');
    expect(analyticsVendors).toContain('.eq("company_id", companyId)');
    expect(analyticsVendors).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );
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
    expect(result.safeSubmissionCountByRfqId).toEqual({});
    expect(result.companyCompliance).toEqual({
      insurance: [],
      workers_compensation: [],
      safety: [],
    });
    expect(getTrace(harness.traces, "rfqs")).toBeUndefined();
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
    expect(getTrace(harness.traces, "company_compliance")).toBeUndefined();
    expect(getTrace(harness.traces, "company_directory")).toBeDefined();
    expect(harness.rpc).not.toHaveBeenCalled();
  });

  it("scopes quote loading to commercially open RFQs owned by the active membership company", async () => {
    const harness = createSupabaseHarness({
      rfqs: [
        {
          id: "rfq-open",
          company_id: "company-1",
          deadline: "2000-01-01T00:00:00.000Z",
        },
        {
          id: "rfq-locked",
          company_id: "company-1",
          deadline: "2999-01-01T00:00:00.000Z",
        },
        {
          id: "rfq-invalid",
          company_id: "company-1",
          deadline: "not-a-date",
        },
      ],
      quotes: [
        {
          id: "quote-open",
          rfq_id: "rfq-open",
          company_id: "supplier-1",
          amount: 1000,
          decision: "awarded",
        },
        {
          id: "quote-locked",
          rfq_id: "rfq-locked",
          company_id: "supplier-sealed",
          amount: 9000,
          decision: null,
        },
      ],
      submissionCountsByRfqId: {
        "rfq-open": 2,
        "rfq-locked": 1,
        "rfq-invalid": 0,
      },
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
      ["rfq_id", ["rfq-open"]],
    ]);
    expect(result.rfqList.map((rfq) => rfq.id)).toEqual([
      "rfq-open",
      "rfq-locked",
      "rfq-invalid",
    ]);
    expect(result.quoteList.map((quote) => quote.id)).toEqual([
      "quote-open",
    ]);
    expect(result.safeSubmissionCountByRfqId).toEqual({
      "rfq-open": 2,
      "rfq-locked": 1,
      "rfq-invalid": 0,
    });
    expect(harness.rpcTraces).toEqual([
      {
        functionName: "count_rfq_quote_submissions",
        args: { p_rfq_id: "rfq-open" },
      },
      {
        functionName: "count_rfq_quote_submissions",
        args: { p_rfq_id: "rfq-locked" },
      },
      {
        functionName: "count_rfq_quote_submissions",
        args: { p_rfq_id: "rfq-invalid" },
      },
    ]);
  });

  it("does not read quote rows when all scoped RFQs remain commercially sealed", async () => {
    const harness = createSupabaseHarness({
      rfqs: [
        {
          id: "rfq-future",
          company_id: "company-1",
          deadline: "2999-01-01T00:00:00.000Z",
        },
        {
          id: "rfq-missing",
          company_id: "company-1",
          deadline: null,
        },
        {
          id: "rfq-invalid",
          company_id: "company-1",
          deadline: "not-a-date",
        },
      ],
      quotes: [
        {
          id: "quote-sealed",
          rfq_id: "rfq-future",
          company_id: "supplier-1",
          amount: 1000,
          decision: null,
        },
      ],
      submissionCountsByRfqId: {
        "rfq-future": 1,
        "rfq-missing": 0,
        "rfq-invalid": 0,
      },
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    expect(result.companyId).toBe("company-1");
    expect(result.rfqList).toHaveLength(3);
    expect(result.quoteList).toEqual([]);
    expect(result.safeSubmissionCountByRfqId).toEqual({
      "rfq-future": 1,
      "rfq-missing": 0,
      "rfq-invalid": 0,
    });
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
  });

  it("aggregates one safe count for each owned RFQ", async () => {
    const harness = createSupabaseHarness({
      rfqs: [
        { id: "rfq-1", company_id: "company-1", deadline: null },
        { id: "rfq-2", company_id: "company-1", deadline: null },
        { id: "rfq-3", company_id: "company-1", deadline: null },
      ],
      submissionCountsByRfqId: {
        "rfq-1": 1,
        "rfq-2": 2,
        "rfq-3": 3,
      },
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    expect(result.safeSubmissionCountByRfqId).toEqual({
      "rfq-1": 1,
      "rfq-2": 2,
      "rfq-3": 3,
    });
    expect(harness.rpcTraces.map((trace) => trace.args.p_rfq_id)).toEqual([
      "rfq-1",
      "rfq-2",
      "rfq-3",
    ]);
  });

  it("filters out cross-buyer RFQs before aggregate RPC calls", async () => {
    const harness = createSupabaseHarness({
      rfqs: [
        { id: "owned-rfq", company_id: "company-1", deadline: null },
        { id: "other-rfq", company_id: "company-2", deadline: null },
      ],
      submissionCountsByRfqId: {
        "owned-rfq": 1,
        "other-rfq": 99,
      },
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    const result = await loadAnalyticsSourceData();

    expect(result.rfqList.map((rfq) => rfq.id)).toEqual(["owned-rfq"]);
    expect(result.safeSubmissionCountByRfqId).toEqual({ "owned-rfq": 1 });
    expect(harness.rpcTraces).toEqual([
      {
        functionName: "count_rfq_quote_submissions",
        args: { p_rfq_id: "owned-rfq" },
      },
    ]);
  });

  it("rejects the complete aggregate when any RFQ count RPC fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = createSupabaseHarness({
      rfqs: [
        { id: "rfq-success", company_id: "company-1", deadline: null },
        { id: "rfq-error", company_id: "company-1", deadline: null },
      ],
      submissionCountsByRfqId: { "rfq-success": 2 },
      submissionCountErrorsByRfqId: {
        "rfq-error": new Error("count denied"),
      },
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    await expect(loadAnalyticsSourceData()).rejects.toThrow(
      "Unable to load analytics submission participation evidence.",
    );
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
    consoleError.mockRestore();
  });

  it.each([
    ["null", null],
    ["numeric string", "1"],
    ["negative", -1],
    ["fractional", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("rejects an invalid safe count: %s", async (_label, invalidCount) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = createSupabaseHarness({
      rfqs: [{ id: "rfq-invalid", company_id: "company-1", deadline: null }],
      submissionCountsByRfqId: { "rfq-invalid": invalidCount },
    });

    vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

    await expect(loadAnalyticsSourceData()).rejects.toThrow(
      "Unable to validate analytics submission participation evidence.",
    );
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
    consoleError.mockRestore();
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
    expect(result.safeSubmissionCountByRfqId).toEqual({});
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
    expect(harness.rpc).not.toHaveBeenCalled();
  });

  it("scopes self-declared company compliance to the exact active membership company", async () => {
  const harness = createSupabaseHarness({
    compliance: [
      {
        id: "compliance-1",
        company_id: "company-1",
        compliance_type: "insurance",
        name: "General Liability",
        provider: "Carrier",
        effective_on: "2026-01-01",
        expires_on: "2026-12-31",
        sort_order: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  vi.mocked(createClient).mockResolvedValue(harness.supabase as never);

  const result = await loadAnalyticsSourceData();
  const complianceTrace = getTrace(harness.traces, "company_compliance");

  expect(complianceTrace?.equals).toContainEqual(["company_id", "company-1"]);
  expect(result.companyCompliance.insurance).toEqual([
    {
      name: "General Liability",
      provider: "Carrier",
      effective_on: "2026-01-01",
      expires_on: "2026-12-31",
    },
  ]);
  expect(result.companyCompliance.workers_compensation).toEqual([]);
  expect(result.companyCompliance.safety).toEqual([]);
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
    expect(result.safeSubmissionCountByRfqId).toEqual({});
    expect(getTrace(harness.traces, "quotes")).toBeUndefined();
    expect(harness.rpc).not.toHaveBeenCalled();
  });
});
