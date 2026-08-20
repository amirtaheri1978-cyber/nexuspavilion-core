"use client";

import { useMemo, useState } from "react";

import { formatOwnershipTransferOptionLabel } from "@/lib/auth/professional-identity-display";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

type OwnershipTransfer = {
  id: string;
  company_id: string;
  from_user_id: string;
  to_user_id: string;
  status:
    | "pending_acceptance"
    | "rejected"
    | "cancelled"
    | "expired"
    | "completed";
  previous_owner_next_role: "admin" | "member" | "viewer";
  transfer_reason: string | null;
  requested_at: string;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
};

type TransferTarget = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  workspace_role:
    | "owner"
    | "admin"
    | "member"
    | "viewer";
  membership_status:
    | "pending"
    | "active"
    | "suspended"
    | "revoked";
};

type OwnershipPanelProps = {
  companyName: string;
  currentOwnerLabel: string | null;
  currentOwnerEmail: string | null;
  currentUserId: string;
  currentUserWorkspaceRole:
    | "owner"
    | "admin"
    | "member"
    | "viewer"
    | null;
  pendingTransfer: OwnershipTransfer | null;
  fromUserEmail: string | null;
  toUserEmail: string | null;
  transferTargets: TransferTarget[];
};

type ActionResult = {
  success?: boolean;
  error?: string;
  code?: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OwnershipPanel({
  companyName,
  currentOwnerLabel,
  currentOwnerEmail,
  currentUserId,
  currentUserWorkspaceRole,
  pendingTransfer,
  fromUserEmail,
  toUserEmail,
  transferTargets,
}: OwnershipPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedTargetUserId, setSelectedTargetUserId] =
    useState("");

  const [previousOwnerNextRole, setPreviousOwnerNextRole] =
    useState<"admin" | "member" | "viewer">("admin");

  const [transferReason, setTransferReason] = useState("");

  const isCurrentUserRecipient =
    pendingTransfer?.to_user_id === currentUserId;

  const isCurrentUserSender =
    pendingTransfer?.from_user_id === currentUserId;

  const pendingStatusLabel = useMemo(() => {
    if (!pendingTransfer) return null;

    if (pendingTransfer.status === "pending_acceptance") {
      return "Pending Acceptance";
    }

    if (pendingTransfer.status === "rejected") {
      return "Rejected";
    }

    if (pendingTransfer.status === "cancelled") {
      return "Cancelled";
    }

    if (pendingTransfer.status === "expired") {
      return "Expired";
    }

    return "Completed";
  }, [pendingTransfer]);

  async function runTransferAction(
    endpoint: "accept" | "reject",
  ) {
    if (!pendingTransfer) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/company/ownership/transfer/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transfer_request_id: pendingTransfer.id,
            ...(endpoint === "reject"
              ? {
                  rejection_reason:
                    "Rejected from ownership governance panel",
                }
              : {}),
          }),
        },
      );

      const result = (await response.json()) as ActionResult;

      if (!response.ok || !result.success) {
        setMessage(
          result.error ||
            "The ownership transfer action could not be completed.",
        );
        return;
      }

      setMessage(
        endpoint === "accept"
          ? "Ownership transfer completed successfully."
          : "Ownership transfer rejected successfully.",
      );

      window.location.reload();
    } catch (error) {
      console.error(error);

      setMessage(
        "The ownership transfer action could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestOwnershipTransfer() {
    if (!selectedTargetUserId) {
      setMessage("Please select a proposed owner.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/company/ownership/transfer/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target_user_id: selectedTargetUserId,
            previous_owner_next_role:
              previousOwnerNextRole,
            transfer_reason:
              transferReason.trim() || null,
            expires_in_hours: 72,
          }),
        },
      );

      const result = (await response.json()) as ActionResult;

      if (!response.ok || !result.success) {
        setMessage(
          result.error ||
            "The ownership transfer request could not be created.",
        );
        return;
      }

      setMessage(
        "Ownership transfer request created successfully.",
      );

      window.location.reload();
    } catch (error) {
      console.error(error);

      setMessage(
        "The ownership transfer request could not be created.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-[26px] border border-white/10 bg-[#061426]/70 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Current Ownership
        </p>

        <p className="mt-3 text-xl font-black text-white">
          {companyName}
        </p>

        <p className="mt-2 text-sm font-semibold text-slate-400">
          {currentOwnerLabel
            ? `Current owner: ${currentOwnerLabel}`
            : "No current owner is assigned."}
        </p>
        {currentOwnerEmail &&
        currentOwnerLabel &&
        currentOwnerEmail !== currentOwnerLabel ? (
          <p
            className="mt-1 break-words text-xs font-semibold text-slate-400"
            title={currentOwnerEmail}
          >
            {currentOwnerEmail}
          </p>
        ) : null}

        <div className="mt-4">
          <span
            className={
              currentOwnerLabel
                ? "inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-200"
                : "inline-flex rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-orange-200"
            }
          >
            {currentOwnerLabel
              ? "Ownership Active"
              : "Ownership Missing"}
          </span>
        </div>
      </div>

      {pendingTransfer ? (
        <div className="rounded-[26px] border border-[#C8A646]/25 bg-[#C8A646]/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#F5D77B]">
                Pending Ownership Transfer
              </p>

              <p className="mt-2 text-sm font-semibold text-[#F5D77B]/80">
                {fromUserEmail || "Current owner"} →{" "}
                {toUserEmail || "Proposed owner"}
              </p>
            </div>

            <span className="inline-flex rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#F5D77B]">
              {pendingStatusLabel}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-black text-slate-500">
                Requested
              </dt>

              <dd className="mt-1 font-semibold text-slate-300">
                {formatDateTime(
                  pendingTransfer.requested_at,
                )}
              </dd>
            </div>

            <div>
              <dt className="font-black text-slate-500">
                Expires
              </dt>

              <dd className="mt-1 font-semibold text-slate-300">
                {formatDateTime(
                  pendingTransfer.expires_at,
                )}
              </dd>
            </div>

            <div>
              <dt className="font-black text-slate-500">
                Previous owner role
              </dt>

              <dd className="mt-1 font-semibold capitalize text-slate-300">
                {pendingTransfer.previous_owner_next_role}
              </dd>
            </div>

            <div>
              <dt className="font-black text-slate-500">
                Reason
              </dt>

              <dd className="mt-1 font-semibold text-slate-300">
                {pendingTransfer.transfer_reason ||
                  "No reason provided"}
              </dd>
            </div>
          </dl>

          {pendingTransfer.status ===
            "pending_acceptance" &&
          isCurrentUserRecipient ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  runTransferAction("accept")
                }
                className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-[#03111f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Processing..."
                  : "Accept Ownership"}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  runTransferAction("reject")
                }
                className="rounded-full border border-red-300/25 bg-red-400/10 px-5 py-3 text-sm font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject Transfer
              </button>
            </div>
          ) : null}

          {pendingTransfer.status ===
            "pending_acceptance" &&
          isCurrentUserSender ? (
            <p className="mt-5 text-sm font-semibold text-slate-400">
              Waiting for the proposed owner to accept or
              reject this transfer.
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sm font-semibold text-slate-200">
              {message}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[26px] border border-dashed border-white/15 bg-white/[0.035] p-6">
          <p className="text-sm font-black text-white">
            No pending ownership transfer
          </p>

          {currentUserWorkspaceRole === "owner" ? (
            <>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Select an active workspace member and
                create a governed ownership-transfer
                request.
              </p>

              {transferTargets.length > 0 ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="ownership-transfer-target"
                      className="text-xs font-black uppercase tracking-[0.16em] text-slate-500"
                    >
                      Proposed owner
                    </label>

                    <select
                      id="ownership-transfer-target"
                      value={selectedTargetUserId}
                      onChange={(event) =>
                        setSelectedTargetUserId(
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={`mt-2 w-full rounded-2xl border border-white/10 bg-[#07111F] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_CYAN}`}
                    >
                      <option value="">
                        Select an active member
                      </option>

                      {transferTargets.map((target) => (
                        <option
                          key={target.id}
                          value={target.id}
                          className="bg-[#061426]"
                        >
                          {formatOwnershipTransferOptionLabel({
                            firstName: target.first_name,
                            lastName: target.last_name,
                            jobTitle: target.job_title,
                            email: target.email,
                            workspaceRole: target.workspace_role,
                          })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="previous-owner-next-role"
                      className="text-xs font-black uppercase tracking-[0.16em] text-slate-500"
                    >
                      Your role after transfer
                    </label>

                    <select
                      id="previous-owner-next-role"
                      value={previousOwnerNextRole}
                      onChange={(event) =>
                        setPreviousOwnerNextRole(
                          event.target.value as
                            | "admin"
                            | "member"
                            | "viewer",
                        )
                      }
                      disabled={isSubmitting}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111F] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="admin">
                        Admin
                      </option>

                      <option value="member">
                        Member
                      </option>

                      <option value="viewer">
                        Viewer
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ownership-transfer-reason"
                      className="text-xs font-black uppercase tracking-[0.16em] text-slate-500"
                    >
                      Reason
                    </label>

                    <textarea
                      id="ownership-transfer-reason"
                      value={transferReason}
                      onChange={(event) =>
                        setTransferReason(
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      rows={3}
                      maxLength={2000}
                      placeholder="Optional context for the proposed owner"
                      className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#07111F] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={requestOwnershipTransfer}
                    disabled={
                      isSubmitting ||
                      !selectedTargetUserId
                    }
                    className="rounded-full bg-[#C8A646] px-5 py-3 text-sm font-black text-[#07111F] transition hover:bg-[#F5D77B] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Creating request..."
                      : "Request Ownership Transfer"}
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold leading-6 text-orange-200">
                  No eligible active workspace members are
                  available for ownership transfer.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              There are no ownership actions requiring
              your attention.
            </p>
          )}

          {message ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sm font-semibold text-slate-200">
              {message}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}