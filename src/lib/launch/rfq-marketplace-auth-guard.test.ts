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

const marketplace = readSource("src/app/rfq/page.tsx");
const middleware = readSource("middleware.ts");
const invitePage = readSource("src/app/rfq/invite/[token]/page.tsx");

describe("anonymous RFQ marketplace auth continuation", () => {
  it("guards /rfq with getUser before procurement context reads", () => {
    const userIndex = marketplace.indexOf("supabase.auth.getUser()");
    const contextIndex = marketplace.indexOf("getProcurementContext()");
    const redirectIndex = marketplace.indexOf(
      'redirect(`/login?next=${encodeURIComponent(getSafeNextPath("/rfq"))}`)',
    );

    expect(userIndex).toBeGreaterThan(-1);
    expect(contextIndex).toBeGreaterThan(userIndex);
    expect(redirectIndex).toBeGreaterThan(userIndex);
    expect(redirectIndex).toBeLessThan(contextIndex);
    expect(marketplace).toContain('from "@/lib/auth/login-continuation"');
    expect(marketplace).toContain('from "@/lib/supabase/server"');
    expect(marketplace).toContain("if (!user)");
  });

  it("preserves /rfq through the existing safe login continuation helper", () => {
    expect(getSafeNextPath("/rfq")).toBe("/rfq");
    expect(getSafeNextPath("/rfq?view=open")).toBe("/rfq?view=open");
    expect(getSafeNextPath("https://evil.example/rfq")).toBe("/dashboard");
  });

  it("does not middleware-lock the whole /rfq tree, so invite-token access stays intact", () => {
    expect(middleware).not.toContain('"/rfq"');
    expect(middleware).not.toContain('"/rfq/:path*"');
    expect(invitePage).not.toContain("getProcurementContext(");
    expect(marketplace).toContain("getProcurementContext()");
  });
});
