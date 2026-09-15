export type MaterialQuoteRevalidationStatus = "current" | "requires_review";

export type QuoteRevalidationQuoteBasis = {
  id: string;
  company_id: string | null;
  created_at?: string | null;
};

export type MaterialAddendumEvidence = {
  id: string;
  created_at: string | null;
  addendum_number?: number | string | null;
  affected_fields?: string[] | null;
  amendment_before?: unknown;
  amendment_after?: unknown;
  amendment_reason?: string | null;
};

export type AddendumAcknowledgementEvidence = {
  addendum_id: string;
  company_id: string | null;
  acknowledged_at: string | null;
};

export type QuoteRevalidationEvidence = {
  quote_id: string;
  addendum_id: string;
  company_id: string | null;
};

export type QuoteMaterialRevalidationState = {
  materialRevalidationStatus: MaterialQuoteRevalidationStatus;
  requiresMaterialRevalidation: boolean;
  latestMaterialAddendumId: string | null;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMaterialAddendum(addendum: MaterialAddendumEvidence) {
  return (
    Array.isArray(addendum.affected_fields) &&
    addendum.affected_fields.length > 0 &&
    isJsonObject(addendum.amendment_before) &&
    isJsonObject(addendum.amendment_after) &&
    Boolean(addendum.amendment_reason?.trim())
  );
}

function timestampValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function addendumNumberValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function getLatestMaterialAddendum(
  addenda: ReadonlyArray<MaterialAddendumEvidence>,
) {
  return (
    addenda
      .filter(isMaterialAddendum)
      .sort((first, second) => {
        const createdAtDelta =
          timestampValue(second.created_at) - timestampValue(first.created_at);

        if (createdAtDelta !== 0) {
          return createdAtDelta;
        }

        const addendumNumberDelta =
          addendumNumberValue(second.addendum_number) -
          addendumNumberValue(first.addendum_number);

        if (addendumNumberDelta !== 0) {
          return addendumNumberDelta;
        }

        return second.id.localeCompare(first.id);
      })[0] ?? null
  );
}

export function resolveQuoteMaterialRevalidationState({
  quote,
  addenda,
  acknowledgements,
  revalidations,
}: {
  quote: QuoteRevalidationQuoteBasis;
  addenda: ReadonlyArray<MaterialAddendumEvidence>;
  acknowledgements: ReadonlyArray<AddendumAcknowledgementEvidence>;
  revalidations: ReadonlyArray<QuoteRevalidationEvidence>;
}): QuoteMaterialRevalidationState {
  const latestMaterialAddendum = getLatestMaterialAddendum(addenda);

  if (!latestMaterialAddendum) {
    return {
      materialRevalidationStatus: "current",
      requiresMaterialRevalidation: false,
      latestMaterialAddendumId: null,
    };
  }

  const hasExactRevalidation = revalidations.some(
    (revalidation) =>
      revalidation.quote_id === quote.id &&
      revalidation.addendum_id === latestMaterialAddendum.id &&
      Boolean(quote.company_id) &&
      revalidation.company_id === quote.company_id,
  );

  if (hasExactRevalidation) {
    return {
      materialRevalidationStatus: "current",
      requiresMaterialRevalidation: false,
      latestMaterialAddendumId: latestMaterialAddendum.id,
    };
  }

  const quoteCreatedAt = timestampValue(quote.created_at);

  const hasPreQuoteAcknowledgement =
    Number.isFinite(quoteCreatedAt) &&
    acknowledgements.some((acknowledgement) => {
      const acknowledgedAt = timestampValue(acknowledgement.acknowledged_at);

      return (
        acknowledgement.addendum_id === latestMaterialAddendum.id &&
        Boolean(quote.company_id) &&
        acknowledgement.company_id === quote.company_id &&
        Number.isFinite(acknowledgedAt) &&
        acknowledgedAt <= quoteCreatedAt
      );
    });

  if (hasPreQuoteAcknowledgement) {
    return {
      materialRevalidationStatus: "current",
      requiresMaterialRevalidation: false,
      latestMaterialAddendumId: latestMaterialAddendum.id,
    };
  }

  return {
    materialRevalidationStatus: "requires_review",
    requiresMaterialRevalidation: true,
    latestMaterialAddendumId: latestMaterialAddendum.id,
  };
}

export function attachQuoteMaterialRevalidationState<
  TQuote extends QuoteRevalidationQuoteBasis,
>({
  quotes,
  addenda,
  acknowledgements,
  revalidations,
}: {
  quotes: ReadonlyArray<TQuote>;
  addenda: ReadonlyArray<MaterialAddendumEvidence>;
  acknowledgements: ReadonlyArray<AddendumAcknowledgementEvidence>;
  revalidations: ReadonlyArray<QuoteRevalidationEvidence>;
}): Array<TQuote & QuoteMaterialRevalidationState> {
  return quotes.map((quote) => ({
    ...quote,
    ...resolveQuoteMaterialRevalidationState({
      quote,
      addenda,
      acknowledgements,
      revalidations,
    }),
  }));
}
