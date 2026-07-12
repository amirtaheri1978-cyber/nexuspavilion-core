import type { FormEvent } from "react";

import type { SupplierAvlVendorOption } from "@/components/rfq-workspace/supplier-avl-panel";

type SupplierInvitationDeliveryProps = {
  email: string;
  loading: boolean;
  selectedVendor: SupplierAvlVendorOption | null;
  selectedVendorId: string;
  onEmailChange: (email: string) => void;
  onClearVendor: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SupplierInvitationDelivery({
  email,
  loading,
  selectedVendor,
  selectedVendorId,
  onEmailChange,
  onClearVendor,
  onSubmit,
}: SupplierInvitationDeliveryProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.045] p-5 sm:p-6"
    >
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
          Invitation Delivery
        </p>

        <h4 className="mt-2 text-xl font-black text-nexus-white">
          Create Secure Supplier Invitation
        </h4>

        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-nexus-muted">
          Enter the authorized supplier contact email. The invitation
          will remain associated with this RFQ and the selected AVL
          supplier when applicable.
        </p>
      </div>

      {selectedVendor ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Selected AVL Supplier
            </p>

            <p className="mt-2 break-words text-sm font-black text-nexus-white">
              {selectedVendor.name || "Approved Supplier"}
            </p>

            <p className="mt-1 break-words text-xs font-semibold leading-5 text-nexus-muted">
              {selectedVendor.category || "Supplier Organization"}
              {" · "}
              {selectedVendor.location || "Location not specified"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClearVendor}
            className="self-start rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-nexus-muted transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 sm:self-auto"
          >
            Clear Selection
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
        <label className="min-w-0">
          <span className="sr-only">Supplier contact email</span>

          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={
              selectedVendorId
                ? "Authorized contact email for selected supplier"
                : "supplier@company.com"
            }
            required
            autoComplete="email"
            className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-sm font-bold text-nexus-white outline-none transition placeholder:text-nexus-muted/70 hover:border-white/20 focus:border-nexus-gold/40 focus:ring-2 focus:ring-nexus-gold/20"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="min-h-14 rounded-full border border-nexus-gold/30 bg-nexus-gold px-7 py-4 text-sm font-black text-nexus-navy transition duration-200 hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating Secure Invite..."
            : "Create Supplier Invite"}
        </button>
      </div>

      {selectedVendorId ? (
        <p className="mt-3 text-xs font-bold leading-5 text-nexus-muted">
          The selected AVL supplier will be attached to this invitation
          for procurement governance and audit tracking.
        </p>
      ) : (
        <p className="mt-3 text-xs font-bold leading-5 text-nexus-muted">
          Direct email invitations remain available where permitted by
          the RFQ sourcing method and governance policy.
        </p>
      )}
    </form>
  );
}