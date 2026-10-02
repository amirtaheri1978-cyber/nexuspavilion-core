import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const guide = readSource("src/components/executive/executive-nexus-guide.tsx");
const contract = readSource("src/lib/design-system/executive-contract.ts");

describe("executive nexus guide", () => {
  it("exports ExecutiveNexusGuide and renders nothing when closed", () => {
    expect(guide).toContain("export function ExecutiveNexusGuide");
    expect(guide).toContain("if (!open) return null;");
  });

  it("reuses shared drawer contracts when open", () => {
    expect(guide).toContain("EXECUTIVE_DRAWER_OVERLAY");
    expect(guide).toContain("EXECUTIVE_DRAWER_SURFACE");
    expect(guide).toContain("EXECUTIVE_DRAWER_HEADER");
    expect(guide).toContain("EXECUTIVE_DRAWER_TITLE");
    expect(guide).toContain("EXECUTIVE_DRAWER_BODY");
    expect(guide).toContain("EXECUTIVE_DRAWER_FOOTER");
    expect(guide).toContain("EXECUTIVE_DRAWER_CLOSE");
    expect(guide).toContain("EXECUTIVE_DRAWER_INTELLIGENCE");
    expect(guide).toContain(
      'from "@/lib/design-system/executive-contract"',
    );
    expect(contract).toContain("export const EXECUTIVE_DRAWER_OVERLAY");
    expect(contract).toContain("export const EXECUTIVE_DRAWER_SURFACE");
    expect(contract).toContain(
      "max-w-[var(--layout-sidebar-width)]",
    );
  });

  it("renders caller-supplied sections and omits empty ones", () => {
    expect(guide).toContain("showWorkflow");
    expect(guide).toContain("showReadiness");
    expect(guide).toContain("showAttention");
    expect(guide).toContain("showNextStep");
    expect(guide).toContain("hasText(workflow)");
    expect(guide).toContain("hasText(readiness)");
    expect(guide).toContain("hasText(suggestedNextStep)");
    expect(guide).toContain("{workflow}");
    expect(guide).toContain("{readiness}");
    expect(guide).toContain("{suggestedNextStep}");
    expect(guide).toContain("attention.map");
    expect(guide).toContain("hasAction(primaryAction)");
    expect(guide).toContain("hasAction(secondaryAction)");
    expect(guide).toContain("showFooter");
  });

  it("keeps close caller-owned with an accessible type=button control", () => {
    expect(guide).toContain('type="button"');
    expect(guide).toContain("onClick={onClose}");
    expect(guide).toContain('aria-label="Close"');
    expect(guide).toContain("aria-labelledby={titleId}");
    expect(guide).toContain("Nexus Guide");
  });

  it("stays free of focus trapping, AI, routing, and owned state", () => {
    expect(guide).toContain("min-w-0");
    expect(guide).toContain("max-w-full");
    expect(guide).toContain("break-words");
    expect(guide).toContain("text-pretty");
    expect(guide).toContain("flex-wrap");
    expect(guide).not.toContain("useState");
    expect(guide).not.toContain("useEffect");
    expect(guide).not.toContain("useRef");
    expect(guide).not.toContain(".focus(");
    expect(guide).not.toContain("FocusTrap");
    expect(guide).not.toContain("focus-trap");
    expect(guide).not.toContain("createPortal");
    expect(guide).not.toContain("fetch(");
    expect(guide).not.toContain("useRouter");
    expect(guide).not.toContain("setTimeout");
    expect(guide).not.toContain("setInterval");
    expect(guide).not.toContain("localStorage");
    expect(guide).not.toContain("sessionStorage");
    expect(guide).not.toContain("eligibility");
    expect(guide).not.toContain("frequency");
    expect(guide).not.toContain("snooze");
    expect(guide).not.toContain("openai");
    expect(guide).not.toContain("generate");
    expect(guide).not.toContain("href=");
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
      "chat",
      "prompt",
    ];

    for (const term of forbidden) {
      expect(guide.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
