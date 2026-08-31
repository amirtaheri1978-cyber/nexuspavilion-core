"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WorkspaceLifecycleButtonProps = {
  id: string;
  companyName: string;
  mode?: "archive" | "reactivate";
};

export default function WorkspaceLifecycleButton({
  id,
  companyName,
  mode = "archive",
}: WorkspaceLifecycleButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isArchive = mode === "archive";
  const archiveConfirmed = confirmationValue === companyName;
  const actionLabel = isArchive ? "Archive Workspace" : "Reactivate Workspace";

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setConfirmationValue("");
    setErrorMessage("");
  }

  async function submitLifecycleAction() {
    if (isArchive && !archiveConfirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: mode }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            `Unable to ${mode} the company workspace.`,
        );
        return;
      }

      setIsOpen(false);
      setConfirmationValue("");
      router.refresh();
    } catch (error) {
      console.error("Company workspace lifecycle request failed.", {
        companyId: id,
        mode,
        error,
      });
      setErrorMessage(
        `Unable to ${mode} the company workspace.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          isArchive
            ? "inline-flex min-h-11 items-center rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-400/15"
            : "inline-flex min-h-11 items-center rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15"
        }
      >
        {actionLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-lifecycle-dialog-title"
            className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#07111F] p-6 text-white shadow-[0_36px_120px_rgba(0,0,0,0.62)] sm:p-8"
          >
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#C8A646]">
              Workspace Lifecycle
            </p>

            <h3
              id="workspace-lifecycle-dialog-title"
              className="mt-3 text-2xl font-black text-white"
            >
              {actionLabel}
            </h3>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              {isArchive
                ? "Archiving preserves governance, document, RFQ, quotation, award, and audit history in read-only mode. The workspace leaves public discovery and cannot create new operational activity until reactivated."
                : "Reactivation restores the archived memberships that were active when this workspace was archived and returns the workspace to active operations."}
            </p>

            {isArchive ? (
              <div className="mt-6">
                <label
                  htmlFor="workspace-archive-confirmation"
                  className="text-sm font-black text-slate-200"
                >
                  Type <span className="text-white">{companyName}</span> to confirm
                </label>
                <input
                  id="workspace-archive-confirmation"
                  value={confirmationValue}
                  onChange={(event) =>
                    setConfirmationValue(event.target.value)
                  }
                  autoComplete="off"
                  className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/50"
                />
              </div>
            ) : null}

            {errorMessage ? (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm font-bold text-red-100"
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="min-h-11 rounded-xl border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLifecycleAction}
                disabled={
                  isSubmitting ||
                  (isArchive && !archiveConfirmed)
                }
                className={
                  isArchive
                    ? "min-h-11 rounded-xl border border-red-300/25 bg-red-400/15 px-4 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    : "min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-400/15 px-4 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                {isSubmitting
                  ? isArchive
                    ? "Archiving..."
                    : "Reactivating..."
                  : actionLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
