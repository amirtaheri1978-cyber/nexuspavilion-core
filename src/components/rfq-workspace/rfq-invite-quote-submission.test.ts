import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const invitePage = readSource("src/app/rfq/invite/[token]/page.tsx");
const inviteWorkspace = readSource(
  "src/components/rfq-workspace/rfq-invite-quote-submission.tsx",
);
const form = readSource("src/components/submit-quote-form.tsx");
const frozenSubmit = readSource("src/app/rfq/[slug]/submit/page.tsx");
const companySubmit = readSource("src/app/company/[slug]/submit/page.tsx");
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const nav = readSource("src/lib/navigation/application-nav.ts");
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const ownerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const inviteVendor = readSource("src/components/invite-vendor-form.tsx");
const addenda = readSource("src/components/rfq-addenda-manager.tsx");
const sidebar = readSource("src/components/sidebar.tsx");
const appShell = readSource("src/components/app-shell.tsx");

describe("Task 24-RFQ-14 invite-token quote submission presentation", () => {
  it("keeps token lookup, quote insert destination, and payload shape intact", () => {
    expect(invitePage).toContain("token.trim()");
    expect(invitePage).toContain('rpc("get_rfq_invitation_context"');
    expect(invitePage).toContain("{ p_token: cleanToken }");
    expect(invitePage).toContain(".maybeSingle()");
    expect(invitePage).toContain("error || !invitation");
    expect(form).toContain("supabase.auth.getUser()");
    expect(form).toContain('.from("companies")');
    expect(form).toContain('.select("id")');
    expect(form).toContain('.eq("user_id", user.id)');
    expect(form).toContain('.from("quotes")');
    expect(form).toContain(".insert({");
    expect(form).toContain("rfq_id: rfqId");
    expect(form).toContain("company_id: companyId");
    expect(form).toContain("user_id: user.id");
    expect(form).toContain("amount,");
    expect(form).toContain("timeline,");
    expect(form).toContain("message,");
    expect(form).toContain('status: "submitted"');
    expect(form).toContain("Please login before submitting a quote.");
    expect(form).toContain("Could not submit quote.");
    expect(form).toContain("Quote submitted successfully.");
    expect(form).not.toContain('fetch("/api/quotes"');
    expect(form).not.toContain("award_rfq_quote");
    expect(invitePage).toContain('rpc("get_rfq_invitation_context"');
  });

  it("renders one chromeless invited-supplier surface without nested cream cards", () => {
    expect(nav).toContain('"/rfq/invite"');
    expect(invitePage).toContain("EXECUTIVE_PAGE_CLASS");
    expect(invitePage).toContain("bg-nexus-navy");
    expect(invitePage).toContain("RfqInviteQuoteSubmission");
    expect(invitePage).toContain("RfqInviteQuoteUnavailable");
    expect(inviteWorkspace).toContain('data-rfq-invite-quote-submission="true"');
    expect(inviteWorkspace).toContain('data-rfq-invite-quote-identity="true"');
    expect(inviteWorkspace).toContain('data-rfq-invite-quote-status="true"');
    expect(inviteWorkspace).toContain("@container");
    expect(inviteWorkspace).toContain("@sm:grid-cols-2");
    expect(inviteWorkspace).not.toContain("md:grid-cols-2");
    expect(inviteWorkspace).not.toContain("bg-slate-100");
    expect(inviteWorkspace).not.toContain("bg-white");
    expect(inviteWorkspace).not.toContain("text-orange-500");
    expect(form).not.toContain("text-orange-500");
    expect(form).not.toContain("bg-slate-100");
    expect(form).toContain("embedded");
    expect(inviteWorkspace).toContain("embedded");
    expect(inviteWorkspace.match(/<ExecutivePanel/g)?.length).toBe(2);
    expect(invitePage.match(/<h1\b/g)?.length ?? 0).toBe(0);
    expect(inviteWorkspace.match(/<h1\b/g)?.length).toBe(2);
  });

  it("wraps invitation copy at word boundaries and keeps actions reachable", () => {
    expect(inviteWorkspace).toContain("text-pretty");
    expect(inviteWorkspace).toContain("min-w-0");
    expect(form).toContain("text-pretty");
    expect(form).toContain("min-w-0");
    expect(form).toContain("min-h-14");
    expect(form).toContain('htmlFor="invite-quote-amount"');
    expect(form).toContain('htmlFor="invite-quote-timeline"');
    expect(form).toContain('htmlFor="invite-quote-message"');
    expect(form).toContain("aria-invalid");
    expect(form).toContain("aria-describedby");
    expect(form).toContain('role="alert"');
    expect(form).toContain('role="status"');
    expect(form).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(inviteWorkspace).toContain("EXECUTIVE_CTA_SECONDARY");
    expect(inviteWorkspace).toContain("Open RFQ Page");
    expect(inviteWorkspace).toContain("`/rfq/${invitation.rfq_slug}`");
    expect(inviteWorkspace).not.toContain("break-words");
    expect(inviteWorkspace).not.toContain("break-all");
    expect(inviteWorkspace).not.toContain("overflow-wrap:anywhere");
    expect(form).not.toContain("break-words");
    expect(form).not.toContain("break-all");
    expect(form).not.toContain("truncate");
    expect(visualQa).toContain('data-rfq-invite-quote-shell-width="1110"');
    expect(visualQa).toContain("invite-token quote submission");
    expect(visualQa).toContain("RfqInviteQuoteSubmission");
    expect(visualQa).toContain("RfqInviteQuoteUnavailable");
    expect(visualQa).toContain("does not submit a quote");
  });

  it("does not alter frozen Task 23 or RFQ-01 through RFQ-13 regions", () => {
    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(documents).toContain('data-rfq-document-workspace="true"');
    expect(inviteVendor).toContain('data-rfq-invite-vendor-form="true"');
    expect(addenda).toContain('data-rfq-addenda-manager="true"');
    expect(comparison).toContain("@min-[1500px]:block");
    expect(ownerQuotes).toContain("resolveRfqOwnerSupplierLabel");
    expect(frozenSubmit).toContain('fetch("/api/quotes"');
    expect(frozenSubmit).toContain('data-rfq-submit-workspace="true"');
    expect(companySubmit).toContain("bg-slate-100");
    expect(invitePage).not.toContain("award_rfq_quote");
  });
});
