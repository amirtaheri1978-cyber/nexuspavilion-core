import { existsSync } from "node:fs";
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
const dashboard = readSource("src/app/dashboard/page.tsx");
const submit = readSource("src/app/rfq/[slug]/submit/page.tsx");
const award = readSource("src/components/award-contract-button.tsx");
const invite = readSource("src/components/invite-vendor-form.tsx");
const addenda = readSource("src/components/rfq-addenda-manager.tsx");
const inviteForm = readSource("src/components/submit-quote-form.tsx");

describe("Task 26 launch reliability hardening", () => {
  it("loads independent RFQ detail and dashboard reads concurrently", () => {
    expect(detail).toContain("await Promise.all([");
    expect(detail).toContain('.from("quotes")');
    expect(detail).toContain('.from("rfq_attachments")');
    expect(detail).toContain('.from("rfq_addenda")');
    expect(detail).toContain('.from("company_directory")');
    expect(dashboard).toContain("await Promise.all([");
    expect(dashboard).toContain('.from("rfqs")');
    expect(dashboard).toContain('.from("notifications")');
  });

  it("keeps an RFQ detail loading boundary so sequential round-trips cannot strand the shell", () => {
    expect(existsSync(resolve(process.cwd(), "src/app/rfq/[slug]/loading.tsx"))).toBe(
      true,
    );
    const loading = readSource("src/app/rfq/[slug]/loading.tsx");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading RFQ workspace");
  });

  it("locks in-flight quote, award, invite, and addenda mutations before a second request can start", () => {
    expect(submit).toContain("submitLock.current");
    expect(submit).toContain("if (submitLock.current || loading || rfqLoading)");
    expect(submit).toContain("JSON.parse(text)");
    expect(submit).toContain("The quote could not be submitted. Please try again.");
    expect(submit.indexOf("router.push(`/rfq/${slug}`)")).toBeGreaterThan(
      submit.indexOf("if (!response.ok)"),
    );

    expect(award).toContain("awardLock.current");
    expect(award).toContain("if (loading || disabled) return");
    expect(award).toContain("if (awardLock.current) return");
    expect(award).toContain("if (!response.ok)");
    expect(award.indexOf("router.push(data.redirectTo)")).toBeGreaterThan(
      award.indexOf("if (!response.ok)"),
    );

    expect(invite).toContain("inviteLock.current");
    expect(invite).toContain("if (inviteLock.current || loading)");
    expect(addenda).toContain("createLock.current");
    expect(addenda).toContain("if (!canManage) return");
    expect(addenda).toContain("if (createLock.current || loading) return");
    expect(inviteForm).toContain("submitLock.current");
    expect(inviteForm).toContain("if (submitLock.current || submitting)");
    expect(inviteForm).toContain('if (preview)');
  });

  it("does not navigate after a failed canonical quote submit", () => {
    const pushIndex = submit.indexOf("router.push(`/rfq/${slug}`)");
    const failureIndex = submit.indexOf("if (!response.ok)");
    const parseFailure = submit.indexOf(
      "The quote could not be submitted. Please try again.",
    );

    expect(failureIndex).toBeGreaterThan(0);
    expect(parseFailure).toBeGreaterThan(0);
    expect(pushIndex).toBeGreaterThan(failureIndex);
    expect(submit).toContain("submitLock.current = false");
  });
});
