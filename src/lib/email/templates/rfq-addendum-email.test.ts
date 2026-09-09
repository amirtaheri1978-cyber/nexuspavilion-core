import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfqAddendumEmail } from "@/lib/email/templates/rfq-addendum-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const templateSource = readSource(
  "src/lib/email/templates/rfq-addendum-email.ts",
);
const workspaceUrl = "https://app.example.test/rfq/harbor-point-package";

describe("RFQ Addendum email template", () => {
  it("builds acknowledgement-required subject, HTML, and text with RFQ and Addendum identity", () => {
    const email = buildRfqAddendumEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      addendumNumber: 3,
      addendumTitle: "Structural Steel Clarification",
      requiresAcknowledgement: true,
      workspaceUrl,
    });

    expect(email.subject).toBe(
      "RFQ Addendum #3 — Harbor Point Mixed-Use Development",
    );
    expect(email.html).toContain("Nexus Pavilion");
    expect(email.html).toContain("RFQ Addendum");
    expect(email.html).toContain("Harbor Point Mixed-Use Development");
    expect(email.html).toContain("#3 — Structural Steel Clarification");
    expect(email.html).toContain("Acknowledgement Required");
    expect(email.html).toContain(
      "Acknowledgement is required before quote submission",
    );
    expect(email.html).toContain("Review Addendum");
    expect(email.html).toContain(`href="${workspaceUrl}"`);
    expect(email.html).toContain("Confidentiality Notice");
    expect(email.text).toContain("RFQ Addendum");
    expect(email.text).toContain("Harbor Point Mixed-Use Development");
    expect(email.text).toContain("Addendum #3: Structural Steel Clarification");
    expect(email.text).toContain("Acknowledgement Required");
    expect(email.text).toContain(workspaceUrl);
    expect(email.text).toContain("Confidentiality notice:");
  });

  it("renders informational classification when acknowledgement is not required", () => {
    const email = buildRfqAddendumEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      addendumNumber: 2,
      addendumTitle: "Schedule Update",
      requiresAcknowledgement: false,
      workspaceUrl,
    });

    expect(email.html).toContain("Informational");
    expect(email.html).not.toContain("Acknowledgement Required");
    expect(email.text).toContain("Classification: Informational");
    expect(email.text).toContain("This Addendum is informational.");
  });

  it("escapes dynamic HTML values without altering plaintext", () => {
    const email = buildRfqAddendumEmail({
      rfqTitle: 'Roofing <script>alert("x")</script> & Facade',
      addendumNumber: '4"',
      addendumTitle: 'Scope <A> & "Docs"',
      requiresAcknowledgement: true,
      workspaceUrl:
        'https://app.example.test/rfq/token"?onclick=alert(1)',
    });

    expect(email.html).toContain(
      "Roofing &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Facade",
    );
    expect(email.html).toContain("Scope &lt;A&gt; &amp; &quot;Docs&quot;");
    expect(email.html).toContain(
      "https://app.example.test/rfq/token&quot;?onclick=alert(1)",
    );
    expect(email.html).not.toContain("<script>alert");
    expect(email.text).toContain(
      'Roofing <script>alert("x")</script> & Facade',
    );
    expect(email.subject).toContain(
      'Roofing <script>alert("x")</script> & Facade',
    );
  });

  it("keeps the template API free of Addendum body, documents, and recipient disclosure", () => {
    expect(templateSource).toContain("type RfqAddendumEmailInput");
    expect(templateSource).toContain("rfqTitle: string;");
    expect(templateSource).toContain("addendumNumber: number | string;");
    expect(templateSource).toContain("addendumTitle: string;");
    expect(templateSource).toContain("requiresAcknowledgement: boolean;");
    expect(templateSource).toContain("workspaceUrl: string;");
    expect(templateSource).not.toContain("description:");
    expect(templateSource).not.toContain("affectedDocuments");
    expect(templateSource).not.toContain("recipientEmail");
    expect(templateSource).toContain(
      "Intentionally omits description and affected document fields.",
    );
    expect(templateSource).toMatch(
      /type RfqAddendumEmailInput = \{\s*rfqTitle: string;\s*addendumNumber: number \| string;\s*addendumTitle: string;\s*requiresAcknowledgement: boolean;\s*workspaceUrl: string;\s*\}/,
    );

    const email = buildRfqAddendumEmail({
      rfqTitle: "Controlled Package",
      addendumNumber: 1,
      addendumTitle: "Issued Clarification",
      requiresAcknowledgement: true,
      workspaceUrl,
    });

    expect(email.html).not.toContain("SECRET_DESCRIPTION");
    expect(email.html).not.toContain("SECRET_AFFECTED_DOCS");
    expect(email.text).not.toContain("recipient@");
  });
});
