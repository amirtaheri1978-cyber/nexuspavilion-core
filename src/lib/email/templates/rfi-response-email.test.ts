
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfiResponseEmail } from "@/lib/email/templates/rfi-response-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");
}

const templateSource = readSource("src/lib/email/templates/rfi-response-email.ts");
const workspaceUrl = "https://app.example.test/rfq/harbor-point-package";

describe("private RFI response email template", () => {
  it("uses concise premium wording without exposing RFI bodies", () => {
    const email = buildRfiResponseEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      workspaceUrl,
    });

    expect(email.subject).toBe("Private RFI Response — Harbor Point Mixed-Use Development");
    expect(email.html).toContain("A response has been posted to your Private RFI.");
    expect(email.html).toContain("Review RFI Response");
    expect(email.html).toContain("not included in this email");
    expect(email.html).toContain(`href="${workspaceUrl}"`);
    expect(email.text).toContain("issuing procurement team has responded");
  });

  it("keeps the template API free of private RFI question or response bodies", () => {
    expect(templateSource).toContain("type RfiResponseEmailInput");
    expect(templateSource).toContain("rfqTitle: string;");
    expect(templateSource).toContain("workspaceUrl: string;");
    expect(templateSource).not.toContain("responseText");
    expect(templateSource).not.toContain("question:");
    expect(templateSource).toContain("Do not extend this API to accept question or response_text bodies.");
  });
});
