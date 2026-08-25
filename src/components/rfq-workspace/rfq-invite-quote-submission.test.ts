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
const frozenSubmit = readSource(
  "src/components/rfq-workspace/rfq-submit-workspace.tsx",
);
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

describe("Task 28 RFQ invitation continuation surface", () => {
  it("keeps token lookup intact and does not submit quotes from the invite route", () => {
    expect(invitePage).toContain("token.trim()");
    expect(invitePage).toContain('rpc("get_rfq_invitation_context"');
    expect(invitePage).toContain("{ p_token: cleanToken }");
    expect(invitePage).toContain(".maybeSingle()");
    expect(invitePage).toContain("error || !invitation");
    expect(invitePage).toContain("RfqInviteQuoteSubmission");
    expect(invitePage).not.toContain("award_rfq_quote");
    expect(invitePage).not.toContain('fetch("/api/quotes"');
    expect(invitePage).not.toContain('.from("quotes")');
    expect(invitePage).not.toContain(".insert({");
    expect(invitePage).not.toContain("SubmitQuoteForm");

    expect(inviteWorkspace).not.toContain("SubmitQuoteForm");
    expect(inviteWorkspace).not.toContain('.from("quotes")');
    expect(inviteWorkspace).not.toContain(".insert({");
    expect(inviteWorkspace).not.toContain('fetch("/api/quotes"');
    expect(inviteWorkspace).not.toContain("embedded");
  });

  it("continues validated invitations into the canonical submit workspace", () => {
    expect(inviteWorkspace).toContain("Continue to Submit Quote");
    expect(inviteWorkspace).toContain(
      "`/rfq/${invitation.rfq_slug}/submit`",
    );
    expect(inviteWorkspace).toContain('data-rfq-invite-continue-submit="true"');
    expect(inviteWorkspace).toContain("Open RFQ Page");
    expect(inviteWorkspace).toContain("`/rfq/${invitation.rfq_slug}`");
    expect(inviteWorkspace).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(inviteWorkspace).toContain("EXECUTIVE_CTA_SECONDARY");
    expect(frozenSubmit).toContain('fetch("/api/quotes"');
    expect(frozenSubmit).toContain('method: "POST"');
    expect(frozenSubmit).toContain('data-rfq-submit-workspace="true"');
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
    expect(inviteWorkspace.match(/<ExecutivePanel/g)?.length).toBe(2);
    expect(invitePage.match(/<h1\b/g)?.length ?? 0).toBe(0);
    expect(inviteWorkspace.match(/<h1\b/g)?.length).toBe(2);
  });

  it("wraps invitation copy at word boundaries and keeps actions reachable", () => {
    expect(inviteWorkspace).toContain("text-pretty");
    expect(inviteWorkspace).toContain("min-w-0");
    expect(inviteWorkspace).toContain("min-h-14");
    expect(inviteWorkspace).not.toContain("break-words");
    expect(inviteWorkspace).not.toContain("break-all");
    expect(inviteWorkspace).not.toContain("overflow-wrap:anywhere");
    expect(visualQa).toContain('data-rfq-invite-quote-shell-width="1110"');
    expect(visualQa).toContain("invite-token quote submission");
    expect(visualQa).toContain("RfqInviteQuoteSubmission");
    expect(visualQa).toContain("RfqInviteQuoteUnavailable");
    expect(visualQa).toContain("does not submit a quote");
    expect(visualQa).toContain("continuation surface");
    expect(visualQa).not.toContain("previewAmount");
    expect(visualQa).not.toContain("SubmitQuoteForm");
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
