import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_BADGE_ROLES,
  EXECUTIVE_BADGE_SEMANTIC_CLASSES,
  EXECUTIVE_BADGE_TONE_ALIASES,
  EXECUTIVE_BADGE_TONES,
  EXECUTIVE_BORDER_ROLES,
  EXECUTIVE_BUTTON_DESTRUCTIVE,
  EXECUTIVE_BUTTON_ICON,
  EXECUTIVE_BUTTON_LOADING,
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_ROLES,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_CARD_INTELLIGENCE_CLASS,
  EXECUTIVE_CARD_ROLE_DEPTH,
  EXECUTIVE_CARD_ROLE_ELEVATION,
  EXECUTIVE_CARD_ROLE_RADIUS,
  EXECUTIVE_CARD_ROLE_SURFACE,
  EXECUTIVE_CARD_ROLES,
  EXECUTIVE_CONTENT_MAX_WIDTH_PX,
  EXECUTIVE_ATTENTION_CLASS,
  EXECUTIVE_MOTION_OVERLAY_POINTER,
  EXECUTIVE_MOTION_PERFORMANCE_PROPERTIES,
  EXECUTIVE_CONTROL_CLASS,
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_CYAN,
  EXECUTIVE_DATE_CONTROL_ROLES,
  EXECUTIVE_DATE_FIELD,
  EXECUTIVE_DATE_TIMEZONE,
  EXECUTIVE_DATE_TIMEZONE_BADGE,
  EXECUTIVE_DEPTH_ROLES,
  EXECUTIVE_DIALOG_ACTIONS,
  EXECUTIVE_DIALOG_BODY,
  EXECUTIVE_DIALOG_CANCEL,
  EXECUTIVE_DIALOG_CONFIRM,
  EXECUTIVE_DIALOG_DESTRUCTIVE,
  EXECUTIVE_DIALOG_OVERLAY,
  EXECUTIVE_DIALOG_ROLES,
  EXECUTIVE_DIALOG_SURFACE,
  EXECUTIVE_DIALOG_TITLE,
  EXECUTIVE_DRAWER_BODY,
  EXECUTIVE_DRAWER_CLOSE,
  EXECUTIVE_DRAWER_FOOTER,
  EXECUTIVE_DRAWER_HEADER,
  EXECUTIVE_DRAWER_INTELLIGENCE,
  EXECUTIVE_DRAWER_OVERLAY,
  EXECUTIVE_DRAWER_ROLES,
  EXECUTIVE_DRAWER_SURFACE,
  EXECUTIVE_DRAWER_TITLE,
  EXECUTIVE_EMPTY_ACTION,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_EMPTY_CONTENT_ROLES,
  EXECUTIVE_EMPTY_EYEBROW,
  EXECUTIVE_EMPTY_FULL,
  EXECUTIVE_EMPTY_ICON,
  EXECUTIVE_EMPTY_ICON_HIDDEN,
  EXECUTIVE_EMPTY_LIVE,
  EXECUTIVE_EMPTY_ROLE,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_EMPTY_VARIANTS,
  EXECUTIVE_ERROR_CONTENT_ROLES,
  EXECUTIVE_ERROR_ICON,
  EXECUTIVE_ERROR_ICON_HIDDEN,
  EXECUTIVE_ERROR_IMPACT,
  EXECUTIVE_ERROR_LIVE,
  EXECUTIVE_ERROR_PROBLEM,
  EXECUTIVE_ERROR_RECOVERY,
  EXECUTIVE_ERROR_ROLE,
  EXECUTIVE_ERROR_SURFACE,
  EXECUTIVE_STEPPER_CURRENT,
  EXECUTIVE_STEPPER_DISABLED,
  EXECUTIVE_STEPPER_FOCUS,
  EXECUTIVE_STEPPER_LABEL,
  EXECUTIVE_STEPPER_LAYOUTS,
  EXECUTIVE_STEPPER_LIST_COMPACT,
  EXECUTIVE_STEPPER_LIST_HORIZONTAL,
  EXECUTIVE_STEPPER_MARKER_STATE,
  EXECUTIVE_STEPPER_STATES,
  EXECUTIVE_STEPPER_SURFACE,
  EXECUTIVE_STEPPER_SURFACE_STATE,
  EXECUTIVE_FEEDBACK_ACTION,
  EXECUTIVE_FEEDBACK_BODY,
  EXECUTIVE_FEEDBACK_DISMISS,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_ICON,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_LIVE,
  EXECUTIVE_FEEDBACK_MOTION,
  EXECUTIVE_FEEDBACK_PLACEMENT,
  EXECUTIVE_FEEDBACK_ROLES,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_TITLE,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_FORM_CHECKBOX,
  EXECUTIVE_FORM_CONTROL_ROLES,
  EXECUTIVE_FORM_DISABLED,
  EXECUTIVE_FORM_ERROR,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
  EXECUTIVE_FORM_RADIO,
  EXECUTIVE_FORM_READONLY,
  EXECUTIVE_FORM_SELECT,
  EXECUTIVE_FORM_STATE_ROLES,
  EXECUTIVE_FORM_TEXTAREA,
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
  EXECUTIVE_POPOVER_MOTION,
  EXECUTIVE_POPOVER_PLACEMENT,
  EXECUTIVE_POPOVER_SURFACE,
  EXECUTIVE_TOOLTIP_MOTION,
  EXECUTIVE_TOOLTIP_MOTION_MS,
  EXECUTIVE_TOOLTIP_PLACEMENT,
  EXECUTIVE_TOOLTIP_ROLES,
  EXECUTIVE_TOOLTIP_SURFACE,
  EXECUTIVE_NAVY,
  EXECUTIVE_LOADING_LABEL,
  EXECUTIVE_LOADING_LIVE,
  EXECUTIVE_LOADING_ROLES,
  EXECUTIVE_PAGE_CLASS,
  EXECUTIVE_PROGRESS_MOTION_MS,
  EXECUTIVE_PROGRESS_TRACK,
  EXECUTIVE_PROGRESS_VALUE,
  EXECUTIVE_SKELETON,
  EXECUTIVE_SKELETON_LINE,
  EXECUTIVE_TYPE_ROLES,
  EXECUTIVE_PANEL_RADIUS_PX,
  EXECUTIVE_SIDEBAR_WIDTH_PX,
  EXECUTIVE_STATUS_ROLES,
  EXECUTIVE_SURFACE_ROLES,
  EXECUTIVE_TABLE,
  EXECUTIVE_TABLE_CAPTION,
  EXECUTIVE_TABLE_CELL,
  EXECUTIVE_TABLE_CONTAINER,
  EXECUTIVE_TABLE_FILTER_ACTIVE,
  EXECUTIVE_TABLE_HEADER,
  EXECUTIVE_TABLE_NUMERIC,
  EXECUTIVE_TABLE_NUMERIC_HEADER,
  EXECUTIVE_TABLE_ROLES,
  EXECUTIVE_TABLE_SORT_ACTIVE,
  EXECUTIVE_TILE_RADIUS_PX,
} from "@/lib/design-system/executive-contract";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function sourceFiles(relativeDir: string): string[] {
  const entries = readdirSync(resolve(process.cwd(), relativeDir), {
    withFileTypes: true,
  });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...sourceFiles(relativePath));
      continue;
    }

    if (relativePath === "src/app/globals.css") continue;
    if (!/\.(tsx|ts|css)$/.test(entry.name)) continue;

    files.push(relativePath);
  }

  return files;
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
    expect(EXECUTIVE_BADGE_ROLES).toEqual([
      "success",
      "warning",
      "risk",
      "info",
      "neutral",
      "gold",
      "board",
    ]);
    expect(EXECUTIVE_BADGE_TONE_ALIASES.awarded).toBe("success");
    expect(EXECUTIVE_BADGE_TONE_ALIASES.pending).toBe("warning");
    expect(EXECUTIVE_BADGE_TONE_ALIASES.locked).toBe("neutral");
    expect(EXECUTIVE_BADGE_TONE_ALIASES.recommended).toBe("gold");
    expect(EXECUTIVE_BADGE_TONE_ALIASES.live).toBe("board");
    expect(EXECUTIVE_BADGE_TONE_ALIASES.blue).toBe("info");
    expect(badge).toContain("EXECUTIVE_BADGE_TONE_ALIASES");
    expect(badge).toContain("EXECUTIVE_BADGE_SEMANTIC_CLASSES");
    expect(badge).toContain("{children}");
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
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.success).toContain(
      "border-status-success/25",
    );
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.warning).toContain(
      "border-status-warning/25",
    );
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.risk).toContain(
      "border-status-risk/25",
    );
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.info).toContain(
      "border-status-info/25",
    );
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.neutral).toContain(
      "text-status-neutral",
    );
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.gold).toContain(
      "text-nexus-gold-bright",
    );
    expect(EXECUTIVE_BADGE_SEMANTIC_CLASSES.board).toContain("text-nexus-gold");
    expect(badge).not.toContain("emerald-");
    expect(badge).not.toContain("orange-");
    expect(badge).not.toContain("red-");

    const statusBadge = readSource(
      "src/components/rfq-workspace/shared/executive-status-badge.tsx",
    );
    expect(statusBadge).toContain("EXECUTIVE_BADGE_SEMANTIC_CLASSES");
    expect(statusBadge).toContain("{children}");
    expect(statusBadge).not.toContain("emerald-");
    expect(statusBadge).not.toContain("orange-");
    expect(statusBadge).not.toContain("red-");
    expect(statusBadge).not.toContain("cyan-300");
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

  it("defines five canonical card roles from the existing panel and intelligence contracts", () => {
    expect(EXECUTIVE_CARD_ROLES).toEqual([
      "status",
      "metric",
      "action",
      "intelligence",
      "summary",
    ]);
    expect(EXECUTIVE_CARD_ROLE_DEPTH.status).toBe("tile");
    expect(EXECUTIVE_CARD_ROLE_RADIUS.status).toBe("rounded-executive");
    expect(EXECUTIVE_CARD_ROLE_ELEVATION.status).toBe("shadow-inner-executive");
    expect(EXECUTIVE_CARD_ROLE_SURFACE.status).toBe("muted");
    expect(EXECUTIVE_CARD_ROLE_DEPTH.metric).toBe("tile");
    expect(EXECUTIVE_CARD_ROLE_RADIUS.metric).toBe("rounded-executive");
    expect(EXECUTIVE_CARD_ROLE_ELEVATION.metric).toBe("shadow-inner-executive");
    expect(EXECUTIVE_CARD_ROLE_SURFACE.metric).toBe("elevated");
    expect(metric).toContain('radius="tile"');
    expect(EXECUTIVE_CARD_ROLE_DEPTH.action).toBe("panel");
    expect(EXECUTIVE_CARD_ROLE_RADIUS.action).toBe("rounded-panel");
    expect(EXECUTIVE_CARD_ROLE_ELEVATION.action).toBe("shadow-executive");
    expect(EXECUTIVE_CARD_ROLE_SURFACE.action).toBe("elevated");
    expect(EXECUTIVE_CARD_ROLE_DEPTH.intelligence).toBe("panel");
    expect(EXECUTIVE_CARD_ROLE_RADIUS.intelligence).toBe("rounded-panel");
    expect(EXECUTIVE_CARD_ROLE_ELEVATION.intelligence).toBe("shadow-executive");
    expect(EXECUTIVE_CARD_ROLE_SURFACE.intelligence).toBe("elevated");
    expect(EXECUTIVE_CARD_INTELLIGENCE_CLASS).toBe(
      EXECUTIVE_INTELLIGENCE_SURFACE_CLASS,
    );
    expect(EXECUTIVE_CARD_ROLE_DEPTH.summary).toBe("panel");
    expect(EXECUTIVE_CARD_ROLE_RADIUS.summary).toBe("rounded-panel");
    expect(EXECUTIVE_CARD_ROLE_ELEVATION.summary).toBe("shadow-executive");
    expect(EXECUTIVE_CARD_ROLE_SURFACE.summary).toBe("base");
    expect(panel).toContain('panel: "rounded-panel"');
    expect(panel).toContain('tile: "rounded-executive"');
  });

  it("defines one enterprise table contract from existing overflow and alignment patterns", () => {
    expect(EXECUTIVE_TABLE_ROLES).toEqual([
      "container",
      "header",
      "cell",
      "numeric",
      "sort",
      "filter",
    ]);
    expect(EXECUTIVE_TABLE_CONTAINER).toContain("min-w-0");
    expect(EXECUTIVE_TABLE_CONTAINER).toContain("overflow-x-auto");
    expect(EXECUTIVE_TABLE_CONTAINER).not.toContain("overflow-y-hidden");
    expect(EXECUTIVE_TABLE).toContain("border-collapse");
    expect(EXECUTIVE_TABLE).toContain("text-left");
    expect(EXECUTIVE_TABLE_HEADER).toContain("sticky top-0");
    expect(EXECUTIVE_TABLE_HEADER).toContain("np-type-meta");
    expect(EXECUTIVE_TABLE_HEADER).toContain("text-left");
    expect(EXECUTIVE_TABLE_HEADER).toContain("px-3 py-3");
    expect(EXECUTIVE_TABLE_NUMERIC_HEADER).toContain("sticky top-0");
    expect(EXECUTIVE_TABLE_NUMERIC_HEADER).toContain("text-right");
    expect(EXECUTIVE_TABLE_CELL).toContain("text-left");
    expect(EXECUTIVE_TABLE_CELL).toContain("px-3 py-3");
    expect(EXECUTIVE_TABLE_NUMERIC).toContain("text-right");
    expect(EXECUTIVE_TABLE_NUMERIC).toContain("tabular-nums");
    expect(EXECUTIVE_TABLE_SORT_ACTIVE).toBe(EXECUTIVE_TABLE_FILTER_ACTIVE);
    expect(EXECUTIVE_TABLE_SORT_ACTIVE).toContain("bg-nexus-cyan/10");
    expect(EXECUTIVE_TABLE_SORT_ACTIVE).toContain(EXECUTIVE_FOCUS_CYAN);
    expect(EXECUTIVE_TABLE_SORT_ACTIVE).not.toContain("hover:scale");
    expect(EXECUTIVE_TABLE_CAPTION).toBe("sr-only");

    for (const part of [
      EXECUTIVE_TABLE_CONTAINER,
      EXECUTIVE_TABLE,
      EXECUTIVE_TABLE_HEADER,
      EXECUTIVE_TABLE_CELL,
      EXECUTIVE_TABLE_NUMERIC,
      EXECUTIVE_TABLE_SORT_ACTIVE,
    ]) {
      expect(part).not.toContain("onClick");
      expect(part).not.toContain("pointer-events-none");
    }
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

  it("defines the shared confirmation dialog from existing surface and button contracts", () => {
    expect(EXECUTIVE_DIALOG_ROLES).toEqual([
      "overlay",
      "surface",
      "title",
      "body",
      "actions",
      "confirm",
      "cancel",
      "destructive",
    ]);
    expect(EXECUTIVE_DIALOG_OVERLAY).toContain("bg-black/70");
    expect(EXECUTIVE_DIALOG_SURFACE).toContain("rounded-panel");
    expect(EXECUTIVE_DIALOG_SURFACE).toContain("shadow-executive");
    expect(EXECUTIVE_DIALOG_SURFACE).toContain("bg-nexus-navy");
    expect(EXECUTIVE_DIALOG_TITLE).toBe("np-type-h2");
    expect(EXECUTIVE_DIALOG_BODY).toContain("np-type-body");
    expect(EXECUTIVE_DIALOG_ACTIONS).toContain("sm:justify-end");
    expect(EXECUTIVE_DIALOG_CONFIRM).toBe(EXECUTIVE_BUTTON_PRIMARY);
    expect(EXECUTIVE_DIALOG_CANCEL).toBe(EXECUTIVE_BUTTON_SECONDARY);
    expect(EXECUTIVE_DIALOG_DESTRUCTIVE).toBe(EXECUTIVE_BUTTON_DESTRUCTIVE);
    expect(EXECUTIVE_DIALOG_DESTRUCTIVE).toContain("text-status-risk");

    const dialog = readSource(
      "src/components/executive/executive-confirm-dialog.tsx",
    );
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain("aria-labelledby={titleId}");
    expect(dialog).toContain("aria-describedby={descriptionId}");
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain("last.focus()");
    expect(dialog).toContain("onClick={onConfirm}");
    expect(dialog).toContain("onClick={onClose}");
    expect(dialog).toContain('tone = "confirm"');
    expect(dialog).toContain("EXECUTIVE_DIALOG_DESTRUCTIVE");
    expect(dialog).toContain('{busy ? "Awarding..." : confirmLabel}');
    expect(dialog).not.toContain("window.confirm");
  });

  it("defines the shared drawer contract without a second drawer component", () => {
    expect(EXECUTIVE_DRAWER_ROLES).toEqual([
      "overlay",
      "surface",
      "header",
      "body",
      "footer",
      "close",
      "intelligence",
    ]);
    expect(EXECUTIVE_DRAWER_OVERLAY).toContain("bg-black/70");
    expect(EXECUTIVE_DRAWER_OVERLAY).toContain("justify-end");
    expect(EXECUTIVE_DRAWER_OVERLAY).not.toContain("pointer-events-none");
    expect(EXECUTIVE_DRAWER_SURFACE).toContain(
      "max-w-[var(--layout-sidebar-width)]",
    );
    expect(EXECUTIVE_DRAWER_SURFACE).toContain("var(--radius-panel)");
    expect(EXECUTIVE_DRAWER_SURFACE).toContain("shadow-executive");
    expect(EXECUTIVE_DRAWER_SURFACE).toContain("border-white/10");
    expect(EXECUTIVE_DRAWER_HEADER).toContain("justify-between");
    expect(EXECUTIVE_DRAWER_TITLE).toBe("np-type-h2");
    expect(EXECUTIVE_DRAWER_BODY).toContain("overflow-y-auto");
    expect(EXECUTIVE_DRAWER_BODY).toContain("np-type-body");
    expect(EXECUTIVE_DRAWER_FOOTER).toContain("border-t");
    expect(EXECUTIVE_DRAWER_CLOSE).toBe(EXECUTIVE_BUTTON_ICON);
    expect(EXECUTIVE_DRAWER_CLOSE).toContain(EXECUTIVE_FOCUS_CYAN);
    expect(EXECUTIVE_DRAWER_CLOSE).not.toContain("aria-hidden");
    expect(EXECUTIVE_DRAWER_INTELLIGENCE).toBe(
      EXECUTIVE_CARD_INTELLIGENCE_CLASS,
    );
    expect(contract).not.toContain("function ExecutiveDrawer");
  });

  it("defines the shared tooltip and popover contract from existing surface and motion tokens", () => {
    expect(EXECUTIVE_TOOLTIP_ROLES).toEqual(["surface", "placement", "timing"]);
    expect(EXECUTIVE_TOOLTIP_SURFACE).toContain("bg-nexus-surface-elevated");
    expect(EXECUTIVE_TOOLTIP_SURFACE).toContain("rounded-executive");
    expect(EXECUTIVE_TOOLTIP_SURFACE).toContain("shadow-inner-executive");
    expect(EXECUTIVE_TOOLTIP_SURFACE).toContain("np-type-meta");
    expect(EXECUTIVE_TOOLTIP_SURFACE).toContain("px-3 py-2");
    expect(EXECUTIVE_TOOLTIP_PLACEMENT).toContain("bottom-full");
    expect(EXECUTIVE_TOOLTIP_PLACEMENT).toContain("mb-2");
    expect(EXECUTIVE_TOOLTIP_MOTION_MS).toBe(EXECUTIVE_MOTION_FAST_MS);
    expect(EXECUTIVE_TOOLTIP_MOTION).toContain("var(--motion-duration-fast)");
    expect(EXECUTIVE_POPOVER_SURFACE).toContain("rounded-panel");
    expect(EXECUTIVE_POPOVER_SURFACE).toContain("shadow-executive");
    expect(EXECUTIVE_POPOVER_SURFACE).toContain("np-type-body");
    expect(EXECUTIVE_POPOVER_PLACEMENT).toContain("top-full");
    expect(EXECUTIVE_POPOVER_PLACEMENT).toContain("mt-2");
    expect(EXECUTIVE_POPOVER_MOTION).toBe(EXECUTIVE_TOOLTIP_MOTION);
    expect(EXECUTIVE_TOOLTIP_SURFACE).not.toContain("aria-hidden");
    expect(EXECUTIVE_POPOVER_SURFACE).not.toContain("aria-hidden");
    expect(contract).not.toContain("function Tooltip");
    expect(contract).not.toContain("function Popover");
  });

  it("defines the shared feedback contract from the existing status palette", () => {
    expect(EXECUTIVE_FEEDBACK_ROLES).toEqual([
      "success",
      "warning",
      "error",
      "info",
    ]);
    expect(EXECUTIVE_FEEDBACK_SUCCESS).toContain("border-status-success/25");
    expect(EXECUTIVE_FEEDBACK_WARNING).toContain("border-status-warning/25");
    expect(EXECUTIVE_FEEDBACK_ERROR).toContain("border-status-risk/25");
    expect(EXECUTIVE_FEEDBACK_ERROR).toContain("text-status-risk");
    expect(EXECUTIVE_FEEDBACK_INFO).toContain("border-status-info/25");
    expect(EXECUTIVE_FEEDBACK_INFO).toContain("text-nexus-cyan-bright");
    expect(EXECUTIVE_FEEDBACK_TITLE).toBe("np-type-meta");
    expect(EXECUTIVE_FEEDBACK_BODY).toContain("np-type-body");
    expect(EXECUTIVE_FEEDBACK_ICON).toContain("h-4 w-4");
    expect(EXECUTIVE_FEEDBACK_ICON).not.toContain("aria-hidden");
    expect(EXECUTIVE_FEEDBACK_ACTION).toBe(EXECUTIVE_BUTTON_TERTIARY);
    expect(EXECUTIVE_FEEDBACK_DISMISS).toBe(EXECUTIVE_BUTTON_ICON);
    expect(EXECUTIVE_FEEDBACK_PLACEMENT).toContain("bottom-4");
    expect(EXECUTIVE_FEEDBACK_PLACEMENT).not.toContain("pointer-events-none");
    expect(EXECUTIVE_FEEDBACK_MOTION).toBe(EXECUTIVE_TOOLTIP_MOTION);
    expect(EXECUTIVE_FEEDBACK_LIVE).toEqual({
      success: "polite",
      warning: "polite",
      error: "assertive",
      info: "polite",
    });
    for (const tone of [
      EXECUTIVE_FEEDBACK_SUCCESS,
      EXECUTIVE_FEEDBACK_WARNING,
      EXECUTIVE_FEEDBACK_ERROR,
      EXECUTIVE_FEEDBACK_INFO,
    ]) {
      expect(tone).toContain("rounded-executive");
      expect(tone).toContain("shadow-inner-executive");
      expect(tone).not.toContain("aria-hidden");
      expect(tone).not.toContain("emerald-");
      expect(tone).not.toContain("red-");
    }
    expect(contract).not.toContain("function Toast");
  });

  it("defines the shared loading contract from existing progress and skeleton patterns", () => {
    expect(EXECUTIVE_LOADING_ROLES).toEqual(["skeleton", "progress", "label"]);
    expect(EXECUTIVE_SKELETON).toContain("rounded-executive");
    expect(EXECUTIVE_SKELETON).toContain("bg-white/[0.06]");
    expect(EXECUTIVE_SKELETON).not.toContain("animate-pulse");
    expect(EXECUTIVE_SKELETON_LINE).toContain("rounded-full");
    expect(EXECUTIVE_SKELETON_LINE).toContain("bg-white/10");
    expect(EXECUTIVE_PROGRESS_TRACK).toContain("h-2");
    expect(EXECUTIVE_PROGRESS_TRACK).toContain("bg-white/10");
    expect(EXECUTIVE_PROGRESS_VALUE).toContain("bg-nexus-gold");
    expect(EXECUTIVE_PROGRESS_VALUE).toContain("var(--motion-duration-context)");
    expect(EXECUTIVE_PROGRESS_VALUE).toContain("motion-reduce:transition-none");
    expect(EXECUTIVE_PROGRESS_MOTION_MS).toBe(EXECUTIVE_MOTION_CONTEXT_MS);
    expect(EXECUTIVE_LOADING_LABEL).toBe("sr-only");
    expect(EXECUTIVE_LOADING_LIVE).toBe("polite");

    const progress = readSource(
      "src/components/executive/executive-progress.tsx",
    );
    expect(progress).toContain('role="progressbar"');
    expect(progress).toContain("aria-valuemin={0}");
    expect(progress).toContain("aria-valuemax={100}");
    expect(progress).toContain("aria-valuenow={safeValue}");
    expect(progress).toContain("EXECUTIVE_PROGRESS_TRACK");
    expect(progress).toContain("EXECUTIVE_PROGRESS_VALUE");
    expect(progress).toContain('style={{ width: `${safeValue}%` }}');
    expect(progress).not.toContain("setTimeout");
    expect(progress).not.toContain("animate-pulse");
    expect(contract).not.toContain("function Skeleton");
  });

  it("defines the shared empty-state contract from existing local layouts", () => {
    expect(EXECUTIVE_EMPTY_VARIANTS).toEqual(["compact", "full"]);
    expect(EXECUTIVE_EMPTY_CONTENT_ROLES).toEqual([
      "icon",
      "eyebrow",
      "title",
      "body",
      "action",
    ]);
    expect(EXECUTIVE_EMPTY_COMPACT).toContain("rounded-executive");
    expect(EXECUTIVE_EMPTY_COMPACT).toContain("border-dashed");
    expect(EXECUTIVE_EMPTY_COMPACT).toContain("border-white/15");
    expect(EXECUTIVE_EMPTY_COMPACT).toContain("bg-white/[0.025]");
    expect(EXECUTIVE_EMPTY_COMPACT).toContain("px-5 py-8");
    expect(EXECUTIVE_EMPTY_FULL).toContain("border-dashed");
    expect(EXECUTIVE_EMPTY_FULL).toContain("p-8");
    expect(EXECUTIVE_EMPTY_FULL).toContain("sm:p-10");
    expect(EXECUTIVE_EMPTY_ICON).toContain("h-12 w-12");
    expect(EXECUTIVE_EMPTY_ICON).toContain("rounded-full");
    expect(EXECUTIVE_EMPTY_ICON_HIDDEN).toBe("true");
    expect(EXECUTIVE_EMPTY_EYEBROW).toContain("np-type-eyebrow");
    expect(EXECUTIVE_EMPTY_TITLE).toContain("np-type-h2");
    expect(EXECUTIVE_EMPTY_BODY).toContain("np-type-body");
    expect(EXECUTIVE_EMPTY_ACTION).toContain(EXECUTIVE_BUTTON_PRIMARY);
    expect(EXECUTIVE_EMPTY_ACTION).not.toContain("href");
    expect(EXECUTIVE_EMPTY_ROLE).toBe("status");
    expect(EXECUTIVE_EMPTY_LIVE).toBe("polite");
    expect(contract).not.toContain("function EmptyState");
    expect(contract).not.toContain("function ExecutiveEmpty");
  });

  it("defines the shared error-state contract from existing alert patterns", () => {
    expect(EXECUTIVE_ERROR_CONTENT_ROLES).toEqual([
      "icon",
      "problem",
      "impact",
      "recovery",
    ]);
    expect(EXECUTIVE_ERROR_SURFACE).toBe(EXECUTIVE_FEEDBACK_ERROR);
    expect(EXECUTIVE_ERROR_SURFACE).toContain("border-status-risk/25");
    expect(EXECUTIVE_ERROR_SURFACE).toContain("bg-status-risk/10");
    expect(EXECUTIVE_ERROR_SURFACE).toContain("rounded-executive");
    expect(EXECUTIVE_ERROR_ICON).toContain(EXECUTIVE_FEEDBACK_ICON);
    expect(EXECUTIVE_ERROR_ICON).toContain("text-status-risk");
    expect(EXECUTIVE_ERROR_ICON_HIDDEN).toBe("true");
    expect(EXECUTIVE_ERROR_PROBLEM).toContain("text-status-risk");
    expect(EXECUTIVE_ERROR_IMPACT).toContain("np-type-body");
    expect(EXECUTIVE_ERROR_RECOVERY).toContain(EXECUTIVE_BUTTON_PRIMARY);
    expect(EXECUTIVE_ERROR_RECOVERY).toContain(EXECUTIVE_FOCUS_GOLD);
    expect(EXECUTIVE_ERROR_RECOVERY).not.toContain("href");
    expect(EXECUTIVE_ERROR_RECOVERY).not.toContain("onClick");
    expect(EXECUTIVE_ERROR_ROLE).toBe("alert");
    expect(EXECUTIVE_ERROR_LIVE).toBe("assertive");
    expect(EXECUTIVE_ERROR_LIVE).toBe(EXECUTIVE_FEEDBACK_LIVE.error);
    expect(contract).not.toContain("function ErrorState");
    expect(contract).not.toContain("function ExecutiveError");
  });

  it("defines the shared workflow stepper presentation contract", () => {
    expect(EXECUTIVE_STEPPER_STATES).toEqual([
      "completed",
      "current",
      "upcoming",
    ]);
    expect(EXECUTIVE_STEPPER_LAYOUTS).toEqual(["horizontal", "compact"]);
    expect(EXECUTIVE_STEPPER_LIST_HORIZONTAL).toContain("overflow-x-auto");
    expect(EXECUTIVE_STEPPER_LIST_HORIZONTAL).toContain("min-w-0");
    expect(EXECUTIVE_STEPPER_LIST_COMPACT).toContain("flex-col");
    expect(EXECUTIVE_STEPPER_SURFACE).toContain("rounded-executive");
    expect(EXECUTIVE_STEPPER_SURFACE).toContain("var(--motion-duration-standard)");
    expect(EXECUTIVE_STEPPER_SURFACE).toContain("motion-reduce:transition-none");
    expect(EXECUTIVE_STEPPER_SURFACE_STATE.completed).toContain("status-success");
    expect(EXECUTIVE_STEPPER_SURFACE_STATE.current).toContain("status-info");
    expect(EXECUTIVE_STEPPER_SURFACE_STATE.upcoming).toContain("bg-white/[0.045]");
    expect(EXECUTIVE_STEPPER_MARKER_STATE.completed).toBe(
      EXECUTIVE_BADGE_SEMANTIC_CLASSES.success,
    );
    expect(EXECUTIVE_STEPPER_MARKER_STATE.current).toBe(
      EXECUTIVE_BADGE_SEMANTIC_CLASSES.info,
    );
    expect(EXECUTIVE_STEPPER_MARKER_STATE.upcoming).toBe(
      EXECUTIVE_BADGE_SEMANTIC_CLASSES.neutral,
    );
    expect(EXECUTIVE_STEPPER_LABEL).toContain("break-words");
    expect(EXECUTIVE_STEPPER_DISABLED).toContain("opacity-60");
    expect(EXECUTIVE_STEPPER_DISABLED).toContain("cursor-not-allowed");
    expect(EXECUTIVE_STEPPER_DISABLED).not.toContain("pointer-events-none");
    expect(EXECUTIVE_STEPPER_FOCUS).toBe(EXECUTIVE_FOCUS_GOLD);
    expect(EXECUTIVE_STEPPER_CURRENT).toBe("step");
    expect(contract).not.toContain("function ExecutiveWorkflowStepper");
  });

  it("defines one executive button system from the existing CTA contract", () => {
    expect(EXECUTIVE_BUTTON_ROLES).toEqual([
      "primary",
      "secondary",
      "tertiary",
      "destructive",
      "icon",
    ]);
    expect(EXECUTIVE_BUTTON_PRIMARY).toContain(EXECUTIVE_CTA_PRIMARY);
    expect(EXECUTIVE_BUTTON_SECONDARY).toContain(EXECUTIVE_CTA_SECONDARY);
    expect(EXECUTIVE_BUTTON_PRIMARY).toContain("disabled:cursor-not-allowed");
    expect(EXECUTIVE_BUTTON_PRIMARY).toContain("disabled:opacity-60");
    expect(EXECUTIVE_BUTTON_SECONDARY).toContain("aria-pressed:bg-nexus-cyan/10");
    expect(EXECUTIVE_BUTTON_TERTIARY).toContain("bg-transparent");
    expect(EXECUTIVE_BUTTON_TERTIARY).not.toContain("from-nexus-gold-deep");
    expect(EXECUTIVE_BUTTON_DESTRUCTIVE).toContain("border-status-risk/25");
    expect(EXECUTIVE_BUTTON_DESTRUCTIVE).toContain("focus-visible:ring-status-risk/40");
    expect(EXECUTIVE_BUTTON_ICON).toContain("h-11 w-11");
    expect(EXECUTIVE_BUTTON_ICON).toContain(EXECUTIVE_FOCUS_CYAN);
    expect(EXECUTIVE_BUTTON_LOADING).toContain("disabled:opacity-60");
    expect(EXECUTIVE_BUTTON_LOADING).toContain("aria-busy:cursor-wait");
    expect(EXECUTIVE_BUTTON_LOADING).not.toContain("animate-");

    for (const button of [
      EXECUTIVE_BUTTON_PRIMARY,
      EXECUTIVE_BUTTON_SECONDARY,
      EXECUTIVE_BUTTON_TERTIARY,
      EXECUTIVE_BUTTON_DESTRUCTIVE,
      EXECUTIVE_BUTTON_ICON,
    ]) {
      expect(button).toContain("focus-visible:ring-2");
      expect(button).toContain("disabled:opacity-60");
      expect(button).not.toContain("hover:scale");
      expect(button).not.toContain("animate-");
    }
  });

  it("defines one executive form-control system from existing field patterns", () => {
    expect(EXECUTIVE_FORM_CONTROL_ROLES).toEqual([
      "input",
      "textarea",
      "select",
      "checkbox",
      "radio",
    ]);
    expect(EXECUTIVE_FORM_STATE_ROLES).toEqual([
      "label",
      "helper",
      "error",
      "disabled",
      "read-only",
    ]);
    expect(EXECUTIVE_FORM_INPUT).toContain("border-white/10");
    expect(EXECUTIVE_FORM_INPUT).toContain("bg-white/[0.045]");
    expect(EXECUTIVE_FORM_INPUT).toContain(EXECUTIVE_FOCUS_GOLD);
    expect(EXECUTIVE_FORM_INPUT).toContain("aria-invalid:border-status-risk");
    expect(EXECUTIVE_FORM_INPUT).toContain(EXECUTIVE_FORM_READONLY);
    expect(EXECUTIVE_FORM_INPUT).toContain(EXECUTIVE_FORM_DISABLED);
    expect(EXECUTIVE_FORM_TEXTAREA).toContain(EXECUTIVE_FORM_INPUT);
    expect(EXECUTIVE_FORM_TEXTAREA).toContain("min-h-28");
    expect(EXECUTIVE_FORM_SELECT).toContain(EXECUTIVE_FORM_INPUT);
    expect(EXECUTIVE_FORM_SELECT).toContain("scheme-dark");
    expect(EXECUTIVE_FORM_CHECKBOX).toContain("h-5 w-5");
    expect(EXECUTIVE_FORM_CHECKBOX).toContain("accent-nexus-gold");
    expect(EXECUTIVE_FORM_CHECKBOX).toContain(EXECUTIVE_FOCUS_GOLD);
    expect(EXECUTIVE_FORM_CHECKBOX).not.toContain("appearance-none");
    expect(EXECUTIVE_FORM_RADIO).toContain("rounded-full");
    expect(EXECUTIVE_FORM_RADIO).toContain("accent-nexus-gold");
    expect(EXECUTIVE_FORM_LABEL).toContain("uppercase");
    expect(EXECUTIVE_FORM_HELPER).toContain("text-nexus-text-secondary");
    expect(EXECUTIVE_FORM_ERROR).toContain("text-status-risk");
    expect(EXECUTIVE_FORM_DISABLED).toContain("disabled:opacity-60");
    expect(EXECUTIVE_FORM_DISABLED).toContain("disabled:cursor-not-allowed");
    expect(EXECUTIVE_FORM_READONLY).toContain("readonly:bg-black/15");
    expect(EXECUTIVE_FORM_READONLY).not.toContain("opacity-60");

    for (const control of [
      EXECUTIVE_FORM_INPUT,
      EXECUTIVE_FORM_TEXTAREA,
      EXECUTIVE_FORM_SELECT,
      EXECUTIVE_FORM_CHECKBOX,
      EXECUTIVE_FORM_RADIO,
    ]) {
      expect(control).toContain("focus-visible:ring-2");
      expect(control).toContain("disabled:opacity-60");
      expect(control).not.toContain("pointer-events-none");
      expect(control).not.toContain("hover:scale");
      expect(control).not.toContain("animate-");
    }
  });

  it("defines the shared deadline control from the form contract", () => {
    expect(EXECUTIVE_DATE_CONTROL_ROLES).toEqual(["datetime", "timezone"]);
    expect(EXECUTIVE_DATE_FIELD).toContain(EXECUTIVE_FORM_INPUT);
    expect(EXECUTIVE_DATE_FIELD).toContain("scheme-dark");
    expect(EXECUTIVE_DATE_FIELD).toContain(EXECUTIVE_FORM_DISABLED);
    expect(EXECUTIVE_DATE_FIELD).toContain(EXECUTIVE_FORM_READONLY);
    expect(EXECUTIVE_DATE_FIELD).toContain("aria-invalid:border-status-risk");
    expect(EXECUTIVE_DATE_TIMEZONE).toBe(EXECUTIVE_FORM_SELECT);
    expect(EXECUTIVE_DATE_TIMEZONE_BADGE).toContain("border-status-info/25");
    expect(EXECUTIVE_DATE_TIMEZONE_BADGE).toContain("text-nexus-cyan-bright");

    const deadlineField = readSource("src/components/deadline-field.tsx");
    expect(deadlineField).toContain("type=\"datetime-local\"");
    expect(deadlineField).toContain("className={EXECUTIVE_DATE_FIELD}");
    expect(deadlineField).toContain("className={EXECUTIVE_DATE_TIMEZONE}");
    expect(deadlineField).toContain("className={EXECUTIVE_DATE_TIMEZONE_BADGE}");
    expect(deadlineField).toContain("aria-invalid={ariaInvalid}");
    expect(deadlineField).toContain("aria-describedby={ariaDescribedBy}");
    expect(deadlineField).toContain("onDateTimeChange(event.target.value)");
    expect(deadlineField).toContain("onTimezoneChange(event.target.value)");
    expect(deadlineField).toContain('value: "America/Toronto"');
    expect(deadlineField).toContain('value: "UTC"');
    expect(deadlineField).not.toContain("toISOString");
    expect(deadlineField).not.toContain("timeZone:");
  });

  it("defines a one-shot attention motion from existing tokens", () => {
    expect(EXECUTIVE_ATTENTION_CLASS).toBe("np-attention");
    expect(contract).toContain('export const EXECUTIVE_ATTENTION_CLASS = "np-attention"');

    const attention = globals.slice(globals.indexOf(".np-attention,"));
    const fade = globals.slice(globals.indexOf("@keyframes np-motion-fade"));
    expect(EXECUTIVE_MOTION_PERFORMANCE_PROPERTIES).toEqual([
      "opacity",
      "transform",
    ]);
    expect(EXECUTIVE_MOTION_OVERLAY_POINTER).toBe("none");
    expect(attention).toContain("animation-name: np-motion-fade;");
    expect(attention).toContain("animation-iteration-count: 1;");
    expect(attention).toContain("animation-fill-mode: none;");
    expect(attention).toContain("pointer-events: none;");
    expect(attention).toContain("opacity: 0;");
    expect(attention).toContain("var(--motion-duration-context)");
    expect(attention).toContain("var(--motion-duration-milestone)");
    expect(attention).toContain("var(--motion-ease-standard)");
    expect(attention).toContain("var(--status-warning)");
    expect(attention).toContain("var(--nexus-gold)");
    expect(attention).toContain("var(--nexus-cyan)");
    expect(fade).toContain("opacity: 1;");
    expect(fade).toContain("opacity: 0;");
    expect(fade).not.toMatch(
      /background-color|box-shadow|width:|height:|\btop:|\bleft:|\bright:|\bbottom:|transform:/,
    );
    expect(attention).not.toContain("infinite");
    expect(attention).not.toContain("scale");
    expect(attention).not.toContain("bounce");
    expect(attention).not.toContain("confetti");
    expect(attention).not.toContain("prefers-reduced-motion");

    expect(cssVariableValue(globals, "--motion-duration-context")).toBe(
      "300ms",
    );
    expect(cssVariableValue(globals, "--motion-duration-milestone")).toBe(
      "650ms",
    );
    expect(cssVariableValue(globals, "--motion-ease-standard")).toBe(
      "cubic-bezier(0.2,0,0,1)",
    );

    const reduced = globals.slice(
      globals.indexOf("@media (prefers-reduced-motion: reduce)"),
      globals.indexOf("@media print"),
    );
    expect(reduced).toContain("animation-name: none !important;");
    expect(reduced).toContain("animation-duration: 0.01ms !important;");
    expect(reduced).toContain("animation-iteration-count: 1 !important;");
    expect(reduced).toContain("transition-property: none !important;");

    for (const file of [
      ...sourceFiles("src/app"),
      ...sourceFiles("src/components"),
    ]) {
      expect(readSource(file), file).not.toContain(EXECUTIVE_ATTENTION_CLASS);
    }
  });
});
