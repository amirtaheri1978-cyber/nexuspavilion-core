import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const rootPage = readSource("src/app/page.tsx");
const productPage = readSource(
  "src/app/products/intelligent-procurement/page.tsx",
);
const sitemap = readSource("src/app/sitemap.ts");
const robots = readSource("src/app/robots.ts");
const rootLayout = readSource("src/app/layout.tsx");
const loginLayout = readSource("src/app/login/layout.tsx");
const signupLayout = readSource("src/app/signup/layout.tsx");
const inviteLayout = readSource("src/app/invite/layout.tsx");
const rfqInviteLayout = readSource("src/app/rfq/invite/layout.tsx");

describe("21-03E SEO and AI discoverability contract", () => {
  it("keeps corporate and product search intent distinct", () => {
    expect(rootPage).toContain("Nexus Pavilion Inc.");
    expect(rootPage).toContain('alternates: { canonical: "/" }');
    expect(rootPage).toContain("index: true");
    expect(rootPage).toContain("follow: true");

    expect(productPage).toContain(
      "Intelligent Procurement by Nexus Pavilion Inc.",
    );
    expect(productPage).toContain(
      'canonical: "/products/intelligent-procurement"',
    );
    expect(productPage).toContain("index: true");
    expect(productPage).toContain("follow: true");
    expect(productPage).toContain('siteName: "Nexus Pavilion Inc."');
    expect(productPage).toContain('"@type": "SoftwareApplication"');
  });

  it("provides factual public product context without collapsing business domains", () => {
    expect(productPage).toContain("Company Workspace");
    expect(productPage).toContain("RFQ workflows");
    expect(productPage).toContain("Commercial evaluation");
    expect(productPage).toContain("Governed award decisions");
    expect(productPage).toMatch(
      /Workspace invitations\s+establish company membership; they do not grant RFQ\s+participation by themselves\./,
    );
    expect(productPage).toContain(
      "it does not itself constitute an executed legal contract, purchase order, or notice to proceed.",
    );
    expect(productPage).not.toMatch(
      /market[- ]leading|world[- ]leading|revolutionary|guaranteed|trusted by|our customers/i,
    );
  });

  it("internally links the corporate home to the public product page", () => {
    expect(rootPage).toContain(
      'href="/products/intelligent-procurement"',
    );
    expect(rootPage).toContain("Explore Intelligent Procurement");
  });

  it("limits the sitemap to approved public discovery surfaces", () => {
    expect(sitemap).toContain('url: "https://nexuspavilion.com"');
    expect(sitemap).toContain(
      'url: "https://nexuspavilion.com/about"',
    );
    expect(sitemap).toContain(
      'url: "https://nexuspavilion.com/contact"',
    );
    expect(sitemap).toContain(
      'url: "https://nexuspavilion.com/products/intelligent-procurement"',
    );

    for (const privatePath of [
      "/login",
      "/signup",
      "/dashboard",
      "/analytics",
      "/company",
      "/directory",
      "/invite",
      "/rfq",
      "/notifications",
    ]) {
      expect(sitemap).not.toContain(
        `url: "https://nexuspavilion.com${privatePath}`,
      );
    }
  });

  it("keeps authenticated and invitation surfaces out of crawler discovery", () => {
    for (const route of [
      '"/login"',
      '"/signup"',
      '"/forgot-password"',
      '"/set-password"',
      '"/verify"',
      '"/create-company"',
      '"/dashboard"',
      '"/analytics"',
      '"/company"',
      '"/directory"',
      '"/invite/"',
      '"/rfq"',
    ]) {
      expect(robots).toContain(route);
    }

    expect(robots).toContain(
      'sitemap: "https://nexuspavilion.com/sitemap.xml"',
    );
    expect(robots).not.toContain('disallow: "/"');

    for (const privateLayout of [
      loginLayout,
      signupLayout,
      inviteLayout,
      rfqInviteLayout,
    ]) {
      expect(privateLayout).toContain("index: false");
      expect(privateLayout).toContain("follow: false");
    }
  });

  it("uses neutral global metadata so only explicitly public pages opt into indexing", () => {
    expect(rootLayout).toContain("index: false");
    expect(rootLayout).toContain("follow: false");
    expect(rootLayout).toContain(
      'const siteUrl = "https://nexuspavilion.com"',
    );
  });
});
