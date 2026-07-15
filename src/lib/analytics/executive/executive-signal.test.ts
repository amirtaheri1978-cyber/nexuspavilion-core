import { describe, expect, it } from "vitest";

import {
  createExecutiveSignal,
  prioritizeExecutiveSignals,
} from "@/lib/analytics/executive/executive-signal";

describe("createExecutiveSignal", () => {
  it("normalizes importance to the 0-100 range", () => {
    const highImportanceSignal = createExecutiveSignal({
      id: "high",
      category: "risk",
      label: "High Importance",
      value: "100",
      status: "critical",
      importance: 150,
      description: "High importance signal",
    });

    const lowImportanceSignal = createExecutiveSignal({
      id: "low",
      category: "risk",
      label: "Low Importance",
      value: "0",
      status: "limited",
      importance: -20,
      description: "Low importance signal",
    });

    expect(highImportanceSignal.importance).toBe(100);
    expect(lowImportanceSignal.importance).toBe(0);
  });

  it("trims string values", () => {
    const signal = createExecutiveSignal({
      id: "  supplier-coverage  ",
      category: "supplier",
      label: "  Supplier coverage  ",
      value: "  6  ",
      status: "healthy",
      importance: 80,
      description: "  Supplier coverage description  ",
    });

    expect(signal.id).toBe("supplier-coverage");
    expect(signal.label).toBe("Supplier coverage");
    expect(signal.value).toBe("6");
    expect(signal.description).toBe(
      "Supplier coverage description",
    );
  });
});

describe("prioritizeExecutiveSignals", () => {
  it("prioritizes more urgent statuses", () => {
    const signals = [
      createExecutiveSignal({
        id: "strong",
        category: "commercial",
        label: "Strong",
        value: "1",
        status: "strong",
        importance: 100,
        description: "Strong signal",
      }),
      createExecutiveSignal({
        id: "critical",
        category: "risk",
        label: "Critical",
        value: "2",
        status: "critical",
        importance: 10,
        description: "Critical signal",
      }),
      createExecutiveSignal({
        id: "limited",
        category: "competition",
        label: "Limited",
        value: "3",
        status: "limited",
        importance: 50,
        description: "Limited signal",
      }),
      createExecutiveSignal({
        id: "moderate",
        category: "classification",
        label: "Moderate",
        value: "4",
        status: "moderate",
        importance: 90,
        description: "Moderate signal",
      }),
    ];

    const result = prioritizeExecutiveSignals(signals);

    expect(result.map((signal) => signal.id)).toEqual([
      "critical",
      "limited",
      "moderate",
      "strong",
    ]);
  });

  it("uses importance when statuses are equal", () => {
    const signals = [
      createExecutiveSignal({
        id: "lower",
        category: "supplier",
        label: "Lower",
        value: "1",
        status: "healthy",
        importance: 40,
        description: "Lower importance",
      }),
      createExecutiveSignal({
        id: "higher",
        category: "supplier",
        label: "Higher",
        value: "2",
        status: "healthy",
        importance: 90,
        description: "Higher importance",
      }),
    ];

    const result = prioritizeExecutiveSignals(signals);

    expect(result.map((signal) => signal.id)).toEqual([
      "higher",
      "lower",
    ]);
  });

  it("does not mutate the original array", () => {
    const signals = [
      createExecutiveSignal({
        id: "first",
        category: "risk",
        label: "First",
        value: "1",
        status: "healthy",
        importance: 20,
        description: "First signal",
      }),
      createExecutiveSignal({
        id: "second",
        category: "risk",
        label: "Second",
        value: "2",
        status: "critical",
        importance: 100,
        description: "Second signal",
      }),
    ];

    const originalOrder = signals.map((signal) => signal.id);

    prioritizeExecutiveSignals(signals);

    expect(signals.map((signal) => signal.id)).toEqual(
      originalOrder,
    );
  });
});