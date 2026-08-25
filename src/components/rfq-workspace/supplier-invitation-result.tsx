type InviteEmailResult = {
  sent?: boolean;
  skipped?: boolean;
  id?: string | null;
  error?: string | null;
};

type SupplierInvitationResultProps = {
  error: string;
  successMessage: string;
  emailResult?: InviteEmailResult | null;
  inviteUrl: string;
  copyMessage: string;
  onCopyInviteLink: () => void;
};

function getEmailDeliveryCopy(emailResult: InviteEmailResult | null | undefined) {
  if (!emailResult) {
    return {
      title: "Invitation Created",
      message:
        "The supplier invitation record was created. Confirm whether the invitation email was sent before treating delivery as complete.",
      tone: "warning" as const,
    };
  }

  if (emailResult.sent) {
    return {
      title: "Invitation Email Sent",
      message:
        "The supplier invitation email was sent. The copy link remains available as a fallback.",
      tone: "success" as const,
    };
  }

  if (emailResult.skipped) {
    return {
      title: "Invitation Created, Email Not Sent",
      message: emailResult.error
        ? `The invitation record exists, but email delivery was skipped: ${emailResult.error}`
        : "The invitation record exists, but the invitation email was not sent. Use the copy link as a fallback.",
      tone: "warning" as const,
    };
  }

  return {
    title: "Invitation Created, Email Failed",
    message: emailResult.error
      ? `The invitation record exists, but email delivery failed: ${emailResult.error}`
      : "The invitation record exists, but the invitation email was not sent. Use the copy link as a fallback.",
    tone: "warning" as const,
  };
}

export function SupplierInvitationResult({
  error,
  successMessage,
  emailResult = null,
  inviteUrl,
  copyMessage,
  onCopyInviteLink,
}: SupplierInvitationResultProps) {
  const delivery = successMessage
    ? getEmailDeliveryCopy(emailResult)
    : null;
  const deliveryClassName =
    delivery?.tone === "success"
      ? "border-emerald-300/15 bg-emerald-400/[0.08]"
      : "border-amber-300/20 bg-amber-400/[0.08]";
  const deliveryLabelClassName =
    delivery?.tone === "success" ? "text-emerald-300" : "text-amber-200";
  const deliveryBodyClassName =
    delivery?.tone === "success" ? "text-emerald-100" : "text-amber-100";

  return (
    <div className="min-w-0" data-rfq-supplier-result="true">
      {error ? (
        <div
          className="mt-5 min-w-0 rounded-executive border border-red-300/15 bg-red-400/[0.08] px-5 py-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
            Invitation Not Created
          </p>

          <p className="mt-2 min-w-0 text-pretty text-sm font-bold leading-6 text-red-200">
            {error}
          </p>
        </div>
      ) : null}

      {delivery ? (
        <div
          className={`mt-5 min-w-0 rounded-executive border px-5 py-4 ${deliveryClassName}`}
          role="status"
          aria-live="polite"
          data-rfq-invitation-email-status={
            emailResult?.sent
              ? "sent"
              : emailResult?.skipped
                ? "skipped"
                : emailResult
                  ? "failed"
                  : "unknown"
          }
        >
          <p
            className={`text-xs font-black uppercase tracking-[0.2em] ${deliveryLabelClassName}`}
          >
            {delivery.title}
          </p>

          <p
            className={`mt-2 min-w-0 text-pretty text-sm font-bold leading-6 ${deliveryBodyClassName}`}
          >
            {successMessage}
          </p>

          <p
            className={`mt-2 min-w-0 text-pretty text-sm font-bold leading-6 ${deliveryBodyClassName}`}
          >
            {delivery.message}
          </p>
        </div>
      ) : null}

      {inviteUrl ? (
        <section
          className="mt-5 min-w-0 border-t border-white/10 pt-5"
          aria-labelledby="secure-supplier-invite-link-title"
        >
          <p
            id="secure-supplier-invite-link-title"
            className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold"
          >
            Secure Invite Link
          </p>

          <p className="mt-2 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
            Share this controlled invitation link with the authorized
            supplier contact.
          </p>

          <p
            className="mt-4 min-w-0 break-all rounded-executive border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold leading-6 text-nexus-white"
            data-rfq-invite-url="true"
          >
            {/* Unavoidable opaque invite URL token: break-all prevents horizontal overflow. */}
            {inviteUrl}
          </p>

          <div className="mt-4 flex min-w-0 flex-col gap-3 @sm:flex-row @sm:flex-wrap">
            <button
              type="button"
              onClick={onCopyInviteLink}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-nexus-gold/30 bg-nexus-gold px-5 py-3 text-xs font-black text-nexus-navy transition hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70"
            >
              Copy Invite Link
            </button>

            <a
              href={inviteUrl}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-center text-xs font-black text-nexus-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70"
            >
              Open Invite
            </a>
          </div>

          {copyMessage ? (
            <p
              className="mt-3 min-w-0 text-pretty text-xs font-black leading-5 text-emerald-300"
              role="status"
              aria-live="polite"
            >
              {copyMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
