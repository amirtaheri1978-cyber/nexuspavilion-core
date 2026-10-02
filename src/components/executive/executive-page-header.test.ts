import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const header = readSource(
  "src/components/executive/executive-page-header.tsx",
);

describe("executive page header", () => {
  it("renders a caller-driven title, context, status, metadata, and actions", () => {
    const eyebrow = header.indexOf("hasText(eyebrow)");
    const status = header.indexOf("<ExecutiveBadge");
    const title = header.indexOf("<h1");
    const description = header.indexOf("hasText(description)");
    const metadata = header.indexOf("<dl");
    const actions = header.indexOf("hasAction(actions)");

    expect(eyebrow).toBeGreaterThan(-1);
    expect(eyebrow).toBeLessThan(status);
    expect(status).toBeLessThan(title);
    expect(title).toBeLessThan(description);
    expect(description).toBeLessThan(metadata);
    expect(metadata).toBeLessThan(actions);
    expect(header).toContain("<header");
    expect(header).toContain("aria-labelledby={titleId}");
    expect(header).toContain("np-type-eyebrow");
    expect(header).toContain("np-type-h1");
    expect(header).toContain("np-type-body");
    expect(header).toContain("np-type-meta");
    expect(header).toContain("<ExecutiveBadge");
    expect(header).toContain("flex-col");
    expect(header).toContain("lg:flex-row");
    expect(header).toContain("flex-wrap");
    expect(header).toContain("min-w-0");
    expect(header).toContain("text-pretty");
    expect(header).not.toContain("overflow-hidden");
  });

  it("does not calculate status, deadlines, permissions, or navigation", () => {
    expect(header).not.toContain("overdue");
    expect(header).not.toContain("Date");
    expect(header).not.toContain("permission");
    expect(header).not.toContain("useRouter");
    expect(header).not.toContain("href=");
    expect(header).not.toContain("<button");
    expect(header).not.toContain("onClick");
    expect(header).not.toContain("rfq");
  });
});
