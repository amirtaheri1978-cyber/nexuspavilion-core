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
  it("loads independent analytics sources concurrently before deadline-gated quote retrieval", () => {
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

    const commerciallyOpenRfqIdsIndex = analyticsSourceLoader.indexOf(
      "const commerciallyOpenRfqIds =",
    );
    const quoteQueryIndex = analyticsSourceLoader.indexOf('.from("quotes")');

    expect(commerciallyOpenRfqIdsIndex).toBeGreaterThan(concurrentEnd);
    expect(quoteQueryIndex).toBeGreaterThan(commerciallyOpenRfqIdsIndex);
    expect(analyticsSourceLoader).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(analyticsSourceLoader).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );

    expect(analyticsSourceLoader).toContain(
      "const { data: companies, error: companiesError } = companiesResult;",
    );
  });

  it("loads independent vendor governance and RFQ opening context before deadline-gated quote retrieval", () => {
    const concurrentStart = vendorAnalyticsPage.indexOf(
      "const [approvedVendorsResult, complianceResult, rfqResult] = await Promise.all([",
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
    expect(concurrentSection).toContain('.from("rfqs")');
    expect(concurrentSection).toContain('.select("id, deadline")');
    expect(concurrentSection).toContain('.eq("company_id", companyId)');

    const vendorCompanyIdsIndex =
      vendorAnalyticsPage.indexOf("const vendorCompanyIds");
    const commerciallyOpenRfqIdsIndex = vendorAnalyticsPage.indexOf(
      "const commerciallyOpenRfqIds =",
    );
    const quoteQueryIndex = vendorAnalyticsPage.indexOf('.from("quotes")');

    expect(vendorCompanyIdsIndex).toBeGreaterThan(concurrentEnd);
    expect(commerciallyOpenRfqIdsIndex).toBeGreaterThan(vendorCompanyIdsIndex);
    expect(quoteQueryIndex).toBeGreaterThan(commerciallyOpenRfqIdsIndex);
    expect(vendorAnalyticsPage).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(vendorAnalyticsPage).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );

    expect(vendorAnalyticsPage).toContain(
      "const { data: approvedVendorsData } = approvedVendorsResult;",
    );

    expect(vendorAnalyticsPage).toContain(
      "const { data: complianceData } = complianceResult;",
    );

    expect(vendorAnalyticsPage).toContain(
      "const { data: commercialRfqsData, error: commercialRfqsError } = rfqResult;",
    );
  });
});
