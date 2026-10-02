import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const hint = readSource("src/components/executive/executive-inline-hint.tsx");
const contract = readSource("src/lib/design-system/executive-contract.ts");

describe("executive inline hint", () => {
  it("exports ExecutiveInlineHint and reuses EXECUTIVE_FORM_HELPER", () => {
    expect(hint).toContain("export function ExecutiveInlineHint");
    expect(hint).toContain("EXECUTIVE_FORM_HELPER");
    expect(hint).toContain(
      'from "@/lib/design-system/executive-contract"',
    );
    expect(contract).toContain(
      'export const EXECUTIVE_FORM_HELPER =\n  "text-xs font-semibold text-nexus-text-secondary"',
    );
  });

  it("forwards caller id and children for always-visible contextual text", () => {
    expect(hint).toContain("id?: string");
    expect(hint).toContain("id={id}");
    expect(hint).toContain("{children}");
    expect(hint).toContain("<p");
    expect(hint).toContain("min-w-0");
    expect(hint).toContain("max-w-full");
    expect(hint).toContain("break-words");
    expect(hint).toContain("text-pretty");
    expect(hint).not.toContain("w-[");
    expect(hint).not.toContain("truncate");
    expect(hint).not.toContain("overflow-hidden");
    expect(hint).not.toContain("overflow-clip");
  });

  it("stays non-interactive and free of live regions", () => {
    expect(hint).not.toContain("<button");
    expect(hint).not.toContain("<a ");
    expect(hint).not.toContain("href=");
    expect(hint).not.toContain("onClick");
    expect(hint).not.toContain("dialog");
    expect(hint).not.toContain("popover");
    expect(hint).not.toContain("tooltip");
    expect(hint).not.toContain("aria-live");
    expect(hint).not.toContain("role=");
    expect(hint).not.toContain("tabIndex");
  });

  it("does not own state, routing, requests, timers, or guidance memory", () => {
    expect(hint).not.toContain("useState");
    expect(hint).not.toContain("useEffect");
    expect(hint).not.toContain("useRef");
    expect(hint).not.toContain("useRouter");
    expect(hint).not.toContain("fetch(");
    expect(hint).not.toContain("setTimeout");
    expect(hint).not.toContain("setInterval");
    expect(hint).not.toContain("localStorage");
    expect(hint).not.toContain("sessionStorage");
    expect(hint).not.toContain("eligibility");
    expect(hint).not.toContain("frequency");
    expect(hint).not.toContain("snooze");
    expect(hint).not.toContain("dismiss");
  });

  it("stays domain-neutral without product-page ownership", () => {
    const forbidden = [
      "rfq",
      "procurement",
      "quote",
      "award",
      "supplier",
      "vendor",
      "src/app/",
      "ask nexus",
      "coachmark",
      "guidance card",
    ];

    for (const term of forbidden) {
      expect(hint.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
