import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const publicFooter = readSource("src/components/footer.tsx");
const applicationFooter = readSource("src/components/application-footer.tsx");
const privacyPage = readSource("src/app/privacy/page.tsx");
const termsPage = readSource("src/app/terms/page.tsx");
const contactPage = readSource("src/app/contact/page.tsx");
const productPage = readSource(
  "src/app/products/intelligent-procurement/page.tsx",
);

describe("21-03F final legal attribution contract", () => {
  it("identifies Nexus Pavilion Inc. as the corporate legal entity", () => {
    for (const source of [
      publicFooter,
      privacyPage,
      termsPage,
      contactPage,
      productPage,
    ]) {
      expect(source).toContain("Nexus Pavilion Inc.");
    }

    expect(publicFooter).toContain(
      "© 2026 Nexus Pavilion Inc. All rights reserved.",
    );
    expect(contactPage).toContain("contact@nexuspavilion.com");
    expect(contactPage).not.toMatch(/gmail\.com/i);
  });

  it("attributes Intelligent Procurement to the corporate parent without inventing a separate legal entity", () => {
    expect(applicationFooter).toContain(
      "Intelligent Procurement · A Nexus Pavilion Inc. product",
    );
    expect(privacyPage).toContain(
      "Intelligent Procurement, a Nexus Pavilion Inc. product currently in development.",
    );
    expect(termsPage).toContain(
      "References to Intelligent Procurement identify a Nexus Pavilion Inc. product currently in development.",
    );
    expect(productPage).toContain(
      "INTELLIGENT PROCUREMENT BY NEXUS PAVILION INC.",
    );

    for (const source of [
      applicationFooter,
      privacyPage,
      termsPage,
      productPage,
    ]) {
      expect(source).not.toMatch(
        /Intelligent Procurement (?:Inc\.|LLC|Ltd\.|Corporation)/i,
      );
    }
  });

  it("keeps product-specific legal language scoped to Intelligent Procurement", () => {
    expect(privacyPage).toContain(
      "References to procurement workspaces, RFQs, quotations, suppliers, and procurement intelligence apply to Intelligent Procurement",
    );
    expect(termsPage).toContain(
      "Provisions concerning procurement workspaces, RFQs, suppliers, quotations, analytics, and related workflows apply specifically to Intelligent Procurement.",
    );
  });

  it("states the governing-law and decision-support boundaries without contract overclaim", () => {
    expect(termsPage).toContain(
      "laws of the Province of Ontario and the applicable federal laws of Canada",
    );
    expect(termsPage).toContain(
      "The services do not make autonomous decisions on behalf of an organization.",
    );
    expect(productPage).toContain(
      "it does not itself constitute an executed legal contract, purchase order, or notice to proceed.",
    );
  });

  it("keeps privacy accountability on the corporate entity", () => {
    expect(privacyPage).toContain(
      "Privacy Officer — Nexus Pavilion Inc. at contact@nexuspavilion.com.",
    );
    expect(privacyPage).toContain(
      "This privacy information is provided by Nexus Pavilion Inc.",
    );
  });
});
