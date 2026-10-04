
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfqInvitationEmail } from "@/lib/email/templates/rfq-invitation-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");
}

const invitesRoute = readSource("src/app/api/invites/route.ts");
const shellSource = readSource("src/lib/email/templates/transactional-email-shell.ts");
const inviteUrl = "https://app.example.test/rfq/invite/opaque-invitation-token-value";

describe("RFQ invitation email family", () => {
  it("keeps the existing RFQ invitation route and token URL", () => {
    expect(invitesRoute).toContain('from "@/lib/email/templates/rfq-invitation-email"');
    expect(invitesRoute).toContain("buildRfqInvitationEmail({");
    expect(invitesRoute).toContain("deliverRfqInvitationEmail");
    expect(invitesRoute).toContain("`${publicSiteUrl}/rfq/invite/${token}`");
    expect(invitesRoute).not.toContain("function buildRfqInviteEmail");
  });

  it("uses premium product wording, canonical procurement semantics and one primary CTA", () => {
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

    expect(email.subject).toBe("RFQ Invitation — Harbor Point Mixed-Use Development");
    expect(email.html).toContain("Intelligent Procurement");
    expect(email.html).toContain("A Nexus Pavilion Inc. product");
    expect(email.html).toContain("You’ve been invited to review and respond to this RFQ.");
    expect(email.html).toContain("Review RFQ");
    expect(email.html).toContain(`href="${inviteUrl}"`);
    expect(email.html).toContain("Concrete &amp; Reinforcing Steel");
    expect(email.html).toContain("September 15, 2026");
    expect(email.html).toContain("not visible to competing respondents");
    expect(email.text).toContain("if you choose to participate");
    expect(email.text).toContain("does not create an award");
    expect(email.text).not.toContain("/submit");
  });

  it("keeps the shared shell dark, branded and tied to the official logo asset", () => {
    expect(shellSource).toContain("/branding/logo-horizontal-1024.png");
    expect(shellSource).toContain("background:#061426");
    expect(shellSource).toContain("background:#07111F");
    expect(shellSource).toContain("#C8A646");
    expect(shellSource).toContain("A Nexus Pavilion Inc. product");
    expect(shellSource).not.toContain("Supplier Intelligence • RFQ Management");
  });

  it("escapes dynamic RFQ fields through the shared shell helpers", () => {
    const email = buildRfqInvitationEmail({
      rfqTitle: 'Roofing <script>alert("x")</script> & Facade',
      category: 'Envelope & "Glazing"',
      budget: "<1000",
      deadline: "Now & Later",
      procurementScope: "Scope <A>",
      sourcingMethod: 'Invited & "Sealed"',
      contractFramework: "Framework & Call-Off",
      inviteUrl: 'https://app.example.test/rfq/invite/token"?onclick=alert(1)',
    });

    expect(email.html).toContain("Roofing &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Facade");
    expect(email.html).not.toContain("<script>alert");
    expect(email.text).toContain('Roofing <script>alert("x")</script> & Facade');
  });
});
