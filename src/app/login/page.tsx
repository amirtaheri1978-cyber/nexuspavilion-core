"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const PLATFORM_SIGNALS = [
  "RFQ & Award Governance",
  "Supplier Intelligence",
  "Executive Decision Support",
];

const inputClassName =
  "h-[60px] w-full rounded-2xl border border-white/20 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-300 hover:border-white/30 focus:border-[#F0D576] focus:bg-[#081827] focus:ring-4 focus:ring-[#F0D576]/20 disabled:cursor-not-allowed disabled:opacity-60";

function getFriendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "The email or password entered does not match an active Nexus Pavilion account.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }

  if (normalized.includes("too many requests")) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "We could not reach the authentication service. Please check your connection and try again.";
  }

  return "We could not sign you in securely. Please review your details and try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function syncUserProfile(userId: string, userEmail: string | null) {
    const normalizedEmail = String(userEmail || "")
      .trim()
      .toLowerCase();

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      await supabase
        .from("profiles")
        .update({
          email: normalizedEmail,
        })
        .eq("id", userId);

      return;
    }

    await supabase.from("profiles").insert({
      id: userId,
      email: normalizedEmail,
      role: "buyer",
    });
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setError(getFriendlyAuthError(error.message));
        return;
      }

      const user = data.user;

      if (user) {
        await syncUserProfile(user.id, user.email ?? null);
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(
        "A secure sign-in connection could not be completed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    if (error) {
      setError("");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1680px] gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:gap-10">
        <aside className="flex h-full min-h-0 flex-col rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
          <BrandTile />

          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
              Enterprise Procurement Intelligence
            </p>

            <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
              Secure access to your procurement workspace.
            </h1>

            <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-100 xl:text-lg">
              Access your organization&apos;s protected environment for RFQs,
              supplier intelligence, award governance, and executive
              decision-making.
            </p>

            <div className="mt-9 grid gap-3">
              {PLATFORM_SIGNALS.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3.5 text-sm font-black text-white"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F2D778]/50 bg-[#C8A646]/15 text-xs text-[#FFE9A3]">
                    ✓
                  </span>

                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-9 rounded-3xl border border-white/15 bg-[#07111F]/80 p-5 lg:mt-auto">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-100">
              Protected Workspace
            </p>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">
              Access is limited to verified company users, invited team
              members, and authorized enterprise accounts.
            </p>
          </div>
        </aside>

        <section className="flex h-full min-h-0 w-full flex-col rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
              Secure Enterprise Access
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
              Sign in to your workspace.
            </h2>

            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-slate-100">
              Continue to your organization&apos;s secure procurement
              intelligence environment.
            </p>

            <form onSubmit={handleLogin} className="mt-10 space-y-6">
              <div>
                <label
                  htmlFor={emailId}
                  className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white"
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
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError();
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  className={inputClassName}
                />
              </div>

              <div>
                <div className="mb-2 flex min-h-11 items-center justify-between gap-4">
                  <label
                    htmlFor={passwordId}
                    className="block text-xs font-black uppercase tracking-[0.2em] text-white"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-extrabold text-white underline decoration-white/40 underline-offset-4 outline-none transition hover:text-[#FFE9A3] hover:decoration-[#FFE9A3] focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearError();
                    }}
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className={`${inputClassName} pr-16`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-100 outline-none transition hover:bg-white/10 hover:text-[#FFE9A3] focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
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
                disabled={loading}
                className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_22px_65px_rgba(200,166,70,0.34)] outline-none transition hover:scale-[1.01] hover:shadow-[0_28px_80px_rgba(200,166,70,0.42)] focus-visible:ring-4 focus-visible:ring-[#F5D77B]/35 focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Securing access..." : "Sign in to Workspace"}
              </button>
            </form>
          </div>

          <div className="mt-8 rounded-3xl border border-[#F2D778]/35 bg-[#C8A646]/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:mt-auto">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFE9A3]">
              New to Nexus Pavilion?
            </p>

            <p className="mt-3 text-base font-bold leading-7 text-white">
              Create an account to establish your procurement workspace.
            </p>

            <Link
              href="/signup"
              className="mt-5 flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-[#F5D77B]/55 bg-[#F5D77B]/15 px-5 text-sm font-black uppercase tracking-[0.12em] text-[#FFF1B8] outline-none transition hover:border-[#F5D77B]/80 hover:bg-[#F5D77B]/20 hover:text-white focus-visible:ring-4 focus-visible:ring-[#F5D77B]/25 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0C1825]"
            >
              Create an account
              <span aria-hidden="true" className="ml-2 text-base">
                →
              </span>
            </Link>

            <div className="mt-5 border-t border-white/15 pt-5">
              <p className="text-sm font-bold leading-6 text-white">
                Already invited to an existing company workspace?
              </p>

              <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-100">
                Open the secure invitation link provided by your workspace
                administrator.
              </p>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-bold leading-5 text-slate-100">
            <span aria-hidden="true">🔒</span>
            Enterprise authentication protected by Nexus Pavilion Security.
          </p>
        </section>
      </section>
    </main>
  );
}

function BrandTile() {
  return (
    <Link
      href="/"
      aria-label="Nexus Pavilion home"
      className="inline-flex w-fit rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0A1929]"
    >
      <Image
        src={BRAND_LOGO_SRC}
        alt="Nexus Pavilion"
        width={300}
        height={110}
        priority
        className="h-auto w-[240px] object-contain sm:w-[275px] xl:w-[300px]"
      />
    </Link>
  );
}

function EyeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.7a2.5 2.5 0 0 0 3.4 3.4" />
      <path d="M9.4 5.2A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a16.6 16.6 0 0 1-2.1 2.9" />
      <path d="M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 7 9.5 7a9.9 9.9 0 0 0 4.1-.9" />
    </svg>
  );
}