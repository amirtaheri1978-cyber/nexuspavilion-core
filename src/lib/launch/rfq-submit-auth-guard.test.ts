import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getSafeNextPath } from "@/lib/auth/login-continuation";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const submitPage = readSource("src/app/rfq/[slug]/submit/page.tsx");
const submitWorkspace = readSource(
  "src/components/rfq-workspace/rfq-submit-workspace.tsx",
);
const inviteWorkspace = readSource(
  "src/components/rfq-workspace/rfq-invite-quote-submission.tsx",
);
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const middleware = readSource("middleware.ts");
const loginPage = readSource("src/app/login/page.tsx");
const callbackRoute = readSource("src/app/auth/callback/route.ts");

describe("anonymous RFQ submit auth continuation", () => {
  it("guards /rfq/[slug]/submit with getUser before rendering the quote workspace", () => {
    const userIndex = submitPage.indexOf("supabase.auth.getUser()");
    const redirectIndex = submitPage.indexOf(
      "redirect(`/login?next=${encodeURIComponent(submitPath)}`)",
    );
    const workspaceIndex = submitPage.indexOf("<RfqSubmitWorkspace");

    expect(userIndex).toBeGreaterThan(-1);
    expect(redirectIndex).toBeGreaterThan(userIndex);
    expect(workspaceIndex).toBeGreaterThan(redirectIndex);
    expect(submitPage).toContain("if (!user)");
    expect(submitPage).toContain('from "@/lib/auth/login-continuation"');
    expect(submitPage).toContain('from "@/lib/supabase/server"');
    expect(submitPage).toContain("getSafeNextPath(`/rfq/${slug}/submit`)");
    expect(submitPage).not.toContain('"use client"');
    expect(submitPage).not.toContain('data-rfq-submit-workspace="true"');
    expect(submitPage).not.toContain('fetch("/api/quotes"');
  });

  it("continues signed-out submit access through the existing safe login next path", () => {
    expect(getSafeNextPath("/rfq/harbor-point/submit")).toBe(
      "/rfq/harbor-point/submit",
    );
    expect(getSafeNextPath("/rfq/north-harbor-bonded-warehouse/submit")).toBe(
      "/rfq/north-harbor-bonded-warehouse/submit",
    );
    expect(submitPage).toContain(
      "const submitPath = getSafeNextPath(`/rfq/${slug}/submit`);",
    );
    expect(loginPage).toContain("getSafeNextPath(searchParams.get(\"next\"))");
    expect(callbackRoute).toContain(
      "getSafeNextPath(requestUrl.searchParams.get(\"next\"))",
    );
  });

  it("does not weaken safe-next open-redirect protections", () => {
    expect(getSafeNextPath("https://evil.example/rfq/harbor-point/submit")).toBe(
      "/dashboard",
    );
    expect(getSafeNextPath("//evil.example/rfq/harbor-point/submit")).toBe(
      "/dashboard",
    );
    expect(getSafeNextPath("/\\evil.example/submit")).toBe("/dashboard");
    expect(getSafeNextPath("http://evil.example")).toBe("/dashboard");
  });

  it("keeps authenticated submit on the existing quote workspace and POST /api/quotes", () => {
    expect(submitPage).toContain("<RfqSubmitWorkspace slug={slug} />");
    expect(submitWorkspace).toContain('"use client"');
    expect(submitWorkspace).toContain('data-rfq-submit-workspace="true"');
    expect(submitWorkspace).toContain('fetch("/api/quotes"');
    expect(submitWorkspace).toContain('method: "POST"');
    expect(submitPage).not.toContain("getProcurementContext(");
    expect(submitPage).not.toContain("canSubmitCompanyQuote");
    expect(submitPage).not.toContain("bootstrap_owned_company_workspace");
  });

  it("keeps the invitation CTA on the canonical submit route", () => {
    expect(inviteWorkspace).toContain("Continue to Submit Quote");
    expect(inviteWorkspace).toContain("`/rfq/${invitation.rfq_slug}/submit`");
    expect(inviteWorkspace).not.toContain("/login?next=");
    expect(inviteWorkspace).not.toContain("p_token");
    expect(inviteWorkspace).not.toContain("invite_token");
  });

  it("does not middleware-lock /rfq and keeps quote POST unauthenticated-protected", () => {
    expect(middleware).not.toContain('"/rfq"');
    expect(middleware).not.toContain('"/rfq/:path*"');
    expect(quotesRoute).toContain("supabase.auth.getUser()");
    expect(quotesRoute).toContain("if (userError || !user)");
    expect(quotesRoute).toContain(
      'return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
    );
    expect(quotesRoute).not.toContain("get_rfq_invitation_context");
    expect(quotesRoute).not.toContain("p_token");
  });
});
