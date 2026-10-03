"use client";

import { useId, useState, type FormEvent } from "react";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_SELECT,
} from "@/lib/design-system/executive-contract";

type InviteEmailResult = {
  sent?: boolean;
  skipped?: boolean;
  id?: string | null;
  error?: string | null;
};

type InviteResponse = {
  success?: boolean;
  inviteUrl?: string;
  email?: InviteEmailResult;
  error?: string;
};

type InviteRole = "viewer" | "member" | "admin";

const ROLE_OPTIONS: {
  value: InviteRole;
  label: string;
  description: string;
}[] = [
  {
    value: "viewer",
    label: "Read Only",
    description:
      "Can review permitted workspace information. Cannot create, edit, submit, or manage workspace access.",
  },
  {
    value: "member",
    label: "Standard",
    description:
      "Can perform permitted day-to-day work within authorized workflows. Cannot manage workspace settings or team access.",
  },
  {
    value: "admin",
    label: "Administrator",
    description:
      "Can manage workspace settings, members, and access in addition to standard workspace activity.",
  },
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function InviteUserForm() {
  const emailId = useId();
  const roleId = useId();
  const roleHintId = useId();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [emailResult, setEmailResult] = useState<InviteEmailResult | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);

    setLoading(true);
    setInviteUrl("");
    setEmailResult(null);
    setCopied(false);
    setError("");

    if (!isValidEmail(normalizedEmail)) {
      setLoading(false);
      setError("Please enter a valid work email address.");
      return;
    }

    try {
      const response = await fetch("/api/company-invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          role,
        }),
      });

      const rawText = await response.text();

      let data: InviteResponse = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        setError(
          "We couldn't send the workspace invitation. Please try again.",
        );
        return;
      }

      if (!response.ok) {
        const apiError =
          typeof data.error === "string" ? data.error.trim() : "";
        setError(
          apiError &&
            apiError.length < 200 &&
            !/postgres|supabase|permission denied|stack|undefined/i.test(
              apiError,
            )
            ? apiError
            : "We couldn't send the workspace invitation. Please try again.",
        );
        return;
      }

      if (!data.inviteUrl) {
        setError(
          "Workspace invitation was created, but no invitation link was returned.",
        );
        return;
      }

      setInviteUrl(data.inviteUrl);
      setEmailResult(data.email || null);
      setEmail("");
      setRole("member");
    } catch (requestError) {
      console.error(requestError);

      setError(
        "We couldn't send the workspace invitation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyInviteUrl() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (copyError) {
      console.error(copyError);
      setError("Could not copy invite link. Please copy it manually.");
    }
  }

  function getStatusLabel() {
    if (!emailResult) return "Workspace Invitation Ready";
    if (emailResult.sent) return "Workspace Invitation Sent";
    if (emailResult.skipped) return "Email Delivery Skipped";
    if (emailResult.error) return "Email Delivery Failed";

    return "Workspace Invitation Ready";
  }

  function getResultTitle() {
    if (!emailResult) return "Workspace Invitation Created";

    if (emailResult.sent) {
      return "Workspace Invitation Email Sent";
    }

    if (emailResult.skipped) {
      return "Workspace Invitation Created, Email Skipped";
    }

    if (emailResult.error) {
      return "Workspace Invitation Created, Email Failed";
    }

    return "Workspace Invitation Created";
  }

  function getResultMessage() {
    if (!emailResult) {
      return "The workspace invitation link was created. You can copy and share it manually.";
    }

    if (emailResult.sent) {
      return "The workspace invitation email was sent successfully. The copy link remains available as a fallback.";
    }

    if (emailResult.skipped) {
      return "Email delivery was skipped because email configuration is missing. Use the workspace invitation link as a fallback.";
    }

    if (emailResult.error) {
      return "Email delivery failed. Use the workspace invitation link as a fallback.";
    }

    return "The workspace invitation link was created. You can copy and share it manually.";
  }

  const selectedRole = ROLE_OPTIONS.find((option) => option.value === role);

  return (
    <section className="rounded-panel border border-white/10 bg-white/[0.045] p-6 text-white shadow-inner-executive backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="np-type-eyebrow text-nexus-gold">
            Workspace Invitation
          </p>

          <h2 className="np-type-h2 mt-3 text-nexus-white">
            Invite Team Member
          </h2>

          <p className="np-type-body mt-3 max-w-2xl text-pretty text-nexus-muted">
            Invite users to become members of your company workspace.
            Workspace membership is separate from RFQ invitations and supplier
            participation. Nexus Pavilion sends the workspace invitation email
            and keeps a secure copy link available as a fallback.
          </p>
        </div>

        <StatusCard label="Status" value={getStatusLabel()} />
      </div>

      <form
        onSubmit={handleInvite}
        className="mt-7 grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"
        noValidate
      >
        <div className="min-w-0">
          <label htmlFor={emailId} className="np-type-meta mb-2 block text-nexus-muted">
            Work Email
          </label>
          <input
            id={emailId}
            type="email"
            name="inviteEmail"
            autoComplete="email"
            required
            placeholder="user@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            className={`h-[56px] focus-visible:ring-2 ${EXECUTIVE_FORM_INPUT}`}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={roleId} className="np-type-meta mb-2 block text-nexus-muted">
            Access Level
          </label>
          <select
            id={roleId}
            name="inviteAccessLevel"
            value={role}
            onChange={(event) => setRole(event.target.value as InviteRole)}
            disabled={loading}
            aria-describedby={roleHintId}
            className={`h-[56px] focus-visible:ring-2 ${EXECUTIVE_FORM_SELECT}`}
          >
            {ROLE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-nexus-navy text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className={`${EXECUTIVE_CTA_PRIMARY} h-[56px] w-full md:w-auto`}
          >
            {loading ? "Sending..." : "Send Workspace Invitation"}
          </button>
        </div>
      </form>

      {selectedRole ? (
        <div className="mt-4 rounded-executive border border-white/10 bg-white/[0.035] p-5">
          <p className="np-type-meta text-nexus-muted">
            Selected Access Level
          </p>

          <p className="np-type-body mt-2 font-black text-nexus-white">
            {selectedRole.label}
          </p>

          <p id={roleHintId} className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
            {selectedRole.description} Access Level is workspace membership
            authority only. It does not assign Job Title, Procurement Function,
            or RFQ participation.
          </p>
        </div>
      ) : null}

      {inviteUrl ? (
        <div
          role="status"
          className={`mt-6 ${EXECUTIVE_FEEDBACK_SUCCESS} p-5`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black">
                {getResultTitle()}
              </p>

              <p className="mt-2 text-sm font-bold leading-6 opacity-90">
                {getResultMessage()}
              </p>

              <p className="mt-4 max-w-3xl min-w-0 break-all rounded-2xl border border-white/10 bg-black/20 p-4 text-xs font-semibold leading-6">
                {inviteUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteUrl}
              className={`min-h-11 shrink-0 rounded-2xl border border-status-success/25 bg-status-success/15 px-5 py-3 text-sm font-black text-status-success transition hover:bg-status-success/20 ${EXECUTIVE_FOCUS_CYAN}`}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <p className="mt-4 text-xs font-bold leading-5 opacity-80">
            The invited company member must use the same email address shown
            in the workspace invitation.
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className={`mt-6 ${EXECUTIVE_FEEDBACK_ERROR} p-4 text-sm font-bold leading-6`}
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${EXECUTIVE_FEEDBACK_INFO} shrink-0 px-5 py-4`}>
      <p className="np-type-meta">{label}</p>
      <p className="np-type-body mt-1 font-black text-nexus-white">{value}</p>
    </div>
  );
}
