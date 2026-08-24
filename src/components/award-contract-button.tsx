"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ExecutiveConfirmDialog } from "@/components/executive/executive-confirm-dialog";
import {
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";

type AwardContractButtonProps = {
  quoteId: string;
  disabled?: boolean;
  rfqTitle?: string;
  supplierLabel?: string;
  amountLabel?: string;
};

type AwardContractResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
  rfq?: {
    slug?: string | null;
  };
  warnings?: {
    notification?: string | null;
    audit?: string | null;
    ownerNotification?: string | null;
    supplierNotification?: string | null;
    ownerAudit?: string | null;
    supplierAudit?: string | null;
  };
};

function toWorkspaceError(message: string) {
  if (
    /postgres|supabase|permission denied|column |relation |stack|undefined/i.test(
      message,
    )
  ) {
    return "The award could not be completed. Please try again.";
  }

  return message;
}

export default function AwardContractButton({
  quoteId,
  disabled = false,
  rfqTitle = "this RFQ",
  supplierLabel = "the selected supplier",
  amountLabel = "the quoted amount",
}: AwardContractButtonProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const awardLock = useRef(false);

  function closeDialog() {
    setOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }

  async function handleAward() {
    if (loading || disabled) return;
    if (awardLock.current) return;

    awardLock.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/award-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId,
        }),
      });

      const data = (await response.json()) as AwardContractResponse;

      if (!response.ok) {
        awardLock.current = false;
        setLoading(false);
        setError(toWorkspaceError(data.error || "Failed to award contract."));
        return;
      }

      if (data.warnings?.notification) {
        console.warn("Award notification warning:", data.warnings.notification);
      }

      if (data.warnings?.audit) {
        console.warn("Award audit warning:", data.warnings.audit);
      }

      setOpen(false);

      if (data.redirectTo) {
        router.push(data.redirectTo);
        router.refresh();
        return;
      }

      if (data.rfq?.slug) {
        router.push(`/rfq/${data.rfq.slug}`);
        router.refresh();
        return;
      }

      router.refresh();
    } catch (awardError) {
      console.error(awardError);
      awardLock.current = false;
      setLoading(false);
      setError("Failed to award contract.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (loading || disabled) return;
          setError("");
          setOpen(true);
        }}
        disabled={loading || disabled}
        className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-nexus-gold/30 bg-nexus-gold/15 px-5 py-2.5 text-sm font-black text-nexus-gold-bright transition-colors hover:bg-nexus-gold/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-nexus-text-muted ${EXECUTIVE_FOCUS_GOLD}`}
      >
        {loading ? "Awarding..." : "Award contract"}
      </button>

      {error ? (
        <p role="alert" className="max-w-[240px] np-type-meta text-red-300">
          {error}
        </p>
      ) : null}

      <ExecutiveConfirmDialog
        open={open}
        title="Confirm contract award"
        confirmLabel="Confirm award"
        busy={loading}
        onClose={closeDialog}
        onConfirm={handleAward}
        description={
          <div className="space-y-3">
            <p>
              Awarding this quote will reject all other quotes for this RFQ and
              mark the RFQ as awarded.
            </p>
            <dl className="space-y-2 rounded-executive border border-white/10 bg-white/[0.04] p-4">
              <div>
                <dt className="np-type-meta">RFQ</dt>
                <dd className="np-type-body mt-1 text-white">{rfqTitle}</dd>
              </div>
              <div>
                <dt className="np-type-meta">Supplier</dt>
                <dd className="np-type-body mt-1 text-white">{supplierLabel}</dd>
              </div>
              <div>
                <dt className="np-type-meta">Quoted amount</dt>
                <dd className="np-type-kpi mt-1 text-lg text-nexus-gold-bright">
                  {amountLabel}
                </dd>
              </div>
            </dl>
          </div>
        }
      />
    </div>
  );
}
