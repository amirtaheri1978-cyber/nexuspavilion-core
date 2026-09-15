import { describe, expect, it } from "vitest";

import {
  attachQuoteMaterialRevalidationState,
  getLatestMaterialAddendum,
  resolveQuoteMaterialRevalidationState,
  type MaterialAddendumEvidence,
} from "./rfq-quote-revalidation-state";

const quote = {
  id: "quote-1",
  company_id: "supplier-1",
  created_at: "2026-09-14T12:00:00.000Z",
};

function materialAddendum(
  overrides: Partial<MaterialAddendumEvidence> = {},
): MaterialAddendumEvidence {
  return {
    id: "addendum-1",
    created_at: "2026-09-14T13:00:00.000Z",
    addendum_number: 1,
    affected_fields: ["scope"],
    amendment_before: { scope: "A" },
    amendment_after: { scope: "B" },
    amendment_reason: "Material scope revision",
    ...overrides,
  };
}

describe("RFQ Quote material revalidation state", () => {
  it("keeps a Quote current when no governed material Addendum exists", () => {
    const state = resolveQuoteMaterialRevalidationState({
      quote,
      addenda: [
        materialAddendum({
          affected_fields: null,
          amendment_before: null,
          amendment_after: null,
          amendment_reason: null,
        }),
      ],
      acknowledgements: [],
      revalidations: [],
    });

    expect(state.requiresMaterialRevalidation).toBe(false);
    expect(state.materialRevalidationStatus).toBe("current");
    expect(state.latestMaterialAddendumId).toBeNull();
  });

  it("marks a Quote stale against the latest governed material Addendum without current-basis proof", () => {
    const state = resolveQuoteMaterialRevalidationState({
      quote,
      addenda: [materialAddendum()],
      acknowledgements: [],
      revalidations: [],
    });

    expect(state).toEqual({
      materialRevalidationStatus: "requires_review",
      requiresMaterialRevalidation: true,
      latestMaterialAddendumId: "addendum-1",
    });
  });

  it("accepts immutable revalidation for the exact latest material Addendum", () => {
    const state = resolveQuoteMaterialRevalidationState({
      quote,
      addenda: [materialAddendum()],
      acknowledgements: [],
      revalidations: [
        {
          quote_id: quote.id,
          addendum_id: "addendum-1",
          company_id: quote.company_id,
        },
      ],
    });

    expect(state.requiresMaterialRevalidation).toBe(false);
  });

  it("accepts only an acknowledgement completed before the original Quote submission", () => {
    const currentState = resolveQuoteMaterialRevalidationState({
      quote,
      addenda: [materialAddendum()],
      acknowledgements: [
        {
          addendum_id: "addendum-1",
          company_id: quote.company_id,
          acknowledged_at: "2026-09-14T11:59:59.000Z",
        },
      ],
      revalidations: [],
    });

    const staleState = resolveQuoteMaterialRevalidationState({
      quote,
      addenda: [materialAddendum()],
      acknowledgements: [
        {
          addendum_id: "addendum-1",
          company_id: quote.company_id,
          acknowledged_at: "2026-09-14T12:00:01.000Z",
        },
      ],
      revalidations: [],
    });

    expect(currentState.requiresMaterialRevalidation).toBe(false);
    expect(staleState.requiresMaterialRevalidation).toBe(true);
  });

  it("does not use another supplier company's acknowledgement as Quote-basis proof", () => {
    const state = resolveQuoteMaterialRevalidationState({
      quote,
      addenda: [materialAddendum()],
      acknowledgements: [
        {
          addendum_id: "addendum-1",
          company_id: "supplier-2",
          acknowledged_at: "2026-09-14T11:00:00.000Z",
        },
      ],
      revalidations: [],
    });

    expect(state.requiresMaterialRevalidation).toBe(true);
  });

  it("selects the latest material Addendum using created_at, addendum number, then id", () => {
    const latest = getLatestMaterialAddendum([
      materialAddendum({ id: "a", addendum_number: 1 }),
      materialAddendum({ id: "b", addendum_number: 2 }),
      materialAddendum({
        id: "c",
        addendum_number: 1,
        created_at: "2026-09-14T14:00:00.000Z",
      }),
    ]);

    expect(latest?.id).toBe("c");
  });

  it("makes a previously current Quote stale again when a later material Addendum is issued", () => {
    const [decorated] = attachQuoteMaterialRevalidationState({
      quotes: [quote],
      addenda: [
        materialAddendum({ id: "addendum-1", addendum_number: 1 }),
        materialAddendum({
          id: "addendum-2",
          addendum_number: 2,
          created_at: "2026-09-14T15:00:00.000Z",
        }),
      ],
      acknowledgements: [],
      revalidations: [
        {
          quote_id: quote.id,
          addendum_id: "addendum-1",
          company_id: quote.company_id,
        },
      ],
    });

    expect(decorated.requiresMaterialRevalidation).toBe(true);
    expect(decorated.latestMaterialAddendumId).toBe("addendum-2");
  });
  it("fails closed when Quote or acknowledgement timestamps are unavailable", () => {
    const missingQuoteTime = resolveQuoteMaterialRevalidationState({
      quote: { id: "quote-1", company_id: "company-1", created_at: null },
      addenda: [materialAddendum()],
      acknowledgements: [
        {
          addendum_id: "addendum-1",
          company_id: "company-1",
          acknowledged_at: null,
        },
      ],
      revalidations: [],
    });

    expect(missingQuoteTime.requiresMaterialRevalidation).toBe(true);
  });

});
