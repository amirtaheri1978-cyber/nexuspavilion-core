import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const analyticsSourceLoader = readSource(
  "src/lib/analytics/source-data/load-analytics-source-data.ts",
);

const vendorAnalyticsPage = readSource(
  "src/app/analytics/vendors/page.tsx",
);

describe("Task 16-01 executive page query audit", () => {
  it("loads independent analytics sources concurrently before dependent quote retrieval", () => {
    const concurrentStart = analyticsSourceLoader.indexOf(
      "const [companyCompliance, rfqResult, companiesResult] = await Promise.all([",
    );

    const concurrentEnd = analyticsSourceLoader.indexOf(
      "  ]);",
      concurrentStart,
    );

    expect(concurrentStart).toBeGreaterThanOrEqual(0);
    expect(concurrentEnd).toBeGreaterThan(concurrentStart);

    const concurrentSection = analyticsSourceLoader.slice(
      concurrentStart,
      concurrentEnd,
    );

    expect(concurrentSection).toContain("loadCompanyCompliance");
    expect(concurrentSection).toContain('.from("rfqs")');
    expect(concurrentSection).toContain('.from("company_directory")');

    const rfqIdsIndex = analyticsSourceLoader.indexOf("const rfqIds =");
    const quoteQueryIndex = analyticsSourceLoader.indexOf('.from("quotes")');

    expect(rfqIdsIndex).toBeGreaterThan(concurrentEnd);
    expect(quoteQueryIndex).toBeGreaterThan(rfqIdsIndex);

    expect(analyticsSourceLoader).toContain(
      "const { data: companies, error: companiesError } = companiesResult;",
    );
  });

  it("loads independent vendor governance sources concurrently before quote retrieval", () => {
    const concurrentStart = vendorAnalyticsPage.indexOf(
      "const [approvedVendorsResult, complianceResult] = await Promise.all([",
    );

    const concurrentEnd = vendorAnalyticsPage.indexOf(
      "]);",
      concurrentStart,
    );

    expect(concurrentStart).toBeGreaterThanOrEqual(0);
    expect(concurrentEnd).toBeGreaterThan(concurrentStart);

    const concurrentSection = vendorAnalyticsPage.slice(
      concurrentStart,
      concurrentEnd,
    );

    expect(concurrentSection).toContain('.from("approved_vendors")');
    expect(concurrentSection).toContain('.from("supplier_compliance")');

    const vendorCompanyIdsIndex =
      vendorAnalyticsPage.indexOf("const vendorCompanyIds");

    const quoteQueryIndex = vendorAnalyticsPage.indexOf('.from("quotes")');

    expect(vendorCompanyIdsIndex).toBeGreaterThan(concurrentEnd);
    expect(quoteQueryIndex).toBeGreaterThan(vendorCompanyIdsIndex);

    expect(vendorAnalyticsPage).toContain(
      "const { data: approvedVendorsData } = approvedVendorsResult;",
    );

    expect(vendorAnalyticsPage).toContain(
      "const { data: complianceData } = complianceResult;",
    );
  });
});
