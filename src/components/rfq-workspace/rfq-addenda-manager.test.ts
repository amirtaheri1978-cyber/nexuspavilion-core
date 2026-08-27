import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const manager = readSource("src/components/rfq-addenda-manager.tsx");
const acknowledgement = readSource(
  "src/components/rfq-addendum-acknowledgement-center.tsx",
);
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const invite = readSource("src/components/invite-vendor-form.tsx");
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
const detail = readSource("src/app/rfq/[slug]/page.tsx");

describe("Task 24-RFQ-10 addenda manager presentation", () => {
  it("keeps addenda creation, listing, and acknowledgement contracts intact", () => {
    expect(documents).toContain("RFQAddendaManager");
    expect(documents).toContain("RFQAddendumAcknowledgementCenter");
    expect(documents).toContain('data-rfq-addenda-workspace="true"');
    expect(documents).toContain("canManage");
    expect(manager).toContain("if (!canManage) return");
    expect(manager).toContain('fetch(`/api/rfq-addenda?rfqId=${rfqId}`)');
    expect(manager).toContain('fetch("/api/rfq-addenda"');
    expect(manager).toContain("method: \"POST\"");
    expect(manager).toContain("rfqId");
    expect(manager).not.toContain("companyId,");
    expect(manager).not.toContain("companyId:");
    expect(manager).toContain("title: title.trim()");
    expect(manager).toContain("description: description.trim()");
    expect(manager).toContain("affectedDocuments: affectedDocuments.trim()");
    expect(manager).toContain("requiresAcknowledgement");
    expect(manager).toContain("Issue Addendum");
    expect(manager).toContain("Refreshing...");
    expect(documents).toContain("RFQRfiWorkspace");
    expect(acknowledgement).toContain(
      'fetch("/api/rfq-addendum-acknowledgements"',
    );
    expect(acknowledgement).toContain("addendumId");
    expect(acknowledgement).toContain("Acknowledge");
    expect(acknowledgement).toContain("Acknowledging...");
    expect(acknowledgement).toContain("Quote Status");
    expect(acknowledgement).toContain("Blocked");
    expect(acknowledgement).toContain("Clear");
  });

  it("flattens nested addenda cards and uses container-aware layout", () => {
    expect(manager).toContain('data-rfq-addenda-manager="true"');
    expect(manager).toContain("@container");
    expect(manager).toContain('data-rfq-addenda-status="true"');
    expect(manager).toContain('data-rfq-addenda-history="true"');
    expect(manager).toContain('data-rfq-addenda-create="true"');
    expect(manager).not.toContain("rounded-[32px]");
    expect(manager).not.toContain("rounded-[28px]");
    expect(manager).not.toContain("rounded-[26px]");
    expect(manager).not.toContain("lg:flex-row");
    expect(manager).not.toContain("md:flex-row md:items-start");
    expect(manager).not.toContain("sm:flex-row sm:items-center sm:justify-between");
    expect(manager).not.toContain("<h2");
    expect(manager).toContain("@sm:flex-row");
    expect(manager).toContain("@md:flex-row");
    expect(acknowledgement).toContain(
      'data-rfq-addenda-acknowledgement="true"',
    );
    expect(acknowledgement).toContain("@container");
    expect(acknowledgement).toContain('data-rfq-addenda-compliance="true"');
    expect(acknowledgement).not.toContain("rounded-[32px]");
    expect(acknowledgement).not.toContain("rounded-[26px]");
    expect(acknowledgement).not.toContain("md:grid-cols-3");
    expect(acknowledgement).not.toContain("lg:flex-row");
    expect(acknowledgement).not.toContain("<h2");
    expect(acknowledgement).not.toContain("@md:flex-row");
    expect(documents.match(/<ExecutivePanel/g)?.length).toBe(1);
  });

  it("wraps addenda copy on word boundaries and keeps actions reachable", () => {
    expect(manager).toContain("text-pretty");
    expect(manager).toContain("min-w-0");
    expect(manager).toContain("min-h-11");
    expect(manager).not.toContain("break-words");
    expect(manager).not.toContain("break-all");
    expect(manager).not.toContain("overflow-wrap:anywhere");
    expect(manager).not.toContain("truncate");
    expect(acknowledgement).toContain("text-pretty");
    expect(acknowledgement).toContain("min-h-11");
    expect(acknowledgement).not.toContain("break-words");
    expect(acknowledgement).not.toContain("truncate");
    expect(visualQa).toContain("visualQaAddenda");
    expect(visualQa).toContain('data-rfq-addenda-shell-width="1110"');
    expect(visualQa).toContain(
      "North Harbor refrigeration sequence revision and bonded warehouse commissioning bulletin",
    );
    expect(visualQa).toContain("isOwner={false}");
  });

  it("does not alter frozen Task 23 or RFQ-01 through RFQ-09 regions", () => {
    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(documents).toContain('data-rfq-document-workspace="true"');
    expect(documents).toContain("@4xl:flex-row @4xl:items-start");
    expect(invite).toContain('data-rfq-invite-vendor-form="true"');
    expect(invite).toContain('fetch("/api/invites"');
    expect(detail).toContain("<InviteVendorForm embedded rfqId={rfq.id} />");
    expect(comparison).toContain("@min-[1500px]:block");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
  });
});
