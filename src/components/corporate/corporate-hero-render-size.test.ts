import { describe, expect, it } from "vitest";

import {
  CORPORATE_HERO_ABSOLUTE_MAX_CSS_HEIGHT,
  CORPORATE_HERO_MAX_BUFFER_EDGE,
  CORPORATE_HERO_MAX_PIXEL_RATIO,
  resolveCorporateHeroRenderSize,
} from "./corporate-hero-render-size";

describe("resolveCorporateHeroRenderSize", () => {
  it("preserves normal desktop viewport dimensions", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 1920,
      containerHeight: 1080,
      layoutViewportWidth: 1920,
      layoutViewportHeight: 1080,
      screenHeight: 1440,
      visualViewportHeight: 1080,
      devicePixelRatio: 1.5,
    });

    expect(size).toEqual({
      width: 1920,
      height: 1080,
      pixelRatio: 1.5,
      aspect: 1920 / 1080,
      heightClamped: false,
    });
  });

  it("preserves normal mobile viewport dimensions with existing pixel-ratio cap", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 412,
      containerHeight: 915,
      layoutViewportWidth: 412,
      layoutViewportHeight: 915,
      screenHeight: 915,
      visualViewportHeight: 915,
      devicePixelRatio: 2.625,
    });

    expect(size.width).toBe(412);
    expect(size.height).toBe(915);
    expect(size.pixelRatio).toBe(CORPORATE_HERO_MAX_PIXEL_RATIO);
    expect(size.heightClamped).toBe(false);
    expect(size.width * size.pixelRatio).toBeCloseTo(741.6, 5);
    expect(size.height * size.pixelRatio).toBeCloseTo(1647, 5);
  });

  it("clamps pathological expanded layout height to the trusted display bound", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 412,
      containerHeight: 12891,
      layoutViewportWidth: 412,
      layoutViewportHeight: 12891,
      screenHeight: 915,
      visualViewportHeight: 915,
      devicePixelRatio: 1.8,
    });

    expect(size.width).toBe(412);
    expect(size.height).toBe(915);
    expect(size.pixelRatio).toBe(1.8);
    expect(size.heightClamped).toBe(true);
    expect(size.height * size.pixelRatio).toBeCloseTo(1647, 5);
    expect(size.height * size.pixelRatio).toBeLessThan(CORPORATE_HERO_MAX_BUFFER_EDGE);
  });

  it("still clamps when expanded tooling also inflates screen height", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 412,
      containerHeight: 12891,
      layoutViewportWidth: 412,
      layoutViewportHeight: 12891,
      screenHeight: 12891,
      visualViewportHeight: 12891,
      devicePixelRatio: 1.8,
    });

    expect(size.heightClamped).toBe(true);
    expect(size.height).toBe(1200);
    expect(size.height).toBeLessThanOrEqual(CORPORATE_HERO_ABSOLUTE_MAX_CSS_HEIGHT);
    expect(size.height * size.pixelRatio).toBeLessThan(CORPORATE_HERO_MAX_BUFFER_EDGE);
  });

  it("does not clamp moderately tall but plausible windows", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 1440,
      containerHeight: 1600,
      layoutViewportWidth: 1440,
      layoutViewportHeight: 1600,
      screenHeight: 1440,
      visualViewportHeight: 1600,
      devicePixelRatio: 1,
    });

    expect(size.height).toBe(1600);
    expect(size.heightClamped).toBe(false);
  });

  it("reduces pixel ratio when buffer edges would exceed the practical budget", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 6000,
      containerHeight: 1200,
      layoutViewportWidth: 6000,
      layoutViewportHeight: 1200,
      screenHeight: 1440,
      visualViewportHeight: 1200,
      devicePixelRatio: 1.8,
    });

    expect(size.width * size.pixelRatio).toBeLessThanOrEqual(CORPORATE_HERO_MAX_BUFFER_EDGE);
    expect(size.height * size.pixelRatio).toBeLessThanOrEqual(CORPORATE_HERO_MAX_BUFFER_EDGE);
  });

  it("keeps extreme-width drawing buffers within the practical edge budget", () => {
    const size = resolveCorporateHeroRenderSize({
      containerWidth: 12000,
      containerHeight: 900,
      layoutViewportWidth: 12000,
      layoutViewportHeight: 900,
      screenHeight: 1440,
      visualViewportHeight: 900,
      devicePixelRatio: 2,
    });

    expect(size.width).toBeLessThanOrEqual(CORPORATE_HERO_MAX_BUFFER_EDGE);
    expect(size.height).toBe(900);
    expect(size.width * size.pixelRatio).toBeLessThanOrEqual(CORPORATE_HERO_MAX_BUFFER_EDGE);
    expect(size.height * size.pixelRatio).toBeLessThanOrEqual(CORPORATE_HERO_MAX_BUFFER_EDGE);
    expect(size.width).toBe(CORPORATE_HERO_MAX_BUFFER_EDGE);
    expect(size.pixelRatio).toBe(1);
  });
});
