import {
  ExecutiveBadge,
  type ExecutiveBadgeTone,
} from "@/components/executive/executive-badge";
import {
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";

type SupplierAvlPanelProps = {
  vendors: SupplierAvlVendorOption[];
  vendorsLoading: boolean;
  selectedVendorId: string;
  onSelectVendor: (vendorId: string) => void;
  unavailable?: boolean;
  unavailableMessage?: string;
};

export type SupplierAvlVendorOption = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  network_role: string | null;
  avlStatus: string;
  avlRating: number;
};

type VendorStatusTone = {
  label: string;
  tone: ExecutiveBadgeTone;
};

function getStatusTone(status: string): VendorStatusTone {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === "approved") {
    return {
      label: "Approved",
      tone: "success",
    };
  }

  if (normalizedStatus === "conditional") {
    return {
      label: "Conditional",
      tone: "warning",
    };
  }

  if (normalizedStatus === "suspended") {
    return {
      label: "Suspended",
      tone: "risk",
    };
  }

  return {
    label: status || "Unclassified",
    tone: "neutral",
  };
}

export function SupplierAvlPanel({
  vendors,
  vendorsLoading,
  selectedVendorId,
  onSelectVendor,
  unavailable = false,
  unavailableMessage,
}: SupplierAvlPanelProps) {
  const availabilityLabel = vendorsLoading
    ? "Loading"
    : unavailable
      ? "Unavailable"
      : `${vendors.length} eligible supplier${
          vendors.length === 1 ? "" : "s"
        }`;

  const availabilityTone: ExecutiveBadgeTone = vendorsLoading
    ? "pending"
    : unavailable
      ? "warning"
      : vendors.length > 0
        ? "success"
        : "neutral";

  return (
    <section
      className="@container mt-7 min-w-0 border-t border-white/10 pt-7"
      aria-labelledby="supplier-avl-panel-title"
      data-rfq-supplier-avl="true"
    >
      <div className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-end @sm:justify-between">
        <div className="min-w-0">
          <p
            id="supplier-avl-panel-title"
            className="np-type-eyebrow text-nexus-gold"
          >
            Approved Vendor List
          </p>

          <p className="np-type-body mt-2 max-w-3xl min-w-0 text-pretty text-nexus-text-secondary">
            Select an approved supplier organization or continue with a
            controlled direct email invitation.
          </p>
        </div>

        <ExecutiveBadge tone={availabilityTone} className="w-fit shrink-0">
          {availabilityLabel}
        </ExecutiveBadge>
      </div>

      {unavailable ? (
        <div
          className={`${EXECUTIVE_EMPTY_COMPACT} mt-5 text-left`}
          role="status"
        >
          <p className="np-type-h3 text-pretty">
            Approved vendor management is not enabled in this environment.
          </p>

          <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
            {unavailableMessage ||
              "Invite by email remains available."}
          </p>
        </div>
      ) : vendors.length > 0 ? (
        <div
          className="mt-5 grid gap-3"
          role="listbox"
          aria-label="Approved suppliers"
        >
          {vendors.map((vendor) => {
            const selected = selectedVendorId === vendor.id;
            const statusTone = getStatusTone(vendor.avlStatus);

            return (
              <button
                key={vendor.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelectVendor(vendor.id)}
                className={`min-h-11 min-w-0 rounded-executive border p-5 text-left transition-[border-color,background-color] duration-200 motion-reduce:transition-none ${EXECUTIVE_FOCUS_GOLD} ${
                  selected
                    ? "border-nexus-gold/40 bg-nexus-gold/[0.08]"
                    : "border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.065]"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-4 @sm:flex-row @sm:items-start @sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 text-pretty text-sm font-black text-nexus-text-primary">
                        {vendor.name || "Approved Supplier"}
                      </p>

                      {selected ? (
                        <ExecutiveBadge tone="gold">Selected</ExecutiveBadge>
                      ) : null}
                    </div>

                    <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
                      {vendor.category || "Supplier Organization"}
                      {" · "}
                      {vendor.location || "Location not specified"}
                    </p>

                    {vendor.network_role ? (
                      <p className="np-type-body mt-1 min-w-0 text-pretty text-nexus-text-secondary">
                        Network classification: {vendor.network_role}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ExecutiveBadge tone={statusTone.tone}>
                      {statusTone.label}
                    </ExecutiveBadge>

                    <ExecutiveBadge tone="neutral">
                      AVL {vendor.avlRating}/100
                    </ExecutiveBadge>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className={`${EXECUTIVE_EMPTY_COMPACT} mt-5 text-left`}
          role="status"
        >
          <p className="np-type-h3 text-pretty">
            {vendorsLoading
              ? "Loading Approved Vendor List"
              : "No Eligible AVL Suppliers Available"}
          </p>

          <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
            {vendorsLoading
              ? "Nexus Pavilion is retrieving the approved supplier records available to this company."
              : "Your Approved Vendor List currently has no approved or conditional suppliers available for selection. Add qualified suppliers through the Directory or continue with a controlled direct email invitation."}
          </p>
        </div>
      )}
    </section>
  );
}
