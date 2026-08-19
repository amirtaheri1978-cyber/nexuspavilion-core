/**
 * Frozen executive design-system contract for Task 22 B01–B05.
 * Tokens match the live dark enterprise language. Do not invent a second kit.
 */

export const EXECUTIVE_NAVY = "#07111F";
export const EXECUTIVE_GOLD = "#C8A646";
export const EXECUTIVE_GOLD_DEEP = "#B9902F";
export const EXECUTIVE_GOLD_BRIGHT = "#F5D77B";
export const EXECUTIVE_CYAN = "#2CC4E8";
export const EXECUTIVE_CYAN_BRIGHT = "#9BE8F8";
export const EXECUTIVE_TEXT_MUTED = "#94A3B8";

export const EXECUTIVE_PANEL_RADIUS_PX = 32;
export const EXECUTIVE_TILE_RADIUS_PX = 24;
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

export const EXECUTIVE_FOCUS_GOLD =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]";

export const EXECUTIVE_FOCUS_CYAN =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]";

export const EXECUTIVE_CTA_PRIMARY = [
  "inline-flex min-h-14 items-center justify-center rounded-2xl",
  "bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B]",
  "px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950",
  "shadow-[0_18px_55px_rgba(200,166,70,0.3)]",
  "transition-[box-shadow] duration-200 hover:shadow-[0_22px_65px_rgba(200,166,70,0.34)]",
  EXECUTIVE_FOCUS_GOLD,
].join(" ");

export const EXECUTIVE_CTA_SECONDARY = [
  "inline-flex min-h-14 items-center justify-center rounded-2xl",
  "border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white",
  "transition-[border-color,background-color] duration-200",
  "hover:border-[#2CC4E8]/25 hover:bg-white/[0.08]",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

export const EXECUTIVE_PAGE_CLASS =
  "np-page mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-8 lg:px-10 lg:py-8";
