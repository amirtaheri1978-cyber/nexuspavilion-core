"use client";

import { useState } from "react";

import { EXECUTIVE_CTA_PRIMARY } from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/client";

type SubmitQuoteFormProps = {
  rfqId: string;
  embedded?: boolean;
  preview?: boolean;
  previewAmount?: string;
  previewTimeline?: string;
  previewMessage?: string;
  previewError?: string;
};

const fieldClassName =
  "mt-3 min-h-14 min-w-0 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-nexus-text-muted focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-60";

export default function SubmitQuoteForm({
  rfqId,
  embedded = false,
  preview = false,
  previewAmount = "",
  previewTimeline = "",
  previewMessage = "",
  previewError = "",
}: SubmitQuoteFormProps) {
  const [amount, setAmount] = useState(preview ? previewAmount : "");
  const [timeline, setTimeline] = useState(preview ? previewTimeline : "");
  const [message, setMessage] = useState(preview ? previewMessage : "");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (preview) {
      return;
    }

    setSubmitting(true);
    setSuccess("");
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please login before submitting a quote.");
      setSubmitting(false);
      return;
    }

    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const companyId = companies?.[0]?.id ?? null;

    const { error } = await supabase.from("quotes").insert({
      rfq_id: rfqId,
      company_id: companyId,
      user_id: user.id,
      amount,
      timeline,
      message,
      status: "submitted",
    });

    if (error) {
      console.error(error);
      setError("Could not submit quote.");
      setSubmitting(false);
      return;
    }

    setAmount("");
    setTimeline("");
    setMessage("");
    setSuccess("Quote submitted successfully.");
    setSubmitting(false);
  }

  const visibleError = error || (preview ? previewError : "");
  const errorId = visibleError ? "invite-quote-submit-error" : undefined;
  const successId = success ? "invite-quote-submit-success" : undefined;

  const form = (
    <>
      <p className="np-type-eyebrow">Supplier Response</p>
      <h2 id="invite-quote-submit-heading" className="np-type-h2 mt-3 min-w-0 text-pretty">
        Submit Quote
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-6 min-w-0 space-y-5"
        aria-labelledby="invite-quote-submit-heading"
      >
        <div className="min-w-0">
          <label htmlFor="invite-quote-amount" className="np-type-meta">
            Quote amount
          </label>
          <input
            id="invite-quote-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Quote amount"
            required
            disabled={submitting}
            aria-invalid={Boolean(visibleError)}
            aria-describedby={errorId}
            className={fieldClassName}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="invite-quote-timeline" className="np-type-meta">
            Timeline / delivery schedule
          </label>
          <textarea
            id="invite-quote-timeline"
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            placeholder="Timeline / delivery schedule"
            required
            rows={3}
            disabled={submitting}
            aria-invalid={Boolean(visibleError)}
            aria-describedby={errorId}
            className={fieldClassName}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="invite-quote-message" className="np-type-meta">
            Message / proposal notes
          </label>
          <textarea
            id="invite-quote-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Message / proposal notes"
            required
            rows={5}
            disabled={submitting}
            aria-invalid={Boolean(visibleError)}
            aria-describedby={errorId}
            className={fieldClassName}
          />
        </div>

        {success ? (
          <p
            id={successId}
            role="status"
            className="min-w-0 rounded-executive border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-pretty text-sm font-bold text-emerald-300"
          >
            {success}
          </p>
        ) : null}

        {visibleError ? (
          <p
            id="invite-quote-submit-error"
            role="alert"
            className="min-w-0 rounded-executive border border-red-400/20 bg-red-500/10 px-5 py-4 text-pretty text-sm font-bold text-red-300"
          >
            {visibleError}
          </p>
        ) : null}

        <div className="sticky bottom-4 z-10 min-w-0 rounded-executive bg-nexus-navy/90 p-3">
          <button
            type="submit"
            disabled={submitting}
            className={`${EXECUTIVE_CTA_PRIMARY} w-full min-h-14`}
          >
            {submitting ? "Submitting..." : "Submit Quote"}
          </button>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return (
      <section
        className="min-w-0"
        data-rfq-invite-quote-form="true"
        aria-labelledby="invite-quote-submit-heading"
      >
        {form}
      </section>
    );
  }

  return (
    <section
      className="mt-10 min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-8"
      data-rfq-invite-quote-form="true"
      aria-labelledby="invite-quote-submit-heading"
    >
      {form}
    </section>
  );
}
