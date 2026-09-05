import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const membership = readSource("src/lib/auth/membership.ts");
const analyticsSourceLoader = readSource(
  "src/lib/analytics/source-data/load-analytics-source-data.ts",
);
const analyticsVendors = readSource("src/app/analytics/vendors/page.tsx");
const vendorDashboard = readSource("src/app/vendor-dashboard/page.tsx");

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
