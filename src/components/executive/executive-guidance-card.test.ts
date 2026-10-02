import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const card = readSource("src/components/executive/executive-guidance-card.tsx");
const contract = readSource("src/lib/design-system/executive-contract.ts");

describe("executive guidance card", () => {
  it("exports ExecutiveGuidanceCard and reuses ExecutivePanel", () => {
    expect(card).toContain("export function ExecutiveGuidanceCard");
    expect(card).toContain("ExecutivePanel");
    expect(card).toContain(
      'from "@/components/executive/executive-panel"',
    );
  });

  it("reuses shared executive button contracts for Review and Dismiss", () => {
    expect(card).toContain("EXECUTIVE_BUTTON_SECONDARY");
    expect(card).toContain("EXECUTIVE_BUTTON_TERTIARY");
    expect(card).toContain(
      'from "@/lib/design-system/executive-contract"',
    );
    expect(contract).toContain("export const EXECUTIVE_BUTTON_SECONDARY");
    expect(contract).toContain("export const EXECUTIVE_BUTTON_TERTIARY");
  });

  it("renders Review and Dismiss only when label and handler are both provided", () => {
    expect(card).toContain("hasLabeledAction(reviewLabel, onReview)");
    expect(card).toContain("hasLabeledAction(dismissLabel, onDismiss)");
    expect(card).toContain("showReview ?");
    expect(card).toContain("showDismiss ?");
    expect(card).toContain("onClick={onReview}");
    expect(card).toContain("onClick={onDismiss}");
    expect(card).toContain('{reviewLabel}');
    expect(card).toContain("{dismissLabel}");
    expect(card.match(/type="button"/g)).toHaveLength(2);
  });

  it("stays embedded, non-modal, and free of live regions", () => {
    expect(card).toContain("np-type-eyebrow");
    expect(card).toContain("np-type-h3");
    expect(card).toContain("np-type-body");
    expect(card).toContain("min-w-0");
    expect(card).toContain("max-w-full");
    expect(card).toContain("break-words");
    expect(card).toContain("text-pretty");
    expect(card).toContain("flex-wrap");
    expect(card).not.toContain("aria-live");
    expect(card).not.toContain("dialog");
    expect(card).not.toContain("modal");
    expect(card).not.toContain("popover");
    expect(card).not.toContain("role=");
  });

  it("does not own state, routing, persistence, or guidance contracts", () => {
    expect(card).not.toContain("useState");
    expect(card).not.toContain("useEffect");
    expect(card).not.toContain("useRouter");
    expect(card).not.toContain("fetch(");
    expect(card).not.toContain("setTimeout");
    expect(card).not.toContain("setInterval");
    expect(card).not.toContain("localStorage");
    expect(card).not.toContain("sessionStorage");
    expect(card).not.toContain("eligibility");
    expect(card).not.toContain("frequency");
    expect(card).not.toContain("snooze");
    expect(card).not.toContain("executive-guidance-memory");
    expect(card).not.toContain("href=");
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
    ];

    for (const term of forbidden) {
      expect(card.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
