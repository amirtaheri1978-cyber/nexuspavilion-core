"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

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
  "h-[60px] w-full rounded-2xl border border-white/20 bg-[#07111F]/90 px-5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition duration-200 placeholder:font-medium placeholder:text-slate-500 hover:border-white/30 focus:border-[#D8B84E] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-60";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getFriendlyResetError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email")) {
    return "Please enter a valid work email address.";
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Too many recovery attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "We could not reach the secure recovery service. Please check your connection and try again.";
  }

  return "We could not send a recovery link securely. Please review your email and try again.";
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const normalizedEmail = normalizeEmail(email);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${SITE_URL}/auth/callback?next=/set-password`,
        },
      );

      if (error) {
        setError(getFriendlyResetError(error.message));
        return;
      }

      setSubmittedEmail(normalizedEmail);
      setSent(true);
    } catch {
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

      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1560px] items-stretch gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
        <aside className="flex h-full flex-col justify-between rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
          <div>
            <BrandLogo />

            <p className="mt-10 text-xs font-black uppercase tracking-[0.32em] text-[#D8B84E]">
              Secure account recovery
            </p>

            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.03] tracking-[-0.045em] text-white sm:text-5xl xl:text-[58px]">
              Restore access to your workspace.
            </h1>

            <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-300 xl:text-[17px]">
              Use your verified work email to begin a protected password
              recovery process and regain access to your procurement workspace.
            </p>

            <div className="mt-9 space-y-3">
              {RECOVERY_ASSURANCES.map((assurance) => (
                <RecoveryAssurance
                  key={assurance.title}
                  title={assurance.title}
                  description={assurance.description}
                />
              ))}
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C8A646]/25 bg-[#C8A646]/10 text-base text-[#F5D77B]"
              >
                🔒
              </span>

              <p className="max-w-lg text-sm font-semibold leading-6 text-slate-300">
                Recovery links are time-limited, valid for one use, and return
                you to a protected password setup process.
              </p>
            </div>
          </div>
        </aside>

        <section className="mx-auto flex h-full w-full max-w-[700px] flex-col rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
          <Link
            href="/login"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-1 text-sm font-extrabold text-slate-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#C8A646] focus-visible:ring-offset-4 focus-visible:ring-offset-[#132238]"
          >
            <span aria-hidden="true">←</span>
            <span>Back to sign in</span>
          </Link>

          {!sent ? (
            <div className="flex flex-1 flex-col">
              <div className="mt-7">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#D8B84E]">
                  Secure recovery
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
                  Reset your password
                </h2>

                <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-slate-300">
                  Enter your work email. We will send a secure, time-limited
                  link to create a new password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-9 space-y-6">
                <label className="block">
                  <span className="mb-2.5 block text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                    Work email
                  </span>

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "recovery-error" : undefined}
                    className={inputClassName}
                  />
                </label>

                {error ? (
                  <div
                    id="recovery-error"
                    role="alert"
                    className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold leading-6 text-red-200"
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_22px_65px_rgba(200,166,70,0.34)] outline-none transition duration-200 hover:scale-[1.01] hover:shadow-[0_28px_80px_rgba(200,166,70,0.42)] focus-visible:ring-4 focus-visible:ring-[#F5D77B]/30 focus-visible:ring-offset-4 focus-visible:ring-offset-[#132238] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? "Sending recovery link..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-7 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
                <p className="text-sm font-semibold leading-6 text-slate-300">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="font-black text-[#F5D77B] underline decoration-[#F5D77B]/40 underline-offset-4 transition hover:text-white"
                  >
                    Back to sign in
                  </Link>
                  .
                </p>
              </div>

              <div className="mt-auto pt-5">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-sm text-[#F5D77B]"
                  >
                    🔒
                  </span>

                  <p className="text-sm font-semibold leading-6 text-slate-300">
                    Recovery links are encrypted, time-limited, and valid for
                    one use.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="mt-7">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-2xl text-emerald-300">
                  ✓
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.32em] text-[#D8B84E]">
                  Recovery email sent
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
                  Check your inbox
                </h2>

                <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
                  We sent a secure recovery link to{" "}
                  <span className="font-black text-white">
                    {submittedEmail}
                  </span>
                  . Use the newest email to continue through the protected
                  password reset process.
                </p>

                <div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Complete account recovery
                  </p>

                  <div className="mt-4 space-y-3">
                    <RecoveryStep label="Open the newest Nexus Pavilion recovery email" />
                    <RecoveryStep label="Follow the secure, time-limited link" />
                    <RecoveryStep label="Create and confirm your new password" />
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setError("");
                    }}
                    className="h-[56px] rounded-2xl border border-white/15 bg-white/[0.045] px-5 text-sm font-black text-white outline-none transition hover:border-white/25 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[#C8A646] focus-visible:ring-offset-4 focus-visible:ring-offset-[#132238]"
                  >
                    Request another link
                  </button>

                  <Link
                    href="/login"
                    className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] outline-none transition hover:scale-[1.01] focus-visible:ring-4 focus-visible:ring-[#F5D77B]/30 focus-visible:ring-offset-4 focus-visible:ring-offset-[#132238]"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>

              <p className="mt-auto pt-6 text-sm font-semibold leading-6 text-slate-400">
                If the email does not arrive, check your spam folder or request
                a new recovery link.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function BrandLogo() {
  return (
    <div className="w-fit">
      <Image
        src={BRAND_LOGO_SRC}
        alt="Nexus Pavilion"
        width={320}
        height={110}
        className="h-auto w-[230px] object-contain sm:w-[260px] xl:w-[290px]"
        priority
      />
    </div>
  );
}

function RecoveryAssurance({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-sm font-black text-[#F5D77B]">
        ✓
      </span>

      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function RecoveryStep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
        ✓
      </span>

      <span className="text-sm font-bold leading-6 text-slate-300">
        {label}
      </span>
    </div>
  );
}