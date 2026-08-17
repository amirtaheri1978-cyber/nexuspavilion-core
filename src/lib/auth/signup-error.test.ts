import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  FRIENDLY_SIGNUP_ALREADY_REGISTERED,
  FRIENDLY_SIGNUP_EMAIL,
  FRIENDLY_SIGNUP_GENERIC,
  FRIENDLY_SIGNUP_NETWORK,
  FRIENDLY_SIGNUP_PASSWORD,
  FRIENDLY_SIGNUP_RATE_LIMIT,
  getFriendlySignupError,
  isExistingAccountSignupError,
} from "@/lib/auth/signup-error";

const inviteSignupPage = readFileSync(
  resolve(process.cwd(), "src/app/invite/[token]/signup/page.tsx"),
  "utf8",
);

const signupPage = readFileSync(
  resolve(process.cwd(), "src/app/signup/page.tsx"),
  "utf8",
);

const RAW_PROVIDER_ERRORS = [
  "User already registered",
  "AuthApiError: Password should be at least 6 characters",
  "Unable to validate email address: invalid format",
  "For security purposes, you can only request this after 12 seconds.",
  "Request rate limit reached. Too many requests.",
  "TypeError: Failed to fetch",
  "Network request failed",
  'duplicate key value violates unique constraint "profiles_pkey"',
  "PGRST116: JSON object requested, multiple (or no) rows returned",
  "JWT expired",
  "invalid claim: missing sub",
];

describe("getFriendlySignupError", () => {
  it("maps already-registered provider errors to bounded copy", () => {
    expect(getFriendlySignupError("User already registered")).toBe(
      FRIENDLY_SIGNUP_ALREADY_REGISTERED,
    );
    expect(
      getFriendlySignupError("A user with this email already exists"),
    ).toBe(FRIENDLY_SIGNUP_ALREADY_REGISTERED);
  });

  it("maps password-related provider errors to bounded copy", () => {
    expect(
      getFriendlySignupError("Password should be at least 6 characters"),
    ).toBe(FRIENDLY_SIGNUP_PASSWORD);
  });

  it("maps invalid-email provider errors to bounded copy", () => {
    expect(
      getFriendlySignupError("Unable to validate email address: invalid format"),
    ).toBe(FRIENDLY_SIGNUP_EMAIL);
  });

  it("maps rate-limit provider errors to bounded copy", () => {
    expect(
      getFriendlySignupError("Request rate limit reached"),
    ).toBe(FRIENDLY_SIGNUP_RATE_LIMIT);
    expect(getFriendlySignupError("Too many requests")).toBe(
      FRIENDLY_SIGNUP_RATE_LIMIT,
    );
  });

  it("maps network/request failures to bounded copy", () => {
    expect(getFriendlySignupError("Failed to fetch")).toBe(
      FRIENDLY_SIGNUP_NETWORK,
    );
    expect(getFriendlySignupError("Network request failed")).toBe(
      FRIENDLY_SIGNUP_NETWORK,
    );
  });

  it("uses a generic fallback for unknown or empty provider errors", () => {
    expect(getFriendlySignupError("JWT expired")).toBe(
      FRIENDLY_SIGNUP_GENERIC,
    );
    expect(
      getFriendlySignupError(
        'duplicate key value violates unique constraint "profiles_pkey"',
      ),
    ).toBe(FRIENDLY_SIGNUP_GENERIC);
    expect(
      getFriendlySignupError(
        "PGRST116: JSON object requested, multiple (or no) rows returned",
      ),
    ).toBe(FRIENDLY_SIGNUP_GENERIC);
    expect(getFriendlySignupError("")).toBe(FRIENDLY_SIGNUP_GENERIC);
    expect(getFriendlySignupError(null)).toBe(FRIENDLY_SIGNUP_GENERIC);
    expect(getFriendlySignupError(undefined)).toBe(FRIENDLY_SIGNUP_GENERIC);
  });

  it("never returns raw provider, SQL, PostgREST, or token text", () => {
    for (const raw of RAW_PROVIDER_ERRORS) {
      const friendly = getFriendlySignupError(raw);

      expect(friendly).not.toBe(raw);
      expect(friendly).not.toContain("AuthApiError");
      expect(friendly).not.toContain("duplicate key");
      expect(friendly).not.toContain("PGRST");
      expect(friendly).not.toContain("JWT");
      expect(friendly).not.toContain("profiles_pkey");
    }
  });
});

describe("invite signup continues existing-account enrollment", () => {
  it("treats already-registered provider text as an existing account", () => {
    expect(isExistingAccountSignupError("User already registered")).toBe(
      true,
    );
    expect(
      isExistingAccountSignupError("A user with this email already exists"),
    ).toBe(true);
    expect(isExistingAccountSignupError("Password should be at least 6 characters")).toBe(
      false,
    );
  });
});

describe("signup pages reuse the shared mapper", () => {
  it("does not render raw signupError.message on invite signup", () => {
    expect(inviteSignupPage).toContain(
      'from "@/lib/auth/signup-error"',
    );
    expect(inviteSignupPage).toContain("getFriendlySignupError(");
    expect(inviteSignupPage).toContain("isExistingAccountSignupError(");
    expect(inviteSignupPage).not.toContain("setError(signupError.message)");
    expect(inviteSignupPage).not.toContain("signupError.message.toLowerCase()");
  });

  it("keeps invite signup wired to signUp, sign-in, accept, and token context", () => {
    expect(inviteSignupPage).toContain("supabase.auth.signUp({");
    expect(inviteSignupPage).toContain("signInWithPassword");
    expect(inviteSignupPage).toContain("/api/company-invitations/accept");
    expect(inviteSignupPage).toContain(
      'rpc("get_organization_invitation_context"',
    );
    expect(inviteSignupPage).not.toMatch(/\.from\(\s*["']invitations["']\s*\)/);
    expect(inviteSignupPage).toContain(
      "`/login?next=${encodeURIComponent(`/invite/${token}`)}`",
    );
  });

  it("uses the same helper on /signup instead of a second mapper", () => {
    expect(signupPage).toContain('from "@/lib/auth/signup-error"');
    expect(signupPage).toContain("getFriendlySignupError(");
    expect(signupPage).not.toContain("function getFriendlySignupError");
    expect(signupPage).toContain("supabase.auth.signUp({");
  });
});
