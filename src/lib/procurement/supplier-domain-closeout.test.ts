import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  APPROVED_VENDOR_DOMAIN_AVAILABLE,
  APPROVED_VENDOR_UNAVAILABLE_MESSAGE,
  INVITE_BY_EMAIL_REMAINS_MESSAGE,
  SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE,
  SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE,
} from "@/lib/procurement/supplier-domain-availability";
import { canInviteCompanySuppliers } from "@/lib/procurement/procurement-write-authorization";
import type { OrganizationMembership } from "@/lib/auth/membership";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function queryIndex(source: string, snippet: string) {
  const index = source.indexOf(snippet);
  expect(index).toBeGreaterThan(-1);
  return index;
}

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

function membership(
  overrides: Partial<OrganizationMembership> = {},
): OrganizationMembership {
  return {
    id: "membership-1",
    userId: "user-1",
    companyId: COMPANY_ID,
    workspaceRole: "member",
    procurementFunction: "none",
    membershipType: "employee",
    membershipStatus: "active",
    jobTitle: null,
    jobFunction: null,
    invitedBy: null,
    joinedAt: null,
    ...overrides,
  };
}

const directory = readSource("src/app/directory/page.tsx");
const analyticsVendors = readSource("src/app/analytics/vendors/page.tsx");
const inviteForm = readSource("src/components/invite-vendor-form.tsx");
const avlPanel = readSource("src/components/rfq-workspace/supplier-avl-panel.tsx");
const invitesRoute = readSource("src/app/api/invites/route.ts");
const approvedVendorsRoute = readSource("src/app/api/approved-vendors/route.ts");
const supplierComplianceRoute = readSource(
  "src/app/api/supplier-compliance/route.ts",
);
const availability = readSource(
  "src/lib/procurement/supplier-domain-availability.ts",
);
const authorization = readSource(
  "src/lib/procurement/procurement-write-authorization.ts",
);

const migrationFiles = readdirSync(
  resolve(process.cwd(), "supabase/migrations"),
).filter((file) => file.endsWith(".sql"));

