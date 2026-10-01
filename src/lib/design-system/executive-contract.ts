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

export const EXECUTIVE_BADGE_ROLES = [
  "success",
  "warning",
  "risk",
  "info",
  "neutral",
  "gold",
  "board",
] as const;

export type ExecutiveBadgeRole = (typeof EXECUTIVE_BADGE_ROLES)[number];

export const EXECUTIVE_BADGE_TONE_ALIASES: Record<
  ExecutiveContractBadgeTone,
  ExecutiveBadgeRole
> = {
  neutral: "neutral",
  locked: "neutral",
  blue: "info",
  gold: "gold",
  recommended: "gold",
  risk: "risk",
  success: "success",
  awarded: "success",
  warning: "warning",
  pending: "warning",
  board: "board",
  live: "board",
};

export const EXECUTIVE_BADGE_SEMANTIC_CLASSES: Record<
  ExecutiveBadgeRole,
  string
> = {
  success:
    "border-status-success/25 bg-status-success/10 text-status-success",
  warning:
    "border-status-warning/25 bg-status-warning/10 text-status-warning",
  risk: "border-status-risk/25 bg-status-risk/10 text-status-risk",
  info: "border-status-info/25 bg-status-info/10 text-nexus-cyan-bright",
  neutral: "border-nexus-border-subtle bg-white/[0.06] text-status-neutral",
  gold: "border-nexus-gold/25 bg-nexus-gold/10 text-nexus-gold-bright",
  board: "border-nexus-gold/30 bg-nexus-gold/10 text-nexus-gold",
};

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

const EXECUTIVE_BUTTON_DISABLED = [
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
].join(" ");

export const EXECUTIVE_BUTTON_ROLES = [
  "primary",
  "secondary",
  "tertiary",
  "destructive",
  "icon",
] as const;

export type ExecutiveButtonRole = (typeof EXECUTIVE_BUTTON_ROLES)[number];

export const EXECUTIVE_BUTTON_PRIMARY = [
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_BUTTON_DISABLED,
].join(" ");

export const EXECUTIVE_BUTTON_SECONDARY = [
  EXECUTIVE_CTA_SECONDARY,
  "aria-pressed:border-nexus-cyan/25 aria-pressed:bg-nexus-cyan/10",
  EXECUTIVE_BUTTON_DISABLED,
].join(" ");

export const EXECUTIVE_BUTTON_TERTIARY = [
  "inline-flex min-h-14 items-center justify-center rounded-2xl bg-transparent px-6",
  "text-sm font-black text-nexus-text-secondary",
  "transition-[background-color,color] duration-200 hover:bg-white/[0.08] hover:text-white",
  "aria-pressed:bg-nexus-cyan/10 aria-pressed:text-nexus-text-primary",
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_BUTTON_DISABLED,
].join(" ");

export const EXECUTIVE_BUTTON_DESTRUCTIVE = [
  "inline-flex min-h-14 items-center justify-center rounded-2xl",
  "border border-status-risk/25 bg-status-risk/10 px-6 text-sm font-black text-status-risk",
  "transition-[background-color] duration-200 hover:bg-status-risk/15",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-risk/40 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy",
  EXECUTIVE_BUTTON_DISABLED,
].join(" ");

export const EXECUTIVE_BUTTON_ICON = [
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
  "border border-white/10 bg-white/[0.045] text-white",
  "transition-[border-color,background-color] duration-200",
  "hover:border-nexus-cyan/25 hover:bg-white/[0.08]",
  "aria-pressed:border-nexus-cyan/25 aria-pressed:bg-nexus-cyan/10",
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_BUTTON_DISABLED,
].join(" ");

export const EXECUTIVE_BUTTON_LOADING = [
  EXECUTIVE_BUTTON_DISABLED,
  "aria-busy:cursor-wait",
].join(" ");

