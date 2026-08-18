import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getSafeNextPath } from "@/lib/auth/login-continuation";

const signupPage = readFileSync(
  resolve(process.cwd(), "src/app/signup/page.tsx"),
  "utf8",
);
const inviteSignupPage = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/signup/page.tsx"),
  "utf8",
);
const callbackRoute = readFileSync(
  resolve(process.cwd(), "src/app/auth/callback/route.ts"),
  "utf8",
);
const activeMiddleware = readFileSync(
  resolve(process.cwd(), "middleware.ts"),
  "utf8",
);
const inactiveSrcMiddleware = readFileSync(
  resolve(process.cwd(), "src/middleware.ts"),
  "utf8",
);
const createCompanyPage = readFileSync(
  resolve(process.cwd(), "src/app/create-company/page.tsx"),
  "utf8",
);
const forgotPasswordPage = readFileSync(
  resolve(process.cwd(), "src/app/forgot-password/page.tsx"),
  "utf8",
);

describe("signup confirmation session continuation", () => {
  it("uses the active root middleware.ts for create-company continuation", () => {
    expect(activeMiddleware).toContain('COMPANY_SETUP_ROUTE = "/create-company"');
    expect(activeMiddleware).toContain('"/create-company"');
    expect(activeMiddleware).toContain('"/create-company/:path*"');
    expect(inactiveSrcMiddleware).not.toContain("redirectToLoginWithNext");
  });

  it("sends confirmation through the auth callback with next=/create-company", () => {
    expect(signupPage).toContain("new URL(");
    expect(signupPage).toContain('"/auth/callback"');
    expect(signupPage).toContain(
      'confirmationRedirect.searchParams.set("next", "/create-company")',
    );
    expect(signupPage).toContain(
      "emailRedirectTo: confirmationRedirect.toString()",
    );
    expect(signupPage).not.toContain(
      "emailRedirectTo: `${window.location.origin}/create-company`",
    );
  });

  it("leaves session exchange on the existing auth callback", () => {
    expect(callbackRoute).toContain("exchangeCodeForSession(code)");
    expect(callbackRoute).toContain("getSafeNextPath(");
    expect(signupPage).not.toContain("exchangeCodeForSession");
    expect(createCompanyPage).not.toContain("exchangeCodeForSession");
    expect(activeMiddleware).not.toContain("exchangeCodeForSession");
  });

  it("resolves a successful callback continuation to create-company", () => {
    expect(getSafeNextPath("/create-company")).toBe("/create-company");
    expect(callbackRoute).toContain(
      'getSafeNextPath(requestUrl.searchParams.get("next"))',
    );
    expect(callbackRoute).toContain(
      "NextResponse.redirect(new URL(next, SITE_URL))",
    );
  });

  it("sends unauthenticated create-company visitors to login continuation", () => {
    expect(activeMiddleware).toContain(
      "isCompanySetupRoute(pathname) && !hasSupabaseSessionCookie(request)",
    );
    expect(activeMiddleware).toContain(
      'loginUrl.searchParams.set("next", COMPANY_SETUP_ROUTE)',
    );
    expect(getSafeNextPath("/create-company")).toBe("/create-company");
  });

  it("keeps authenticated create-company access allowed", () => {
    const protectedBlock = activeMiddleware.slice(
      activeMiddleware.indexOf("const protectedRoutes"),
      activeMiddleware.indexOf("];", activeMiddleware.indexOf("const protectedRoutes")) +
        2,
    );

    expect(protectedBlock).not.toContain("/create-company");
    expect(activeMiddleware).toContain("return NextResponse.next();");
  });

  it("does not change invitation continuation", () => {
    expect(inviteSignupPage).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(inviteSignupPage).not.toContain(
      "/auth/callback?next=/create-company",
    );
    expect(inviteSignupPage).not.toContain(
      'searchParams.set("next", "/create-company")',
    );
  });

  it("does not label missing create-company auth as an expired session", () => {
    expect(createCompanyPage).toContain(
      "Please sign in to continue creating your workspace.",
    );
    expect(createCompanyPage).not.toContain(
      "Your secure session has expired. Please sign in again to create your workspace.",
    );
    expect(createCompanyPage).not.toContain("signupError.message");
    expect(createCompanyPage).not.toContain("userError.message");
  });

  it("does not alter password-recovery callback wiring", () => {
    expect(forgotPasswordPage).toContain(
      "${siteUrl}/auth/callback?next=/set-password",
    );
  });
});
