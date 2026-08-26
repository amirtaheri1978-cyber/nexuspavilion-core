import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getAppShellKind } from "@/lib/navigation/application-nav";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const rootPage = readSource("src/app/page.tsx");
const publicFooter = readSource("src/components/footer.tsx");
const applicationFooter = readSource("src/components/application-footer.tsx");
const appShell = readSource("src/components/app-shell.tsx");
const logo = readSource("src/components/branding/nexus-pavilion-logo.tsx");
const layout = readSource("src/app/layout.tsx");
const sitemap = readSource("src/app/sitemap.ts");
const robots = readSource("src/app/robots.ts");
const activeMiddleware = readSource("middleware.ts");
const inactiveSrcMiddleware = readSource("src/middleware.ts");
const loginContinuation = readSource("src/lib/auth/login-continuation.ts");
const callbackRoute = readSource("src/app/auth/callback/route.ts");
const rfqInvitePage = readSource("src/app/rfq/invite/[token]/page.tsx");
const rfqSubmitPage = readSource("src/app/rfq/[slug]/submit/page.tsx");
const dashboardPage = readSource("src/app/dashboard/page.tsx");
const analyticsPage = readSource("src/app/analytics/page.tsx");
const directoryPage = readSource("src/app/directory/page.tsx");
const notificationsPage = readSource("src/app/notifications/page.tsx");
const companyPage = readSource("src/app/company/page.tsx");
const vendorDashboardPage = readSource("src/app/vendor-dashboard/page.tsx");
const privacyPage = readSource("src/app/privacy/page.tsx");
const termsPage = readSource("src/app/terms/page.tsx");
const applicationNav = readSource("src/lib/navigation/application-nav.ts");

function assertNoCorporateHomeDetour(source: string) {
  expect(source).not.toContain('redirect("/")');
  expect(source).not.toContain("redirect('/')");
  expect(source).not.toContain('new URL("/", request.url)');
  expect(source).not.toContain('new URL("/", request.nextUrl)');
  expect(source).not.toContain('NextResponse.redirect("/")');
}

describe("Cursor Corp 02 Slice A corporate root contract", () => {
  it("no longer redirects the corporate root to /create-company", () => {
    expect(rootPage).not.toContain("redirect(");
    expect(rootPage).not.toContain("/create-company");
    expect(rootPage).not.toContain('from "next/navigation"');
    expect(rootPage).toContain("export default function HomePage");
  });

  it("identifies NexusPavilion Inc. as the corporate parent on the root", () => {
    expect(rootPage).toContain("NexusPavilion Inc.");
    expect(rootPage).toContain("parent company");
    expect(rootPage).toContain('id="corporate-hero-heading"');
    expect(rootPage).toContain("<h1");
  });

  it("contains a Products / Projects section with the required anchor", () => {
    expect(rootPage).toContain('id="products-projects"');
    expect(rootPage).toContain("Products / Projects");
    expect(rootPage).toContain('href="#products-projects"');
  });

  it("represents only NexusPavilion Intelligent Procurement as the live product", () => {
    expect(rootPage).toContain("NexusPavilion Intelligent Procurement");
    expect(rootPage).toContain("Live");
    expect(rootPage).toContain("Available Now");
    expect(rootPage).not.toMatch(/coming soon/i);
    expect(rootPage).not.toMatch(/placeholder/i);
    expect(rootPage).not.toContain("/products");
    expect(rootPage).not.toContain("ExecutiveActionCard");
    expect(rootPage).toContain("ExecutivePanel");
    expect(rootPage).toContain("ExecutiveBadge");

    const liveProductHeadings = rootPage.match(
      /NexusPavilion Intelligent Procurement/g,
    );
    expect(liveProductHeadings?.length).toBeGreaterThan(0);

    expect(rootPage).not.toContain("NexusPavilion Cloud");
    expect(rootPage).not.toContain("NexusPavilion Analytics Platform");
    expect(rootPage).not.toContain("NexusPavilion Marketplace");
  });

  it("sends product entry to /login and onboarding entry to /signup", () => {
    expect(rootPage).toContain("Open Intelligent Procurement");
    expect(rootPage).toContain('href="/login"');
    expect(rootPage).toContain("New to Intelligent Procurement? Get started");
    expect(rootPage).toContain('href="/signup"');
    expect(rootPage).not.toContain('href="/create-company"');
  });

  it("keeps public footer destinations real and omits dead legal/status links", () => {
    expect(publicFooter).toContain('href="/about"');
    expect(publicFooter).toContain('href="/contact"');
    expect(publicFooter).toContain('href="/pricing"');
    expect(publicFooter).toContain('href="/privacy"');
    expect(publicFooter).toContain('href="/terms"');
    expect(publicFooter).toContain("NexusPavilion Inc.");
    expect(publicFooter).toContain(
      "NexusPavilion Intelligent Procurement — a NexusPavilion Inc. product",
    );

    expect(publicFooter).not.toContain('href="/security"');
    expect(publicFooter).not.toContain('href="/status"');
    expect(publicFooter).not.toContain('href="/products"');
    expect(publicFooter).not.toContain('href="/resources"');
    expect(publicFooter).not.toContain('href="/help"');
    expect(publicFooter).not.toContain("All rights reserved");
    expect(publicFooter).not.toContain("©");
    expect(publicFooter).not.toContain("/dashboard");
    expect(publicFooter).not.toContain("/analytics");
    expect(publicFooter).not.toContain("/directory");
  });

  it("does not introduce corporate-home redirects from RFQ or application routes", () => {
    assertNoCorporateHomeDetour(activeMiddleware);
    assertNoCorporateHomeDetour(inactiveSrcMiddleware);
    assertNoCorporateHomeDetour(loginContinuation);
    assertNoCorporateHomeDetour(callbackRoute);
    assertNoCorporateHomeDetour(rfqInvitePage);
    assertNoCorporateHomeDetour(rfqSubmitPage);
    assertNoCorporateHomeDetour(dashboardPage);
    assertNoCorporateHomeDetour(analyticsPage);
    assertNoCorporateHomeDetour(directoryPage);
    assertNoCorporateHomeDetour(notificationsPage);
    assertNoCorporateHomeDetour(companyPage);
    assertNoCorporateHomeDetour(vendorDashboardPage);

    expect(rfqInvitePage).not.toContain("getUser()");
    expect(rfqSubmitPage).toContain(
      "redirect(`/login?next=${encodeURIComponent(submitPath)}`)",
    );
    expect(appShell).toMatch(/if \(shellKind === "public"\)[\s\S]*<Footer \/>/);
  });

  it("defines corporate root metadata rather than procurement-only site identity", () => {
    expect(rootPage).toContain("absolute: CORPORATE_TITLE");
    expect(rootPage).toContain(
      'const CORPORATE_TITLE = "NexusPavilion Inc. | Corporate Home"',
    );
    expect(rootPage).toContain('canonical: "/"');
    expect(rootPage).toContain("index: true");
    expect(rootPage).toContain("follow: true");
    expect(rootPage).toContain('siteName: "NexusPavilion Inc."');
    expect(rootPage).toContain(
      "parent company of NexusPavilion Intelligent Procurement",
    );
    expect(rootPage).not.toContain("Procurement Intelligence Platform");
    expect(rootPage).not.toContain("Nexus Pavilion |");
  });

  it("leaves Slice C identity surfaces and unresolved legal page copy unchanged", () => {
    expect(layout).toContain(
      'default: "Nexus Pavilion | Procurement Intelligence Platform"',
    );
    expect(sitemap).toContain('url: "https://nexuspavilion.com"');
    expect(robots).toContain(
      'sitemap: "https://nexuspavilion.com/sitemap.xml"',
    );
    expect(privacyPage).toContain(
      "Nexus Pavilion is committed to protecting company information",
    );
    expect(termsPage).toContain("Nexus Pavilion Terms");
    expect(logo).toContain('alt="NexusPavilion"');
  });
});

