import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfiResponseEmail } from "@/lib/email/templates/rfi-response-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const templateSource = readSource(
  "src/lib/email/templates/rfi-response-email.ts",
);
const workspaceUrl = "https://app.example.test/rfq/harbor-point-package";

describe("private RFI response email template", () => {
  it("builds subject, HTML, and text with RFQ title and workspace CTA", () => {
    const email = buildRfiResponseEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      workspaceUrl,
    });

    expect(email.subject).toBe(
      "Private RFI response available — Harbor Point Mixed-Use Development",
    );
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("Nexus Pavilion");
    expect(email.html).toContain("Private RFI Response");
    expect(email.html).toContain("Harbor Point Mixed-Use Development");
    expect(email.html).toContain("issuing procurement team has responded");
    expect(email.html).toContain("Confidentiality Notice");
    expect(email.html).toContain(
      "Competing suppliers cannot view this inquiry or its response.",
    );
    expect(email.html).toContain(`href="${workspaceUrl}"`);
    expect(email.html).toContain("Open RFQ Workspace");
    expect(email.text).toContain("Private RFI Response");
    expect(email.text).toContain("Harbor Point Mixed-Use Development");
    expect(email.text).toContain(workspaceUrl);
    expect(email.text).toContain("Confidentiality notice:");
  });

  it("escapes dynamic HTML values without altering plaintext", () => {
    const email = buildRfiResponseEmail({
      rfqTitle: 'Roofing <script>alert("x")</script> & Facade',
      workspaceUrl:
        'https://app.example.test/rfq/token"?onclick=alert(1)',
    });

    expect(email.html).toContain(
      "Roofing &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Facade",
    );
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

  it("keeps the template API free of private RFI question or response bodies", () => {
    expect(templateSource).toContain("type RfiResponseEmailInput");
    expect(templateSource).toContain("rfqTitle: string;");
    expect(templateSource).toContain("workspaceUrl: string;");
    expect(templateSource).not.toContain("responseText");
    expect(templateSource).not.toContain("question:");
    expect(templateSource).toContain(
      "Do not extend this API to accept question or response_text bodies.",
    );
    expect(templateSource).toMatch(
      /type RfiResponseEmailInput = \{\s*rfqTitle: string;\s*workspaceUrl: string;\s*\}/,
    );

    const email = buildRfiResponseEmail({
      rfqTitle: "Controlled Package",
      workspaceUrl,
    });

    expect(email.html).not.toContain("SECRET_RESPONSE_BODY");
    expect(email.text).not.toContain("SECRET_RESPONSE_BODY");
  });
});
