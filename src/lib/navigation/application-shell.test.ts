import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const appShell = readSource("src/components/app-shell.tsx");
const sidebar = readSource("src/components/sidebar.tsx");
const topbar = readSource("src/components/common/AppTopbar.tsx");
const appSidebar = readSource("src/components/common/AppSidebar.tsx");
const pageContext = readSource("src/components/app-page-context.tsx");
const applicationFooter = readSource("src/components/application-footer.tsx");
const signOut = readSource("src/components/sign-out-button.tsx");
const layout = readSource("src/app/layout.tsx");
const nav = readSource("src/lib/navigation/application-nav.ts");

describe("Task 23 enterprise application shell", () => {
  it("mounts the live Sidebar primitive and keeps AppSidebar unmounted", () => {
    expect(layout).toContain("<AppShell>{children}</AppShell>");
    expect(appShell).toContain('import Sidebar from "@/components/sidebar"');
    expect(appShell).toContain("<Sidebar />");
    expect(appShell).not.toContain("AppSidebar");
    expect(appShell).toContain("getAppShellKind");
    expect(appShell).toContain("<ApplicationFooter />");
    expect(appShell).toContain("<Footer />");
    expect(appShell).toContain("<AppPageContext />");
  });

  it("replaces marketing footer duplication on authenticated chrome only", () => {
    expect(applicationFooter).toContain("Confidential procurement workspace");
    expect(applicationFooter).not.toContain("/pricing");
    expect(applicationFooter).not.toContain("/about");
    expect(appShell).toMatch(/if \(shellKind === "public"\)[\s\S]*<Footer \/>/);
    expect(appShell).toMatch(
      /shellKind === "application"|authenticated application shell/,
    );
  });

  it("uses a disclosure mobile menu instead of horizontally scrolling chips", () => {
    expect(sidebar).toContain('aria-expanded={mobileOpen}');
    expect(sidebar).toContain('aria-controls="np-mobile-nav"');
    expect(sidebar).toContain('id="np-mobile-nav"');
    expect(sidebar).toContain("Escape");
    expect(sidebar).not.toContain("overflow-x-auto");
    expect(sidebar).toContain('aria-current={isActive ? "page" : undefined}');
    expect(sidebar).toContain("EXECUTIVE_FOCUS_CYAN");
    expect(sidebar).toContain("w-[330px]");
    expect(sidebar).toContain(".select(\"role, company_id\")");
    expect(sidebar).not.toContain("first_name");
    expect(sidebar).not.toContain("/pricing");
  });

  it("keeps AppTopbar as context, not a page h1, with frozen action placement", () => {
    expect(topbar).not.toMatch(/<h1[\s>]/);
    expect(topbar).toContain("Boardroom Intelligence");
    expect(topbar).toContain('href="/notifications"');
    expect(topbar).toContain('href="/analytics"');
    expect(topbar).toContain("hidden h-[76px]");
    expect(topbar).toContain("lg:flex lg:px-8");
    expect(topbar).not.toContain("hover:scale");
    expect(topbar).not.toContain("hover:-translate");
  });

  it("keeps breadcrumbs nested-only and identity-safe", () => {
    expect(pageContext).toContain('aria-label="Breadcrumb"');
    expect(pageContext).toContain("getAppBreadcrumbs");
    expect(pageContext).toContain('aria-current="page"');
    expect(nav).toContain('label: "Opportunity"');
    expect(nav).not.toContain("user.id");
    expect(nav).not.toContain("first_name");
  });

  it("aligns unused AppSidebar and account menu to the canonical owner hrefs", () => {
    expect(appSidebar).toContain("getAppSidebarSections");
    expect(appSidebar).toContain("EXECUTIVE_FOCUS_CYAN");
    expect(appSidebar).not.toContain('href: "/contact"');
    expect(signOut).toContain("ACCOUNT_MENU_LINKS");
    expect(signOut).toContain("aria-current={current ? \"page\" : undefined}");
    expect(signOut).toContain("min-h-11");
    expect(signOut).toContain('aria-label="Executive workspace menu"');
  });

  it("does not introduce hover-scale gimmicks on shell chrome", () => {
    for (const source of [sidebar, topbar, appShell, appSidebar, pageContext, signOut]) {
      expect(source).not.toContain("hover:scale");
      expect(source).not.toContain("hover:-translate");
    }
  });
});
