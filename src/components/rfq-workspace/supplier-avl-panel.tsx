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
  className: string;
};

function getStatusTone(status: string): VendorStatusTone {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === "approved") {
    return {
      label: "Approved",
      className:
        "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
    };
  }

  if (normalizedStatus === "conditional") {
    return {
      label: "Conditional",
      className:
        "border-amber-300/20 bg-amber-400/10 text-amber-200",
    };
  }

  if (normalizedStatus === "suspended") {
    return {
      label: "Suspended",
      className:
        "border-red-300/20 bg-red-400/10 text-red-300",
    };
  }

  return {
    label: status || "Unclassified",
    className:
      "border-white/10 bg-white/[0.055] text-nexus-muted",
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
  return (
    <section
      className="mt-7 rounded-[30px] border border-white/10 bg-black/20 p-5 sm:p-6"
      aria-labelledby="supplier-avl-panel-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p
            id="supplier-avl-panel-title"
            className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold"
          >
            Approved Vendor List
          </p>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-nexus-muted">
            Select an approved supplier organization or continue with a
            controlled direct email invitation.
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-nexus-muted">
          {vendorsLoading
            ? "Loading"
            : unavailable
              ? "Unavailable"
              : `${vendors.length} eligible supplier${
                  vendors.length === 1 ? "" : "s"
                }`}
        </div>
      </div>

      {unavailable ? (
        <div
          className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-5"
          role="status"
        >
          <p className="text-sm font-black text-nexus-white">
            Approved vendor management is not enabled in this environment.
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
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
                className={`min-w-0 rounded-3xl border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 ${
                  selected
                    ? "border-nexus-gold/40 bg-nexus-gold/[0.08] shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
                    : "border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.065]"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-black text-nexus-white">
                        {vendor.name || "Approved Supplier"}
                      </p>

                      {selected ? (
                        <span className="rounded-full border border-nexus-gold/25 bg-nexus-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold">
                          Selected
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 break-words text-xs font-semibold leading-5 text-nexus-muted">
                      {vendor.category || "Supplier Organization"}
                      {" · "}
                      {vendor.location || "Location not specified"}
                    </p>

                    {vendor.network_role ? (
                      <p className="mt-1 break-words text-xs font-semibold leading-5 text-nexus-muted">
                        Network classification: {vendor.network_role}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone.className}`}
                    >
                      {statusTone.label}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-nexus-white">
                      AVL {vendor.avlRating}/100
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-5"
          role="status"
        >
          <p className="text-sm font-black text-nexus-white">
            {vendorsLoading
              ? "Loading Approved Vendor List"
              : "No Eligible AVL Suppliers Available"}
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
            {vendorsLoading
              ? "Nexus Pavilion is retrieving the approved supplier records available to this company."
              : "Your Approved Vendor List currently has no approved or conditional suppliers available for selection. Add qualified suppliers through the Directory or continue with a controlled direct email invitation."}
          </p>
        </div>
      )}
    </section>
  );
}