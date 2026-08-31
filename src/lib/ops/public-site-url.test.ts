import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getPublicSiteUrl,
  joinPublicSitePath,
  resolveRequestSiteUrl,
} from "@/lib/ops/public-site-url";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe("public site URL", () => {
  it("returns a trimmed http(s) origin and rejects empty values", () => {
    expect(getPublicSiteUrl(" https://pavilion.example/ ")).toBe(
      "https://pavilion.example",
    );
    expect(getPublicSiteUrl("")).toBeNull();
    expect(getPublicSiteUrl("   ")).toBeNull();
    expect(getPublicSiteUrl("ftp://pavilion.example")).toBeNull();
    expect(getPublicSiteUrl("not-a-url")).toBeNull();
  });

  it("never accepts leftover Codespace github.dev hosts", () => {
    expect(
      getPublicSiteUrl(
        "https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev",
      ),
    ).toBeNull();
  });

  it("uses the request origin when the public site URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(
      resolveRequestSiteUrl("https://launch.nexuspavilion.com/auth/callback"),
    ).toBe("https://launch.nexuspavilion.com");
  });

  it("joins launch-critical paths only when a public origin is configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://launch.nexuspavilion.com";
    expect(joinPublicSitePath("/rfq/harbor-package")).toBe(
      "https://launch.nexuspavilion.com/rfq/harbor-package",
    );

    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(joinPublicSitePath("/rfq/harbor-package")).toBeNull();
  });
});

describe("public site URL production consumers", () => {
  it("company and settings pages use getPublicSiteUrl instead of a direct env read", () => {
    const settings = readSource("src/app/company/settings/page.tsx");
    const company = readSource("src/app/company/page.tsx");

    expect(settings).toContain("getPublicSiteUrl()");
    expect(settings).toContain('getPublicSiteUrl() ?? ""');
    expect(settings).not.toContain("process.env.NEXT_PUBLIC_SITE_URL");

    expect(company).toContain("getPublicSiteUrl()");
    expect(company).toContain('getPublicSiteUrl() ?? ""');
    expect(company).not.toContain("process.env.NEXT_PUBLIC_SITE_URL");
  });

  it("forgot-password uses getPublicSiteUrl first and keeps window.location.origin as fallback", () => {
    const forgotPassword = readSource("src/app/forgot-password/page.tsx");

    expect(forgotPassword).toContain("getPublicSiteUrl()");
    expect(forgotPassword).toContain("window.location.origin");
    expect(forgotPassword).not.toContain("process.env.NEXT_PUBLIC_SITE_URL");
  });
});
