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
    <>
      {error ? (
        <div
          className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.08] px-5 py-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
            Invitation Not Created
          </p>

          <p className="mt-2 text-sm font-bold leading-6 text-red-200">
            {error}
          </p>
        </div>
      ) : null}

      {successMessage ? (
        <div
          className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.08] px-5 py-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            Invitation Created
          </p>

          <p className="mt-2 text-sm font-bold leading-6 text-emerald-100">
            {successMessage}
          </p>
        </div>
      ) : null}

      {inviteUrl ? (
        <section
          className="mt-5 rounded-[30px] border border-nexus-gold/20 bg-nexus-gold/[0.06] p-5 sm:p-6"
          aria-labelledby="secure-supplier-invite-link-title"
        >
          <p
            id="secure-supplier-invite-link-title"
            className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold"
          >
            Secure Invite Link
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
            Share this controlled invitation link with the authorized
            supplier contact.
          </p>

          <p className="mt-4 break-all rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold leading-6 text-nexus-white">
            {inviteUrl}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onCopyInviteLink}
              className="rounded-full border border-nexus-gold/30 bg-nexus-gold px-5 py-3 text-xs font-black text-nexus-navy transition hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70"
            >
              Copy Invite Link
            </button>

            <a
              href={inviteUrl}
              className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-center text-xs font-black text-nexus-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70"
            >
              Open Invite
            </a>
          </div>

          {copyMessage ? (
            <p
              className="mt-3 text-xs font-black leading-5 text-emerald-300"
              role="status"
              aria-live="polite"
            >
              {copyMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}