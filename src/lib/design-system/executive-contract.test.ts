import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_BADGE_TONES,
  EXECUTIVE_CONTENT_MAX_WIDTH_PX,
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CYAN,
  EXECUTIVE_GOLD,
  EXECUTIVE_NAVY,
  EXECUTIVE_PANEL_RADIUS_PX,
  EXECUTIVE_SIDEBAR_WIDTH_PX,
  EXECUTIVE_TILE_RADIUS_PX,
} from "@/lib/design-system/executive-contract";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function normalizeColor(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

function cssVariableValue(source: string, name: string) {
  const match = source.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match).not.toBeNull();
  return normalizeColor(String(match?.[1]));
}

const globals = readSource("src/app/globals.css");
const panel = readSource("src/components/executive/executive-panel.tsx");
const badge = readSource("src/components/executive/executive-badge.tsx");
const metric = readSource(
  "src/components/executive/executive-metric-card.tsx",
);
const topbar = readSource("src/components/common/AppTopbar.tsx");
const contract = readSource(
  "src/lib/design-system/executive-contract.ts",
);

const b01Files = [
  "src/app/globals.css",
  "src/components/executive/executive-panel.tsx",
  "src/components/executive/executive-badge.tsx",
  "src/components/executive/executive-metric-card.tsx",
  "src/components/common/AppTopbar.tsx",
  "src/lib/design-system/executive-contract.ts",
];

describe("NP-MASTER-22-B01 executive design contract", () => {
  it("freezes canonical gold to the live executive gold", () => {
    expect(EXECUTIVE_GOLD).toBe("#C8A646");
    expect(cssVariableValue(globals, "--nexus-gold")).toBe(
      normalizeColor(EXECUTIVE_GOLD),
    );
    expect(globals.toLowerCase()).not.toContain("--nexus-gold: #f5c542");
  });

  it("freezes canonical cyan to the live executive cyan", () => {
    expect(EXECUTIVE_CYAN).toBe("#2CC4E8");
    expect(cssVariableValue(globals, "--nexus-cyan")).toBe(
      normalizeColor(EXECUTIVE_CYAN),
    );
    expect(cssVariableValue(globals, "--nexus-info")).toBe(
      "var(--nexus-cyan)",
    );
    expect(globals.toLowerCase()).not.toContain("--nexus-info: #38bdf8");
  });

  it("keeps a dark-only color scheme", () => {
    expect(globals).toContain("color-scheme: dark");
    expect(globals).not.toMatch(/color-scheme:\s*light/);
    expect(globals).not.toMatch(/\[data-theme=["']light["']\]/);
    expect(contract).not.toMatch(/theme toggle|light mode/i);
    expect(cssVariableValue(globals, "--nexus-navy")).toBe(
      normalizeColor(EXECUTIVE_NAVY),
    );
  });

  it("freezes ExecutivePanel to the panel/tile radius hierarchy", () => {
    expect(EXECUTIVE_PANEL_RADIUS_PX).toBe(32);
    expect(EXECUTIVE_TILE_RADIUS_PX).toBe(24);
    expect(cssVariableValue(globals, "--radius-panel")).toBe("32px");
    expect(cssVariableValue(globals, "--radius-executive")).toBe("24px");
    expect(panel).toContain('radius?: ExecutivePanelRadius');
    expect(panel).toContain('panel: "rounded-panel"');
    expect(panel).toContain('tile: "rounded-executive"');
    expect(panel).toContain('radius = "panel"');
    expect(panel).not.toMatch(/rounded-\[(36|38|40|44)px\]/);
  });

  it("exposes canonical ExecutiveBadge semantic tones", () => {
    expect(EXECUTIVE_BADGE_TONES).toEqual(
      expect.arrayContaining([
        "success",
        "awarded",
        "warning",
        "pending",
        "neutral",
        "locked",
        "risk",
        "gold",
        "recommended",
        "board",
        "live",
      ]),
    );
    expect(badge).toContain('awarded: "success"');
    expect(badge).toContain('pending: "warning"');
    expect(badge).toContain('locked: "neutral"');
    expect(badge).toContain('recommended: "gold"');
    expect(badge).toContain('live: "board"');
  });

  it("keeps ExecutiveMetricCard accessible labeling and tabular KPI style", () => {
    expect(metric).toContain("aria-label={`${label}: ${value}`}");
    expect(metric).toContain('radius="tile"');
    expect(metric).toContain("np-type-kpi");
    expect(metric).toContain("tabular-nums");
    expect(metric).toContain("text-nexus-text-muted");
  });

  it("stops AppTopbar from emitting a page h1", () => {
    expect(topbar).not.toMatch(/<h1[\s>]/);
    expect(topbar).toContain("Boardroom Intelligence");
    expect(topbar).toMatch(/<p className="mt-1 truncate text-lg font-black text-white">/);
  });

  it("does not present inert search as an unlabeled active input", () => {
    expect(topbar).not.toMatch(/<input[\s>]/);
    expect(topbar).not.toMatch(/Search RFQs, suppliers, companies/);
    expect(topbar).toContain('href="/notifications"');
    expect(topbar).toContain('href="/analytics"');
  });

  it("does not introduce the light-mode ui kit on the frozen primitives", () => {
    for (const file of b01Files) {
      const source = readSource(file);
      expect(source).not.toContain('@/components/ui');
      expect(source).not.toContain('src/components/ui');
    }
  });

  it("exposes frozen page layout and CTA focus contracts for B02–B05", () => {
    expect(EXECUTIVE_CONTENT_MAX_WIDTH_PX).toBe(1680);
    expect(EXECUTIVE_SIDEBAR_WIDTH_PX).toBe(330);
    expect(globals).toContain("--layout-content-max: 1680px");
    expect(globals).toContain("--layout-sidebar-width: 330px");
    expect(globals).toContain(".np-type-eyebrow");
    expect(globals).toContain(".np-type-h1");
    expect(globals).toContain(".np-focus-gold:focus-visible");
    expect(EXECUTIVE_CTA_PRIMARY).toContain("focus-visible:ring-2");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:scale");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:-translate");
  });
});
