/**
 * Frozen executive design-system contract for Task 22 B01–B05.
 * Tokens match the live dark enterprise language. Do not invent a second kit.
 */

/**
 * Frozen mirrors of the :root semantic tokens in globals.css.
 * Rendered styles use the nexus-* theme names, which read those variables.
 */
export const EXECUTIVE_NAVY = "#07111F";
export const EXECUTIVE_GOLD = "#C8A646";
export const EXECUTIVE_GOLD_DEEP = "#B9902F";
export const EXECUTIVE_GOLD_BRIGHT = "#F5D77B";
export const EXECUTIVE_CYAN = "#2CC4E8";
export const EXECUTIVE_CYAN_BRIGHT = "#9BE8F8";
export const EXECUTIVE_TEXT_MUTED = "#94A3B8";

/** Tile radius. `rounded-executive` and `rounded-tile` read `--radius-tile`. */
export const EXECUTIVE_TILE_RADIUS_PX = 24;
/** Panel radius. `rounded-panel` and `rounded-modal` read `--radius-panel`. */
export const EXECUTIVE_PANEL_RADIUS_PX = 32;
export const EXECUTIVE_MODAL_RADIUS_PX = EXECUTIVE_PANEL_RADIUS_PX;
export const EXECUTIVE_CONTENT_MAX_WIDTH_PX = 1680;
export const EXECUTIVE_SIDEBAR_WIDTH_PX = 330;
export const EXECUTIVE_REGION_GAP_PX = 24;
export const EXECUTIVE_REGION_MAJOR_GAP_PX = 32;

export const EXECUTIVE_BADGE_TONES = [
  "neutral",
  "locked",
  "blue",
  "gold",
  "recommended",
  "risk",
  "success",
  "awarded",
  "warning",
  "pending",
  "board",
  "live",
] as const;

export type ExecutiveContractBadgeTone = (typeof EXECUTIVE_BADGE_TONES)[number];

export const EXECUTIVE_STATUS_ROLES = [
  "success",
  "warning",
  "risk",
  "info",
  "neutral",
] as const;

export type ExecutiveStatusRole = (typeof EXECUTIVE_STATUS_ROLES)[number];

export const EXECUTIVE_FOCUS_GOLD =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy";

export const EXECUTIVE_FOCUS_CYAN =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy";

export const EXECUTIVE_CTA_PRIMARY = [
  "inline-flex min-h-14 items-center justify-center rounded-2xl",
  "bg-gradient-to-r from-nexus-gold-deep via-nexus-gold to-nexus-gold-bright",
  "px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950",
  "shadow-cta-gold",
  "transition-[box-shadow] duration-200 hover:shadow-cta-gold-hover",
  EXECUTIVE_FOCUS_GOLD,
].join(" ");

export const EXECUTIVE_CTA_SECONDARY = [
  "inline-flex min-h-14 items-center justify-center rounded-2xl",
  "border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white",
  "transition-[border-color,background-color] duration-200",
  "hover:border-nexus-cyan/25 hover:bg-white/[0.08]",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

export const EXECUTIVE_PAGE_CLASS = "np-page";

export const EXECUTIVE_TYPE_ROLES = [
  "eyebrow",
  "h1",
  "h2",
  "h3",
  "body",
  "meta",
  "kpi",
] as const;

export type ExecutiveTypeRole = (typeof EXECUTIVE_TYPE_ROLES)[number];

export const EXECUTIVE_LAYOUT_ROLES = [
  "content",
  "sidebar",
  "page",
  "region",
  "region-major",
] as const;

export type ExecutiveLayoutRole = (typeof EXECUTIVE_LAYOUT_ROLES)[number];

export const EXECUTIVE_SURFACE_ROLES = ["base", "elevated", "muted"] as const;

export type ExecutiveSurfaceRole = (typeof EXECUTIVE_SURFACE_ROLES)[number];

export const EXECUTIVE_BORDER_ROLES = ["subtle", "strong"] as const;

export type ExecutiveBorderRole = (typeof EXECUTIVE_BORDER_ROLES)[number];

export const EXECUTIVE_DEPTH_ROLES = ["tile", "panel", "modal"] as const;

export type ExecutiveDepthRole = (typeof EXECUTIVE_DEPTH_ROLES)[number];

export const EXECUTIVE_INTELLIGENCE_ROLES = [
  "accent",
  "surface",
  "mark",
] as const;

export type ExecutiveIntelligenceRole =
  (typeof EXECUTIVE_INTELLIGENCE_ROLES)[number];

export const EXECUTIVE_INTELLIGENCE_SURFACE_CLASS = "np-intelligence";
export const EXECUTIVE_INTELLIGENCE_ACCENT_CLASS = "np-intelligence-accent";
export const EXECUTIVE_INTELLIGENCE_MARK_CLASS = "np-intelligence-mark";

export const EXECUTIVE_INTERACTION_ROLES = [
  "focus",
  "hover",
  "selected",
  "disabled",
] as const;

export type ExecutiveInteractionRole =
  (typeof EXECUTIVE_INTERACTION_ROLES)[number];

export const EXECUTIVE_CONTROL_CLASS = "np-control";

export const EXECUTIVE_MOTION_ROLES = [
  "fast",
  "standard",
  "context",
  "milestone",
] as const;

export type ExecutiveMotionRole = (typeof EXECUTIVE_MOTION_ROLES)[number];

export const EXECUTIVE_MOTION_FAST_MS = 140;
export const EXECUTIVE_MOTION_STANDARD_MS = 220;
export const EXECUTIVE_MOTION_CONTEXT_MS = 300;
export const EXECUTIVE_MOTION_MILESTONE_MS = 650;

export const EXECUTIVE_MOTION_EASE_ROLES = ["standard"] as const;

export type ExecutiveMotionEaseRole =
  (typeof EXECUTIVE_MOTION_EASE_ROLES)[number];

export const EXECUTIVE_MOTION_EASE_STANDARD = "cubic-bezier(0.2, 0, 0, 1)";

export const EXECUTIVE_MOTION_REDUCE_DURATION = "0.01ms";
