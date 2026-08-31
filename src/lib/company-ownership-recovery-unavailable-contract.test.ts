import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { POST as postRecoverAdmin } from "@/app/api/company/recover-admin/route";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const membersCenter = readSource("src/components/company-members-center.tsx");
const settingsPage = readSource("src/app/company/settings/page.tsx");
const recoverAdminRoute = readSource(
  "src/app/api/company/recover-admin/route.ts",
);

const noOwnerBlockStart = membersCenter.indexOf("{!company.user_id ? (");
const noOwnerBlockEnd = membersCenter.indexOf(") : (", noOwnerBlockStart);
const noOwnerBlock = membersCenter.slice(noOwnerBlockStart, noOwnerBlockEnd);

describe("company ownership recovery unavailable contract", () => {
  it("does not import RecoverOwnershipButton from company members or settings", () => {
    expect(membersCenter).not.toContain("RecoverOwnershipButton");
    expect(membersCenter).not.toContain("recover-ownership-button");
    expect(settingsPage).not.toContain("RecoverOwnershipButton");
    expect(settingsPage).not.toContain("recover-ownership-button");
  });

  it("does not render a clickable Recover Ownership action", () => {
    expect(membersCenter).not.toContain("Recover Ownership");
    expect(membersCenter).not.toContain("Emergency Ownership Recovery");
    expect(noOwnerBlock).not.toMatch(/<button\b/i);
    expect(settingsPage).not.toContain("Recover Ownership");
  });

  it("does not call recover-admin from company members or settings", () => {
    expect(membersCenter).not.toContain("/api/company/recover-admin");
    expect(settingsPage).not.toContain("/api/company/recover-admin");
  });

  it("renders the unavailable governance state when no owner is assigned", () => {
    expect(noOwnerBlockStart).toBeGreaterThan(-1);
    expect(noOwnerBlock).toContain("Ownership Recovery Unavailable");
    expect(noOwnerBlock).toContain(
      "No canonical emergency ownership recovery workflow is currently",
    );
    expect(noOwnerBlock).toContain(
      "approved membership-based ownership transfer controls",
    );
  });

  it("keeps the recover-admin route fail-closed with HTTP 410", async () => {
    expect(recoverAdminRoute).toContain("status: 410");
    expect(recoverAdminRoute).toContain(
      "Emergency ownership recovery is unavailable until a canonical membership-based recovery workflow is approved.",
    );

    const response = await postRecoverAdmin();
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(410);
    expect(body.error).toContain(
      "Emergency ownership recovery is unavailable until a canonical",
    );
  });
});
