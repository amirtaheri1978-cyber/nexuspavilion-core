import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const middleware = readFileSync(
  resolve(process.cwd(), "middleware.ts"),
  "utf8",
);

describe("product host isolation", () => {
  it("routes the Intelligent Procurement product host root to sign in", () => {
    expect(middleware).toContain(
      'const PRODUCT_HOST = "procurement.nexuspavilion.com";',
    );
    expect(middleware).toContain(
      'if (hostname === PRODUCT_HOST && pathname === "/")',
    );
    expect(middleware).toContain('new URL("/login", request.url)');
  });

  it("preserves root query parameters when routing the product host", () => {
    expect(middleware).toContain(
      "request.nextUrl.searchParams.forEach((value, key) => {",
    );
    expect(middleware).toContain(
      "loginUrl.searchParams.append(key, value);",
    );
  });

  it("does not redirect the corporate apex root", () => {
    expect(middleware).not.toContain(
      'hostname === "nexuspavilion.com" && pathname === "/"',
    );
    expect(middleware).not.toContain(
      'hostname === "www.nexuspavilion.com" && pathname === "/"',
    );
  });

  it("includes the root path in middleware matching", () => {
    expect(middleware).toMatch(/matcher:\s*\[\s*"\/"[,\n]/);
  });
});
