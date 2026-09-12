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
const submitPage = readSource("src/app/rfq/[slug]/submit/page.tsx");
const submitWorkspace = readSource(
  "src/components/rfq-workspace/rfq-submit-workspace.tsx",
);
const quoteRoute = readSource("src/app/api/quotes/route.ts");

describe("Task 16-02 RFQ page query audit", () => {
  it("loads independent profile and RFQ detail rows concurrently", () => {
    const concurrentStart = detail.indexOf(
      "const [profileResult, rfqResult] = await Promise.all([",
    );
    const concurrentEnd = detail.indexOf("]);", concurrentStart);

    expect(concurrentStart).toBeGreaterThanOrEqual(0);
    expect(concurrentEnd).toBeGreaterThan(concurrentStart);

    const concurrentSection = detail.slice(concurrentStart, concurrentEnd);

    expect(concurrentSection).toContain('.from("profiles")');
    expect(concurrentSection).toContain('.from("rfqs")');
  });

  it("folds conditional RFI deadline parsing into the RFQ detail parallel batch", () => {
    const loadStart = detail.indexOf("const [\nquotesResult,");
    const parseResultIndex = detail.indexOf(
      "parsedRfiDeadlineResult,",
      loadStart,
    );
    const loadEnd = detail.indexOf("]);", parseResultIndex);

    expect(loadStart).toBeGreaterThanOrEqual(0);
    expect(parseResultIndex).toBeGreaterThan(loadStart);
    expect(loadEnd).toBeGreaterThan(parseResultIndex);

    const loadSection = detail.slice(loadStart, loadEnd);

    expect(loadSection).toContain(
      'rpc("parse_rfq_deadline_timestamptz"',
    );
    expect(detail).not.toContain(
      'await supabase.rpc("parse_rfq_deadline_timestamptz"',
    );
    expect(detail).toContain(
      "const parsedRfiDeadline = parsedRfiDeadlineResult.data;",
    );
  });

  it("reuses the server RFQ row in the submit workspace instead of rereading it in the browser", () => {
    expect(submitPage).toContain("deadline_timezone");
    expect(submitPage).toContain("awarded_quote_id");
    expect(submitPage).toContain(
      "<RfqSubmitWorkspace slug={slug} initialRfq={submitRfq} />",
    );

    expect(submitWorkspace).toContain("initialRfq: RfqStatus;");
    expect(submitWorkspace).toContain("const rfq = initialRfq;");
    expect(submitWorkspace).not.toContain("@/lib/supabase/client");
    expect(submitWorkspace).not.toContain('.from("rfqs")');
    expect(submitWorkspace).not.toContain("loadRfqStatus");
    expect(submitWorkspace).not.toContain("rfqLoading");
    expect(submitWorkspace).not.toContain("rfqStatusError");
  });

  it("keeps quotation submission enforcement authoritative in the server API", () => {
    expect(quoteRoute).toContain('.from("rfqs")');
    expect(quoteRoute).toContain("hasDeadlinePassed(rfq.deadline)");
    expect(quoteRoute).toContain("isOpenForQuotes(rfq)");
    expect(quoteRoute).toContain("supabase.rpc(");
    expect(quoteRoute).toContain(
      '"current_user_has_supplier_rfq_access"',
    );
    expect(quoteRoute).toContain("canRespondToRfqSourcing");
  });
});
