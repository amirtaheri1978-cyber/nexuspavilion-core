import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Children, isValidElement } from "react";
import type { ElementType, ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import { ExecutiveAttentionStrip } from "@/components/dashboard/executive-attention-strip";
import { ExecutiveDecisionWorkspace } from "@/components/dashboard/executive-decision-workspace";
import { ExecutiveKpiRow } from "@/components/dashboard/executive-kpi-row";
import { GovernanceReferenceWorkspace } from "@/components/dashboard/governance-reference-workspace";
import { StrategicIntelligenceWorkspace } from "@/components/dashboard/strategic-intelligence-workspace";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

type QueryResult = {
  data: unknown;
  error: unknown;
};

type QueryTrace = {
  table: string;
  equals: Array<[string, unknown]>;
  inclusions: Array<[string, readonly unknown[]]>;
};

type FakeQuery = {
  select(columns: string): FakeQuery;
  eq(column: string, value: unknown): FakeQuery;
  in(column: string, values: readonly unknown[]): FakeQuery;
  order(column: string, options: { ascending?: boolean }): FakeQuery;
  single(): Promise<QueryResult>;
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2>;
};

type DashboardHarnessOptions = {
  rfqs?: Array<Record<string, unknown>>;
  quotes?: Array<Record<string, unknown>>;
  rpcResults?: Record<string, QueryResult>;
};

const company = {
  id: "company-1",
  name: "Nexus Buyer",
  slug: "nexus-buyer",
  category: "General Contractor",
  location: "Toronto",
  network_role: "buyer",
  status: "active",
  logo_url: "https://example.test/logo.png",
};

function buildRfq(
  id: string,
  deadline: string | null,
  companyId = "company-1",
) {
  return {
    id,
    company_id: companyId,
    slug: id,
    title: id,
    category: "Construction",
    location: "Toronto",
    budget: 0,
    status: "open",
    created_at: "2026-09-01T00:00:00.000Z",
    deadline,
    procurement_scope: "material",
    sourcing_method: "sealed_bid",
    contract_framework: "project_specific",
  };
}

function createDashboardHarness(options: DashboardHarnessOptions = {}) {
  const traces: QueryTrace[] = [];
  const rfqs = options.rfqs ?? [];
  const quotes = options.quotes ?? [];
  const rpcResults = options.rpcResults ?? {};

  function resolveResult(table: string, trace: QueryTrace): QueryResult {
    if (table === "profiles") {
      return {
        data: {
          id: "user-1",
          email: "buyer@example.test",
          company_id: "company-1",
        },
        error: null,
      };
    }

    if (table === "companies") {
      return { data: company, error: null };
    }

    if (table === "rfqs") {
      const companyId = trace.equals.find(
        ([column]) => column === "company_id",
      )?.[1];

      return {
        data: rfqs.filter(
          (rfq) => !companyId || rfq.company_id === companyId,
        ),
        error: null,
      };
    }

    if (table === "quotes") {
      const rfqIds = trace.inclusions.find(
        ([column]) => column === "rfq_id",
      )?.[1];

      return {
        data: quotes.filter(
          (quote) => !rfqIds || rfqIds.includes(quote.rfq_id),
        ),
        error: null,
      };
    }

    return { data: [], error: null };
  }

  const from = vi.fn((table: string) => {
    const trace: QueryTrace = { table, equals: [], inclusions: [] };
    traces.push(trace);

    const query: FakeQuery = {
      select() {
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
      order() {
        return query;
      },
      async single() {
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
    async (name: string, args: { p_rfq_id?: string }): Promise<QueryResult> => {
      if (name !== "count_rfq_quote_submissions" || !args.p_rfq_id) {
        return { data: null, error: new Error("Unexpected RPC call") };
      }

      return (
        rpcResults[args.p_rfq_id] ?? {
          data: null,
          error: new Error(`Missing RPC fixture for ${args.p_rfq_id}`),
        }
      );
    },
  );

  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
      })),
    },
    from,
    rpc,
  } as unknown as SupabaseClient;

  return { supabase, traces, rpc };
}

