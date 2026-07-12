"use client";

import { useEffect, useMemo, useState } from "react";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import { createClient } from "@/lib/supabase/client";

type InviteVendorFormProps = {
  rfqId: string;
};

type InviteResponse = {
  inviteUrl?: string;
  message?: string;
  error?: string;
};

type ApprovedVendor = {
  vendor_company_id: string;
  status: string | null;
  rating: number | null;
};

type Company = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  network_role: string | null;
};

type VendorOption = Company & {
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

export default function InviteVendorForm({
  rfqId,
}: InviteVendorFormProps) {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [inviteUrl, setInviteUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedVendor =
    vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;

  useEffect(() => {
    let active = true;

    async function loadApprovedVendors() {
      setVendorsLoading(true);

      const { data: avlData, error: avlError } = await supabase
        .from("approved_vendors")
        .select("vendor_company_id, status, rating")
        .in("status", ["approved", "conditional"]);

      if (!active) return;

      if (avlError) {
        setVendors([]);
        setError(
          "Approved Vendor List data could not be loaded. Direct email invitations remain available.",
        );
        setVendorsLoading(false);
        return;
      }

      const approvedVendorRows = (avlData || []) as ApprovedVendor[];

      const vendorIds = approvedVendorRows.map(
        (vendor) => vendor.vendor_company_id,
      );

      if (vendorIds.length === 0) {
        setVendors([]);
        setVendorsLoading(false);
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name, category, location, network_role")
        .in("id", vendorIds);

      if (!active) return;

      if (companyError) {
        setVendors([]);
        setError(
          "Approved supplier profiles could not be loaded. Direct email invitations remain available.",
        );
        setVendorsLoading(false);
        return;
      }

      const companies = (companyData || []) as Company[];

      const options = companies
        .map((company) => {
          const avl = approvedVendorRows.find(
            (vendor) => vendor.vendor_company_id === company.id,
          );

          return {
            ...company,
            avlStatus: avl?.status || "approved",
            avlRating: avl?.rating || 85,
          };
        })
        .sort((a, b) => b.avlRating - a.avlRating);

      setVendors(options);
      setVendorsLoading(false);
    }

    loadApprovedVendors();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setInviteUrl("");
    setSuccessMessage("");
    setCopyMessage("");

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rfqId,
          email,
          vendorCompanyId: selectedVendorId || null,
        }),
      });

      const data = (await response.json()) as InviteResponse;

      if (!response.ok) {
        setError(data.error || "Could not create supplier invite.");
        return;
      }

      setInviteUrl(data.inviteUrl || "");
      setSuccessMessage(
        data.message || "Supplier invite created successfully.",
      );
      setEmail("");
      setSelectedVendorId("");
    } catch {
      setError(
        "The supplier invitation could not be created. Verify your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;

    const absoluteUrl = `${window.location.origin}${inviteUrl}`;

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopyMessage("Secure invite link copied.");
    } catch {
      setCopyMessage(
        "The link could not be copied automatically. Select and copy it manually.",
      );
    }
  }

  return (
    <ExecutivePanel
      variant="operational"
      padding="md"
      tone="blue"
    >
      <section aria-labelledby="supplier-invitation-form-title">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Supplier Invitations
            </p>

            <h3
              id="supplier-invitation-form-title"
              className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
            >
              Invite Approved Suppliers to Quote
            </h3>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              Route secure RFQ invitations through the Approved Vendor
              List. Open RFQs may use direct email invitations, while
              selective, sealed-bid, and framework workflows should
              prioritize governed supplier records.
            </p>
          </div>

          <div className="min-w-[210px] rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.07] px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-nexus-muted">
              Access Control
            </p>

            <p className="mt-2 text-sm font-black text-nexus-gold">
              AVL Governance
            </p>

            <p className="mt-2 text-xs font-semibold leading-5 text-nexus-muted">
              Supplier selection and direct invitations remain recorded
              against this RFQ.
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-[30px] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
                Approved Vendor List
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
                Select an approved supplier organization or continue
                with a controlled direct email invitation.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-nexus-muted">
              {vendorsLoading
                ? "Loading"
                : `${vendors.length} eligible supplier${
                    vendors.length === 1 ? "" : "s"
                  }`}
            </div>
          </div>

          {vendors.length > 0 ? (
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
                    onClick={() =>
                      setSelectedVendorId((current) =>
                        current === vendor.id ? "" : vendor.id,
                      )
                    }
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
                          <p className="mt-1 text-xs font-semibold leading-5 text-nexus-muted">
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
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.045] p-5 sm:p-6"
        >
          <div>
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
              </div>

              <button
                type="button"
                onClick={() => setSelectedVendorId("")}
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
                onChange={(event) => setEmail(event.target.value)}
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
              The selected AVL supplier will be attached to this
              invitation for procurement governance and audit tracking.
            </p>
          ) : (
            <p className="mt-3 text-xs font-bold leading-5 text-nexus-muted">
              Direct email invitations remain available where permitted
              by the RFQ sourcing method and governance policy.
            </p>
          )}
        </form>

        {error ? (
          <div
            className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.08] px-5 py-4"
            role="alert"
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
          <div className="mt-5 rounded-[30px] border border-nexus-gold/20 bg-nexus-gold/[0.06] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
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
                onClick={copyInviteLink}
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
              >
                {copyMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </ExecutivePanel>
  );
}