import { describe, expect, it } from "vitest";

import {
  COMPANY_CAPABILITY_MAX_LABEL_LENGTH,
  COMPANY_CAPABILITY_MAX_PER_TYPE,
  createEmptyGroupedCapabilities,
  normalizeCapabilityGroup,
  normalizeCapabilityLabel,
  normalizeGroupedCapabilities,
} from "@/lib/company/capabilities";

describe("company capabilities normalization", () => {
  it("trims and collapses whitespace in labels", () => {
    expect(normalizeCapabilityLabel("  Commercial   Construction  ")).toBe(
      "Commercial Construction",
    );
  });

  it("rejects blank labels", () => {
    expect(normalizeCapabilityLabel("   ")).toBeNull();
    expect(normalizeCapabilityLabel("")).toBeNull();
    expect(normalizeCapabilityLabel(null)).toBeNull();
  });

  it("rejects non-string label values", () => {
    expect(normalizeCapabilityLabel(123)).toBeNull();
    expect(normalizeCapabilityLabel(true)).toBeNull();
    expect(normalizeCapabilityLabel(false)).toBeNull();
    expect(normalizeCapabilityLabel({})).toBeNull();
    expect(normalizeCapabilityLabel([])).toBeNull();
    expect(normalizeCapabilityLabel("Electrical")).toBe("Electrical");
    expect(normalizeCapabilityLabel(" Electrical ")).toBe("Electrical");
  });

  it("enforces the enterprise label length limit", () => {
    const longLabel = "A".repeat(COMPANY_CAPABILITY_MAX_LABEL_LENGTH + 1);
    expect(normalizeCapabilityLabel(longLabel)).toBeNull();
    expect(
      normalizeCapabilityLabel("A".repeat(COMPANY_CAPABILITY_MAX_LABEL_LENGTH)),
    ).toHaveLength(COMPANY_CAPABILITY_MAX_LABEL_LENGTH);
  });

  it("handles duplicate labels case-insensitively within a group", () => {
    const result = normalizeCapabilityGroup([
      "Electrical",
      " electrical ",
      "Plumbing",
    ]);

    expect(result.error).toContain("Duplicate");
    expect(result.labels).toEqual([]);
  });

  it("enforces per-group entry limits", () => {
    const labels = Array.from(
      { length: COMPANY_CAPABILITY_MAX_PER_TYPE + 1 },
      (_, index) => `Capability ${index + 1}`,
    );

    const result = normalizeCapabilityGroup(labels);

    expect(result.error).toContain(String(COMPANY_CAPABILITY_MAX_PER_TYPE));
    expect(result.labels).toEqual([]);
  });

  it("accepts only trade, service, product, and region in grouped payloads", () => {
    const result = normalizeGroupedCapabilities({
      trade: ["Electrical"],
      buyer: ["Invalid"],
    });

    expect(result.error).toContain("trade, service, product, or region");
    expect(result.capabilities).toEqual(createEmptyGroupedCapabilities());
  });

  it("normalizes all four capability groups together", () => {
    const result = normalizeGroupedCapabilities({
      trade: [" Electrical "],
      service: ["Program Management"],
      product: ["Switchgear"],
      region: ["Ontario"],
    });

    expect(result.error).toBeNull();
    expect(result.capabilities).toEqual({
      trade: ["Electrical"],
      service: ["Program Management"],
      product: ["Switchgear"],
      region: ["Ontario"],
    });
  });
});
