import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
} from "@/lib/design-system/executive-contract";

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
  reused?: boolean;
  inviteUrl: string;
  copyMessage: string;
  onCopyInviteLink: () => void;
};

function getEmailDeliveryCopy(
  emailResult: InviteEmailResult | null | undefined,
  reused: boolean,
) {
  if (reused) {
    if (!emailResult) {
      return {
        title: "Existing Invitation Reused",
        message:
          "The existing supplier invitation remains available. Confirm whether the invitation email was sent before treating delivery as complete.",
        tone: "warning" as const,
      };
    }

    if (emailResult.sent) {
      return {
        title: "Invitation Email Resent",
        message:
          "The existing supplier invitation email was sent again using the same secure invitation link.",
        tone: "success" as const,
      };
    }

    if (emailResult.skipped) {
      return {
        title: "Existing Invitation, Email Not Sent",
        message: emailResult.error
          ? `The existing invitation remains available, but the email retry was skipped: ${emailResult.error}`
          : "The existing invitation remains available, but the email retry was skipped. Use the copy link as a fallback.",
        tone: "warning" as const,
      };
    }

    return {
      title: "Existing Invitation, Email Retry Failed",
      message: emailResult.error
        ? `The existing invitation remains available, but the email retry failed: ${emailResult.error}`
        : "The existing invitation remains available, but the email retry failed. Use the copy link as a fallback.",
      tone: "warning" as const,
    };
  }

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
  reused = false,
  inviteUrl,
  copyMessage,
  onCopyInviteLink,
}: SupplierInvitationResultProps) {
  const delivery = successMessage
    ? getEmailDeliveryCopy(emailResult, reused)
    : null;
  const deliveryClassName =
    delivery?.tone === "success"
      ? EXECUTIVE_FEEDBACK_SUCCESS
      : EXECUTIVE_FEEDBACK_WARNING;

  return (
    <div className="min-w-0" data-rfq-supplier-result="true">
      {error ? (
        <div
          className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_ERROR}`}
          role="alert"
          aria-live="assertive"
        >
          <p className="np-type-meta">
            Invitation Not Created
          </p>

          <p className="mt-2 min-w-0 text-pretty text-sm font-bold leading-6 text-status-risk">
            {error}
          </p>
        </div>
      ) : null}

      {delivery ? (
        <div
          className={`mt-5 min-w-0 ${deliveryClassName}`}
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
          data-rfq-invitation-reused={reused ? "true" : "false"}
        >
          <p className="np-type-meta">
            {delivery.title}
          </p>

          <p className="mt-2 min-w-0 text-pretty text-sm font-bold leading-6 text-nexus-text-primary">
            {successMessage}
          </p>

          <p className="mt-2 min-w-0 text-pretty text-sm font-bold leading-6 text-nexus-text-primary">
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
            className="np-type-eyebrow text-nexus-gold"
          >
            Secure Invite Link
          </p>

          <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
            Share this controlled invitation link with the authorized
            supplier contact.
          </p>

          <p
            className="mt-4 min-w-0 break-all rounded-executive border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold leading-6 text-nexus-text-primary"
            data-rfq-invite-url="true"
          >
            {/* Unavoidable opaque invite URL token: break-all prevents horizontal overflow. */}
            {inviteUrl}
          </p>

          <div className="mt-4 flex min-w-0 flex-col gap-3 @sm:flex-row @sm:flex-wrap">
            <button
              type="button"
              onClick={onCopyInviteLink}
              className={`${EXECUTIVE_BUTTON_PRIMARY} min-h-11 px-5 py-3 text-xs`}
            >
              Copy Invite Link
            </button>

            <a
              href={inviteUrl}
              className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-5 py-3 text-center text-xs`}
            >
              Open Invite
            </a>
          </div>

          {copyMessage ? (
            <p
              className="mt-3 min-w-0 text-pretty text-xs font-black leading-5 text-status-success"
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
