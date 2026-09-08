import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const supplierQuotes = readSource(
  "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
);
const workspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const ownerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const sidebar = readSource("src/components/sidebar.tsx");
const appShell = readSource("src/components/app-shell.tsx");

describe("Task 24-RFQ-07 respondent supplier quote density", () => {
  it("keeps respondent quote values, status mapping, and submit destinations intact", () => {
    expect(supplierQuotes).toContain("{formatMoney(quote.amount)}");
    expect(supplierQuotes).toContain("{quote.timeline || \"Not specified\"}");
    expect(supplierQuotes).toContain("{quote.message || \"No supplier message provided.\"}");
    expect(supplierQuotes).toContain("quote.validity_days");
    expect(supplierQuotes).toContain(
      "const decisionLabel = formatSupplierDecisionLabel(quote.decision);",
    );
    expect(supplierQuotes).toContain("normalizedDecision === \"awarded\"");
    expect(supplierQuotes).toContain("normalizedDecision === \"accepted\"");
    expect(supplierQuotes).toContain("normalizedDecision === \"under review\"");
    expect(supplierQuotes).toContain("normalizedDecision === \"shortlisted\"");
    expect(supplierQuotes).toContain("normalizedDecision === \"revision requested\"");
    expect(supplierQuotes).toContain("href={`/rfq/${rfqSlug}/submit`}");
    expect(supplierQuotes).toContain("canSubmitQuote");
    expect(supplierQuotes).toContain("No Commercial Submission Recorded");
    expect(supplierQuotes).toContain(
      "This RFQ is currently open for an authorized company submission.",
    );
    expect(supplierQuotes).not.toContain(
      "authorized supplier submission",
    );
    expect(supplierQuotes).not.toContain("AwardContractButton");
    expect(supplierQuotes).not.toContain("award_rfq_quote");
    expect(supplierQuotes).not.toContain(".from(\"quotes\")");
    expect(supplierQuotes).not.toContain("/rfq/${rfqSlug}/compare");
    expect(workspace).toContain("RFQSupplierQuotes");
    expect(workspace).toContain("quotes={quoteList}");
  });

  it("does not force a min-width table or horizontal scroller under the authenticated shell", () => {
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
    expect(supplierQuotes).toContain("@container");
    expect(supplierQuotes).toContain("@min-[1500px]:block");
    expect(supplierQuotes).toContain("@min-[1500px]:hidden");
    expect(supplierQuotes).toContain("table-fixed");
    expect(supplierQuotes).toContain("<table");
    expect(supplierQuotes).toContain("<caption");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes-table="true"');
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes-cards="true"');
    expect(supplierQuotes).not.toContain("overflow-x-auto");
    expect(supplierQuotes).not.toContain("min-w-[920px]");
    expect(supplierQuotes).not.toContain("lg:block");
    expect(supplierQuotes).not.toContain("lg:hidden");
    expect(supplierQuotes).not.toContain("@7xl:block");
    expect(supplierQuotes).not.toContain("@7xl:hidden");
    expect(supplierQuotes).not.toContain("xl:grid-cols");
  });

  it("separates commercial value, terms, status, and message without owner comparison chrome", () => {
    expect(supplierQuotes).toContain("Confidential commercial value");
    expect(supplierQuotes).toContain("Commercial terms");
    expect(supplierQuotes).toContain("Supplier message");
    expect(supplierQuotes).toContain("<article");
    expect(supplierQuotes).toContain("@md:flex-row");
    expect(supplierQuotes).not.toContain("Owner action");
    expect(supplierQuotes).not.toContain("Comparison intelligence");
    expect(supplierQuotes).not.toContain("Recommended");
    expect(supplierQuotes).not.toContain("evaluationScore");
  });

  it("wraps long timeline and message values at word boundaries", () => {
    expect(supplierQuotes).toContain("text-pretty");
    expect(supplierQuotes).toContain("min-w-0");
    expect(supplierQuotes).not.toContain("overflow-wrap:anywhere");
    expect(supplierQuotes).not.toContain("break-all");
    expect(supplierQuotes).not.toContain("break-words");
    expect(visualQa).toContain("RFQQuoteWorkspace");
    expect(visualQa).toContain('data-rfq-supplier-quote-shell-width="1110"');
    expect(visualQa).toContain(
      "16-month phased commissioning across North Harbor bonded warehouse operations",
    );
    expect(visualQa).toContain("isOwner={false}");
  });

  it("does not alter frozen Task 23 or RFQ-01 through RFQ-06 regions", () => {
    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(command).toContain(
      "@7xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
    );
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(ranking).toContain('data-rfq-opportunity-queue="true"');
    expect(ranking).toContain('data-rfq-intelligence-profiles="true"');
    expect(comparison).toContain("@min-[1500px]:block");
    expect(comparison).toContain("AwardContractButton");
    expect(ownerQuotes).toContain("embedded");
    expect(ownerQuotes).toContain("recommendedQuoteId === quote.id");
  });

  it("normalizes supplier decision display labels without changing decision tone semantics", () => {
    const formatterStart = supplierQuotes.indexOf(
      "function formatSupplierDecisionLabel(",
    );
    const toneStart = supplierQuotes.indexOf(
      "function getDecisionTone(",
      formatterStart,
    );

    expect(formatterStart).toBeGreaterThan(-1);
    expect(toneStart).toBeGreaterThan(formatterStart);

    const formatter = supplierQuotes.slice(formatterStart, toneStart);

    expect(formatter).toContain(
      'const normalizedDecision = decision?.trim().toLowerCase() ?? "";',
    );

    expect(formatter).toContain('case "":');
    expect(formatter).toContain('case "pending":');
    expect(formatter).toContain('return "Submitted";');
    expect(formatter).toContain('case "approved":');
    expect(formatter).toContain('return "Approved";');
    expect(formatter).toContain('case "rejected":');
    expect(formatter).toContain('return "Rejected";');
    expect(formatter).toContain('case "awarded":');
    expect(formatter).toContain('return "Awarded";');
    expect(formatter).toContain(".split(/[_\\s]+/)");
    expect(formatter).toContain("word.charAt(0).toUpperCase()");
    expect(formatter).toContain("word.slice(1)");
    expect(formatter).toContain('.join(" ")');

    const futureDecision = "under_review";
    expect(
      futureDecision
        .split(/[_\s]+/)
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(" "),
    ).toBe("Under Review");

    const displayBindings =
      supplierQuotes.match(
        /const decisionLabel = formatSupplierDecisionLabel\(quote\.decision\);/g,
      ) ?? [];
    expect(displayBindings).toHaveLength(2);

    const visibleStatusBindings =
      supplierQuotes.match(
        /<ExecutiveBadge tone=\{getDecisionTone\(quote\.decision\)\}>\s*\{decisionLabel\}\s*<\/ExecutiveBadge>/g,
      ) ?? [];
    expect(visibleStatusBindings).toHaveLength(2);
    expect(supplierQuotes).toContain("status ${decisionLabel}");

    const toneBindings =
      supplierQuotes.match(/getDecisionTone\(quote\.decision\)/g) ?? [];
    expect(toneBindings).toHaveLength(2);

    expect(supplierQuotes).not.toContain('quote.decision || "Submitted"');
    expect(supplierQuotes).not.toContain("{quote.decision}");
    expect(supplierQuotes).not.toMatch(/quote\.decision\s*=/);
  });
});
