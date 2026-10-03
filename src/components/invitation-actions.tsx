"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  EXECUTIVE_BUTTON_DESTRUCTIVE,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
} from "@/lib/design-system/executive-contract";

type InvitationActionsProps = {
  invitationId: string;
  inviteUrl: string;
  status: string | null;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  email?: {
    sent?: boolean;
    skipped?: boolean;
    id?: string | null;
    error?: string | null;
  };
};

export default function InvitationActions({
  invitationId,
  inviteUrl,
  status,
}: InvitationActionsProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const normalizedStatus = String(status || "").toLowerCase();
  const isPending =
    !normalizedStatus ||
    normalizedStatus === "pending" ||
    normalizedStatus === "sent";
  const hasInviteUrl = inviteUrl.trim().length > 0;

  async function handleCopy() {
    setMessage("");
    setError("");

    if (!hasInviteUrl) {
      setError("Workspace invitation link is not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setMessage("Workspace invitation link copied.");

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setError("Could not copy workspace invitation link.");
    }
  }

  async function handleResend() {
    if (!isPending) {
      setError("Only pending workspace invitations can be resent.");
      return;
    }

    setLoadingAction("resend");
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/company-invitations/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error || "Failed to resend workspace invitation.");
        return;
      }

      if (data.email?.sent) {
        setMessage("Workspace invitation email resent.");
      } else if (data.email?.error) {
        setError(`Workspace invitation resend failed: ${data.email.error}`);
      } else if (data.email?.skipped) {
        setMessage(
          "Workspace invitation resend completed. Email delivery was skipped.",
        );
      } else {
        setMessage("Workspace invitation resend completed.");
      }

      router.refresh();
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleRevoke() {
    if (!isPending) {
      setError("Only pending workspace invitations can be revoked.");
      return;
    }

    const confirmed = window.confirm(
      "Revoke this workspace invitation? The invited user will no longer be able to join with this link.",
    );

    if (!confirmed) return;

    setLoadingAction("revoke");
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/company-invitations/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invitationId }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error || "Failed to revoke workspace invitation.");
        return;
      }

      setMessage("Workspace invitation revoked.");
      router.refresh();
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoadingAction("");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!hasInviteUrl || loadingAction !== ""}
          className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 px-4 py-2 text-xs`}
        >
          {copied ? "Copied" : "Copy Link"}
        </button>

        {isPending ? (
          <>
            <button
              type="button"
              onClick={handleResend}
              disabled={loadingAction === "resend"}
              className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
            >
              {loadingAction === "resend" ? "Resending..." : "Resend"}
            </button>

            <button
              type="button"
              onClick={handleRevoke}
              disabled={loadingAction === "revoke"}
              className={`${EXECUTIVE_BUTTON_DESTRUCTIVE} min-h-11 px-4 py-2 text-xs`}
            >
              {loadingAction === "revoke" ? "Revoking..." : "Revoke"}
            </button>
          </>
        ) : null}
      </div>

      {message ? (
        <p
          role="status"
          className={`${EXECUTIVE_FEEDBACK_SUCCESS} text-xs font-bold leading-5`}
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={`${EXECUTIVE_FEEDBACK_ERROR} text-xs font-bold leading-5`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
