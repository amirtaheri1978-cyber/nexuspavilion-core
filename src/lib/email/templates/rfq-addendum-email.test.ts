
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfqAddendumEmail } from "@/lib/email/templates/rfq-addendum-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");
}

const templateSource = readSource("src/lib/email/templates/rfq-addendum-email.ts");
const workspaceUrl = "https://app.example.test/rfq/harbor-point-package";

describe("RFQ Addendum email template", () => {
  it("uses action-required wording only when acknowledgement is required", () => {
    const required = buildRfqAddendumEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      addendumNumber: 3,
      addendumTitle: "Structural Steel Clarification",
      requiresAcknowledgement: true,
      workspaceUrl,
    });

    expect(required.subject).toBe(
      "Action Required — RFQ Addendum #3 — Harbor Point Mixed-Use Development",
    );
    expect(required.html).toContain("requires your acknowledgement");
    expect(required.html).toContain("Review &amp; Acknowledge Addendum");
    expect(required.text).toContain("Acknowledgement is required before quotation submission or revalidation.");

    const informational = buildRfqAddendumEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      addendumNumber: 2,
      addendumTitle: "Schedule Update",
      requiresAcknowledgement: false,
      workspaceUrl,
    });

    expect(informational.subject).toBe(
      "RFQ Addendum #2 — Harbor Point Mixed-Use Development",
    );
    expect(informational.html).toContain("A new Addendum has been issued for this RFQ.");
    expect(informational.text).toContain("No acknowledgement is required for this Addendum.");
    expect(informational.subject).not.toContain("Action Required");
  });

  it("keeps the template API free of Addendum body, documents, and recipient disclosure", () => {
    expect(templateSource).toContain("type RfqAddendumEmailInput");
    expect(templateSource).not.toContain("description:");
    expect(templateSource).not.toContain("affectedDocuments");
    expect(templateSource).not.toContain("recipientEmail");
    expect(templateSource).toContain("Intentionally omits description and affected document fields.");
  });
});
