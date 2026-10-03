import type { FormEvent } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import type { SupplierAvlVendorOption } from "@/components/rfq-workspace/supplier-avl-panel";
import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
} from "@/lib/design-system/executive-contract";

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
      className="@container mt-7 min-w-0 border-t border-white/10 pt-7"
      data-rfq-supplier-delivery="true"
    >
      <div className="min-w-0">
        <p className="np-type-eyebrow text-nexus-gold">
          Invitation Delivery
        </p>

        <h3 className="np-type-h3 mt-2 min-w-0 text-pretty">
          Send Secure Supplier Invitation
        </h3>

        <p className="np-type-body mt-2 max-w-3xl min-w-0 text-pretty text-nexus-text-secondary">
          Enter the authorized supplier contact email. The invitation
          remains associated with this RFQ. When an invitation already
          exists for the same RFQ and supplier email, its secure
          invitation link is reused for the delivery retry.
        </p>
      </div>

      {selectedVendor ? (
        <div className={`mt-5 flex min-w-0 flex-col gap-3 ${EXECUTIVE_FEEDBACK_SUCCESS} @sm:flex-row @sm:items-center @sm:justify-between`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ExecutiveBadge tone="success">Selected AVL Supplier</ExecutiveBadge>
            </div>

            <p className="mt-2 min-w-0 text-pretty text-sm font-black text-nexus-text-primary">
              {selectedVendor.name || "Approved Supplier"}
            </p>

            <p className="mt-1 min-w-0 text-pretty text-xs font-semibold leading-5 text-nexus-text-secondary">
              {selectedVendor.category || "Supplier Organization"}
              {" · "}
              {selectedVendor.location || "Location not specified"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClearVendor}
            className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 self-start px-4 py-2 text-xs @sm:self-auto`}
          >
            Clear Selection
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid min-w-0 grid-cols-1 items-end gap-4 @md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid min-w-0 gap-2">
          <span className={EXECUTIVE_FORM_LABEL}>
            Supplier contact email
          </span>
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
            className={EXECUTIVE_FORM_INPUT}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`${EXECUTIVE_BUTTON_PRIMARY} w-full @md:w-auto @md:shrink-0`}
        >
          {loading
            ? "Sending Supplier Invitation..."
            : "Send Supplier Invitation"}
        </button>
      </div>

      {selectedVendorId ? (
        <p className={`mt-3 min-w-0 text-pretty ${EXECUTIVE_FORM_HELPER}`}>
          The selected AVL supplier will be attached to this invitation
          for procurement governance and audit tracking.
        </p>
      ) : (
        <p className={`mt-3 min-w-0 text-pretty ${EXECUTIVE_FORM_HELPER}`}>
          Direct email invitations remain available where permitted by
          the RFQ sourcing method and governance policy.
        </p>
      )}
    </form>
  );
}
