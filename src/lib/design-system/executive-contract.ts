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

export const EXECUTIVE_DIALOG_ROLES = [
  "overlay",
  "surface",
  "title",
  "body",
  "actions",
  "confirm",
  "cancel",
  "destructive",
] as const;

export type ExecutiveDialogRole = (typeof EXECUTIVE_DIALOG_ROLES)[number];

export const EXECUTIVE_DIALOG_OVERLAY =
  "fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center";

export const EXECUTIVE_DIALOG_SURFACE =
  "w-full max-w-lg rounded-panel border border-white/10 bg-nexus-navy p-6 shadow-executive sm:p-8";

export const EXECUTIVE_DIALOG_TITLE = "np-type-h2";

export const EXECUTIVE_DIALOG_BODY = "np-type-body mt-4";

export const EXECUTIVE_DIALOG_ACTIONS =
  "mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end";

export const EXECUTIVE_DIALOG_CONFIRM = EXECUTIVE_BUTTON_PRIMARY;

export const EXECUTIVE_DIALOG_CANCEL = EXECUTIVE_BUTTON_SECONDARY;

export const EXECUTIVE_DIALOG_DESTRUCTIVE = EXECUTIVE_BUTTON_DESTRUCTIVE;

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

export const EXECUTIVE_DRAWER_ROLES = [
  "overlay",
  "surface",
  "header",
  "body",
  "footer",
  "close",
  "intelligence",
] as const;

export type ExecutiveDrawerRole = (typeof EXECUTIVE_DRAWER_ROLES)[number];

export const EXECUTIVE_DRAWER_OVERLAY =
  "fixed inset-0 z-[80] flex justify-end bg-black/70";

export const EXECUTIVE_DRAWER_SURFACE = [
  "flex h-full w-full max-w-[var(--layout-sidebar-width)] flex-col",
  "rounded-l-[var(--radius-panel)] border-l border-white/10 bg-nexus-navy shadow-executive",
].join(" ");

export const EXECUTIVE_DRAWER_HEADER =
  "flex items-start justify-between gap-4 border-b border-white/10 p-6";

export const EXECUTIVE_DRAWER_TITLE = "np-type-h2";

export const EXECUTIVE_DRAWER_BODY = "min-h-0 flex-1 overflow-y-auto p-6 np-type-body";

export const EXECUTIVE_DRAWER_FOOTER = "border-t border-white/10 p-6";

export const EXECUTIVE_DRAWER_CLOSE = EXECUTIVE_BUTTON_ICON;

export const EXECUTIVE_DRAWER_INTELLIGENCE = EXECUTIVE_CARD_INTELLIGENCE_CLASS;

export const EXECUTIVE_TABLE_ROLES = [
  "container",
  "header",
  "cell",
  "numeric",
  "sort",
  "filter",
] as const;

export type ExecutiveTableRole = (typeof EXECUTIVE_TABLE_ROLES)[number];

export const EXECUTIVE_TABLE_CONTAINER =
  "min-w-0 overflow-x-auto rounded-executive border border-white/10";

export const EXECUTIVE_TABLE = "w-full min-w-full border-collapse text-left";

export const EXECUTIVE_TABLE_HEADER = [
  "sticky top-0 z-10 bg-nexus-navy",
  "np-type-meta px-3 py-3 text-left align-middle",
].join(" ");

export const EXECUTIVE_TABLE_NUMERIC_HEADER = [
  "sticky top-0 z-10 bg-nexus-navy",
  "np-type-meta px-3 py-3 text-right align-middle",
].join(" ");

export const EXECUTIVE_TABLE_CELL =
  "px-3 py-3 text-left align-middle text-sm font-medium text-nexus-text-primary";

export const EXECUTIVE_TABLE_NUMERIC =
  "px-3 py-3 text-right align-middle text-sm font-medium tabular-nums text-nexus-text-primary";

