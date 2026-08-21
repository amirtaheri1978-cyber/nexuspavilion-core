import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const detail = readSource("src/app/rfq/[slug]/page.tsx");
const invite = readSource("src/components/invite-vendor-form.tsx");
const avl = readSource("src/components/rfq-workspace/supplier-avl-panel.tsx");
const delivery = readSource(
  "src/components/rfq-workspace/supplier-invitation-delivery.tsx",
);
const result = readSource(
  "src/components/rfq-workspace/supplier-invitation-result.tsx",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const supplierQuotes = readSource(
  "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
);
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const sidebar = readSource("src/components/sidebar.tsx");
const appShell = readSource("src/components/app-shell.tsx");
const domain = readSource(
  "src/lib/procurement/supplier-domain-availability.ts",
);

describe("Task 24-RFQ-09 supplier invitation density", () => {
  it("owns a single invitation panel with an embedded form", () => {
    expect(detail).toContain('id="supplier-invitations"');
    expect(detail).toContain('data-rfq-supplier-invitations="true"');
    expect(detail).toContain('id="rfq-supplier-invitation-heading"');
    expect(detail).toContain("Supplier Invitation");
    expect(detail).toContain("<InviteVendorForm embedded rfqId={rfq.id} />");
    expect(detail).toContain("min-w-0 @container");
    expect(invite).toContain("embedded?: boolean");
    expect(invite).toContain("embedded = false");
    expect(invite).toContain('data-rfq-invite-vendor-form="true"');
    expect(invite).toContain("if (embedded)");
    expect(invite.match(/<ExecutivePanel/g)?.length).toBe(1);
    expect(invite).not.toContain("xl:flex-row");
    expect(invite).not.toContain("min-w-[210px]");
    expect(invite).not.toContain("Access Control");
  });

  it("keeps invitation, AVL, and delivery as one stacked surface", () => {
    expect(invite).toContain('data-rfq-invitation-access="true"');
    expect(invite).toContain("Invitation access");
    expect(invite).toContain("ExecutiveBadge");
    expect(avl).toContain('data-rfq-supplier-avl="true"');
    expect(avl).toContain("@container");
    expect(avl).toContain("@sm:flex-row");
    expect(avl).not.toContain("rounded-[30px]");
    expect(delivery).toContain('data-rfq-supplier-delivery="true"');
    expect(delivery).toContain("@container");
    expect(delivery).toContain("@md:grid-cols-[minmax(0,1fr)_auto]");
    expect(delivery).not.toContain("rounded-[30px]");
    expect(delivery).not.toContain("md:grid-cols-[1fr_auto]");
    expect(result).toContain('data-rfq-supplier-result="true"');
    expect(result).not.toContain("rounded-[30px]");
  });

  it("wraps invitation copy on word boundaries and keeps actions reachable", () => {
    expect(detail).toContain("text-pretty");
    expect(invite).toContain("text-pretty");
    expect(avl).toContain("text-pretty");
    expect(avl).toContain("min-w-0");
    expect(avl).not.toContain("break-words");
    expect(avl).not.toContain("break-all");
    expect(avl).not.toContain("overflow-wrap:anywhere");
    expect(avl).not.toContain("[overflow-wrap:anywhere]");
    expect(delivery).toContain("text-pretty");
    expect(delivery).toContain("min-w-0");
    expect(delivery).not.toContain("break-words");
    expect(delivery).not.toContain("break-all");
    expect(delivery).toContain("Supplier contact email");
    expect(delivery).toContain("Create Supplier Invite");
    expect(delivery).toContain("min-h-11");
    expect(result).toContain("text-pretty");
    expect(result).toContain("min-h-11");
    expect(result).toContain("break-all");
    expect(result).toContain(
      "Unavoidable opaque invite URL token: break-all prevents horizontal overflow.",
    );
    expect(visualQa).toContain("InviteVendorForm");
    expect(visualQa).toContain('data-rfq-invitation-shell-width="1110"');
    expect(visualQa).toContain('embedded rfqId="visual-qa-rfq"');
  });

  it("does not change invitation APIs, eligibility, or frozen neighbors", () => {
    expect(invite).toContain('fetch("/api/invites"');
    expect(invite).toContain("method: \"POST\"");
    expect(invite).toContain("rfqId");
    expect(invite).toContain("email");
    expect(invite).toContain("const vendors: SupplierAvlVendorOption[] = [];");
    expect(invite).toContain("unavailable={!APPROVED_VENDOR_DOMAIN_AVAILABLE}");
    expect(domain).toContain(
      "export const APPROVED_VENDOR_DOMAIN_AVAILABLE = false;",
    );
    expect(invite).not.toContain("award_rfq_quote");
    expect(detail).not.toContain("award_rfq_quote");

    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(documents).toContain('data-rfq-document-workspace="true"');
    expect(documents).toContain("@4xl:flex-row @4xl:items-start");
    expect(comparison).toContain("@min-[1500px]:block");
    expect(comparison).toContain("AwardContractButton");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
    expect(supplierQuotes).toContain("@min-[1500px]:hidden");
  });
});
