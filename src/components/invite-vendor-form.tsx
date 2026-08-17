"use client";

import { useEffect, useMemo, useState } from "react";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  SupplierAvlPanel,
  type SupplierAvlVendorOption,
} from "@/components/rfq-workspace/supplier-avl-panel";
import { SupplierInvitationDelivery } from "@/components/rfq-workspace/supplier-invitation-delivery";
import { SupplierInvitationResult } from "@/components/rfq-workspace/supplier-invitation-result";
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

export default function InviteVendorForm({
  rfqId,
}: InviteVendorFormProps) {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendors, setVendors] = useState<SupplierAvlVendorOption[]>([]);

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
        .from("company_directory")
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

      const options: SupplierAvlVendorOption[] = companies
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

  function handleVendorSelection(vendorId: string) {
    setSelectedVendorId((current) =>
      current === vendorId ? "" : vendorId,
    );
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

        <SupplierAvlPanel
          vendors={vendors}
          vendorsLoading={vendorsLoading}
          selectedVendorId={selectedVendorId}
          onSelectVendor={handleVendorSelection}
        />

        <SupplierInvitationDelivery
          email={email}
          loading={loading}
          selectedVendor={selectedVendor}
          selectedVendorId={selectedVendorId}
          onEmailChange={setEmail}
          onClearVendor={() => setSelectedVendorId("")}
          onSubmit={handleSubmit}
        />

        <SupplierInvitationResult
          error={error}
          successMessage={successMessage}
          inviteUrl={inviteUrl}
          copyMessage={copyMessage}
          onCopyInviteLink={copyInviteLink}
        />
      </section>
    </ExecutivePanel>
  );
}