import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const compare = read("src/app/rfq/[slug]/compare/page.tsx");
const submit = read("src/components/rfq-workspace/rfq-submit-workspace.tsx");
const detail = read("src/app/rfq/[slug]/page.tsx");
const award = read("src/components/award-contract-button.tsx");
const dialog = read("src/components/executive/executive-confirm-dialog.tsx");
const comparison = read("src/components/rfq-workspace/rfq-quote-comparison.tsx");
const command = read("src/components/rfq-workspace/rfq-command-center.tsx");
const ownerQuotes = read("src/components/rfq-workspace/rfq-owner-quotes.tsx");

const b03Sources = [compare, submit, detail, award, dialog, comparison, command];

describe("NP-MASTER-22-B03 Golden RFQ compare / submit", () => {
  it("removes cream/light-mode islands from compare and submit", () => {
    expect(compare).not.toContain("bg-[#f6f6f3]");
    expect(submit).not.toContain("bg-[#f6f6f3]");
    expect(compare).toContain("bg-nexus-navy");
    expect(submit).toContain("bg-nexus-navy");
    expect(compare).toContain("EXECUTIVE_PAGE_CLASS");
    expect(submit).toContain("EXECUTIVE_PAGE_CLASS");
    expect(detail).toContain("EXECUTIVE_PAGE_CLASS");
  });

  it("uses frozen primitives instead of orange marketing or green-700 award", () => {
    expect(compare).not.toMatch(/text-orange-500|bg-orange-50|bg-orange-100/);
    expect(submit).not.toMatch(/text-orange-400|bg-orange-50|bg-orange-100/);
    expect(award).not.toContain("bg-green-700");
    expect(award).not.toContain("hover:bg-green-800");
    expect(compare).toContain("ExecutivePanel");
    expect(submit).toContain("ExecutiveBadge");
    expect(command).toContain("ExecutiveBadge");
  });

  it("replaces window.confirm with an accessible dialog contract", () => {
    expect(award).not.toContain("window.confirm");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain("aria-labelledby");
    expect(dialog).toContain("aria-describedby");
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain(".focus()");
    expect(award).toContain("triggerRef.current?.focus()");
    expect(award).toContain("Confirm award");
    expect(award).toContain("rfqTitle");
    expect(award).toContain("supplierLabel");
    expect(award).toContain("amountLabel");
  });

  it("keeps award and quote API contracts unchanged", () => {
    expect(award).toContain('fetch("/api/award-contract"');
    expect(award).toContain("quoteId");
    expect(award).toContain("method: \"POST\"");
    expect(submit).toContain('fetch("/api/quotes"');
    expect(submit).toContain("amount: amountNumber");
    expect(submit).toContain("timeline: timeline.trim()");
    expect(submit).toContain("message: message.trim()");
  });

  it("preserves compare scoring formulas", () => {
    expect(compare).toContain("priceScore * 0.6 + validityScore * 0.2 + budgetDisciplineScore * 0.2");
    expect(compare).toContain("timelineScore * 0.45 + performanceScore * 0.35 + riskScore * 0.2");
    expect(compare).toContain("commercialScore * 0.45 + technicalScore * 0.4 + riskScore * 0.15");
    expect(compare).toContain('.from("quotes")');
    expect(compare).toContain('.select("*")');
  });

  it("uses a semantic table and a mobile card comparison path", () => {
    expect(comparison).toContain("<table");
    expect(comparison).toContain("<caption");
    expect(comparison).toContain('scope="col"');
    expect(comparison).toContain('scope="row"');
    expect(comparison).toContain("@min-[1500px]:hidden");
    expect(comparison).not.toContain("lg:hidden");
    expect(comparison).not.toContain("overflow-x-auto");
    expect(comparison).toContain("<article");
    expect(comparison).toContain("<h3");
    expect(comparison).not.toContain("grid-cols-10");
    expect(ownerQuotes).toContain("RfqQuoteComparison");
  });

  it("keeps one h1 on each B03 page path and labeled submit fields", () => {
    expect(compare.match(/<h1\b/g)?.length).toBe(2);
    expect(submit.match(/<h1\b/g)?.length).toBe(1);
    expect(command.match(/<h1\b/g)?.length).toBe(1);
    expect(submit).toContain('htmlFor="quote-amount"');
    expect(submit).toContain("aria-invalid");
    expect(submit).toContain("aria-describedby");
  });

  it("does not introduce the unused light-mode ui kit", () => {
    for (const source of b03Sources) {
      expect(source).not.toContain("@/components/ui");
    }
  });

  it("guards against accidental double-submit on award", () => {
    expect(award).toContain("if (loading || disabled) return");
    expect(dialog).toContain("disabled={busy}");
  });
});
