export type CorporateHeroRenderSizeInput = {
  containerWidth: number;
  containerHeight: number;
  layoutViewportWidth: number;
  layoutViewportHeight: number;
  screenHeight: number;
  visualViewportHeight: number;
  devicePixelRatio: number;
};

export type CorporateHeroRenderSize = {
  width: number;
  height: number;
  pixelRatio: number;
  aspect: number;
  heightClamped: boolean;
};

/** Matches the existing hero renderer pixel-ratio ceiling. */
export const CORPORATE_HERO_MAX_PIXEL_RATIO = 1.8;

/**
 * Practical drawing-buffer edge budget. Kept well below common
 * MAX_TEXTURE_SIZE values so composer/bloom targets stay allocatable.
 */
export const CORPORATE_HERO_MAX_BUFFER_EDGE = 8192;

/**
 * Hard CSS-pixel height ceiling for the hero drawing surface. Above any
 * practical single-viewport hero, far below full-document Lighthouse heights.
 */
export const CORPORATE_HERO_ABSOLUTE_MAX_CSS_HEIGHT = 2560;

/**
 * Maximum accepted height/width for a single hero viewport. Document-tall
 * expanded viewports exceed this even when screen APIs are also inflated.
 */
export const CORPORATE_HERO_MAX_HEIGHT_WIDTH_RATIO = 2.75;

/**
 * Clamp only when layout height is clearly pathological relative to the
 * trusted safe ceiling (e.g. Lighthouse full-page expansion).
 */
export const CORPORATE_HERO_HEIGHT_CLAMP_TRIGGER_RATIO = 1.25;

/** Fallback ceiling when screen/visualViewport APIs are unavailable. */
export const CORPORATE_HERO_FALLBACK_SAFE_HEIGHT = 1200;

function positiveDimension(value: number, fallback: number): number {
  const resolved = Number.isFinite(value) && value > 0 ? value : fallback;
  return Math.max(1, Math.floor(resolved));
}

function resolveSafeHeightCeiling(width: number, screenHeight: number, visualViewportHeight: number): number {
  const aspectBound = Math.max(
    Math.ceil(width * CORPORATE_HERO_MAX_HEIGHT_WIDTH_RATIO),
    CORPORATE_HERO_FALLBACK_SAFE_HEIGHT,
  );
  const displayBound = Math.max(
    screenHeight > 0 ? Math.floor(screenHeight) : 0,
    visualViewportHeight > 0 ? Math.floor(visualViewportHeight) : 0,
  );

  // Ignore display metrics that have themselves been stretched with the layout viewport.
  const trustedDisplay =
    displayBound > 0 &&
    displayBound <= CORPORATE_HERO_ABSOLUTE_MAX_CSS_HEIGHT &&
    displayBound <= aspectBound * 1.1
      ? displayBound
      : 0;

  return Math.min(
    CORPORATE_HERO_ABSOLUTE_MAX_CSS_HEIGHT,
    trustedDisplay > 0 ? trustedDisplay : aspectBound,
  );
}

/**
 * Resolve CSS-pixel renderer dimensions for the corporate hero WebGL surface.
 * Normal desktop/mobile viewports pass through unchanged; elongated layout
 * viewports are height-clamped before pixel-ratio application.
 */
export function resolveCorporateHeroRenderSize(
  input: CorporateHeroRenderSizeInput,
): CorporateHeroRenderSize {
  const width = positiveDimension(
    input.containerWidth,
    positiveDimension(input.layoutViewportWidth, 1),
  );
  const unconstrainedHeight = positiveDimension(
    input.containerHeight,
    positiveDimension(input.layoutViewportHeight, 1),
  );

  const safeCeiling = resolveSafeHeightCeiling(
    width,
    input.screenHeight,
    input.visualViewportHeight,
  );

  const heightClamped =
    unconstrainedHeight > safeCeiling * CORPORATE_HERO_HEIGHT_CLAMP_TRIGGER_RATIO;
  let height = heightClamped
    ? Math.min(unconstrainedHeight, safeCeiling)
    : unconstrainedHeight;

  // Cap CSS edges first so a floor of 1.0 device pixel cannot blow the buffer budget.
  const renderWidth = Math.min(width, CORPORATE_HERO_MAX_BUFFER_EDGE);
  height = Math.min(height, CORPORATE_HERO_MAX_BUFFER_EDGE);

  const requestedRatio =
    Number.isFinite(input.devicePixelRatio) && input.devicePixelRatio > 0
      ? input.devicePixelRatio
      : 1;
  let pixelRatio = Math.min(requestedRatio, CORPORATE_HERO_MAX_PIXEL_RATIO);

  const longestEdge = Math.max(renderWidth, height);
  if (longestEdge * pixelRatio > CORPORATE_HERO_MAX_BUFFER_EDGE) {
    pixelRatio = CORPORATE_HERO_MAX_BUFFER_EDGE / longestEdge;
  }

  return {
    width: renderWidth,
    height,
    pixelRatio,
    aspect: renderWidth / height,
    heightClamped,
  };
}
