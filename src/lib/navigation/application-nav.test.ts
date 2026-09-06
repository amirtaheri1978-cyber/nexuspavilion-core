import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCOUNT_MENU_LINKS,
  flattenNavigation,
  getAppBreadcrumbs,
  getAppSectionTitle,
  getAppShellKind,
  getAppSidebarSections,
  getExperience,
  getNavigation,
  isActivePath,
} from "@/lib/navigation/application-nav";

function hrefsFor(
  experience: "owner" | "vendor" | "consultant",
) {
  return flattenNavigation(experience).map((item) => item.href);
}

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const companyNetworkPage = readSource("src/app/directory/page.tsx");
const rfqMarketplacePage = readSource("src/app/rfq/page.tsx");
const rfqDetailPage = readSource("src/app/rfq/[slug]/page.tsx");

describe("Task 23 application navigation contract", () => {
  it("keeps one canonical href per executive destination", () => {
    const hrefs = hrefsFor("owner");

    expect(hrefs).toEqual([
      "/dashboard",
      "/projects",
      "/rfq",
      "/directory",
      "/analytics",
      "/notifications",
      "/company/settings",
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps vendor destinations unique and omits marketing pricing", () => {
    const hrefs = hrefsFor("vendor");

    expect(hrefs).toEqual([
      "/dashboard",
      "/projects",
      "/rfq",
      "/vendor-dashboard",
      "/notifications",
      "/company/settings",
    ]);
    expect(hrefs).not.toContain("/pricing");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps consultant destinations unique and omits marketing pricing", () => {
    const hrefs = hrefsFor("consultant");

    expect(hrefs).toEqual([
      "/dashboard",
      "/projects",
      "/rfq",
      "/notifications",
      "/company/settings",
    ]);
    expect(hrefs).not.toContain("/pricing");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("reuses the existing role/network_role experience rules only", () => {
    expect(
      getExperience({
        role: "owner",
        networkRole: "general contractor",
        companyName: "Harbor Steel Co.",
        companyStatus: "verified",
      }),
    ).toBe("owner");

    expect(
      getExperience({
        role: "vendor",
        networkRole: "supplier",
        companyName: "Harbor Steel Co.",
        companyStatus: "verified",
      }),
    ).toBe("vendor");

    expect(
      getExperience({
        role: "member",
        networkRole: "consulting engineer",
        companyName: "Harbor Steel Co.",
        companyStatus: "verified",
      }),
    ).toBe("consultant");
  });

  it("treats dashboard as exact-match and nested application routes as prefix-active", () => {
    expect(isActivePath("/dashboard", "/dashboard")).toBe(true);
    expect(isActivePath("/dashboard/settings", "/dashboard")).toBe(false);
    expect(isActivePath("/projects/new", "/projects")).toBe(true);
    expect(isActivePath("/rfq/new", "/rfq")).toBe(true);
    expect(isActivePath("/analytics/vendors", "/analytics")).toBe(true);
  });

  it("classifies public, chromeless, and application shells without inventing routes", () => {
    expect(getAppShellKind("/")).toBe("public");
    expect(getAppShellKind("/pricing")).toBe("public");
    expect(getAppShellKind("/login")).toBe("chromeless");
    expect(getAppShellKind("/verify")).toBe("chromeless");
    expect(getAppShellKind("/create-company")).toBe("chromeless");
    expect(getAppShellKind("/dev/rfq-visual-qa")).toBe("chromeless");
    expect(getAppShellKind("/rfq/invite/token-value")).toBe("chromeless");
    expect(getAppShellKind("/dashboard")).toBe("application");
    expect(getAppShellKind("/projects")).toBe("application");
    expect(getAppShellKind("/projects/new")).toBe("application");
    expect(getAppShellKind("/company/settings")).toBe("application");
    expect(getAppShellKind("/company/harbor-steel")).toBe("application");
    expect(getAppShellKind("/connections")).toBe("application");
  });

  it("adds breadcrumbs only where hierarchy is nested and never renders slugs as labels", () => {
    expect(getAppBreadcrumbs("/dashboard")).toEqual([]);
    expect(getAppBreadcrumbs("/projects")).toEqual([]);
    expect(getAppBreadcrumbs("/rfq")).toEqual([]);
    expect(getAppBreadcrumbs("/company/settings")).toEqual([]);

    expect(getAppBreadcrumbs("/projects/new")).toEqual([
      { href: "/projects", label: "Project Portfolio" },
      { href: "/projects/new", label: "New Project" },
    ]);

    const compare = getAppBreadcrumbs("/rfq/harbor-package/compare");
    expect(compare.map((crumb) => crumb.label)).toEqual([
      "Procurement Center",
      "Opportunity",
      "Compare",
    ]);
    expect(compare.map((crumb) => crumb.label).join(" ")).not.toContain(
      "harbor-package",
    );

    expect(getAppSectionTitle("/projects")).toBe("Project Portfolio");
    expect(getAppSectionTitle("/projects/new")).toBe("Project Portfolio");
    expect(getAppSectionTitle("/analytics")).toBe("Strategic Insights");
    expect(getAppSectionTitle("/rfq/new")).toBe("Procurement Center");
  });

  it("uses company-neutral terminology for the canonical network destination", () => {
    const ownerDirectory = flattenNavigation("owner").find(
      (item) => item.href === "/directory",
    );
    const accountDirectory = ACCOUNT_MENU_LINKS.find(
      (item) => item.href === "/directory",
    );
    const sidebarDirectory = getAppSidebarSections()
      .flatMap((section) => section.items)
      .find((item) => item.href === "/directory");

    expect(ownerDirectory).toMatchObject({
      label: "Company Network",
      description: "Verified construction companies and network records.",
    });
    expect(accountDirectory).toMatchObject({
      label: "Company Network",
      description: "Verified construction companies and network records.",
    });
    expect(sidebarDirectory).toEqual({
      href: "/directory",
      label: "Company Network",
    });
    expect(getAppSectionTitle("/directory")).toBe("Company Network");
    expect(ownerDirectory?.label).not.toBe("Supplier Intelligence");
    expect(accountDirectory?.label).not.toBe("Supplier Intelligence");
  });

  it("protects the Company Network RFQ invitation handoff and canonical sourcing gate", () => {
    expect(companyNetworkPage).toContain(
      'import { canInviteCompanySuppliers } from "@/lib/procurement/procurement-write-authorization";',
    );
    expect(companyNetworkPage).toContain(
      "const canInviteNetworkSuppliers = canInviteCompanySuppliers(",
    );
    expect(companyNetworkPage).toContain(
      'data-company-network-rfq-invite="true"',
    );
    expect(companyNetworkPage).toContain(
      "href={`/rfq?inviteCompanyId=${encodeURIComponent(company.id)}`}",
    );
    expect(companyNetworkPage).toContain(
      "The supplier contact email is confirmed in the secure invitation step.",
    );
    expect(companyNetworkPage).not.toContain('fetch("/api/invites"');

    expect(rfqMarketplacePage).toContain(
      "inviteCompanyId?: string | string[];",
    );
    expect(rfqMarketplacePage).toContain(
      "const canRouteNetworkInvitation = canInviteCompanySuppliers(",
    );
    expect(rfqMarketplacePage).toContain('.from("company_directory")');
    expect(rfqMarketplacePage).toContain(
      '.in("status", ["approved", "verified"])',
    );
    expect(rfqMarketplacePage).toContain(
      "invitationTargetData.id !== context.identity.companyId",
    );
    expect(rfqMarketplacePage).toContain(
      "No invitation is sent from Company Network.",
    );
    expect(rfqMarketplacePage).toContain(
      "? `/rfq/${rfq.slug}#supplier-invitations`",
    );
    expect(rfqMarketplacePage).not.toContain('fetch("/api/invites"');

    expect(rfqDetailPage).toContain("const canInviteSuppliers =");
    expect(rfqDetailPage).toContain("capabilities.canInviteSuppliers &&");
    expect(rfqDetailPage).toContain(
      'canInviteCompanySuppliers(sourcingMembership, rfq.company_id ?? "");',
    );
    expect(rfqDetailPage).toContain('id="supplier-invitations"');
    expect(rfqDetailPage).toContain(
      'className="mt-8 min-w-0 scroll-mt-24 @container lg:scroll-mt-0"',
    );
  });

  it("keeps the unused AppSidebar primitive on the same owner destinations", () => {
    const hrefs = getAppSidebarSections().flatMap((section) =>
      section.items.map((item) => item.href),
    );
    const accountMenuHrefs = ACCOUNT_MENU_LINKS.map((item) => item.href);

    expect(hrefs).toEqual([
      "/dashboard",
      "/projects",
      "/rfq",
      "/directory",
      "/analytics",
      "/notifications",
      "/company/settings",
    ]);
    expect(new Set(accountMenuHrefs)).toEqual(new Set(hrefs));
    expect(new Set(accountMenuHrefs).size).toBe(accountMenuHrefs.length);
  });

  it("does not attach count badges to duplicate destinations", () => {
    const owner = getNavigation("owner", {
      activeRfqs: 4,
      unreadNotifications: 2,
      awardedContracts: 9,
      supplierQuotes: 3,
    });
    const rfqItems = owner
      .flatMap((section) => section.items)
      .filter((item) => item.href === "/rfq");

    expect(rfqItems).toHaveLength(1);
    expect(rfqItems[0].badge).toBe("4");
  });
});
