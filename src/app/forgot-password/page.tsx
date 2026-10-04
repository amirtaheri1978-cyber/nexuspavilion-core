"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import { getPublicSiteUrl } from "@/lib/ops/public-site-url";
import { createClient } from "@/lib/supabase/client";

const RECOVERY_ASSURANCES = [
  {
    title: "Verified recovery",
    description:
      "Recovery links are time-limited and issued through a protected account verification flow.",
  },
  {
    title: "Workspace protection",
    description:
      "Your company, supplier, and procurement data remain protected throughout account recovery.",
  },
];

const inputClassName =
  "h-[60px] w-full rounded-2xl border border-white/20 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-300 hover:border-white/30 focus:border-[#F0D576] focus:bg-[#081827] focus:ring-4 focus:ring-[#F0D576]/20 disabled:cursor-not-allowed disabled:opacity-60";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getRecoverySiteUrl() {
  const configuredSiteUrl = getPublicSiteUrl();

  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  return window.location.origin.replace(/\/+$/, "");
}

function getFriendlyResetError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rate") ||
    normalized.includes("too many")
  ) {
    return "Too many recovery attempts. Please wait a moment and try again.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch")
  ) {
    return "We could not reach the secure recovery service. Please check your connection and try again.";
  }

  if (
    normalized.includes("invalid email") ||
    normalized.includes("email address")
  ) {
    return "Please enter a valid work email address.";
  }

  return "We could not send a recovery link securely. Please review your email and try again.";
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const emailId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError("Please enter your work email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const siteUrl = getRecoverySiteUrl();
      const redirectTo = `${siteUrl}/auth/callback?next=/set-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          },
        );

      if (resetError) {
        setError(
          getFriendlyResetError(resetError.message),
        );
        return;
      }

      setSubmittedEmail(normalizedEmail);
      setSent(true);
    } catch (recoveryError) {
      console.error(
        "Password recovery request failed:",
        recoveryError,
      );

      setError(
        "A secure recovery connection could not be completed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1680px] items-stretch gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
        <aside className="flex h-full min-h-0 flex-col rounded-[32px] border border-white/10 bg-white/[0.04] p-7 sm:p-9 lg:p-11 xl:p-12">
          <BrandMark />

          <div className="mt-10">
            <h1 className="max-w-xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px] xl:leading-[1.02]">
              Restore access to your workspace.
            </h1>

            <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-300">
              Use your verified work email to start a protected
              password recovery process for Intelligent Procurement.
            </p>
          </div>

          <ul className="mt-9 space-y-4">
            {RECOVERY_ASSURANCES.map((assurance) => (
              <li key={assurance.title} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/35 bg-[#C8A646]/10 text-[10px] text-[#F5D77B]"
                >
                  ✓
                </span>
                <div>
                  <p className="text-sm font-black text-white">
                    {assurance.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
                    {assurance.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-auto border-t border-white/10 pt-7 text-sm font-semibold leading-6 text-slate-400">
            Recovery links are time-limited, valid for one use, and
            return you to a protected password setup process.
          </p>
        </aside>

        <section className="flex h-full min-h-0 w-full flex-col rounded-[32px] border border-white/10 bg-white/[0.055] p-7 sm:p-10 lg:p-12 xl:p-14">
          <Link
            href="/login"
            className={`inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-1 text-sm font-extrabold text-slate-300 transition hover:text-white ${EXECUTIVE_FOCUS_GOLD}`}
          >
            <span aria-hidden="true">←</span>
            <span>Back to sign in</span>
          </Link>

          {!sent ? (
            <div className="flex flex-1 flex-col">
              <div className="mt-7">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
                  Secure password recovery
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
                  Reset your password.
                </h2>

                <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-slate-300">
                  Enter your work email. We will send a secure,
                  time-limited link to create a new password.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-9 space-y-6"
              >
                <div>
                  <label
                    htmlFor={emailId}
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white"
                  >
                    Work email
                  </label>

                  <input
                    id={emailId}
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? errorId : undefined
                    }
                    className={inputClassName}
                  />
                </div>

                {error ? (
                  <div
                    id={errorId}
                    role="alert"
                    aria-live="assertive"
                    className="rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm font-bold leading-6 text-red-100"
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className={`${EXECUTIVE_CTA_PRIMARY} h-[60px] w-full disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {loading
                    ? "Sending recovery link..."
                    : "Send reset link"}
                </button>
              </form>

              <p className="mt-7 text-sm font-semibold leading-6 text-slate-300">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className={`rounded-lg font-black text-[#F5D77B] ${EXECUTIVE_FOCUS_GOLD}`}
                >
                  Back to sign in
                </Link>
              </p>

              <p className="mt-auto pt-6 text-center text-xs font-semibold leading-5 text-slate-400">
                Secure recovery for Intelligent Procurement.
                <span className="mt-1 block font-bold text-slate-300">
                  A Nexus Pavilion Inc. product
                </span>
              </p>
            </div>
          ) : (
            <div
              className="flex flex-1 flex-col"
              aria-live="polite"
            >
              <div className="mt-7">
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-lg font-black text-emerald-300"
                >
                  ✓
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
                  Recovery email sent
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
                  Check your inbox.
                </h2>

                <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
                  We sent a secure recovery link to{" "}
                  <span className="font-black text-white">
                    {submittedEmail}
                  </span>
                  . Use the newest email to continue through the
                  protected password reset process.
                </p>

                <div className="mt-8 border-y border-white/10 py-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Complete account recovery
                  </p>

                  <ol className="mt-4 space-y-3">
                    <RecoveryStep label="Open your newest password recovery email" />
                    <RecoveryStep label="Follow the secure, time-limited link" />
                    <RecoveryStep label="Create and confirm your new password" />
                  </ol>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setError("");
                    }}
                    className={`${EXECUTIVE_CTA_SECONDARY} h-[56px]`}
                  >
                    Request another link
                  </button>

                  <Link
                    href="/login"
                    className={`${EXECUTIVE_CTA_PRIMARY} h-[56px]`}
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>

              <p className="mt-auto pt-6 text-sm font-semibold leading-6 text-slate-400">
                If the email does not arrive, check your spam folder
                or request a new recovery link.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Intelligent Procurement home"
      className={`inline-flex w-fit flex-col gap-2 rounded-xl outline-none transition ${EXECUTIVE_FOCUS_GOLD}`}
    >
      <NexusPavilionLogo
        variant="horizontal"
        size={72}
        priority
        className="justify-start"
      />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F2D778]">
          Intelligent Procurement
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          A Nexus Pavilion Inc. product
        </p>
      </div>
    </Link>
  );
}

function RecoveryStep({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/35 bg-[#C8A646]/10 text-[10px] text-[#F5D77B]"
      >
        ✓
      </span>

      <span className="text-sm font-semibold leading-6 text-slate-300">
        {label}
      </span>
    </li>
  );
}
