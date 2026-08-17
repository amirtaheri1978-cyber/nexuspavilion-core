import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FRIENDLY_INVITE_ACCEPT_FAILED,
  FRIENDLY_INVITE_SIGNIN_EMAIL_UNCONFIRMED,
  FRIENDLY_INVITE_SIGNIN_GENERIC,
  FRIENDLY_INVITE_SIGNIN_INVALID_CREDENTIALS,
  FRIENDLY_INVITE_SIGNIN_NETWORK,
  FRIENDLY_INVITE_SIGNIN_RATE_LIMIT,
  getFriendlyInviteSignInError,
  getInvitationRecoveryPath,
  isSuccessfulInvitationAcceptDestination,
} from "@/lib/auth/invite-enrollment";

const inviteSignupPage = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/signup/page.tsx"),
  "utf8",
);

const accessState = readFileSync(
  resolve(
    process.cwd(),
    "src/components/executive/invitation/executive-access-state.tsx",
  ),
  "utf8",
);

const switchIdentityButton = readFileSync(
  resolve(
    process.cwd(),
    "src/components/executive/invitation/switch-authorized-identity-button.tsx",
  ),
  "utf8",
);

const landing = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/page.tsx"),
  "utf8",
);

const RAW_SIGNIN_ERRORS = [
  "Invalid login credentials",
  "Email not confirmed",
  "AuthApiError: Too many requests",
  "TypeError: Failed to fetch",
  "JWT expired",
  'duplicate key value violates unique constraint "profiles_pkey"',
  "PGRST116: JSON object requested, multiple (or no) rows returned",
];

describe("wrong-identity invitation switch", () => {
  it("signs out the current session before navigating to login", () => {
    expect(accessState).toContain("SwitchAuthorizedIdentityButton");
    expect(accessState).toContain("loginHref={loginHref}");
    expect(accessState).not.toContain("Sign In With Authorized Identity");

    expect(switchIdentityButton).toContain("supabase.auth.signOut({");
    expect(switchIdentityButton).toContain('scope: "local"');
    expect(switchIdentityButton).not.toContain("supabase.auth.signOut()");
    expect(switchIdentityButton).toContain("window.location.assign(loginHref)");
    expect(switchIdentityButton).not.toContain("window.location.assign(\"/dashboard\")");
  });

  it("preserves next=/invite/<token> after sign-out", () => {
    expect(landing).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
    expect(switchIdentityButton).toContain("window.location.assign(loginHref)");
    expect(switchIdentityButton).not.toContain('href="/login"');
    expect(switchIdentityButton).not.toContain('href="/dashboard"');
  });
});

describe("existing-account invite signup sign-in errors", () => {
  it("maps known sign-in failures to bounded copy", () => {
    expect(getFriendlyInviteSignInError("Invalid login credentials")).toBe(
      FRIENDLY_INVITE_SIGNIN_INVALID_CREDENTIALS,
    );
    expect(getFriendlyInviteSignInError("Email not confirmed")).toBe(
      FRIENDLY_INVITE_SIGNIN_EMAIL_UNCONFIRMED,
    );
    expect(getFriendlyInviteSignInError("Too many requests")).toBe(
      FRIENDLY_INVITE_SIGNIN_RATE_LIMIT,
    );
    expect(getFriendlyInviteSignInError("Failed to fetch")).toBe(
      FRIENDLY_INVITE_SIGNIN_NETWORK,
    );
    expect(getFriendlyInviteSignInError("JWT expired")).toBe(
      FRIENDLY_INVITE_SIGNIN_GENERIC,
    );
    expect(getFriendlyInviteSignInError("")).toBe(FRIENDLY_INVITE_SIGNIN_GENERIC);
  });

  it("never returns raw provider, SQL, or PostgREST text", () => {
    for (const raw of RAW_SIGNIN_ERRORS) {
      const friendly = getFriendlyInviteSignInError(raw);

      expect(friendly).not.toBe(raw);
      expect(friendly).not.toContain("AuthApiError");
      expect(friendly).not.toContain("duplicate key");
      expect(friendly).not.toContain("PGRST");
      expect(friendly).not.toContain("JWT");
    }
  });

  it("shows a bounded sign-in error when an existing account cannot authenticate", () => {
    expect(inviteSignupPage).toContain("isExistingAccountSignupError");
    expect(inviteSignupPage).toContain("getFriendlyInviteSignInError(");
    expect(inviteSignupPage).toContain(
      "setError(getFriendlyInviteSignInError(signInError.message))",
    );
    expect(inviteSignupPage).not.toContain("setError(signInError.message)");
    expect(inviteSignupPage).not.toContain("setMessage(signInError.message)");
  });
});

describe("invite signup acceptance destination", () => {
  it("treats a clean dashboard redirect as success", () => {
    expect(
      isSuccessfulInvitationAcceptDestination(
        "http://localhost:3000/dashboard",
      ),
    ).toBe(true);
    expect(isSuccessfulInvitationAcceptDestination("/dashboard")).toBe(true);
  });

  it("does not treat failed accept redirects as success", () => {
    expect(
      isSuccessfulInvitationAcceptDestination(
        "http://localhost:3000/dashboard?error=invalid-invitation",
      ),
    ).toBe(false);
    expect(
      isSuccessfulInvitationAcceptDestination(
        "http://localhost:3000/invite/abc-token?error=recipient-mismatch",
      ),
    ).toBe(false);
    expect(
      isSuccessfulInvitationAcceptDestination(
        "http://localhost:3000/login?next=%2Finvite%2Fabc-token",
      ),
    ).toBe(false);
    expect(isSuccessfulInvitationAcceptDestination("")).toBe(false);
    expect(isSuccessfulInvitationAcceptDestination(null)).toBe(false);
  });

  it("keeps the invitation token recoverable after a failed accept", () => {
    expect(getInvitationRecoveryPath("abc-token")).toBe("/invite/abc-token");
    expect(inviteSignupPage).toContain("getInvitationRecoveryPath(token)");
    expect(inviteSignupPage).toContain("setError(FRIENDLY_INVITE_ACCEPT_FAILED)");
    expect(FRIENDLY_INVITE_ACCEPT_FAILED).toContain("invitation");
  });

  it("redirects to dashboard only after a confirmed successful accept", () => {
    expect(inviteSignupPage).toContain("/api/company-invitations/accept");
    expect(inviteSignupPage).toContain(
      "isSuccessfulInvitationAcceptDestination(response.url)",
    );
    expect(inviteSignupPage).toContain('window.location.assign("/dashboard")');
    expect(inviteSignupPage).toContain(
      "window.location.assign(getInvitationRecoveryPath(token))",
    );
  });
});