function findElementByType(
  node: ReactNode,
  type: ElementType,
): ReactElement<Record<string, unknown>> | null {
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return null;
  }

  if (node.type === type) {
    return node as ReactElement<Record<string, unknown>>;
  }

  for (const child of Children.toArray(node.props.children)) {
    const match = findElementByType(child, type);
    if (match) return match;
  }

  return null;
}

function getElementProps<T>(node: ReactNode, type: ElementType) {
  const element = findElementByType(node, type);

  if (!element) {
    throw new Error(`Expected dashboard element ${type.toString()}`);
  }

  return element.props as T;
}

type KpiProps = {
  metrics: Array<{ label: string; value: string }>;
};

type DecisionProps = {
  summary: string;
  recommendations: Array<{ title: string; value: string; detail: string }>;
};

type StrategicProps = {
  narrative: string;
  primaryMetrics: Array<{ label: string; value: string }>;
  operatingMetrics: Array<{ title: string; value: string }>;
};

type GovernanceProps = {
  readiness: {
    tasks: Array<{ title: string }>;
  };
};

type AttentionProps = {
  items: Array<{ title: string; description: string }>;
};

async function loadDashboard(harness: ReturnType<typeof createDashboardHarness>) {
  vi.mocked(createClient).mockResolvedValue(harness.supabase as never);
  const output = await DashboardPage();

  return {
    output,
    kpi: getElementProps<KpiProps>(output, ExecutiveKpiRow),
    decision: getElementProps<DecisionProps>(
      output,
      ExecutiveDecisionWorkspace,
    ),
    strategic: getElementProps<StrategicProps>(
      output,
      StrategicIntelligenceWorkspace,
    ),
    attention: getElementProps<AttentionProps>(
      output,
      ExecutiveAttentionStrip,
    ),
    governance: getElementProps<GovernanceProps>(
      output,
      GovernanceReferenceWorkspace,
    ),
  };
}

function findKpi(props: KpiProps, label: string) {
  return props.metrics.find((metric) => metric.label === label)?.value;
}

function findOperatingMetric(props: StrategicProps, title: string) {
  return props.operatingMetrics.find((metric) => metric.title === title)?.value;
}

function findPrimaryMetric(props: StrategicProps, label: string) {
  return props.primaryMetrics.find((metric) => metric.label === label)?.value;
}

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const dashboardFiles = [
  "src/app/dashboard/page.tsx",
  "src/app/dashboard/loading.tsx",
  "src/components/dashboard/executive-hero.tsx",
  "src/components/dashboard/executive-attention-strip.tsx",
  "src/components/dashboard/executive-kpi-row.tsx",
  "src/components/dashboard/executive-decision-workspace.tsx",
  "src/components/dashboard/strategic-intelligence-workspace.tsx",
  "src/components/dashboard/procurement-operations-workspace.tsx",
  "src/components/dashboard/governance-reference-workspace.tsx",
];

const page = readSource("src/app/dashboard/page.tsx");
const hero = readSource("src/components/dashboard/executive-hero.tsx");
const loading = readSource("src/app/dashboard/loading.tsx");
const kpi = readSource("src/components/dashboard/executive-kpi-row.tsx");
const attention = readSource(
  "src/components/dashboard/executive-attention-strip.tsx",
);
const decision = readSource(
  "src/components/dashboard/executive-decision-workspace.tsx",
);

