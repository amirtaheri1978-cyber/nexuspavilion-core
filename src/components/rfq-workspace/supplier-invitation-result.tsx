type SupplierInvitationResultProps = {
  error: string;
  successMessage: string;
  inviteUrl: string;
  copyMessage: string;
  onCopyInviteLink: () => void;
};

export function SupplierInvitationResult({
  error,
  successMessage,
  inviteUrl,
  copyMessage,
  onCopyInviteLink,
}: SupplierInvitationResultProps) {
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

      {successMessage ? (
        <div
          className="mt-5 min-w-0 rounded-executive border border-emerald-300/15 bg-emerald-400/[0.08] px-5 py-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            Invitation Created
          </p>

          <p className="mt-2 min-w-0 text-pretty text-sm font-bold leading-6 text-emerald-100">
            {successMessage}
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