const EXECUTIVE_FORM_FIELD = [
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none",
  "placeholder:text-slate-400",
  "transition-[border-color,background-color] duration-200 hover:border-white/20",
  "aria-invalid:border-status-risk",
  "readonly:bg-black/15 readonly:text-slate-400",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

export const EXECUTIVE_FORM_CONTROL_ROLES = [
  "input",
  "textarea",
  "select",
  "checkbox",
  "radio",
] as const;

export type ExecutiveFormControlRole =
  (typeof EXECUTIVE_FORM_CONTROL_ROLES)[number];

export const EXECUTIVE_FORM_STATE_ROLES = [
  "label",
  "helper",
  "error",
  "disabled",
  "read-only",
] as const;

export type ExecutiveFormStateRole =
  (typeof EXECUTIVE_FORM_STATE_ROLES)[number];

export const EXECUTIVE_FORM_INPUT = EXECUTIVE_FORM_FIELD;

export const EXECUTIVE_FORM_TEXTAREA = [EXECUTIVE_FORM_FIELD, "min-h-28"].join(
  " ",
);

export const EXECUTIVE_FORM_SELECT = [EXECUTIVE_FORM_FIELD, "scheme-dark"].join(
  " ",
);

export const EXECUTIVE_FORM_CHECKBOX = [
  "mt-1 h-5 w-5 shrink-0 rounded border border-white/20 bg-white/[0.045] accent-nexus-gold",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

export const EXECUTIVE_FORM_RADIO = [
  "mt-1 h-5 w-5 shrink-0 rounded-full border border-white/20 bg-white/[0.045] accent-nexus-gold",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

export const EXECUTIVE_FORM_LABEL =
  "text-[11px] font-black uppercase tracking-[0.18em] text-slate-500";

export const EXECUTIVE_FORM_HELPER =
  "text-xs font-semibold text-nexus-text-secondary";

export const EXECUTIVE_FORM_ERROR = "text-sm font-semibold text-status-risk";

export const EXECUTIVE_FORM_DISABLED =
  "disabled:cursor-not-allowed disabled:opacity-60";

export const EXECUTIVE_FORM_READONLY =
  "readonly:bg-black/15 readonly:text-slate-400";

export const EXECUTIVE_DATE_CONTROL_ROLES = ["datetime", "timezone"] as const;

export type ExecutiveDateControlRole =
  (typeof EXECUTIVE_DATE_CONTROL_ROLES)[number];

export const EXECUTIVE_DATE_FIELD = [
  EXECUTIVE_FORM_INPUT,
  "scheme-dark",
].join(" ");

export const EXECUTIVE_DATE_TIMEZONE = EXECUTIVE_FORM_SELECT;

export const EXECUTIVE_DATE_TIMEZONE_BADGE = [
  "w-fit rounded-full border border-status-info/25 bg-status-info/10 px-3 py-1",
  "text-xs font-black uppercase tracking-[0.12em] text-nexus-cyan-bright",
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

export const EXECUTIVE_CARD_ROLES = [
  "status",
  "metric",
  "action",
  "intelligence",
  "summary",
] as const;

export type ExecutiveCardRole = (typeof EXECUTIVE_CARD_ROLES)[number];

/** Tile radius for compact roles; panel radius for composition roles. */
export const EXECUTIVE_CARD_ROLE_DEPTH: Record<
  ExecutiveCardRole,
  ExecutiveDepthRole
> = {
  status: "tile",
  metric: "tile",
  action: "panel",
  intelligence: "panel",
  summary: "panel",
};

export const EXECUTIVE_CARD_ROLE_SURFACE: Record<
  ExecutiveCardRole,
  ExecutiveSurfaceRole
> = {
  status: "muted",
  metric: "elevated",
  action: "elevated",
  intelligence: "elevated",
  summary: "base",
};

export const EXECUTIVE_CARD_ROLE_RADIUS: Record<ExecutiveCardRole, string> = {
  status: "rounded-executive",
  metric: "rounded-executive",
  action: "rounded-panel",
  intelligence: "rounded-panel",
  summary: "rounded-panel",
};

export const EXECUTIVE_CARD_ROLE_ELEVATION: Record<ExecutiveCardRole, string> =
  {
    status: "shadow-inner-executive",
    metric: "shadow-inner-executive",
    action: "shadow-executive",
    intelligence: "shadow-executive",
    summary: "shadow-executive",
  };

export const EXECUTIVE_CARD_INTELLIGENCE_CLASS =
  EXECUTIVE_INTELLIGENCE_SURFACE_CLASS;

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

export const EXECUTIVE_LOGO_DARK_VARIANTS = ["icon", "horizontal"] as const;

export type ExecutiveLogoDarkVariant =
  (typeof EXECUTIVE_LOGO_DARK_VARIANTS)[number];

export const EXECUTIVE_LOGO_DARK_MIN_SIZE_PX = 32;
export const EXECUTIVE_LOGO_CLEAR_SPACE_PX = 12;
export const EXECUTIVE_LOGO_DARK_CLASS = "np-logo-dark";