describe("Cursor Corp 02 Slice B application footer contract", () => {
  it("attributes Intelligent Procurement to NexusPavilion Inc.", () => {
    expect(applicationFooter).toContain("Intelligent Procurement");
    expect(applicationFooter).toContain("NexusPavilion Inc.");
    expect(applicationFooter).toContain(
      "Intelligent Procurement · A NexusPavilion Inc. product",
    );
    expect(applicationFooter).not.toContain(
      "Nexus Pavilion · Confidential procurement workspace",
    );
    expect(applicationFooter).not.toMatch(/Nexus Pavilion(?! Inc\.)/);
  });

  it("exposes only compact real trust destinations", () => {
    expect(applicationFooter).toContain('href="/privacy"');
    expect(applicationFooter).toContain('href="/terms"');
    expect(applicationFooter).toContain('href="/contact"');
    expect(applicationFooter).toContain(">Privacy<");
    expect(applicationFooter).toContain(">Terms<");
    expect(applicationFooter).toContain(">Support<");

    expect(applicationFooter).not.toContain("/about");
    expect(applicationFooter).not.toContain("/pricing");
    expect(applicationFooter).not.toContain("/security");
    expect(applicationFooter).not.toContain("/status");
    expect(applicationFooter).not.toContain("/help");
    expect(applicationFooter).not.toContain("/products");
    expect(applicationFooter).not.toContain("All rights reserved");
    expect(applicationFooter).not.toContain("©");
  });

  it("keeps AppShell public vs application footer separation intact", () => {
    expect(appShell).toContain('import Footer from "@/components/footer"');
    expect(appShell).toContain(
      'import ApplicationFooter from "@/components/application-footer"',
    );
    expect(appShell).toMatch(/if \(shellKind === "public"\)[\s\S]*<Footer \/>/);
    expect(appShell).toContain("<ApplicationFooter />");
    expect(appShell).toMatch(
      /shellKind === "application"|authenticated application shell/,
    );

    const chromelessBlock = appShell.slice(
      appShell.indexOf('if (shellKind === "chromeless")'),
      appShell.indexOf('if (shellKind === "public")'),
    );
    expect(chromelessBlock).not.toContain("<ApplicationFooter");
    expect(chromelessBlock).not.toContain("<Footer");
  });

  it("keeps chromeless auth and invitation routing without application footer", () => {
    expect(getAppShellKind("/login")).toBe("chromeless");
    expect(getAppShellKind("/signup")).toBe("chromeless");
    expect(getAppShellKind("/create-company")).toBe("chromeless");
    expect(getAppShellKind("/rfq/invite/opaque-token")).toBe("chromeless");
    expect(getAppShellKind("/dashboard")).toBe("application");
    expect(getAppShellKind("/")).toBe("public");

    expect(applicationNav).toContain('"/login"');
    expect(applicationNav).toContain('"/signup"');
    expect(applicationNav).toContain('"/create-company"');
    expect(applicationNav).toContain('"/rfq/invite"');

    const chromelessReturn = appShell.slice(
      appShell.indexOf('if (shellKind === "chromeless")'),
      appShell.indexOf('if (shellKind === "public")'),
    );
    expect(chromelessReturn).toContain("{children}");
    expect(chromelessReturn).not.toContain("ApplicationFooter");
    expect(chromelessReturn).not.toContain("<Footer");
  });
});