describe("NP-MASTER-22-B02 golden executive dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies the frozen page contract", () => {
    expect(page).toContain("EXECUTIVE_PAGE_CLASS");
    expect(page).toContain("bg-nexus-navy");
    expect(page).not.toContain("max-w-none");
    expect(page).not.toContain("bg-[#030712]");
    expect(EXECUTIVE_PAGE_CLASS).toContain("np-page");
    expect(loading).toContain("EXECUTIVE_PAGE_CLASS");
  });

  it("keeps a single page h1 in the dashboard hero", () => {
    expect(hero.match(/<h1[\s>]/g) || []).toHaveLength(1);
    expect(hero).toContain("np-type-h1");

    for (const file of dashboardFiles.filter(
      (path) => path !== "src/components/dashboard/executive-hero.tsx",
    )) {
      expect(readSource(file)).not.toMatch(/<h1[\s>]/);
    }
  });

  it("uses frozen CTA and focus classes without hover-scale", () => {
    expect(hero).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(hero).toContain("EXECUTIVE_CTA_SECONDARY");
    expect(EXECUTIVE_CTA_PRIMARY).toContain("focus-visible:ring-2");
    expect(EXECUTIVE_CTA_SECONDARY).toContain("focus-visible:ring-2");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:scale");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:-translate");
    expect(hero).not.toContain("hover:scale");
    expect(hero).not.toContain("hover:-translate");
  });

  it("does not reintroduce the light-mode ui kit", () => {
    for (const file of dashboardFiles) {
      const source = readSource(file);
      expect(source).not.toContain('@/components/ui');
      expect(source).not.toContain("src/components/ui");
      expect(source).not.toContain("bg-[#f6f6f3]");
    }
  });

  it("does not fabricate metric trend copy", () => {
    for (const file of dashboardFiles) {
      const source = readSource(file);
      expect(source).not.toMatch(/vs last (month|week|quarter)/i);
      expect(source).not.toMatch(/year over year/i);
      expect(source).not.toMatch(/\+\d+%/);
    }

    expect(kpi).toContain("Values are not compared against prior periods");
    expect(page).toContain("Insufficient Data");
  });

  it("keeps bounded empty and loading states", () => {
    expect(attention).toContain("No Immediate Action");
    expect(attention).toContain("border-dashed");
    expect(decision).toContain("No Decision Signals");
    expect(
      readSource("src/components/dashboard/procurement-operations-workspace.tsx"),
    ).toContain("No award decisions have been recorded.");
    expect(
      readSource("src/components/dashboard/governance-reference-workspace.tsx"),
    ).toContain("Open Activity Center");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading executive dashboard");
  });

  it("does not add backend queries for appearance", () => {
    expect(page).toContain('.from("rfqs")');
    expect(page).toContain('.from("quotes")');
    expect(page).toContain(
      'supabase.rpc("count_rfq_quote_submissions", {',
    );
    expect(page).not.toContain('.from("notifications")');
    expect(page).not.toContain("createBrowserClient");
    expect(page.match(/\.from\("/g) || []).toHaveLength(4);
  });

  it("keeps safe submission participation separate from commercial evidence", () => {
    expect(page).toContain("const safeSubmissionCountResults =");
    expect(page).toContain("let safeSubmissionCount = 0;");
    expect(page).toContain('typeof value !== "number"');
    expect(page).toContain("if (result.error || count === null)");
    expect(page).toContain(
      'throw new Error("Unable to load company quote submission counts.")',
    );
    expect(page).toContain("supplierQuotes: safeSubmissionCount");
    expect(page).toContain("String(safeSubmissionCount)");
    expect(page).toContain("${safeSubmissionCount} supplier quotes received");

    const portfolioBuild = page.slice(
      page.indexOf("const portfolio = buildPortfolioIntelligence"),
      page.indexOf("const awardedQuotes"),
    );
    expect(portfolioBuild).toContain("quoteList");
    expect(portfolioBuild).not.toContain("safeSubmissionCount");

    const coverageSignal = page.slice(
      page.indexOf("const supplierQuoteCoverage"),
      page.indexOf("const alerts"),
    );
    expect(coverageSignal).toContain("safeSubmissionCount");
    expect(coverageSignal).not.toContain("portfolio.supplierQuotes");

    const coverageAlert = page.slice(
      page.indexOf("if (safeSubmissionCount < 3"),
      page.indexOf("if (budgetVariance"),
    );
    expect(coverageAlert).toContain("safeSubmissionCount");
    expect(coverageAlert).not.toContain("portfolio.supplierQuotes");

    const awardRate = page.slice(
      page.indexOf('label: "Award Rate"'),
      page.indexOf('label: "Budget Utilization"'),
    );
    expect(awardRate).toContain("portfolio.supplierQuotes");
    expect(awardRate).not.toContain("safeSubmissionCount");
  });

  it("shows a locked RFQ safe count without loading commercial quote rows", async () => {
    const harness = createDashboardHarness({
      rfqs: [buildRfq("rfq-locked", "2999-01-01T00:00:00.000Z")],
      quotes: [
        {
          id: "locked-quote-secret",
          rfq_id: "rfq-locked",
          company_id: "supplier-secret",
          amount: 99999,
          decision: "awarded",
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      rpcResults: {
        "rfq-locked": { data: 1, error: null },
      },
    });

    const result = await loadDashboard(harness);
    const coverage = result.decision.recommendations.find(
      (recommendation) => recommendation.title === "Supplier Quote Coverage",
    );

    expect(harness.rpc).toHaveBeenCalledWith(
      "count_rfq_quote_submissions",
      { p_rfq_id: "rfq-locked" },
    );
    expect(harness.traces.find((trace) => trace.table === "quotes")).toBeUndefined();
    expect(findKpi(result.kpi, "Supplier Quotes Received")).toBe("1");
    expect(result.decision.summary).toContain("1 supplier quotes received");
    expect(result.strategic.narrative).toContain("1 supplier quotes received");
    expect(result.governance.readiness.tasks).not.toContainEqual(
      expect.objectContaining({ title: "Quote Activity" }),
    );
    expect(findKpi(result.kpi, "Award Rate")).toBe("Insufficient Data");
    expect(coverage?.value).toBe("Limited");
    expect(coverage?.detail).toContain("Few supplier quotes");
    expect(result.attention.items).toContainEqual(
      expect.objectContaining({
        title: "Supplier Quote Coverage Is Limited",
        description: expect.stringContaining("Few supplier quotes"),
      }),
    );
    expect(findOperatingMetric(result.strategic, "Avg Quotes per RFQ")).toBe(
      "Policy Locked",
    );
    expect(
      findPrimaryMetric(result.strategic, "Potential Budget Variance"),
    ).toBe("Insufficient Data");
    expect(result.attention.items).not.toContainEqual(
      expect.objectContaining({ title: "Budget-to-Award Variance Recorded" }),
    );
    expect(JSON.stringify(result.output)).not.toContain("locked-quote-secret");
    expect(JSON.stringify(result.output)).not.toContain("supplier-secret");
    expect(JSON.stringify(result.output)).not.toContain("99999");
  });

  it("keeps numeric zero coverage when no safe or commercial submissions exist", async () => {
    const harness = createDashboardHarness({
      rfqs: [
        {
          ...buildRfq("rfq-empty", "2999-01-01T00:00:00.000Z"),
          budget: 1850000,
        },
      ],
      rpcResults: {
        "rfq-empty": { data: 0, error: null },
      },
    });

    const result = await loadDashboard(harness);
    const coverage = result.decision.recommendations.find(
      (recommendation) => recommendation.title === "Supplier Quote Coverage",
    );

    expect(findKpi(result.kpi, "Supplier Quotes Received")).toBe("0");
    expect(findOperatingMetric(result.strategic, "Avg Quotes per RFQ")).toBe(
      "0",
    );
    expect(findKpi(result.kpi, "Award Rate")).toBe("Insufficient Data");
    expect(coverage?.value).toBe("No Submissions");
    expect(coverage?.detail).toContain("No supplier quotes have been received");
    expect(result.attention.items).toContainEqual(
      expect.objectContaining({
        title: "No Supplier Quote Submissions",
        description: expect.stringContaining(
          "No supplier quotes have been received",
        ),
      }),
    );
    expect(
      findPrimaryMetric(result.strategic, "Potential Budget Variance"),
    ).toBe("Insufficient Data");
    expect(result.attention.items).not.toContainEqual(
      expect.objectContaining({ title: "Budget-to-Award Variance Recorded" }),
    );
  });

  it("preserves numeric average coverage when commercial quotes are open", async () => {
    const harness = createDashboardHarness({
      rfqs: [buildRfq("rfq-open", "2000-01-01T00:00:00.000Z")],
      quotes: [
        {
          id: "quote-open",
          rfq_id: "rfq-open",
          company_id: "supplier-open",
          amount: 1250,
          decision: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      rpcResults: {
        "rfq-open": { data: 1, error: null },
      },
    });

    const result = await loadDashboard(harness);
    const coverage = result.decision.recommendations.find(
      (recommendation) => recommendation.title === "Supplier Quote Coverage",
    );

    expect(findKpi(result.kpi, "Supplier Quotes Received")).toBe("1");
    expect(findOperatingMetric(result.strategic, "Avg Quotes per RFQ")).toBe(
      "1",
    );
    expect(coverage?.value).toBe("Limited");
  });

  it("calculates variance from awarded-RFQ budgets and excludes open RFQ budgets", async () => {
    const harness = createDashboardHarness({
      rfqs: [
        {
          ...buildRfq("rfq-awarded", "2000-01-01T00:00:00.000Z"),
          status: "awarded",
          budget: 1000,
        },
        {
          ...buildRfq("rfq-open", "2000-01-01T00:00:00.000Z"),
          budget: 100000,
        },
      ],
      quotes: [
        {
          id: "quote-awarded",
          rfq_id: "rfq-awarded",
          company_id: "supplier-awarded",
          amount: 700,
          decision: "awarded",
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      rpcResults: {
        "rfq-awarded": { data: 1, error: null },
        "rfq-open": { data: 0, error: null },
      },
    });

    const result = await loadDashboard(harness);
    const varianceSignal = result.decision.recommendations.find(
      (recommendation) => recommendation.title === "Budget-to-Award Variance",
    );

    expect(findPrimaryMetric(result.strategic, "Awarded Spend")).toBe("$700");
    expect(
      findPrimaryMetric(result.strategic, "Potential Budget Variance"),
    ).toBe("$300");
    expect(varianceSignal?.value).toBe("$300");
    expect(result.attention.items).toContainEqual(
      expect.objectContaining({ title: "Budget-to-Award Variance Recorded" }),
    );
  });

  it("aggregates each owned RFQ safe count exactly once", async () => {
    const harness = createDashboardHarness({
      rfqs: [
        buildRfq("rfq-1", "2999-01-01T00:00:00.000Z"),
        buildRfq("rfq-2", "2999-02-01T00:00:00.000Z"),
        buildRfq("rfq-3", null),
        buildRfq("rfq-other-buyer", "2999-03-01T00:00:00.000Z", "company-2"),
      ],
      rpcResults: {
        "rfq-1": { data: 1, error: null },
        "rfq-2": { data: 2, error: null },
        "rfq-3": { data: 3, error: null },
        "rfq-other-buyer": { data: 99, error: null },
      },
    });

    const result = await loadDashboard(harness);
    const rpcIds = harness.rpc.mock.calls.map(([, args]) => args.p_rfq_id);
    const rfqTrace = harness.traces.find((trace) => trace.table === "rfqs");
    const coverage = result.decision.recommendations.find(
      (recommendation) => recommendation.title === "Supplier Quote Coverage",
    );

    expect(rfqTrace?.equals).toContainEqual(["company_id", "company-1"]);
    expect(rpcIds).toEqual(["rfq-1", "rfq-2", "rfq-3"]);
    expect(new Set(rpcIds).size).toBe(3);
    expect(findKpi(result.kpi, "Supplier Quotes Received")).toBe("6");
    expect(result.decision.summary).toContain("6 supplier quotes received");
    expect(result.strategic.narrative).toContain("6 supplier quotes received");
    expect(coverage?.value).toBe("Active");
    expect(findOperatingMetric(result.strategic, "Avg Quotes per RFQ")).toBe(
      "Policy Locked",
    );
    expect(result.attention.items).not.toContainEqual(
      expect.objectContaining({ title: "Supplier Quote Coverage Is Limited" }),
    );
    expect(JSON.stringify(result.attention.items)).not.toContain(
      "Few supplier quotes",
    );
  });

  it("keeps raw aggregate participation separate from unlocked commercial metrics", async () => {
    const harness = createDashboardHarness({
      rfqs: [
        buildRfq("rfq-open", "2000-01-01T00:00:00.000Z"),
        buildRfq("rfq-locked", "2999-01-01T00:00:00.000Z"),
      ],
      quotes: [
        {
          id: "quote-open",
          rfq_id: "rfq-open",
          company_id: "supplier-open",
          amount: 1250,
          decision: "awarded",
          created_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "quote-locked-secret",
          rfq_id: "rfq-locked",
          company_id: "supplier-secret",
          amount: 99999,
          decision: "awarded",
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      rpcResults: {
        "rfq-open": { data: 2, error: null },
        "rfq-locked": { data: 4, error: null },
      },
    });

    const result = await loadDashboard(harness);
    const quoteTrace = harness.traces.find((trace) => trace.table === "quotes");
    const coverage = result.decision.recommendations.find(
      (recommendation) => recommendation.title === "Supplier Quote Coverage",
    );

    expect(quoteTrace?.inclusions).toEqual([["rfq_id", ["rfq-open"]]]);
    expect(findKpi(result.kpi, "Supplier Quotes Received")).toBe("6");
    expect(findKpi(result.kpi, "Award Rate")).toBe("100%");
    expect(findOperatingMetric(result.strategic, "Avg Quotes per RFQ")).toBe(
      "Policy Locked",
    );
    expect(findPrimaryMetric(result.strategic, "Awarded Spend")).toBe("$1,250");
    expect(coverage?.value).toBe("Active");
    expect(result.attention.items).not.toContainEqual(
      expect.objectContaining({ title: "Supplier Quote Coverage Is Limited" }),
    );
    expect(JSON.stringify(result.output)).not.toContain("quote-locked-secret");
    expect(JSON.stringify(result.output)).not.toContain("supplier-secret");
    expect(JSON.stringify(result.output)).not.toContain("99999");
  });

  it("fails closed when any owned RFQ aggregate call fails", async () => {
    const harness = createDashboardHarness({
      rfqs: [
        buildRfq("rfq-success", "2999-01-01T00:00:00.000Z"),
        buildRfq("rfq-failure", "2999-02-01T00:00:00.000Z"),
      ],
      rpcResults: {
        "rfq-success": { data: 4, error: null },
        "rfq-failure": { data: null, error: new Error("count denied") },
      },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      vi.mocked(createClient).mockResolvedValue(harness.supabase as never);
      await expect(DashboardPage()).rejects.toThrow(
        "Unable to load company quote submission counts.",
      );
      expect(harness.rpc).toHaveBeenCalledTimes(2);
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each([
    ["null", null],
    ["numeric string", "1"],
    ["negative", -1],
    ["fractional", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("fails closed for an invalid %s aggregate count", async (_label, count) => {
    const harness = createDashboardHarness({
      rfqs: [buildRfq("rfq-invalid", "2999-01-01T00:00:00.000Z")],
      rpcResults: {
        "rfq-invalid": { data: count, error: null },
      },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      vi.mocked(createClient).mockResolvedValue(harness.supabase as never);
      await expect(DashboardPage()).rejects.toThrow(
        "Unable to load company quote submission counts.",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
