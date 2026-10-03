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
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_WARNING,
} from "@/lib/design-system/executive-contract";
import {
  APPROVED_VENDOR_DOMAIN_AVAILABLE,
  APPROVED_VENDOR_UNAVAILABLE_MESSAGE,
  INVITE_BY_EMAIL_REMAINS_MESSAGE,
} from "@/lib/procurement/supplier-domain-availability";

type InviteVendorFormProps = {
  rfqId: string;
  embedded?: boolean;
};

type InviteEmailResult = {
  sent?: boolean;
  skipped?: boolean;
  id?: string | null;
  error?: string | null;
};

type InviteResponse = {
  inviteUrl?: string;
  absoluteInviteUrl?: string | null;
  reused?: boolean;
  message?: string;
  error?: string;
  email?: InviteEmailResult;
};

export default function InviteVendorForm({
  rfqId,
  embedded = false,
}: InviteVendorFormProps) {
  const [email, setEmail] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const vendors: SupplierAvlVendorOption[] = [];

  const [inviteUrl, setInviteUrl] = useState("");
  const [absoluteInviteUrl, setAbsoluteInviteUrl] = useState<string | null>(
    null,
  );
  const [inviteReused, setInviteReused] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [emailResult, setEmailResult] = useState<InviteEmailResult | null>(
    null,
  );
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
    setAbsoluteInviteUrl(null);
    setInviteReused(false);
    setSuccessMessage("");
    setEmailResult(null);
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
      setAbsoluteInviteUrl(
        typeof data.absoluteInviteUrl === "string" && data.absoluteInviteUrl
          ? data.absoluteInviteUrl
          : null,
      );
      setInviteReused(data.reused === true);
      setEmailResult(data.email || null);
      setSuccessMessage(
        data.message || "Supplier invitation record created.",
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
    const copyTarget = absoluteInviteUrl || inviteUrl;
    if (!copyTarget) return;

    try {
      await navigator.clipboard.writeText(copyTarget);
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
          <p className="np-type-eyebrow text-nexus-gold">
            Supplier Invitations
          </p>

          <h3
            id="supplier-invitation-form-title"
            className="np-type-h2 mt-3 min-w-0 text-pretty"
          >
            Invite Suppliers to Quote
          </h3>

          <p className="np-type-body mt-3 max-w-3xl min-w-0 text-pretty text-nexus-text-secondary">
            Route secure RFQ invitations by email. {INVITE_BY_EMAIL_REMAINS_MESSAGE}
          </p>
        </div>
      )}

      <div
        className={embedded ? "min-w-0" : "mt-6 min-w-0 border-t border-white/10 pt-6"}
        data-rfq-invitation-access="true"
      >
        <p className="np-type-meta text-nexus-gold-bright">Invitation access</p>

        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <ExecutiveBadge tone="gold">Email invitation</ExecutiveBadge>
          <ExecutiveBadge
            tone={APPROVED_VENDOR_DOMAIN_AVAILABLE ? "success" : "warning"}
          >
            {APPROVED_VENDOR_DOMAIN_AVAILABLE
              ? "AVL selection available"
              : "AVL unavailable"}
          </ExecutiveBadge>
        </div>

        <div
          className={`mt-4 ${
            APPROVED_VENDOR_DOMAIN_AVAILABLE
              ? EXECUTIVE_FEEDBACK_INFO
              : EXECUTIVE_FEEDBACK_WARNING
          }`}
        >
          <p className="np-type-body text-pretty text-nexus-text-primary">
            {APPROVED_VENDOR_DOMAIN_AVAILABLE
              ? "Supplier selection and direct invitations remain recorded against this RFQ."
              : `${APPROVED_VENDOR_UNAVAILABLE_MESSAGE} ${INVITE_BY_EMAIL_REMAINS_MESSAGE}`}
          </p>
          <p className="np-type-body mt-2 text-pretty text-nexus-text-secondary">
            Invitation delivery builds respondent coverage for this RFQ.
            An invitation is not quote participation, and participation is
            not an award decision.
          </p>
        </div>
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
        emailResult={emailResult}
        reused={inviteReused}
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
