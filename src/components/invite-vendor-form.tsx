"use client";

import { useRef, useState } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  SupplierAvlPanel,
  type SupplierAvlVendorOption,
} from "@/components/rfq-workspace/supplier-avl-panel";
import { SupplierInvitationDelivery } from "@/components/rfq-workspace/supplier-invitation-delivery";
import { SupplierInvitationResult } from "@/components/rfq-workspace/supplier-invitation-result";
import {
  APPROVED_VENDOR_DOMAIN_AVAILABLE,
  APPROVED_VENDOR_UNAVAILABLE_MESSAGE,
  INVITE_BY_EMAIL_REMAINS_MESSAGE,
} from "@/lib/procurement/supplier-domain-availability";

type InviteVendorFormProps = {
  rfqId: string;
  embedded?: boolean;
};

type InviteResponse = {
  inviteUrl?: string;
  message?: string;
  error?: string;
};

export default function InviteVendorForm({
  rfqId,
  embedded = false,
}: InviteVendorFormProps) {
  const [email, setEmail] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const vendors: SupplierAvlVendorOption[] = [];

  const [inviteUrl, setInviteUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inviteLock = useRef(false);
  const [error, setError] = useState("");

  const selectedVendor =
    vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (inviteLock.current || loading) {
      return;
    }

    inviteLock.current = true;
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
      inviteLock.current = false;
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

  const invitationBody = (
    <section
      className="min-w-0 @container"
      aria-labelledby={
        embedded
          ? "rfq-supplier-invitation-heading"
          : "supplier-invitation-form-title"
      }
      data-rfq-invite-vendor-form="true"
    >
      {embedded ? null : (
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Supplier Invitations
          </p>

          <h3
            id="supplier-invitation-form-title"
            className="mt-3 min-w-0 text-pretty text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
          >
            Invite Suppliers to Quote
          </h3>

          <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
            Route secure RFQ invitations by email. {INVITE_BY_EMAIL_REMAINS_MESSAGE}
          </p>
        </div>
      )}

      <div
        className={embedded ? "min-w-0" : "mt-6 min-w-0 border-t border-white/10 pt-6"}
        data-rfq-invitation-access="true"
      >
        <p className="np-type-meta text-nexus-gold-bright">Invitation access</p>
        <div className="mt-3">
          <ExecutiveBadge tone="gold">Email invitation</ExecutiveBadge>
        </div>
        <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
          {APPROVED_VENDOR_DOMAIN_AVAILABLE
            ? "Supplier selection and direct invitations remain recorded against this RFQ."
            : `${APPROVED_VENDOR_UNAVAILABLE_MESSAGE} ${INVITE_BY_EMAIL_REMAINS_MESSAGE}`}
        </p>
      </div>

      <SupplierAvlPanel
        unavailable={!APPROVED_VENDOR_DOMAIN_AVAILABLE}
        unavailableMessage={INVITE_BY_EMAIL_REMAINS_MESSAGE}
        vendors={vendors}
        vendorsLoading={false}
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
  );

  if (embedded) {
    return invitationBody;
  }

  return (
    <ExecutivePanel variant="operational" padding="md" tone="blue">
      {invitationBody}
    </ExecutivePanel>
  );
}
