import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  resolve(process.cwd(), "src/app/create-company/page.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("create-company review validation feedback", () => {
  it("keeps activation actionable so submit can reveal missing required fields", () => {
    const activationIndex = page.indexOf('"Activate company workspace"');
    expect(activationIndex).toBeGreaterThan(-1);

    const buttonWindow = page.slice(
      Math.max(0, activationIndex - 900),
      activationIndex + 250,
    );

    expect(buttonWindow).toContain('type="submit"');
    expect(buttonWindow).toContain("disabled={loading}");
    expect(buttonWindow).not.toContain("disabled={loading || !formIsReady}");
  });

  it("explains why activation is not ready before the user submits", () => {
    expect(page).toContain('id="workspace-activation-readiness"');
    expect(page).toContain(
      "Complete all required founder details above to activate",
    );
    expect(page).toContain("your Company Workspace.");
    expect(page).toContain(
      '? "workspace-activation-readiness"\n                          : undefined',
    );
  });

  it("retains field-level required validation after submit", () => {
    expect(page).toContain("setAttemptedReviewSubmit(true)");
    expect(page).toContain("required: attemptedReviewSubmit");
    expect(page).toContain("required: true");
    expect(page).toContain(
      "Please select your organization type and complete the required fields.",
    );
  });
});
