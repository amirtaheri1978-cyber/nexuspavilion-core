import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_BADGE_TONES,
  EXECUTIVE_BORDER_ROLES,
  EXECUTIVE_CONTENT_MAX_WIDTH_PX,
  EXECUTIVE_CONTROL_CLASS,
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CYAN,
  EXECUTIVE_DEPTH_ROLES,
  EXECUTIVE_GOLD,
  EXECUTIVE_INTELLIGENCE_ACCENT_CLASS,
  EXECUTIVE_INTELLIGENCE_MARK_CLASS,
  EXECUTIVE_INTELLIGENCE_ROLES,
  EXECUTIVE_INTELLIGENCE_SURFACE_CLASS,
  EXECUTIVE_INTERACTION_ROLES,
  EXECUTIVE_LAYOUT_ROLES,
  EXECUTIVE_LOGO_CLEAR_SPACE_PX,
  EXECUTIVE_LOGO_DARK_CLASS,
  EXECUTIVE_LOGO_DARK_MIN_SIZE_PX,
  EXECUTIVE_LOGO_DARK_VARIANTS,
  EXECUTIVE_MODAL_RADIUS_PX,
  EXECUTIVE_MOTION_CONTEXT_MS,
  EXECUTIVE_MOTION_EASE_ROLES,
  EXECUTIVE_MOTION_EASE_STANDARD,
  EXECUTIVE_MOTION_FAST_MS,
  EXECUTIVE_MOTION_MILESTONE_MS,
  EXECUTIVE_MOTION_REDUCE_DURATION,
  EXECUTIVE_MOTION_ROLES,
  EXECUTIVE_MOTION_STANDARD_MS,
  EXECUTIVE_NAVY,
  EXECUTIVE_PAGE_CLASS,
  EXECUTIVE_TYPE_ROLES,
  EXECUTIVE_PANEL_RADIUS_PX,
  EXECUTIVE_SIDEBAR_WIDTH_PX,
  EXECUTIVE_STATUS_ROLES,
  EXECUTIVE_SURFACE_ROLES,
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
    expect(EXECUTIVE_MODAL_RADIUS_PX).toBe(EXECUTIVE_PANEL_RADIUS_PX);
    expect(cssVariableValue(globals, "--radius-tile")).toBe("24px");
    expect(cssVariableValue(globals, "--radius-panel")).toBe("32px");
    expect(cssVariableValue(globals, "--radius-modal")).toBe("var(--radius-panel)");
    expect(cssVariableValue(globals, "--radius-executive")).toBe("var(--radius-tile)");
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
    expect(EXECUTIVE_STATUS_ROLES).toEqual([
      "success",
      "warning",
      "risk",
      "info",
      "neutral",
    ]);
    expect(cssVariableValue(globals, "--status-success")).toBe(
      "var(--nexus-success)",
    );
    expect(cssVariableValue(globals, "--status-warning")).toBe(
      "var(--nexus-warning)",
    );
    expect(cssVariableValue(globals, "--status-risk")).toBe(
      "var(--nexus-danger)",
    );
    expect(cssVariableValue(globals, "--status-info")).toBe("var(--nexus-info)");
    expect(cssVariableValue(globals, "--status-neutral")).toBe(
      "var(--nexus-text-secondary)",
    );
    expect(cssVariableValue(globals, "--nexus-success")).toBe("#22c55e");
    expect(cssVariableValue(globals, "--nexus-warning")).toBe("#f59e0b");
    expect(cssVariableValue(globals, "--nexus-danger")).toBe("#ef4444");
    expect(badge).toContain("border-status-success/25");
    expect(badge).toContain("border-status-warning/25");
    expect(badge).toContain("border-status-risk/25");
    expect(badge).toContain("border-status-info/25");
    expect(badge).toContain("text-status-neutral");
    expect(badge).not.toContain("emerald-");
    expect(badge).not.toContain("orange-");
    expect(badge).not.toContain("red-");
  });

  it("keeps ExecutiveMetricCard accessible labeling and tabular KPI style", () => {
    expect(metric).toContain("aria-label={`${label}: ${value}`}");
    expect(metric).toContain('radius="tile"');
    expect(metric).toContain("np-type-kpi");
    expect(metric).toContain("tabular-nums");
    expect(metric).toContain("text-nexus-text-muted");
  });

  it("wraps ExecutiveMetricCard copy on word boundaries instead of anywhere", () => {
    expect(metric).toContain("text-pretty");
    expect(metric).toContain("min-w-0");
    expect(metric).toContain("whitespace-nowrap");
    expect(metric).not.toContain("break-words");
    expect(metric).not.toContain("break-all");
    expect(metric).not.toContain("overflow-wrap:anywhere");
    expect(metric).not.toContain("[overflow-wrap:anywhere]");
  });

  it("stops AppTopbar from emitting a page h1", () => {
    expect(topbar).not.toMatch(/<h1[\s>]/);
    expect(topbar).toContain("BOARDROOM_INTELLIGENCE_TITLE");
    expect(topbar).toContain("getAppSectionTitle");
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

  it("renders executive focus and CTA colors from semantic theme tokens", () => {
    expect(contract).toContain("ring-nexus-gold/70");
    expect(contract).toContain("ring-nexus-cyan/40");
    expect(contract).toContain("ring-offset-nexus-navy");
    expect(contract).toContain(
      "from-nexus-gold-deep via-nexus-gold to-nexus-gold-bright",
    );
    expect(contract).toContain("hover:border-nexus-cyan/25");
    expect(contract).toContain("shadow-cta-gold");
    expect(contract).not.toMatch(/\[#[0-9A-Fa-f]{3,8}\]/);
    expect(globals).toContain(
      "--shadow-cta-gold: 0 18px 55px color-mix(in srgb, var(--nexus-gold) 30%, transparent);",
    );
    expect(globals).toContain("color-mix(in srgb, var(--nexus-cyan) 18%, transparent)");
    expect(globals).not.toContain("rgba(44, 196, 232");
    expect(globals).not.toContain("rgba(200, 166, 70");
  });

  it("defines one application typography hierarchy from shared scale tokens", () => {
    expect(EXECUTIVE_TYPE_ROLES).toEqual([
      "eyebrow",
      "h1",
      "h2",
      "h3",
      "body",
      "meta",
      "kpi",
    ]);

    for (const role of EXECUTIVE_TYPE_ROLES) {
      expect(globals).toContain(`.np-type-${role}`);
    }

    expect(cssVariableValue(globals, "--np-type-display-weight")).toBe("800");
    expect(cssVariableValue(globals, "--np-type-copy-weight")).toBe("600");
    expect(cssVariableValue(globals, "--np-type-eyebrow-size")).toBe("0.6875rem");
    expect(cssVariableValue(globals, "--np-type-h1-size")).toBe("1.875rem");
    expect(cssVariableValue(globals, "--np-type-h2-size")).toBe("1.5rem");
    expect(cssVariableValue(globals, "--np-type-h3-size")).toBe("1.125rem");
    expect(cssVariableValue(globals, "--np-type-body-size")).toBe("0.875rem");
    expect(cssVariableValue(globals, "--np-type-meta-size")).toBe("0.75rem");
    expect(globals).toContain("--np-type-h1-size: 2.25rem;");
    expect(globals).toContain("--np-type-h2-size: 1.875rem;");
    expect(globals).toContain("--np-type-h3-size: 1.25rem;");
    expect(globals).toContain("--np-type-h1-size: 3rem;");
    expect(globals).toContain("font-size: var(--np-type-h1-size);");
    expect(globals).not.toMatch(/\.np-type-kpi\s*\{[^}]*font-size:/);
    expect(globals).not.toMatch(
      /@media \(min-width: 640px\) \{\s*\.np-type-h1/,
    );
  });

  it("defines one application spacing and grid scale from shared layout tokens", () => {
    expect(EXECUTIVE_LAYOUT_ROLES).toEqual([
      "content",
      "sidebar",
      "page",
      "region",
      "region-major",
    ]);
    expect(EXECUTIVE_PAGE_CLASS).toBe("np-page");
    expect(EXECUTIVE_PAGE_CLASS).not.toContain("1680");
    expect(EXECUTIVE_PAGE_CLASS).not.toContain("px-");
    expect(cssVariableValue(globals, "--layout-content-max")).toBe("1680px");
    expect(cssVariableValue(globals, "--layout-sidebar-width")).toBe("330px");
    expect(cssVariableValue(globals, "--spacing-region")).toBe("24px");
    expect(cssVariableValue(globals, "--spacing-region-major")).toBe("32px");
    expect(cssVariableValue(globals, "--np-page-pad-inline")).toBe("1rem");
    expect(cssVariableValue(globals, "--np-page-pad-block")).toBe("1.5rem");
    expect(globals).toContain("--np-page-pad-inline: 2rem;");
    expect(globals).toContain("--np-page-pad-inline: 2.5rem;");
    expect(globals).toContain("--np-page-pad-block: 2rem;");
    expect(globals).toContain("max-width: var(--layout-content-max);");
    expect(globals).toContain("padding-inline: var(--np-page-pad-inline);");
    expect(globals).toContain("padding-block: var(--np-page-pad-block);");
    expect(globals).toContain("margin-top: var(--spacing-region);");
    expect(globals).toContain("margin-top: var(--spacing-region-major);");
    expect(globals).not.toMatch(/@media \(min-width: 640px\) \{\s*\.np-page/);
    expect(globals).not.toMatch(/@media \(min-width: 1024px\) \{\s*\.np-page/);
  });

  it("defines one application surface, border, radius, and elevation scale", () => {
    expect(EXECUTIVE_SURFACE_ROLES).toEqual(["base", "elevated", "muted"]);
    expect(EXECUTIVE_BORDER_ROLES).toEqual(["subtle", "strong"]);
    expect(EXECUTIVE_DEPTH_ROLES).toEqual(["tile", "panel", "modal"]);
    expect(cssVariableValue(globals, "--nexus-surface-base")).toBe(
      "var(--nexus-navy)",
    );
    expect(cssVariableValue(globals, "--nexus-surface-elevated")).toBe(
      "var(--nexus-deep)",
    );
    expect(cssVariableValue(globals, "--nexus-surface-muted")).toBe(
      "var(--nexus-slate)",
    );
    expect(cssVariableValue(globals, "--nexus-border-subtle")).toBe(
      "rgba(255,255,255,0.1)",
    );
    expect(cssVariableValue(globals, "--nexus-border-strong")).toBe(
      "var(--nexus-border)",
    );
    expect(cssVariableValue(globals, "--elevation-tile")).toBe(
      "var(--shadow-inner-executive)",
    );
    expect(cssVariableValue(globals, "--elevation-panel")).toBe(
      "var(--shadow-executive)",
    );
    expect(cssVariableValue(globals, "--elevation-modal")).toBe(
      "var(--shadow-executive)",
    );
    expect(globals).toContain(
      "--shadow-executive: 0 30px 90px rgba(0, 0, 0, 0.35);",
    );
    expect(globals).toContain("border-radius: var(--radius-tile);");
    expect(globals).toContain("border-radius: var(--radius-panel);");
    expect(globals).toContain("box-shadow: var(--elevation-panel);");
    expect(globals).toContain("box-shadow: var(--elevation-tile);");
    expect(globals).not.toContain("--radius-executive: 24px");
  });

  it("defines one restrained Nexus Intelligence treatment from existing cyan roles", () => {
    expect(EXECUTIVE_INTELLIGENCE_ROLES).toEqual(["accent", "surface", "mark"]);
    expect(EXECUTIVE_INTELLIGENCE_SURFACE_CLASS).toBe("np-intelligence");
    expect(EXECUTIVE_INTELLIGENCE_ACCENT_CLASS).toBe("np-intelligence-accent");
    expect(EXECUTIVE_INTELLIGENCE_MARK_CLASS).toBe("np-intelligence-mark");
    expect(cssVariableValue(globals, "--intelligence-accent")).toBe(
      "var(--nexus-cyan)",
    );
    expect(cssVariableValue(globals, "--intelligence-accent-bright")).toBe(
      "var(--nexus-cyan-bright)",
    );
    expect(cssVariableValue(globals, "--intelligence-surface")).toBe(
      "var(--nexus-surface-elevated)",
    );
    expect(cssVariableValue(globals, "--intelligence-border")).toBe(
      "color-mix(insrgb,var(--nexus-cyan)15%,transparent)",
    );
    expect(cssVariableValue(globals, "--intelligence-accent")).not.toBe(
      "var(--nexus-success)",
    );
    expect(cssVariableValue(globals, "--intelligence-accent")).not.toBe(
      "var(--nexus-warning)",
    );
    expect(cssVariableValue(globals, "--intelligence-accent")).not.toBe(
      "var(--nexus-danger)",
    );

    const intelligence = globals.slice(
      globals.indexOf(".np-intelligence {"),
      globals.indexOf(".np-region {"),
    );
    expect(intelligence).toContain("background: var(--intelligence-surface);");
    expect(intelligence).toContain("border: 1px solid var(--intelligence-border);");
    expect(intelligence).toContain("color: var(--intelligence-accent-bright);");
    expect(intelligence).toContain("border-radius: 9999px;");
    expect(intelligence).not.toContain("gradient");
    expect(intelligence).not.toContain("box-shadow");
    expect(intelligence).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("defines one shared control interaction contract from existing semantic states", () => {
    expect(EXECUTIVE_INTERACTION_ROLES).toEqual([
      "focus",
      "hover",
      "selected",
      "disabled",
    ]);
    expect(EXECUTIVE_CONTROL_CLASS).toBe("np-control");
    expect(cssVariableValue(globals, "--interaction-hover-fill")).toBe(
      "color-mix(insrgb,var(--nexus-white)8%,transparent)",
    );
    expect(cssVariableValue(globals, "--interaction-hover-border")).toBe(
      "color-mix(insrgb,var(--nexus-cyan)25%,transparent)",
    );
    expect(cssVariableValue(globals, "--interaction-selected-fill")).toBe(
      "color-mix(insrgb,var(--nexus-cyan)10%,transparent)",
    );
    expect(cssVariableValue(globals, "--interaction-selected-border")).toBe(
      "color-mix(insrgb,var(--nexus-cyan)25%,transparent)",
    );
    expect(cssVariableValue(globals, "--interaction-focus")).toBe(
      "color-mix(insrgb,var(--nexus-cyan)40%,transparent)",
    );
    expect(cssVariableValue(globals, "--interaction-disabled-opacity")).toBe(
      "0.6",
    );
    expect(cssVariableValue(globals, "--interaction-hover-fill")).not.toBe(
      cssVariableValue(globals, "--interaction-selected-fill"),
    );

    const control = globals.slice(
      globals.indexOf(".np-control:hover"),
      globals.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(control).toContain(".np-control:focus-visible");
    expect(control).toContain("outline: 2px solid var(--interaction-focus);");
    expect(control).toContain("background-color: var(--interaction-hover-fill);");
    expect(control).toContain(
      "background-color: var(--interaction-selected-fill);",
    );
    expect(control).toContain("cursor: not-allowed;");
    expect(control).toContain("opacity: var(--interaction-disabled-opacity);");
    expect(control).toContain(':not([aria-current="page"])');
    expect(control).toContain(':not([aria-selected="true"])');
    expect(control).not.toMatch(/\.np-control:focus\s*\{/);
    expect(control).not.toContain("transition");
    expect(control).not.toContain("animation");
    expect(control).not.toContain("hover:scale");
  });

  it("defines canonical application motion durations without changing reduced motion", () => {
    expect(EXECUTIVE_MOTION_ROLES).toEqual([
      "fast",
      "standard",
      "context",
      "milestone",
    ]);
    expect(EXECUTIVE_MOTION_FAST_MS).toBe(140);
    expect(EXECUTIVE_MOTION_STANDARD_MS).toBe(220);
    expect(EXECUTIVE_MOTION_CONTEXT_MS).toBe(300);
    expect(EXECUTIVE_MOTION_MILESTONE_MS).toBe(650);
    expect(cssVariableValue(globals, "--motion-duration-fast")).toBe("140ms");
    expect(cssVariableValue(globals, "--motion-duration-standard")).toBe(
      "220ms",
    );
    expect(cssVariableValue(globals, "--motion-duration-context")).toBe(
      "300ms",
    );
    expect(cssVariableValue(globals, "--motion-duration-milestone")).toBe(
      "650ms",
    );
    expect(EXECUTIVE_CTA_PRIMARY).toContain("duration-200");
    expect(globals).toContain("animation-duration: 0.01ms !important;");
    expect(globals).toContain("transition-duration: 0.01ms !important;");

    const durations = globals.slice(
      globals.indexOf("--motion-duration-fast"),
      globals.indexOf("--motion-ease-standard"),
    );
    expect(durations).not.toContain("cubic-bezier");
    expect(durations).not.toContain("ease");
    expect(durations).not.toContain("prefers-reduced-motion");
  });

  it("defines restrained easing and keeps reduced motion on the existing instant rule", () => {
    expect(EXECUTIVE_MOTION_EASE_ROLES).toEqual(["standard"]);
    expect(EXECUTIVE_MOTION_EASE_STANDARD).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(EXECUTIVE_MOTION_REDUCE_DURATION).toBe("0.01ms");
    expect(cssVariableValue(globals, "--motion-ease-standard")).toBe(
      "cubic-bezier(0.2,0,0,1)",
    );
    expect(cssVariableValue(globals, "--motion-duration-fast")).toBe("140ms");
    expect(cssVariableValue(globals, "--motion-duration-standard")).toBe(
      "220ms",
    );
    expect(cssVariableValue(globals, "--motion-duration-context")).toBe(
      "300ms",
    );
    expect(cssVariableValue(globals, "--motion-duration-milestone")).toBe(
      "650ms",
    );

    const reduced = globals.slice(
      globals.indexOf("@media (prefers-reduced-motion: reduce)"),
      globals.indexOf("@media print"),
    );
    expect(reduced).toContain("scroll-behavior: auto !important;");
    expect(reduced).toContain("animation-name: none !important;");
    expect(reduced).toContain("animation-duration: 0.01ms !important;");
    expect(reduced).toContain("animation-iteration-count: 1 !important;");
    expect(reduced).toContain("transition-property: none !important;");
    expect(reduced).toContain("transition-duration: 0.01ms !important;");
    expect(reduced).not.toContain("transform: none");
    expect(reduced).not.toContain("cubic-bezier");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("cubic-bezier");
  });

  it("defines the dark-surface logo contract from the official logo component", () => {
    const logo = readSource("src/components/branding/nexus-pavilion-logo.tsx");

    expect(EXECUTIVE_LOGO_DARK_VARIANTS).toEqual(["icon", "horizontal"]);
    expect(EXECUTIVE_LOGO_DARK_MIN_SIZE_PX).toBe(32);
    expect(EXECUTIVE_LOGO_CLEAR_SPACE_PX).toBe(12);
    expect(EXECUTIVE_LOGO_DARK_CLASS).toBe("np-logo-dark");
    expect(cssVariableValue(globals, "--logo-min-size")).toBe("32px");
    expect(cssVariableValue(globals, "--logo-clear-space")).toBe("0.75rem");
    expect(logo).toContain('horizontal: "/branding/logo-horizontal-1024.png"');
    expect(logo).toContain('icon: "/branding/logo-icon-512.png"');
    expect(logo).toContain('stacked: "/branding/logo-stacked-1024.png"');
    expect(logo).toContain('alt="NexusPavilion"');
    expect(logo).toContain("width: size * 3, height: size");
    expect(logo).toContain("width: size, height: size * 1.25");
    expect(logo).toContain("object-contain");
    expect(logo).toContain('surface === "dark" ? "np-logo-dark"');
    expect(logo).not.toContain("filter");
    expect(logo).not.toContain("drop-shadow");
    const darkLogo = globals.slice(
      globals.indexOf(".np-logo-dark {"),
      globals.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(darkLogo).toContain("padding: var(--logo-clear-space);");
    expect(darkLogo).toContain("min-width: var(--logo-min-size);");
    expect(darkLogo).toContain("object-fit: contain;");
    expect(darkLogo).toContain("background: transparent;");
    expect(darkLogo).not.toMatch(/filter|drop-shadow|box-shadow/);
  });
});
