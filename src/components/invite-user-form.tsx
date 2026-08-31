"use client";

import { useState } from "react";

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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [emailResult, setEmailResult] = useState<InviteEmailResult | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
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
          `API returned non-JSON response. Status: ${
            response.status
          }. Response: ${rawText.slice(0, 250)}`,
        );
        return;
      }

      if (!response.ok) {
        setError(
          data.error ||
            `Failed to create workspace invitation. Status: ${response.status}`,
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
        requestError instanceof Error
          ? `Request failed: ${requestError.message}`
          : "Request failed. Please try again.",
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
    <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Workspace Access
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            Invite Team Member
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
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
        className="mt-7 grid gap-4 md:grid-cols-[1fr_220px_auto]"
      >
        <label className="block">
          <FormLabel>Work Email</FormLabel>

          <input
            type="email"
            required
            placeholder="user@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            className="h-[56px] w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="block">
          <FormLabel>Access Level</FormLabel>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value as InviteRole)}
            disabled={loading}
            className="h-[56px] w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROLE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-[#061426] text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="h-[56px] w-full rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 md:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
          >
            {loading ? "Sending..." : "Send Workspace Invitation"}
          </button>
        </div>
      </form>

      {selectedRole ? (
        <div className="mt-4 rounded-[24px] border border-white/10 bg-[#061426]/70 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Selected Access Level
          </p>

          <p className="mt-2 text-sm font-black text-white">
            {selectedRole.label}
          </p>

          <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
            {selectedRole.description}
          </p>
        </div>
      ) : null}

      {inviteUrl ? (
        <div className="mt-6 rounded-[28px] border border-emerald-300/20 bg-emerald-400/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-200">
                {getResultTitle()}
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-emerald-200/85">
                {getResultMessage()}
              </p>

              <p className="mt-4 max-w-3xl break-all rounded-2xl border border-white/10 bg-[#061426]/70 p-4 text-xs font-semibold leading-6 text-emerald-100">
                {inviteUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteUrl}
              className="rounded-full border border-emerald-300/20 bg-emerald-400/15 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <p className="mt-4 text-xs font-bold leading-5 text-emerald-200/80">
            The invited company member must use the same email address shown
            in the workspace invitation.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[24px] border border-red-300/20 bg-red-400/10 p-4 text-sm font-bold leading-6 text-red-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
      {children}
    </span>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.055] px-5 py-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9BE8F8]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
