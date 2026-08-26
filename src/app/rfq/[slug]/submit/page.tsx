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
    .select("id, slug, company_id, sourcing_method")
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

  return <RfqSubmitWorkspace slug={slug} />;
}
