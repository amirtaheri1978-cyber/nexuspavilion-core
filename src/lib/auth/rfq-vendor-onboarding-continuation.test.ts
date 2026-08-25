import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getCompanyOnboardingPath,
  getPostCompanyCreatePath,
  getSafeNextPath,
  getSignupHref,
} from "@/lib/auth/login-continuation";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const loginPage = readSource("src/app/login/page.tsx");
const signupPage = readSource("src/app/signup/page.tsx");
const callbackRoute = readSource("src/app/auth/callback/route.ts");
const createCompanyPage = readSource("src/app/create-company/page.tsx");
const createRoute = readSource("src/app/api/companies/create/route.ts");
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const inviteWorkspace = readSource(
  "src/components/rfq-workspace/rfq-invite-quote-submission.tsx",
);
const inviteSignupPage = readSource(
  "src/app/invite/[token]/signup/page.tsx",
);
const submitPage = readSource("src/app/rfq/[slug]/submit/page.tsx");
const bootstrapHelper = readSource("src/lib/auth/workspace-bootstrap.ts");
const bootstrapMigration = readSource(
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql",
);

describe("Task 32B RFQ vendor onboarding continuation", () => {
  it("preserves a safe RFQ next from login Create an account to signup", () => {
    expect(loginPage).toContain("getSignupHref(nextPath)");
    expect(getSignupHref("/rfq/harbor-point/submit")).toBe(
      "/signup?next=%2Frfq%2Fharbor-point%2Fsubmit",
    );
    expect(loginPage).not.toContain('href="/signup"');
  });

  it("does not send unsafe next values to signup", () => {
    expect(getSignupHref("https://evil.example/phish")).toBe("/signup");
    expect(getSignupHref("//evil.example/signup")).toBe("/signup");
    expect(signupPage).toContain("getSafeNextPath(searchParams.get(\"next\"))");
  });

  it("reads and sanitizes next on signup, then onboards through create-company", () => {
    expect(signupPage).toContain("getSafeNextPath(searchParams.get(\"next\"))");
    expect(signupPage).toContain("getCompanyOnboardingPath(nextPath)");
    expect(getCompanyOnboardingPath("/rfq/harbor-point/submit")).toBe(
      "/create-company?next=%2Frfq%2Fharbor-point%2Fsubmit",
    );
    expect(
      getSafeNextPath(getCompanyOnboardingPath("/rfq/harbor-point/submit")),
    ).toBe("/create-company?next=%2Frfq%2Fharbor-point%2Fsubmit");
  });

  it("preserves the RFQ destination through emailRedirectTo and immediate signup", () => {
    expect(signupPage).toContain(
      'confirmationRedirect.searchParams.set("next", onboardingPath)',
    );
    expect(signupPage).toContain(
      "emailRedirectTo: confirmationRedirect.toString()",
    );
    expect(signupPage).toContain("router.push(onboardingPath)");
    expect(signupPage).not.toContain(
      'confirmationRedirect.searchParams.set("next", "/create-company")',
    );
    expect(signupPage).not.toContain('router.push("/create-company")');
  });

  it("keeps auth callback sanitizing next and preserves it on auth errors", () => {
    expect(callbackRoute).toContain("getSafeNextPath(requestedNext)");
    expect(callbackRoute).toContain("isInternalNextPath(next)");
    expect(callbackRoute).toContain('url.searchParams.set("next", next)');
    expect(callbackRoute).toContain(
      "NextResponse.redirect(new URL(next, SITE_URL))",
    );
  });

  it("honors a safe nested create-company next and rejects malicious destinations", () => {
    expect(createCompanyPage).toContain("getPostCompanyCreatePath");
    expect(createCompanyPage).toContain("searchParams.get(\"next\")");
    expect(createRoute).toContain("getPostCompanyCreatePath");
    expect(getPostCompanyCreatePath("/rfq/harbor-point/submit")).toBe(
      "/rfq/harbor-point/submit",
    );
    expect(getPostCompanyCreatePath("https://evil.example/phish")).toBe(
      "/company/settings",
    );
    expect(getPostCompanyCreatePath(null)).toBe("/company/settings");
  });

  it("does not propagate the RFQ invitation token into later auth steps", () => {
    expect(signupPage).not.toContain("invite_token");
    expect(signupPage).not.toContain("p_token");
    expect(callbackRoute).not.toContain("invite_token");
    expect(callbackRoute).not.toContain("p_token");
    expect(createCompanyPage).not.toContain("invite_token");
    expect(createCompanyPage).not.toContain("p_token");
    expect(createRoute).not.toContain("invite_token");
    expect(quotesRoute).not.toContain("get_rfq_invitation_context");
    expect(quotesRoute).not.toContain("p_token");
    expect(inviteWorkspace).toContain("`/rfq/${invitation.rfq_slug}/submit`");
    expect(inviteWorkspace).not.toContain("/login?next=");
  });

  it("keeps Task 32A submit login continuation and workspace invite signup unchanged", () => {
    expect(submitPage).toContain(
      "redirect(`/login?next=${encodeURIComponent(submitPath)}`)",
    );
    expect(getSafeNextPath("/rfq/harbor-point/submit")).toBe(
      "/rfq/harbor-point/submit",
    );
    expect(inviteSignupPage).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(inviteSignupPage).not.toContain("getCompanyOnboardingPath");
    expect(inviteSignupPage).not.toContain(
      'searchParams.set("next", onboardingPath)',
    );
  });

  it("hands authenticated no-company submit into the existing create-company continuation", () => {
    expect(submitPage).toContain("getCompanyOnboardingPath");
    expect(submitPage).toContain(
      "redirect(getCompanyOnboardingPath(submitPath))",
    );
    expect(submitPage).toContain(".eq(\"id\", user.id)");
    expect(submitPage).toContain(".maybeSingle()");
    expect(submitPage).toContain("if (profileError)");
    expect(submitPage).toContain("if (!profile?.company_id)");
    expect(submitPage).toContain("<RfqSubmitWorkspace slug={slug} />");
    expect(getCompanyOnboardingPath("/rfq/harbor-point/submit")).toBe(
      "/create-company?next=%2Frfq%2Fharbor-point%2Fsubmit",
    );
    expect(signupPage).toContain("getCompanyOnboardingPath(nextPath)");
  });

  it("does not grant supplier capability in Task 32B", () => {
    expect(createRoute).toContain("p_profile_role: accountConfig.profileRole");
    expect(createRoute).not.toContain("p_procurement_function");
    expect(createRoute).not.toContain("procurement_function");
    expect(bootstrapHelper).not.toContain("procurement_function");
    expect(bootstrapMigration).toContain("procurement_function = 'none'");
  });
});