describe("supplier / compliance domain closeout", () => {
  it("keeps AVL and compliance domains disabled without fabricating schema", () => {
    expect(APPROVED_VENDOR_DOMAIN_AVAILABLE).toBe(false);
    expect(SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE).toBe(false);
    expect(availability).toContain(
      "export const APPROVED_VENDOR_DOMAIN_AVAILABLE = false",
    );
    expect(availability).toContain(
      "export const SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE = false",
    );
    expect(APPROVED_VENDOR_UNAVAILABLE_MESSAGE).toBe(
      "Approved vendor management is not enabled in this environment.",
    );
    expect(SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE).toBe(
      "Compliance data is not available.",
    );
    expect(INVITE_BY_EMAIL_REMAINS_MESSAGE).toBe(
      "Invite by email remains available.",
    );

    for (const file of migrationFiles) {
      const sql = readFileSync(
        resolve(process.cwd(), "supabase/migrations", file),
        "utf8",
      ).toLowerCase();

      expect(sql).not.toMatch(
        /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?approved_vendors\b/,
      );
      expect(sql).not.toMatch(
        /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?supplier_compliance\b/,
      );
    }
  });

  it("does not query approved_vendors from the public directory when the domain is absent", () => {
    expect(directory).toContain('.from("company_directory")');
    expect(directory).toContain('.from("quotes")');
    expect(directory).toContain("APPROVED_VENDOR_DOMAIN_AVAILABLE");
    expect(
      queryIndex(directory, "APPROVED_VENDOR_DOMAIN_AVAILABLE && currentProfile?.company_id"),
    ).toBeLessThan(queryIndex(directory, '.from("approved_vendors")'));
    expect(directory).toContain("APPROVED_VENDOR_UNAVAILABLE_MESSAGE");
    expect(directory).not.toContain("PGRST205");
    expect(directory).not.toContain("Could not find the table");
  });

  it("does not query missing AVL or compliance tables from analytics/vendors", () => {
    expect(analyticsVendors).toContain("APPROVED_VENDOR_DOMAIN_AVAILABLE");
    expect(analyticsVendors).toContain("SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE");
    expect(
      queryIndex(analyticsVendors, "APPROVED_VENDOR_DOMAIN_AVAILABLE"),
    ).toBeLessThan(queryIndex(analyticsVendors, '.from("approved_vendors")'));
    expect(
      queryIndex(analyticsVendors, "SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE"),
    ).toBeLessThan(queryIndex(analyticsVendors, '.from("supplier_compliance")'));
    expect(analyticsVendors).not.toContain("PGRST205");
    expect(analyticsVendors).not.toContain("Could not find the table");
  });

  it("represents missing AVL and compliance dimensions as unavailable or insufficient data", () => {
    expect(analyticsVendors).toContain("Insufficient data");
    expect(analyticsVendors).toContain("APPROVED_VENDOR_UNAVAILABLE_MESSAGE");
    expect(analyticsVendors).toContain("SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE");
    expect(analyticsVendors).toContain("Unavailable");
    expect(analyticsVendors).toContain(
      "Missing AVL and compliance dimensions are unavailable, not scored as",
    );
    expect(analyticsVendors).toContain("zero or non-compliant");
    expect(analyticsVendors).not.toContain('value={String(totalVendors)}');
    expect(analyticsVendors).not.toContain('value={String(compliantVendors)}');
    expect(analyticsVendors).not.toContain('value={String(highRiskVendors)}');
  });

  it("keeps invite-by-email working without AVL selection or AVL schema", () => {
    expect(inviteForm).not.toContain('.from("approved_vendors")');
    expect(inviteForm).not.toContain('.from("company_directory")');
    expect(inviteForm).not.toContain("vendorCompanyId");
    expect(inviteForm).toContain('fetch("/api/invites"');
    expect(inviteForm).toContain("rfqId,");
    expect(inviteForm).toContain("email,");
    expect(inviteForm).toContain("INVITE_BY_EMAIL_REMAINS_MESSAGE");
    expect(avlPanel).toContain(APPROVED_VENDOR_UNAVAILABLE_MESSAGE);
    expect(avlPanel).toContain(INVITE_BY_EMAIL_REMAINS_MESSAGE);

    expect(invitesRoute).toContain("RFQ ID and supplier email are required.");
    expect(
      queryIndex(
        invitesRoute,
        "APPROVED_VENDOR_DOMAIN_AVAILABLE && vendorCompanyId",
      ),
    ).toBeLessThan(queryIndex(invitesRoute, '.from("approved_vendors")'));
    expect(invitesRoute).toContain('.from("rfq_invites")');
  });

  it("returns a bounded feature-unavailable response for AVL and compliance APIs", () => {
    expect(
      queryIndex(approvedVendorsRoute, "!APPROVED_VENDOR_DOMAIN_AVAILABLE"),
    ).toBeLessThan(queryIndex(approvedVendorsRoute, '.from("approved_vendors")'));
    expect(approvedVendorsRoute).toContain("APPROVED_VENDOR_UNAVAILABLE_MESSAGE");
    expect(approvedVendorsRoute).toContain("status: 404");

    expect(
      queryIndex(
        supplierComplianceRoute,
        "!SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE",
      ),
    ).toBeLessThan(
      queryIndex(supplierComplianceRoute, '.from("supplier_compliance")'),
    );
    expect(supplierComplianceRoute).toContain(
      "SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE",
    );
    expect(supplierComplianceRoute).toContain("status: 404");
  });

  it("authorizes POST /api/invites from organization_memberships instead of profiles.role", () => {
    expect(invitesRoute).toContain("getActiveMembershipForUserCompany");
    expect(invitesRoute).toContain("canInviteCompanySuppliers");
    expect(invitesRoute).toContain('select("id, email, company_id")');
    expect(invitesRoute).not.toContain("profile.role");
    expect(invitesRoute).not.toContain("isAllowedProcurementRole");
    expect(invitesRoute).not.toMatch(/as UserRole/);
    expect(authorization).toContain(
      "export function canInviteCompanySuppliers",
    );
    expect(authorization).toContain("return canCreateCompanyRfq(membership, companyId);");
  });

  it("allows owner, admin, and buyer procurement_function invites and denies unrelated members", () => {
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "owner" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "admin" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canInviteCompanySuppliers(
        membership({ procurementFunction: "buyer" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canInviteCompanySuppliers(
        membership({
          workspaceRole: "member",
          procurementFunction: "supplier",
        }),
        COMPANY_ID,
      ),
    ).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({
          workspaceRole: "member",
          procurementFunction: "none",
        }),
        COMPANY_ID,
      ),
    ).toBe(false);
  });
});
