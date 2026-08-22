import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_POST_LOGIN_PATH,
  getSafeLoginStatusMessage,
  getSafeNextPath,
} from "@/lib/auth/login-continuation";

const loginPage = readFileSync(
  resolve(process.cwd(), "src/app/login/page.tsx"),
  "utf8",
);

const callbackRoute = readFileSync(
  resolve(process.cwd(), "src/app/auth/callback/route.ts"),
  "utf8",
);

const middleware = readFileSync(
  resolve(process.cwd(), "src/middleware.ts"),
  "utf8",
);

const SESSION_EXPIRED_MESSAGE =
  "Your secure workspace session has expired. Please sign in again to continue.";
const MISSING_AUTH_CODE_MESSAGE =
  "This secure authentication link is incomplete. Please request a new link or sign in again.";
const EXPIRED_OR_INVALID_LINK_MESSAGE =
  "This secure authentication link has expired or is no longer valid. Please request a new link.";
const GENERIC_AUTH_CALLBACK_MESSAGE =
  "We could not complete your secure sign-in. Please try again.";

describe("login continuation next path", () => {
  it("honors a valid internal next path", () => {
    expect(getSafeNextPath("/dashboard")).toBe("/dashboard");
    expect(getSafeNextPath("/invite/token")).toBe("/invite/token");
    expect(getSafeNextPath("/invite/abc-token")).toBe(
      "/invite/abc-token",
    );
    expect(getSafeNextPath("/company/settings")).toBe(
      "/company/settings",
    );
    expect(getSafeNextPath("/create-company")).toBe("/create-company");
    expect(getSafeNextPath("/rfq")).toBe("/rfq");
  });

  it("honors a valid internal path with a query string", () => {
    expect(getSafeNextPath("/company/settings?tab=members")).toBe(
      "/company/settings?tab=members",
    );
  });

  it("falls back to /dashboard when next is missing", () => {
    expect(getSafeNextPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(DEFAULT_POST_LOGIN_PATH).toBe("/dashboard");
  });

  it("rejects an external absolute URL", () => {
    expect(getSafeNextPath("https://evil.example/phish")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(getSafeNextPath("http://evil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it("rejects a protocol-relative // path", () => {
    expect(getSafeNextPath("//evil.example/login")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(getSafeNextPath("//evil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it("rejects backslash-based open-redirect paths", () => {
    expect(getSafeNextPath("/\\evil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(getSafeNextPath("/\\\\evil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it("rejects encoded next values that decode to backslashes", () => {
    const singleDecoded = new URLSearchParams(
      "next=/%5Cevil.example",
    ).get("next");
    const doubleDecoded = new URLSearchParams(
      "next=/%5C%5Cevil.example",
    ).get("next");

    expect(singleDecoded).toBe("/\\evil.example");
    expect(doubleDecoded).toBe("/\\\\evil.example");
    expect(getSafeNextPath(singleDecoded)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath(doubleDecoded)).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("uses the same helper in login and the auth callback", () => {
    expect(loginPage).toContain(
      'from "@/lib/auth/login-continuation"',
    );
    expect(callbackRoute).toContain(
      'from "@/lib/auth/login-continuation"',
    );
    expect(callbackRoute).toContain("getSafeNextPath(");
    expect(callbackRoute).not.toContain("function getSafeNextPath");
    expect(callbackRoute).toContain("exchangeCodeForSession(code)");
  });
});

describe("login bounded auth status/message query contract", () => {
  it("renders existing bounded middleware and callback messages", () => {
    expect(middleware).toContain(SESSION_EXPIRED_MESSAGE);
    expect(callbackRoute).toContain(MISSING_AUTH_CODE_MESSAGE);
    expect(callbackRoute).toContain(EXPIRED_OR_INVALID_LINK_MESSAGE);
    expect(callbackRoute).toContain(GENERIC_AUTH_CALLBACK_MESSAGE);

    for (const message of [
      SESSION_EXPIRED_MESSAGE,
      MISSING_AUTH_CODE_MESSAGE,
      EXPIRED_OR_INVALID_LINK_MESSAGE,
      GENERIC_AUTH_CALLBACK_MESSAGE,
    ]) {
      expect(
        getSafeLoginStatusMessage("attention", message),
      ).toBe(message);
    }
  });

  it("does not turn arbitrary raw query text into provider or database output", () => {
    const unsafeMessages = [
      "invalid login credentials",
      "JWT expired",
      'duplicate key value violates unique constraint "profiles_pkey"',
      "<script>alert(1)</script>",
      "https://evil.example/reset",
    ];

    for (const message of unsafeMessages) {
      expect(
        getSafeLoginStatusMessage("attention", message),
      ).toBeNull();
    }

    expect(
      getSafeLoginStatusMessage(null, SESSION_EXPIRED_MESSAGE),
    ).toBeNull();
    expect(
      getSafeLoginStatusMessage("error", SESSION_EXPIRED_MESSAGE),
    ).toBeNull();
    expect(getSafeLoginStatusMessage("attention", null)).toBeNull();
  });
});

describe("login page continuation wiring", () => {
  it("validates next and status query params before redirect or render", () => {
    expect(loginPage).toContain(
      'from "@/lib/auth/login-continuation"',
    );
    expect(loginPage).toContain("getSafeNextPath(searchParams.get(\"next\"))");
    expect(loginPage).toContain("searchParams.get(\"authStatus\")");
    expect(loginPage).toContain("searchParams.get(\"message\")");
    expect(loginPage).toContain("getSafeLoginStatusMessage(");
    expect(loginPage).toContain("router.push(nextPath)");
    expect(loginPage).toContain("syncUserProfile");
    expect(loginPage).toContain("signInWithPassword");
    expect(loginPage).toContain("getFriendlyAuthError");
    expect(loginPage).not.toContain('router.push("/dashboard")');
  });
});
