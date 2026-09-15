import Link from "next/link";
import { redirect } from "next/navigation";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import { RfqSubmitWorkspace } from "@/components/rfq-workspace/rfq-submit-workspace";
import {
  getCompanyOnboardingPath,
  getSafeNextPath,
} from "@/lib/auth/login-continuation";
import {
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import {
  canRespondToRfqSourcing,
  isPublicSourcingMethod,
  resolveRfqParticipantRole,
} from "@/lib/procurement/rfq-access-contract";
import { attachQuoteMaterialRevalidationState } from "@/lib/procurement/rfq-quote-revalidation-state";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type SubmitAccessBlockedReason =
  | "rfq-not-found"
  | "issuer"
  | "sourcing";

function SubmitAccessBlocked({
  slug,
  reason,
}: {
  slug: string;
  reason: SubmitAccessBlockedReason;
}) {
  const title =
    reason === "rfq-not-found"
      ? "RFQ not found"
      : reason === "issuer"
        ? "Issuer organizations cannot submit quotes"
        : "Quotation access unavailable";

  const description =
    reason === "rfq-not-found"
      ? "This RFQ workspace could not be found or is no longer available."
      : reason === "issuer"
        ? "Your company issued this RFQ. Issuers manage procurement activity from the RFQ workspace rather than submitting a quote."
        : "Your company does not have authorization to submit a quotation for this RFQ.";

  return (
    <div className="min-h-full bg-nexus-navy text-white">
      <div className={`${EXECUTIVE_PAGE_CLASS} min-w-0`}>
        <Link
          href={`/rfq/${slug}`}
          className={`inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
        >
          Back to RFQ workspace
        </Link>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          tone="gold"
          className="np-region min-w-0 @container"
          data-rfq-submit-access-blocked={reason}
        >
          <p className="np-type-eyebrow">Respondent submission</p>
          <h1 className="np-type-h1 mt-3 min-w-0 text-pretty">{title}</h1>
          <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty">
            {description}
          </p>
          <div className="mt-8 flex min-w-0 flex-col gap-3 @sm:flex-row">
            <Link
              href="/rfq"
              className={`inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
            >
              Return to Procurement Center
            </Link>
            {reason !== "rfq-not-found" ? (
              <Link
                href={`/rfq/${slug}`}
                className="inline-flex min-h-11 items-center text-sm font-black text-nexus-gold"
              >
                Open RFQ workspace
              </Link>
            ) : null}
          </div>
        </ExecutivePanel>
      </div>
    </div>
  );
}

export default async function SubmitQuotePage({ params }: PageProps) {
  const { slug } = await params;
  const submitPath = getSafeNextPath(`/rfq/${slug}/submit`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(submitPath)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("RFQ submit profile lookup failed:", {
      userId: user.id,
      error: profileError,
    });
    throw new Error("Unable to verify company workspace.");
  }

  if (!profile?.company_id) {
    redirect(getCompanyOnboardingPath(submitPath));
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select(
      "id, slug, company_id, sourcing_method, title, deadline, deadline_timezone, status, awarded_quote_id, awarded_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (rfqError) {
    console.error("RFQ submit RFQ lookup failed:", {
      slug,
      error: rfqError,
    });
    throw new Error("Unable to verify RFQ access.");
  }

  if (!rfq) {
    return <SubmitAccessBlocked slug={slug} reason="rfq-not-found" />;
  }

  const participantRole = resolveRfqParticipantRole({
    currentCompanyId: profile.company_id,
    rfqCompanyId: rfq.company_id,
  });

  if (participantRole === "issuer") {
    return <SubmitAccessBlocked slug={slug} reason="issuer" />;
  }

  let hasRestrictedRfqAccess = false;

  if (!isPublicSourcingMethod(rfq.sourcing_method)) {
    const { data: restrictedAccess, error: accessError } = await supabase.rpc(
      "current_user_has_supplier_rfq_access",
      { p_rfq_id: rfq.id },
    );

    if (accessError) {
      console.error("RFQ submit sourcing access lookup failed:", {
        rfqId: rfq.id,
        error: accessError,
      });
      throw new Error("Unable to verify RFQ access.");
    }

    hasRestrictedRfqAccess = restrictedAccess === true;
  }

  if (!canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)) {
    return <SubmitAccessBlocked slug={slug} reason="sourcing" />;
  }

  const { data: existingQuote, error: existingQuoteError } = await supabase
    .from("quotes")
    .select("id, company_id, amount, timeline, message, validity_days, created_at")
    .eq("rfq_id", rfq.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (existingQuoteError) {
    console.error("RFQ submit existing Quote lookup failed:", {
      rfqId: rfq.id,
      companyId: profile.company_id,
      error: existingQuoteError,
    });
    throw new Error("Unable to verify quotation state.");
  }

  let initialQuote:
    | {
        id: string;
        amount: number | string | null;
        timeline: string | null;
        message: string | null;
        validity_days: number | null;
        requiresMaterialRevalidation: boolean;
        hasOutstandingRequiredAcknowledgement: boolean;
      }
    | null = null;

  if (existingQuote) {
    const [addendaResult, acknowledgementResult, revalidationResult] =
      await Promise.all([
        supabase
          .from("rfq_addenda")
          .select(
            "id, addendum_number, requires_acknowledgement, affected_fields, amendment_before, amendment_after, amendment_reason, created_at",
          )
          .eq("rfq_id", rfq.id),
        supabase
          .from("rfq_addendum_acknowledgements")
          .select("addendum_id, company_id, acknowledged_at")
          .eq("rfq_id", rfq.id)
          .eq("company_id", profile.company_id),
        supabase
          .from("rfq_quote_revalidations")
          .select("quote_id, addendum_id, company_id")
          .eq("rfq_id", rfq.id)
          .eq("quote_id", existingQuote.id)
          .eq("company_id", profile.company_id),
      ]);

    if (
      addendaResult.error ||
      acknowledgementResult.error ||
      revalidationResult.error
    ) {
      console.error("RFQ submit Quote revalidation state lookup failed:", {
        rfqId: rfq.id,
        quoteId: existingQuote.id,
        addendaError: addendaResult.error,
        acknowledgementError: acknowledgementResult.error,
        revalidationError: revalidationResult.error,
      });
      throw new Error("Unable to verify quotation revalidation state.");
    }

    const [quoteWithRevalidationState] = attachQuoteMaterialRevalidationState({
      quotes: [existingQuote],
      addenda: addendaResult.data ?? [],
      acknowledgements: acknowledgementResult.data ?? [],
      revalidations: revalidationResult.data ?? [],
    });

    const acknowledgedAddendumIds = new Set(
      (acknowledgementResult.data ?? []).map((item) => item.addendum_id),
    );

    const hasOutstandingRequiredAcknowledgement = (
      addendaResult.data ?? []
    ).some(
      (addendum) =>
        addendum.requires_acknowledgement === true &&
        !acknowledgedAddendumIds.has(addendum.id),
    );

    initialQuote = {
      id: existingQuote.id,
      amount: existingQuote.amount,
      timeline: existingQuote.timeline,
      message: existingQuote.message,
      validity_days: Number(existingQuote.validity_days || 30),
      requiresMaterialRevalidation:
        quoteWithRevalidationState.requiresMaterialRevalidation,
      hasOutstandingRequiredAcknowledgement,
    };
  }

  const submitRfq = {
    title: rfq.title,
    deadline: rfq.deadline,
    deadline_timezone: rfq.deadline_timezone,
    status: rfq.status,
    awarded_quote_id: rfq.awarded_quote_id,
    awarded_at: rfq.awarded_at,
  };

  return (
    <RfqSubmitWorkspace
      slug={slug}
      initialRfq={submitRfq}
      initialQuote={initialQuote}
    />
  );
}
