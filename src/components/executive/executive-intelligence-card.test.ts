import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const card = readSource(
  "src/components/executive/executive-intelligence-card.tsx",
);

describe("executive intelligence card", () => {
  it("keeps signal, evidence, impact, recommendation, and action in order", () => {
    const signal = card.indexOf(">Signal<");
    const evidence = card.indexOf('label="Evidence"');
    const impact = card.indexOf('label="Impact"');
    const recommendation = card.indexOf('label="Recommendation"');
    const action = card.lastIndexOf("Action");

    expect(signal).toBeGreaterThan(-1);
    expect(signal).toBeLessThan(evidence);
    expect(evidence).toBeLessThan(impact);
    expect(impact).toBeLessThan(recommendation);
    expect(recommendation).toBeLessThan(action);
    expect(card).toContain("<article");
    expect(card).toContain("<h3");
    expect(card).toContain("<h4");
    expect(card).toContain("aria-labelledby={id}");
    expect(card).toContain("EXECUTIVE_CARD_INTELLIGENCE_CLASS");
    expect(card).toContain("EXECUTIVE_CARD_ROLE_RADIUS.intelligence");
    expect(card).toContain("EXECUTIVE_CARD_ROLE_ELEVATION.intelligence");
    expect(card).toContain("hasText(evidence)");
    expect(card).toContain("hasText(impact)");
    expect(card).toContain("hasText(recommendation)");
    expect(card).toContain("hasAction(action)");
    expect(card).toContain("<ExecutiveBadge");
    expect(card).toContain("showStatus");
  });

  it("does not decide recommendation, risk, or business action", () => {
    expect(card).not.toContain("onClick");
    expect(card).not.toContain("score");
    expect(card).not.toContain("award");
    expect(card).not.toContain("rfq");
    expect(card).not.toContain("severity");
    expect(card).not.toContain("<button");
  });
});
