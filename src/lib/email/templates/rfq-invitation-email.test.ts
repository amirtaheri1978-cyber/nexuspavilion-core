import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfqInvitationEmail } from "@/lib/email/templates/rfq-invitation-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const invitesRoute = readSource("src/app/api/invites/route.ts");
const invitationEmail = readSource(
  "src/lib/email/templates/rfq-invitation-email.ts",
);
const companyInvitationEmail = readSource(
  "src/lib/email/templates/company-invitation-email.ts",
);

const inviteUrl =
  "https://app.example.test/rfq/invite/opaque-invitation-token-value";

describe("RFQ invitation email family", () => {
  it("keeps POST /api/invites on the extracted builder and token invitation URL", () => {
    expect(invitesRoute).toContain(
      'from "@/lib/email/templates/rfq-invitation-email"',
    );
    expect(invitesRoute).toContain("buildRfqInvitationEmail({");
    expect(invitesRoute).toContain("inviteUrl: absoluteInviteUrl");
    expect(invitesRoute).toContain(
      "`${publicSiteUrl}/rfq/invite/${token}`",
    );
    expect(invitesRoute).toContain("`/rfq/invite/${token}`");
    expect(invitesRoute).not.toContain("background:#f6f6f3");
    expect(invitesRoute).not.toContain("#fb923c");
    expect(invitesRoute).not.toContain("function buildRfqInviteEmail");
  });

  it("uses the dark executive invitation family and a token CTA", () => {
    const email = buildRfqInvitationEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      category: "Concrete & Reinforcing Steel",
      budget: "$1,280,000",
      deadline: "September 15, 2026",
      procurementScope: "Material / Product RFQ",
      sourcingMethod: "Selective Routing / Invited RFQ",
      contractFramework: "Project-Specific RFQ",
      sourcingMethodKey: "invited",
      inviteUrl,
    });

    expect(email.subject).toBe(
      "RFQ Invitation: Harbor Point Mixed-Use Development",
    );
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain('cellpadding="0"');
    expect(email.html).toContain("background:#061426");
    expect(email.html).toContain("background:#07111F");
    expect(email.html).toContain("background:#0b1b2c");
    expect(email.html).toContain("#C8A646");
    expect(email.html).toContain("Nexus Pavilion");
    expect(email.html).toContain("Enterprise Procurement Intelligence");
    expect(email.html).toContain("Open Secure RFQ Invitation");
    expect(email.html).toContain(`href="${inviteUrl}"`);
    expect(email.html).toContain("/rfq/invite/");
    expect(email.html).not.toContain("/submit");
    expect(email.html).not.toContain("background:#f6f6f3");
    expect(email.html).toContain("Harbor Point Mixed-Use Development");
    expect(email.html).toContain("Concrete &amp; Reinforcing Steel");
    expect(email.html).toContain("Material / Product RFQ");
    expect(email.html).toContain("Selective Routing / Invited RFQ");
    expect(email.html).toContain("Project-Specific RFQ");
    expect(email.html).toContain("$1,280,000");
    expect(email.html).toContain("September 15, 2026");
    expect(email.html).toContain(
      "Supplier submissions are confidential and not visible to competing vendors.",
    );
    expect(email.html).toContain(
      "The Buyer reserves the right to accept or reject any or all submissions",
    );
    expect(email.text).toContain("You have been invited to quote on");
    expect(email.text).toContain("Harbor Point Mixed-Use Development");
    expect(email.text).toContain(inviteUrl);
    expect(email.text).toContain("Confidentiality notice:");
    expect(email.text).not.toContain("/submit");
  });

  it("escapes dynamic RFQ fields in HTML without changing the plaintext values", () => {
    const email = buildRfqInvitationEmail({
      rfqTitle: 'Roofing <script>alert("x")</script> & Facade',
      category: 'Envelope & "Glazing"',
      budget: "<1000",
      deadline: "Now & Later",
      procurementScope: "Scope <A>",
      sourcingMethod: 'Invited & "Sealed"',
      contractFramework: "Framework & Call-Off",
      inviteUrl:
        'https://app.example.test/rfq/invite/token"?onclick=alert(1)',
    });

    expect(email.html).toContain("Roofing &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Facade");
    expect(email.html).toContain("Envelope &amp; &quot;Glazing&quot;");
    expect(email.html).toContain("&lt;1000");
    expect(email.html).toContain("Now &amp; Later");
    expect(email.html).toContain("Scope &lt;A&gt;");
    expect(email.html).toContain("Invited &amp; &quot;Sealed&quot;");
    expect(email.html).toContain("Framework &amp; Call-Off");
    expect(email.html).toContain(
      "https://app.example.test/rfq/invite/token&quot;?onclick=alert(1)",
    );
    expect(email.html).not.toContain("<script>alert");
    expect(email.text).toContain('Roofing <script>alert("x")</script> & Facade');
    expect(email.text).toContain(
      'https://app.example.test/rfq/invite/token"?onclick=alert(1)',
    );
  });

  it("reuses the established invitation email family instead of a light-theme template", () => {
    expect(invitationEmail).toContain("<!DOCTYPE html>");
    expect(invitationEmail).toContain("background:#061426");
    expect(invitationEmail).toContain("background:#07111F");
    expect(invitationEmail).toContain("#C8A646");
    expect(companyInvitationEmail).toContain("background:#061426");
    expect(companyInvitationEmail).toContain("#C8A646");
    expect(invitationEmail).not.toContain("background:#f6f6f3");
    expect(invitationEmail).not.toContain("#fb923c");
  });
});
