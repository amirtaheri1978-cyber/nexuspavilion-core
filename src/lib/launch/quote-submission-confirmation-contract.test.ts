import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { quoteSubmittedEmail } from "@/lib/email/templates/quote-submitted-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const quotesRoute = readSource("src/app/api/quotes/route.ts");
const templateSource = readSource(
  "src/lib/email/templates/quote-submitted-email.ts",
);
const workspaceUrl = "https://app.example.test/rfq/harbor-point-package";

describe("14-06 Quote submission confirmation contract", () => {
  it("sends supplier confirmation to the RFQ workspace, not buyer Compare", () => {
    expect(quotesRoute).toContain('from "@/lib/email/send-email"');
    expect(quotesRoute).toContain(
      'from "@/lib/email/templates/quote-submitted-email"',
    );
    expect(quotesRoute).toContain("quoteSubmittedEmail({");
    expect(quotesRoute).toContain("joinPublicSitePath(`/rfq/${rfq.slug}`)");
    expect(quotesRoute).not.toContain(
      "joinPublicSitePath(`/rfq/${rfq.slug}/compare`)",
    );
    expect(quotesRoute).toContain("await sendEmail({");
    expect(quotesRoute).toContain("if (user.email && quoteUrl)");
    expect(quotesRoute).toContain("redirectTo: `/rfq/${rfq.slug}`");
  });

  it("keeps confirmation best-effort after successful quote persistence and activity", () => {
    const postStart = quotesRoute.indexOf("export async function POST");
    const insertStart = quotesRoute.indexOf('.from("quotes")', postStart);
    const insertBody = quotesRoute.indexOf(".insert({", insertStart);
    const activityStart = quotesRoute.indexOf(
      '"quote_submitted"',
      postStart,
    );
    const emailStart = quotesRoute.indexOf(
      "joinPublicSitePath(`/rfq/${rfq.slug}`)",
      postStart,
    );
    const successStart = quotesRoute.indexOf(
      "success: true,\n  quote,",
      postStart,
    );
    const emailCatch = quotesRoute.indexOf(
      'console.error("Quote submitted email failed:"',
      postStart,
    );

    expect(postStart).toBeGreaterThan(-1);
    expect(insertBody).toBeGreaterThan(insertStart);
    expect(activityStart).toBeGreaterThan(insertBody);
    expect(emailStart).toBeGreaterThan(activityStart);
    expect(emailCatch).toBeGreaterThan(emailStart);
    expect(successStart).toBeGreaterThan(emailCatch);
    expect(quotesRoute).toContain(
      'console.error("Quote submitted email failed:"',
    );
  });

  it("surfaces sent/skipped/failed confirmation delivery without failing Quote mutation", () => {
    expect(quotesRoute).toContain("const emailResult = await sendEmail({");
    expect(quotesRoute).toContain("sent: Boolean(emailResult.success)");
    expect(quotesRoute).toContain("skipped: Boolean(emailResult.skipped)");
    expect(quotesRoute).toContain("id: emailResult.id ?? null");
    expect(quotesRoute).toContain("error: emailResult.error ?? null");
    expect(quotesRoute).toContain(
      "Quote submitted, but email delivery failed.",
    );
    expect(quotesRoute).toContain("success: true,\n  quote,");
    expect(quotesRoute).toContain("email,");
    expect(quotesRoute).not.toContain("resubmit");
    expect(quotesRoute).not.toContain("/compare");
  });

  it("renders a clear supplier receipt without competitor or buyer-private fields", () => {
    const html = quoteSubmittedEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      amount: "125000",
      timeline: "Q2 delivery",
      validityDays: "60 days",
      quoteUrl: workspaceUrl,
    });

    expect(html).toContain("Nexus Pavilion");
    expect(html).toContain("Supplier Submission Recorded");
    expect(html).toContain("Quote submitted successfully.");
    expect(html).toContain("Harbor Point Mixed-Use Development");
    expect(html).toContain("125000");
    expect(html).toContain("Q2 delivery");
    expect(html).toContain("60 days");
    expect(html).toContain(`href="${workspaceUrl}"`);
    expect(html).toContain("View Submission");
    expect(html).toContain("Open RFQ Workspace");
    expect(html).toContain("Competing suppliers cannot access or view your submission.");
    expect(html).not.toContain("/compare");
    expect(html).not.toContain("invitation");
    expect(html).not.toContain("provider");
    expect(html).not.toContain("Competitor");
    expect(html).not.toContain("supplier list");
    expect(html).not.toContain("RFI");
    expect(html).not.toContain("Addendum #");
    expect(html).not.toContain("messageId");

    expect(templateSource).toContain("quoteUrl: string");
    expect(templateSource).not.toContain("competitor");
    expect(templateSource).not.toContain("invitationToken");
    expect(templateSource).not.toContain("providerMessageId");
    expect(templateSource).not.toContain("rfiQuestion");
    expect(templateSource).not.toContain("rfiResponse");
  });
});
