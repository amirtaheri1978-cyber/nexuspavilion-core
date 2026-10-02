import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const coachmark = readSource(
  "src/components/executive/executive-coachmark.tsx",
);
const contract = readSource("src/lib/design-system/executive-contract.ts");

describe("executive coachmark", () => {
  it("exports ExecutiveCoachmark and keeps the caller-provided anchor", () => {
    expect(coachmark).toContain("export function ExecutiveCoachmark");
    expect(coachmark).toContain("{children}");
    expect(coachmark).toContain("children: ReactNode");
    expect(coachmark).toContain("open: boolean");

    const childrenIndex = coachmark.indexOf("{children}");
    const openContent = coachmark.indexOf("{open ? (");
    expect(childrenIndex).toBeGreaterThan(-1);
    expect(openContent).toBeGreaterThan(childrenIndex);
  });

  it("hides coachmark content when closed and shows it when open", () => {
    expect(coachmark).toContain("{open ? (");
    expect(coachmark).toContain(") : null}");
    expect(coachmark).toContain("id={contentId}");
    expect(coachmark).toContain("useId()");
    expect(coachmark).toContain("aria-labelledby={titleId}");
  });

  it("reuses shared popover surface, placement, and motion contracts", () => {
    expect(coachmark).toContain("EXECUTIVE_POPOVER_SURFACE");
    expect(coachmark).toContain("EXECUTIVE_POPOVER_PLACEMENT");
    expect(coachmark).toContain("EXECUTIVE_POPOVER_MOTION");
    expect(coachmark).toContain("EXECUTIVE_BUTTON_SECONDARY");
    expect(coachmark).toContain("EXECUTIVE_BUTTON_TERTIARY");
    expect(coachmark).toContain(
      'from "@/lib/design-system/executive-contract"',
    );
    expect(contract).toContain("export const EXECUTIVE_POPOVER_SURFACE");
    expect(contract).toContain("export const EXECUTIVE_POPOVER_PLACEMENT");
    expect(contract).toContain(
      "export const EXECUTIVE_POPOVER_MOTION = EXECUTIVE_TOOLTIP_MOTION",
    );
    expect(contract).toContain(
      '"transition-opacity duration-[var(--motion-duration-fast)]"',
    );
  });

  it("keeps action and dismiss optional, caller-owned, and type=button", () => {
    expect(coachmark).toContain("hasLabeledAction(actionLabel, onAction)");
    expect(coachmark).toContain("hasLabeledAction(dismissLabel, onDismiss)");
    expect(coachmark).toContain("onClick={onAction}");
    expect(coachmark).toContain("onClick={onDismiss}");
    expect(coachmark.match(/type="button"/g)).toHaveLength(2);
  });

  it("stays non-blocking without overlay, focus trap, or invented controls", () => {
    expect(coachmark).toContain("relative");
    expect(coachmark).toContain("min-w-0");
    expect(coachmark).toContain("max-w-full");
    expect(coachmark).toContain("break-words");
    expect(coachmark).toContain("text-pretty");
    expect(coachmark).not.toContain("fixed inset");
    expect(coachmark).not.toContain("createPortal");
    expect(coachmark).not.toContain("aria-modal");
    expect(coachmark).not.toContain('role="dialog"');
    expect(coachmark).not.toContain("focus-trap");
    expect(coachmark).not.toContain("FocusTrap");
    expect(coachmark).not.toContain("inert");
    expect(coachmark).not.toContain("cloneElement");
  });

  it("does not own open state, eligibility, memory, routing, or timers", () => {
    expect(coachmark).not.toContain("useState");
    expect(coachmark).not.toContain("useEffect");
    expect(coachmark).not.toContain("useRouter");
    expect(coachmark).not.toContain("fetch(");
    expect(coachmark).not.toContain("setTimeout");
    expect(coachmark).not.toContain("setInterval");
    expect(coachmark).not.toContain("localStorage");
    expect(coachmark).not.toContain("sessionStorage");
    expect(coachmark).not.toContain("eligibility");
    expect(coachmark).not.toContain("frequency");
    expect(coachmark).not.toContain("snooze");
    expect(coachmark).not.toContain("executive-guidance-memory");
    expect(coachmark).not.toContain("matchMedia");
    expect(coachmark).not.toContain("href=");
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
      "help ui",
    ];

    for (const term of forbidden) {
      expect(coachmark.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
