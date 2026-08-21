import Link from "next/link";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import SubmitQuoteForm from "@/components/submit-quote-form";
import {
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_CYAN,
} from "@/lib/design-system/executive-contract";

export type RfqInviteQuoteContext = {
  invite_email: string;
  rfq_id: string;
  rfq_title: string;
  rfq_slug: string;
  rfq_description: string | null;
  rfq_category: string | null;
  rfq_location: string | null;
  rfq_budget: string | null;
  rfq_deadline: string;
};

type RfqInviteQuoteSubmissionProps = {
  invitation: RfqInviteQuoteContext;
  preview?: boolean;
  previewAmount?: string;
  previewTimeline?: string;
  previewMessage?: string;
  previewError?: string;
};

function InviteInfo({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="np-type-meta">{title}</dt>
      <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
        {value || "Not specified"}
      </dd>
    </div>
  );
}

export function RfqInviteQuoteUnavailable() {
  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className="np-region min-w-0 @container"
      data-rfq-invite-quote-unavailable="true"
    >
      <p className="np-type-eyebrow">Supplier Invitation</p>
      <h1 className="np-type-h1 mt-3 min-w-0 text-pretty">
        Invalid or Expired Invitation
      </h1>
      <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty">
        This invitation is unavailable, expired, or no longer open for
        quotations.
      </p>
    </ExecutivePanel>
  );
}

export function RfqInviteQuoteSubmission({
  invitation,
  preview = false,
  previewAmount,
  previewTimeline,
  previewMessage,
  previewError,
}: RfqInviteQuoteSubmissionProps) {
  return (
    <ExecutivePanel
      variant="executive"
      padding="lg"
      tone="gold"
      className="np-region min-w-0 @container"
      data-rfq-invite-quote-submission="true"
    >
      <p className="np-type-eyebrow">Supplier Invitation</p>
      <h1 className="np-type-h1 mt-3 min-w-0 text-pretty">
        You’ve been invited to quote
      </h1>
      <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty">
        Invitation sent to{" "}
        <span className="min-w-0 font-bold text-nexus-white">
          {invitation.invite_email}
        </span>
      </p>

      <section
        className="mt-8 min-w-0 border-t border-white/10 pt-6"
        data-rfq-invite-quote-identity="true"
        aria-labelledby="invite-rfq-title"
      >
        <h2
          id="invite-rfq-title"
          className="np-type-h2 min-w-0 text-pretty"
        >
          {invitation.rfq_title}
        </h2>
        <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty leading-8">
          {invitation.rfq_description}
        </p>
        <dl
          className="mt-8 grid min-w-0 grid-cols-1 gap-5 @sm:grid-cols-2"
          data-rfq-invite-quote-status="true"
        >
          <InviteInfo title="Category" value={invitation.rfq_category} />
          <InviteInfo title="Location" value={invitation.rfq_location} />
          <InviteInfo title="Budget" value={invitation.rfq_budget} />
          <InviteInfo title="Deadline" value={invitation.rfq_deadline} />
        </dl>
      </section>

      <div className="mt-8 min-w-0 border-t border-white/10 pt-6">
        <SubmitQuoteForm
          rfqId={invitation.rfq_id}
          embedded
          preview={preview}
          previewAmount={previewAmount}
          previewTimeline={previewTimeline}
          previewMessage={previewMessage}
          previewError={previewError}
        />
      </div>

      <div className="mt-8 min-w-0">
        <Link
          href={`/rfq/${invitation.rfq_slug}`}
          className={`${EXECUTIVE_CTA_SECONDARY} ${EXECUTIVE_FOCUS_CYAN} min-h-14 w-full @sm:w-auto`}
        >
          Open RFQ Page
        </Link>
      </div>
    </ExecutivePanel>
  );
}
