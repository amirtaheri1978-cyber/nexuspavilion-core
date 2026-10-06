"use client";

import Link from "next/link";
import { Suspense, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import {
  DEFAULT_POST_LOGIN_PATH,
  getSafeLoginStatusMessage,
  getSafeNextPath,
  getSignupHref,
} from "@/lib/auth/login-continuation";
import { syncCurrentUserProfessionalNames } from "@/lib/auth/professional-names";
import { createClient } from "@/lib/supabase/client";

const WORKFLOW_STEPS = [
  {
    index: "01",
    title: "Define the RFQ",
    detail: "Set out the procurement scope and invite suppliers.",
  },
  {
    index: "02",
    title: "Evaluate quotations",
    detail: "Review price, scope, exclusions and delivery terms.",
  },
  {
    index: "03",
    title: "Document the award",
    detail: "Record the selected supplier and the basis for your decision.",
  },
] as const;

const inputClassName =
  "h-12 w-full rounded-xl border border-white/20 bg-[#07111F] px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-400 hover:border-white/30 focus:border-[#F0D576] focus:bg-[#081827] focus:ring-4 focus:ring-[#F0D576]/20 disabled:cursor-not-allowed disabled:opacity-60";

function getFriendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes(
      "invalid login credentials",
    )
  ) {
    return "The email or password entered does not match an active Intelligent Procurement account.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }

  if (normalized.includes("too many requests")) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("fetch")
  ) {
    return "We could not reach the authentication service. Please check your connection and try again.";
  }

  return "We could not sign you in securely. Please review your details and try again.";
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoginScreen
          nextPath={DEFAULT_POST_LOGIN_PATH}
          statusMessage={null}
        />
      }
    >
      <LoginFromQuery />
    </Suspense>
  );
}

function LoginFromQuery() {
  const searchParams = useSearchParams();

  return (
    <LoginScreen
      nextPath={getSafeNextPath(searchParams.get("next"))}
      statusMessage={getSafeLoginStatusMessage(
        searchParams.get("authStatus"),
        searchParams.get("message"),
      )}
    />
  );
}

