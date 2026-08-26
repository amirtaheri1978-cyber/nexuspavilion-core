import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const submit = readSource("src/components/rfq-workspace/rfq-submit-workspace.tsx");
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const invite = readSource("src/components/invite-vendor-form.tsx");
const addenda = readSource("src/components/rfq-addenda-manager.tsx");
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

describe("Task 24-RFQ-11 submit page presentation", () => {
  it("keeps quote submit contracts, fields, and gating intact", () => {
    expect(submit).toContain('fetch("/api/quotes"');
    expect(submit).toContain("method: \"POST\"");
    expect(submit).toContain("amount: amountNumber");
    expect(submit).toContain("currency");
    expect(submit).toContain("timeline: timeline.trim()");
    expect(submit).toContain("message: message.trim()");
    expect(submit).toContain("router.push(`/rfq/${slug}`)");
    expect(submit).toContain("amountNumber < 1000");
    expect(submit).toContain("if (!timeline.trim())");
    expect(submit).toContain("if (!message.trim())");
    expect(submit).toContain("if (submissionClosed)");
    expect(submit).toContain('htmlFor="quote-amount"');
    expect(submit).toContain('htmlFor="quote-timeline"');
    expect(submit).toContain('htmlFor="quote-message"');
    expect(submit).toContain("aria-invalid");
    expect(submit).toContain("aria-describedby");
    expect(submit).toContain('id="quote-submit-error"');
    expect(submit).toContain('role="alert"');
    expect(submit).toContain("Submit quote");
    expect(submit).toContain("Respondent submission");
    expect(submit).toContain("Submitting quote...");
    expect(submit).toContain("Cancel");
    expect(submit.match(/<h1\b/g)?.length).toBe(1);
  });

  it("uses one submit surface with container-aware status instead of nested metric cards", () => {
    expect(submit).toContain('data-rfq-submit-workspace="true"');
    expect(submit).toContain("@container");
    expect(submit).toContain('data-rfq-submit-status="true"');
    expect(submit).toContain('data-rfq-submit-summary="true"');
    expect(submit).toContain("@lg:grid-cols-3");
    expect(submit).not.toContain("md:grid-cols-3");
    expect(submit).not.toContain("ExecutiveMetricCard");
    expect(submit.match(/<ExecutivePanel/g)?.length).toBe(1);
    expect(submit).toContain("Commercial offer");
    expect(submit).toContain("Confidential submission");
  });

  it("wraps submit copy on word boundaries and keeps actions reachable", () => {
    expect(submit).toContain("text-pretty");
    expect(submit).toContain("min-w-0");
    expect(submit).toContain("min-h-14");
    expect(submit).not.toContain("break-words");
    expect(submit).not.toContain("break-all");
    expect(submit).not.toContain("overflow-wrap:anywhere");
    expect(submit).not.toContain("[overflow-wrap:anywhere]");
    expect(submit).not.toContain("truncate");
    expect(submit).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(submit).toContain("EXECUTIVE_CTA_SECONDARY");
    expect(visualQa).toContain('data-rfq-submit-shell-width="1110"');
    expect(visualQa).toContain('data-rfq-submit-workspace="true"');
    expect(visualQa).toContain(
      "16-month phased commissioning across North Harbor bonded warehouse operations",
    );
    expect(visualQa).toContain("Preview only. This fixture does not submit.");
  });

  it("does not alter frozen Task 23 or RFQ-01 through RFQ-10 regions", () => {
    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(documents).toContain('data-rfq-document-workspace="true"');
    expect(invite).toContain('data-rfq-invite-vendor-form="true"');
    expect(addenda).toContain('data-rfq-addenda-manager="true"');
    expect(comparison).toContain("@min-[1500px]:block");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
    expect(submit).not.toContain("award_rfq_quote");
  });
});