const EXECUTIVE_TABLE_ACTIVE = [
  "bg-nexus-cyan/10 text-nexus-cyan-bright",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

export const EXECUTIVE_TABLE_SORT_ACTIVE = EXECUTIVE_TABLE_ACTIVE;
export const EXECUTIVE_TABLE_FILTER_ACTIVE = EXECUTIVE_TABLE_ACTIVE;

export const EXECUTIVE_TABLE_CAPTION = "sr-only";

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

export const EXECUTIVE_TOOLTIP_ROLES = [
  "surface",
  "placement",
  "timing",
] as const;

export type ExecutiveTooltipRole = (typeof EXECUTIVE_TOOLTIP_ROLES)[number];

export const EXECUTIVE_TOOLTIP_MOTION_MS = EXECUTIVE_MOTION_FAST_MS;

export const EXECUTIVE_TOOLTIP_SURFACE = [
  "rounded-executive border border-white/10 bg-nexus-surface-elevated",
  "px-3 py-2 np-type-meta text-nexus-text-primary shadow-inner-executive",
].join(" ");

export const EXECUTIVE_TOOLTIP_PLACEMENT =
  "absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2";

export const EXECUTIVE_TOOLTIP_MOTION =
  "transition-opacity duration-[var(--motion-duration-fast)]";

export const EXECUTIVE_POPOVER_SURFACE = [
  "rounded-panel border border-white/10 bg-nexus-surface-elevated",
  "p-4 np-type-body text-nexus-text-primary shadow-executive",
].join(" ");

export const EXECUTIVE_POPOVER_PLACEMENT = "absolute top-full left-0 z-20 mt-2";

export const EXECUTIVE_POPOVER_MOTION = EXECUTIVE_TOOLTIP_MOTION;

export const EXECUTIVE_FEEDBACK_ROLES = [
  "success",
  "warning",
  "error",
  "info",
] as const;

export type ExecutiveFeedbackRole = (typeof EXECUTIVE_FEEDBACK_ROLES)[number];

const EXECUTIVE_FEEDBACK_SHELL =
  "rounded-executive border px-4 py-3 shadow-inner-executive";

export const EXECUTIVE_FEEDBACK_SUCCESS = [
  EXECUTIVE_FEEDBACK_SHELL,
  "border-status-success/25 bg-status-success/10 text-status-success",
].join(" ");

export const EXECUTIVE_FEEDBACK_WARNING = [
  EXECUTIVE_FEEDBACK_SHELL,
  "border-status-warning/25 bg-status-warning/10 text-status-warning",
].join(" ");

export const EXECUTIVE_FEEDBACK_ERROR = [
  EXECUTIVE_FEEDBACK_SHELL,
  "border-status-risk/25 bg-status-risk/10 text-status-risk",
].join(" ");

export const EXECUTIVE_FEEDBACK_INFO = [
  EXECUTIVE_FEEDBACK_SHELL,
  "border-status-info/25 bg-status-info/10 text-nexus-cyan-bright",
].join(" ");

export const EXECUTIVE_FEEDBACK_TITLE = "np-type-meta";

export const EXECUTIVE_FEEDBACK_BODY = "mt-1 np-type-body text-nexus-text-primary";

export const EXECUTIVE_FEEDBACK_ICON = "mt-0.5 h-4 w-4 shrink-0";

export const EXECUTIVE_FEEDBACK_ACTION = EXECUTIVE_BUTTON_TERTIARY;

export const EXECUTIVE_FEEDBACK_DISMISS = EXECUTIVE_BUTTON_ICON;

export const EXECUTIVE_FEEDBACK_PLACEMENT =
  "fixed bottom-4 right-4 z-40 flex w-full max-w-sm flex-col gap-3";

export const EXECUTIVE_FEEDBACK_MOTION = EXECUTIVE_TOOLTIP_MOTION;

export const EXECUTIVE_FEEDBACK_LIVE: Record<ExecutiveFeedbackRole, string> = {
  success: "polite",
  warning: "polite",
  error: "assertive",
  info: "polite",
};

export const EXECUTIVE_LOADING_ROLES = [
  "skeleton",
  "progress",
  "label",
] as const;

export type ExecutiveLoadingRole = (typeof EXECUTIVE_LOADING_ROLES)[number];

export const EXECUTIVE_SKELETON =
  "rounded-executive bg-white/[0.06]";

export const EXECUTIVE_SKELETON_LINE = "h-3 rounded-full bg-white/10";

export const EXECUTIVE_PROGRESS_TRACK =
  "h-2 overflow-hidden rounded-full bg-white/10";

export const EXECUTIVE_PROGRESS_VALUE = [
  "h-full rounded-full bg-nexus-gold",
  "transition-[width] duration-[var(--motion-duration-context)]",
  "motion-reduce:transition-none",
].join(" ");

export const EXECUTIVE_PROGRESS_MOTION_MS = EXECUTIVE_MOTION_CONTEXT_MS;

export const EXECUTIVE_LOADING_LABEL = "sr-only";

export const EXECUTIVE_LOADING_LIVE = "polite";

export const EXECUTIVE_EMPTY_VARIANTS = ["compact", "full"] as const;

export type ExecutiveEmptyVariant = (typeof EXECUTIVE_EMPTY_VARIANTS)[number];

export const EXECUTIVE_EMPTY_CONTENT_ROLES = [
  "icon",
  "eyebrow",
  "title",
  "body",
  "action",
] as const;

export type ExecutiveEmptyContentRole =
  (typeof EXECUTIVE_EMPTY_CONTENT_ROLES)[number];

const EXECUTIVE_EMPTY_SURFACE =
  "rounded-executive border border-dashed border-white/15 bg-white/[0.025] text-center";

export const EXECUTIVE_EMPTY_COMPACT = `${EXECUTIVE_EMPTY_SURFACE} px-5 py-8`;

export const EXECUTIVE_EMPTY_FULL = `${EXECUTIVE_EMPTY_SURFACE} p-8 sm:p-10`;

export const EXECUTIVE_EMPTY_ICON =
  "mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]";

export const EXECUTIVE_EMPTY_ICON_HIDDEN = "true";

export const EXECUTIVE_EMPTY_EYEBROW = "np-type-eyebrow mt-5";

export const EXECUTIVE_EMPTY_TITLE = "np-type-h2 mt-4";

export const EXECUTIVE_EMPTY_BODY = "np-type-body mx-auto mt-3 max-w-2xl";

export const EXECUTIVE_EMPTY_ACTION = `mt-7 ${EXECUTIVE_BUTTON_PRIMARY}`;

export const EXECUTIVE_EMPTY_ROLE = "status";

export const EXECUTIVE_EMPTY_LIVE = "polite";

export const EXECUTIVE_ERROR_CONTENT_ROLES = [
  "icon",
  "problem",
  "impact",
  "recovery",
] as const;

export type ExecutiveErrorContentRole =
  (typeof EXECUTIVE_ERROR_CONTENT_ROLES)[number];

export const EXECUTIVE_ERROR_SURFACE = EXECUTIVE_FEEDBACK_ERROR;

export const EXECUTIVE_ERROR_ICON = `${EXECUTIVE_FEEDBACK_ICON} text-status-risk`;

export const EXECUTIVE_ERROR_ICON_HIDDEN = "true";

export const EXECUTIVE_ERROR_PROBLEM = "text-sm font-black leading-6 text-status-risk";

export const EXECUTIVE_ERROR_IMPACT = "mt-1 np-type-body text-nexus-text-primary";

export const EXECUTIVE_ERROR_RECOVERY = `mt-4 ${EXECUTIVE_BUTTON_PRIMARY}`;

export const EXECUTIVE_ERROR_ROLE = "alert";

export const EXECUTIVE_ERROR_LIVE = EXECUTIVE_FEEDBACK_LIVE.error;

export const EXECUTIVE_ERROR_HIGHLIGHT_CLASS = "np-error-recovery";

export const EXECUTIVE_STEPPER_STATES = [
  "completed",
  "current",
  "upcoming",
] as const;

export type ExecutiveStepperState = (typeof EXECUTIVE_STEPPER_STATES)[number];

export const EXECUTIVE_STEPPER_LAYOUTS = ["horizontal", "compact"] as const;

export type ExecutiveStepperLayout =
  (typeof EXECUTIVE_STEPPER_LAYOUTS)[number];

export const EXECUTIVE_STEPPER_LIST_HORIZONTAL =
  "flex min-w-0 gap-3 overflow-x-auto";

export const EXECUTIVE_STEPPER_LIST_COMPACT = "flex min-w-0 flex-col gap-3";

export const EXECUTIVE_STEPPER_ITEM_HORIZONTAL = "min-w-0 w-48 shrink-0";

export const EXECUTIVE_STEPPER_ITEM_COMPACT = "min-w-0 w-full";

export const EXECUTIVE_STEPPER_SURFACE = [
  "flex min-w-0 items-start gap-3 rounded-executive border p-4 text-left",
  "transition-[border-color,background-color] duration-[var(--motion-duration-standard)]",
  "motion-reduce:transition-none",
].join(" ");

export const EXECUTIVE_STEPPER_SURFACE_STATE: Record<
  ExecutiveStepperState,
  string
> = {
  completed: "border-status-success/25 bg-status-success/10",
  current: "border-status-info/25 bg-status-info/10",
  upcoming: "border-white/10 bg-white/[0.045]",
};

export const EXECUTIVE_STEPPER_MARKER =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-black";

export const EXECUTIVE_STEPPER_MARKER_STATE: Record<
  ExecutiveStepperState,
  string
> = {
  completed: EXECUTIVE_BADGE_SEMANTIC_CLASSES.success,
  current: EXECUTIVE_BADGE_SEMANTIC_CLASSES.info,
  upcoming: EXECUTIVE_BADGE_SEMANTIC_CLASSES.neutral,
};

export const EXECUTIVE_STEPPER_LABEL =
  "mt-1 block break-words text-sm font-black text-nexus-text-primary";

export const EXECUTIVE_STEPPER_DESCRIPTION = "mt-1 block break-words np-type-body";

export const EXECUTIVE_STEPPER_DISABLED = "cursor-not-allowed opacity-60";

export const EXECUTIVE_STEPPER_FOCUS = EXECUTIVE_FOCUS_GOLD;

export const EXECUTIVE_STEPPER_CURRENT = "step";

export const EXECUTIVE_LOGO_DARK_VARIANTS = ["icon", "horizontal"] as const;

export type ExecutiveLogoDarkVariant =
  (typeof EXECUTIVE_LOGO_DARK_VARIANTS)[number];

export const EXECUTIVE_LOGO_DARK_MIN_SIZE_PX = 32;
export const EXECUTIVE_LOGO_CLEAR_SPACE_PX = 12;
export const EXECUTIVE_LOGO_DARK_CLASS = "np-logo-dark";

export const EXECUTIVE_ATTENTION_CLASS = "np-attention";

export const EXECUTIVE_MOTION_PERFORMANCE_PROPERTIES = [
  "opacity",
  "transform",
] as const;

export type ExecutiveMotionPerformanceProperty =
  (typeof EXECUTIVE_MOTION_PERFORMANCE_PROPERTIES)[number];

export const EXECUTIVE_MOTION_OVERLAY_POINTER = "none";