function LoginScreen({
  nextPath,
  statusMessage,
}: {
  nextPath: string;
  statusMessage: string | null;
}) {
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

  async function syncUserProfile(
    userId: string,
    userEmail: string | null,
  ) {
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

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email
        .trim()
        .toLowerCase();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError) {
        setError(
          getFriendlyAuthError(
            signInError.message,
          ),
        );
        return;
      }

      const user = data.user;

      if (user) {
        await syncUserProfile(
          user.id,
          user.email ?? null,
        );
        await syncCurrentUserProfessionalNames(supabase, {
          requireNames: false,
        });
      }

      router.push(nextPath);
      router.refresh();
    } catch (loginError) {
      console.error(
        "Secure sign-in failed:",
        loginError,
      );

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
    <>
      <style jsx global>{`
        input.password-input-no-native-reveal::-ms-reveal,
        input.password-input-no-native-reveal::-ms-clear {
          display: none;
        }

        input.password-input-no-native-reveal {
          appearance: none;
          -webkit-appearance: none;
        }
      `}</style>

      <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-5 text-white sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.12),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_34%,rgba(200,166,70,0.04)_68%,transparent)]" />

        <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1200px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,460px)] lg:gap-14 xl:gap-16">
          {/* Open product introduction — desktop left; mobile below form */}
          <aside className="order-2 flex min-h-0 flex-col justify-center lg:order-1">
            <div className="hidden lg:block">
              <BrandMark />
            </div>

            <div className="mt-0 lg:mt-10">
              <h1
                className="hyphens-none text-[1.75rem] font-medium leading-[1.12] tracking-[-0.04em] text-white sm:text-3xl lg:text-[2.75rem] xl:text-[3.25rem]"
                style={{
                  fontFamily:
                    "var(--font-corporate-display), system-ui, sans-serif",
                }}
              >
                Compare with clarity.
                <span className="mt-1 block text-slate-200">
                  Award with confidence.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] font-medium leading-7 text-slate-300 sm:text-base sm:leading-8">
                Compare supplier quotations across price, scope, exclusions and
                delivery—so award decisions rest on a clear commercial picture.
              </p>

              <ol className="mt-8 grid gap-4 sm:mt-10 sm:gap-5">
                {WORKFLOW_STEPS.map((step) => (
                  <li
                    key={step.index}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 sm:gap-4"
                  >
                    <span
                      className="pt-0.5 text-[11px] font-semibold tracking-[0.16em] text-[#C8A646]"
                      style={{
                        fontFamily:
                          "var(--font-corporate-display), system-ui, sans-serif",
                      }}
                    >
                      {step.index}
                    </span>
                    <div>
                      <p
                        className="text-[15px] font-semibold tracking-[-0.02em] text-white"
                        style={{
                          fontFamily:
                            "var(--font-corporate-display), system-ui, sans-serif",
                        }}
                      >
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-400">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-8 text-sm font-medium leading-6 text-slate-400">
                <Link
                  href="https://nexuspavilion.com/contact"
                  className="underline decoration-white/25 underline-offset-4 outline-none transition hover:text-slate-200 hover:decoration-white/40 focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061426]"
                >
                  Request a demo
                </Link>
              </p>
            </div>
          </aside>

          {/* Compact login card — mobile first */}
          <section className="order-1 w-full max-w-[460px] justify-self-center rounded-2xl border border-white/10 bg-white/[0.055] p-5 sm:p-7 lg:order-2 lg:justify-self-end lg:p-8">
            <div className="mb-5 lg:hidden">
              <BrandMark compact />
            </div>

            <h2
              className="hyphens-none text-2xl font-medium tracking-[-0.03em] text-white sm:text-[1.75rem]"
              style={{
                fontFamily:
                  "var(--font-corporate-display), system-ui, sans-serif",
              }}
            >
              Welcome back.
            </h2>

            <p className="mt-1.5 text-sm font-medium leading-6 text-slate-300">
              Sign in to Intelligent Procurement.
            </p>

            <form
              method="post"
              onSubmit={handleLogin}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor={emailId}
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200"
                  style={{
                    fontFamily:
                      "var(--font-corporate-display), system-ui, sans-serif",
                  }}
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
                  aria-describedby={
                    error || statusMessage ? errorId : undefined
                  }
                  className={inputClassName}
                />
              </div>

              <div>
                <div className="mb-1.5 flex min-h-10 items-center justify-between gap-3">
                  <label
                    htmlFor={passwordId}
                    className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200"
                    style={{
                      fontFamily:
                        "var(--font-corporate-display), system-ui, sans-serif",
                    }}
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="inline-flex min-h-10 items-center rounded-lg px-1 text-sm font-semibold text-[#F2D778] underline decoration-[#F2D778]/45 underline-offset-4 outline-none transition hover:text-[#FFE9A3] hover:decoration-[#FFE9A3] focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative" dir="ltr">
                  <input
                    id={passwordId}
                    type={
                      showPassword ? "text" : "password"
                    }
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
                    aria-describedby={
                      error || statusMessage ? errorId : undefined
                    }
                    className={`${inputClassName} password-input-no-native-reveal !pr-14`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={showPassword}
                    title={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    style={{
                      left: "auto",
                      right: "0.4rem",
                    }}
                    className="absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-[#07111F] text-slate-200 outline-none transition hover:border-[#F0D576]/40 hover:bg-[#0B1B2C] hover:text-[#FFE9A3] focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOffIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>

              {error || statusMessage ? (
                <div
                  id={errorId}
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-red-300/30 bg-red-400/10 px-3.5 py-2.5 text-sm font-semibold leading-6 text-red-100"
                >
                  {error || statusMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 shadow-[0_16px_40px_rgba(200,166,70,0.28)] outline-none transition hover:shadow-[0_20px_48px_rgba(200,166,70,0.36)] focus-visible:ring-4 focus-visible:ring-[#F5D77B]/35 focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  fontFamily:
                    "var(--font-corporate-display), system-ui, sans-serif",
                }}
              >
                {loading
                  ? "Securing access..."
                  : "Sign in to Workspace"}
              </button>
            </form>

            <div className="mt-4">
              <p className="mb-2.5 text-sm font-medium leading-6 text-slate-300">
                New to Intelligent Procurement?
              </p>
              <Link
                href={getSignupHref(nextPath)}
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#C8A646]/55 bg-[#07111F] px-5 text-sm font-semibold text-[#FFF1B8] outline-none transition hover:border-[#F5D77B]/70 hover:bg-[#0B1B2C] hover:text-white focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
              >
                Create an account
              </Link>
            </div>

            <p className="mt-4 text-xs font-medium leading-5 text-slate-400">
              Invited to a company workspace? Use the invitation link provided
              by your administrator.
            </p>
          </section>
        </section>
      </main>
    </>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Intelligent Procurement home"
      className="inline-flex w-fit flex-col gap-1.5 rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-[#F5D77B] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0A1929]"
    >
      <NexusPavilionLogo
        variant="horizontal"
        size={compact ? 48 : 64}
        priority
        className="justify-start"
      />
      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F2D778] sm:text-xs"
          style={{
            fontFamily:
              "var(--font-corporate-display), system-ui, sans-serif",
          }}
        >
          Intelligent Procurement
        </p>
        {!compact ? (
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            A Nexus Pavilion Inc. product.
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
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
      width="20"
      height="20"
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
