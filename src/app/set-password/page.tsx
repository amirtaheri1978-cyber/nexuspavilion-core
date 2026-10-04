"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/client";

const SECURITY_SIGNALS = [
  "Protected password setup",
  "Identity verification",
  "Workspace re-access",
  "Enterprise session control",
];

const inputClassName =
  "h-[60px] w-full rounded-2xl border border-white/20 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-300 hover:border-white/30 focus:border-[#F0D576] focus:bg-[#081827] focus:ring-4 focus:ring-[#F0D576]/20 disabled:cursor-not-allowed disabled:opacity-60";

function getFriendlyPasswordUpdateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("weak") || normalized.includes("password")) {
    return "Please choose a stronger password that meets the security requirements.";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("invalid") ||
    normalized.includes("session")
  ) {
    return "This recovery session is no longer valid. Please request a new password reset link.";
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Too many password update attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "We could not reach the secure password service. Please check your connection and try again.";
  }

  return "We could not update your password securely. Please try again.";
}

function getPasswordStrength(password: string) {
  const rules = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const score = rules.filter(Boolean).length;

  if (score <= 1) {
    return {
      label: "Weak",
      width: "w-1/4",
      tone: "bg-red-400",
    };
  }

  if (score <= 3) {
    return {
      label: "Medium",
      width: "w-2/4",
      tone: "bg-amber-300",
    };
  }

  if (score === 4) {
    return {
      label: "Strong",
      width: "w-3/4",
      tone: "bg-emerald-400",
    };
  }

  return {
    label: "Excellent",
    width: "w-full",
    tone: "bg-[#C8A646]",
  };
}

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = [
    {
      label: "Minimum 8 characters",
      ready: password.length >= 8,
    },
    {
      label: "Uppercase letter",
      ready: /[A-Z]/.test(password),
    },
    {
      label: "Lowercase letter",
      ready: /[a-z]/.test(password),
    },
    {
      label: "Number",
      ready: /\d/.test(password),
    },
    {
      label: "Special character",
      ready: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const passwordStrength = getPasswordStrength(password);
  const passwordIsReady = passwordRules.every((rule) => rule.ready);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const formIsReady = passwordIsReady && passwordsMatch;

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    if (!passwordIsReady) {
      setLoading(false);
      setError(
        "Please choose a password that meets all enterprise security requirements.",
      );
      return;
    }

    if (!passwordsMatch) {
      setLoading(false);
      setError(
        "The password confirmation does not match. Please review both fields.",
      );
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(getFriendlyPasswordUpdateError(updateError.message));
        return;
      }

      setCompleted(true);

      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1400);
    } catch {
      setError(
        "A secure password update connection could not be completed. Please try again.",
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
            <h1 className="max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px] xl:leading-[1.02]">
              Set a new secure password for your workspace.
            </h1>

            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-300">
              Complete protected password reset and restore access to
              Intelligent Procurement, including company workspace, RFQ
              governance, and supplier intelligence.
            </p>
          </div>

          <ul className="mt-9 space-y-2.5">
            {SECURITY_SIGNALS.map((signal) => (
              <li
                key={signal}
                className="flex items-start gap-3 text-sm font-semibold text-slate-200"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/35 bg-[#C8A646]/10 text-[10px] text-[#F5D77B]"
                >
                  ✓
                </span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto border-t border-white/10 pt-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
              Secure password policy
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
              Use a strong password that is unique to Intelligent Procurement.
              You will be signed out after the update and asked to sign in
              again securely.
            </p>
          </div>
        </aside>

        <section className="flex h-full min-h-0 w-full flex-col rounded-[32px] border border-white/10 bg-white/[0.055] p-7 sm:p-10 lg:p-12 xl:p-14">
          <Link
            href="/login"
            className={`inline-flex min-h-11 w-fit items-center rounded-xl text-sm font-bold text-slate-400 transition hover:text-white ${EXECUTIVE_FOCUS_GOLD}`}
          >
            ← Back to sign in
          </Link>

          {!completed ? (
            <div className="flex flex-1 flex-col">
              <div className="mt-7">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
                  Secure password setup
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
                  Set your new password.
                </h2>

                <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
                  Create a new enterprise-grade password before restoring
                  access to your procurement workspace.
                </p>
              </div>

              <form
                onSubmit={handleSetPassword}
                className="mt-10 space-y-6"
              >
                <div>
                  <label
                    htmlFor={passwordId}
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white"
                  >
                    New password
                  </label>

                  <div className="relative">
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      autoComplete="new-password"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      aria-invalid={Boolean(error) && !passwordIsReady}
                      aria-describedby={error ? errorId : undefined}
                      className={`${inputClassName} pr-20`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_GOLD}`}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={confirmPasswordId}
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-white"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <input
                      id={confirmPasswordId}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      required
                      autoComplete="new-password"
                      placeholder="Confirm your secure password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      disabled={loading}
                      aria-invalid={Boolean(error) && !passwordsMatch}
                      aria-describedby={error ? errorId : undefined}
                      className={`${inputClassName} pr-20`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      disabled={loading}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      aria-pressed={showConfirmPassword}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_GOLD}`}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="border-y border-white/10 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                      Password strength
                    </p>
                    <p className="text-xs font-black text-[#F5D77B]">
                      {passwordStrength.label}
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${passwordStrength.width} ${passwordStrength.tone}`}
                    />
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {passwordRules.map((rule) => (
                      <CheckRow
                        key={rule.label}
                        label={rule.label}
                        ready={rule.ready}
                      />
                    ))}

                    <CheckRow
                      label="Passwords match"
                      ready={passwordsMatch}
                    />
                  </div>
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
                  disabled={loading || !formIsReady}
                  className={`${EXECUTIVE_CTA_PRIMARY} h-[60px] w-full disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {loading
                    ? "Updating secure password..."
                    : "Update password"}
                </button>
              </form>

              <p className="mt-auto pt-6 text-center text-xs font-semibold leading-5 text-slate-400">
                Secure password update for Intelligent Procurement.
                <span className="mt-1 block font-bold text-slate-300">
                  A Nexus Pavilion Inc. product
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-7 flex flex-1 flex-col" aria-live="polite">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-lg font-black text-emerald-300"
              >
                ✓
              </div>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
                Password updated
              </p>

              <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
                Secure access restored.
              </h2>

              <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
                Your password has been updated successfully. For security,
                you will be signed out and redirected to sign in again with
                your new password.
              </p>

              <div className="mt-8 border-y border-white/10 py-6">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  Next step
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                  Sign in again to continue to your enterprise procurement
                  workspace.
                </p>
              </div>

              <Link
                href="/login"
                className={`${EXECUTIVE_CTA_PRIMARY} mt-8 h-[56px]`}
              >
                Back to sign in
              </Link>
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

function CheckRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs font-bold">
      <span className="text-slate-300">{label}</span>
      <span className={ready ? "text-emerald-300" : "text-slate-500"}>
        {ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}
