import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isRfqSubmitContinuationPath } from "@/lib/auth/login-continuation";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const createCompanyPage = readSource("src/app/create-company/page.tsx");
const createRoute = readSource("src/app/api/companies/create/route.ts");
const helper = readSource("src/lib/auth/login-continuation.ts");
const bootstrapMigration = readSource(
  "supabase/migrations/20260832000000_bootstrap_vendor_supplier_founder_capability.sql",
);

const wizard = createCompanyPage.slice(
  createCompanyPage.indexOf("function CreateCompanyWizard()"),
);

describe("Task 32D RFQ-aware create-company default", () => {
  it("initializes Supplier only from a sanitized RFQ submit continuation", () => {
    expect(wizard).toContain("isRfqSubmitContinuationPath(continuationNext)");
    expect(wizard).toContain(
      'isRfqQuoteContinuation ? "supplier" : "owner_developer"',
    );
    expect(wizard).not.toMatch(
      /useState<OrganizationType>\("owner_developer"\)/,
    );
    const namePreloadEffect = wizard.slice(
      wizard.indexOf("useEffect(() => {"),
      wizard.indexOf("void preloadFounderNames()"),
    );
    expect(namePreloadEffect).not.toContain("setOrganizationType");
    expect(wizard).not.toContain('setOrganizationType("supplier")');
    expect(isRfqSubmitContinuationPath("/rfq/harbor-point/submit")).toBe(true);
    expect(isRfqSubmitContinuationPath(null)).toBe(false);
  });

  it("maps Supplier to vendor_supplier and keeps every organization type selectable", () => {
    expect(createCompanyPage).toContain('value: "owner_developer"');
    expect(createCompanyPage).toContain('value: "general_contractor"');
    expect(createCompanyPage).toContain('value: "consultant"');
    expect(createCompanyPage).toContain('value: "service_provider"');
    expect(createCompanyPage).toContain('value: "supplier"');
    expect(createCompanyPage).toContain('accountType: "vendor_supplier"');
    expect(createCompanyPage).toContain("ORGANIZATION_TYPES.map((item) => {");
    expect(createCompanyPage).toContain("setOrganizationType(");
    expect(createCompanyPage).toContain("item.value");
    expect(createCompanyPage).toContain("disabled={loading}");
    expect(createCompanyPage).not.toContain(
      "disabled={isRfqQuoteContinuation",
    );
  });

  it("explains the RFQ Supplier preselection without sending procurement_function", () => {
    expect(createCompanyPage).toContain(
      "You are continuing to submit an RFQ quote.",
    );
    expect(createCompanyPage).toContain(
      "Supplier has therefore been preselected.",
    );
    expect(createCompanyPage).toContain(
      "You may choose another organization type if that better describes your company.",
    );
    expect(createCompanyPage).not.toContain("procurement_function");
    expect(createCompanyPage).not.toContain("p_procurement_function");
    expect(createRoute).not.toContain("body.procurement_function");
    expect(createRoute).not.toContain("p_procurement_function");
    expect(createRoute).toContain(
      "p_account_type: createdNewCompany ? rawAccountType : null",
    );
    expect(helper).not.toContain("p_procurement_function");
    expect(bootstrapMigration).toContain(
      "elsif normalized_account_type = 'vendor_supplier' then\n    derived_procurement_function := 'supplier';",
    );
  });
});
