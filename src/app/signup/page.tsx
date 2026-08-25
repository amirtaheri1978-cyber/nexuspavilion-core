"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import {
  PROFESSIONAL_NAME_MAX_LENGTH,
  normalizeProfessionalName,
  syncCurrentUserProfessionalNames,
  validateProfessionalName,
} from "@/lib/auth/professional-names";
import {
  DEFAULT_POST_LOGIN_PATH,
  getCompanyOnboardingPath,
  getSafeNextPath,
} from "@/lib/auth/login-continuation";
import { getFriendlySignupError } from "@/lib/auth/signup-error";
import { createClient } from "@/lib/supabase/client";

type SignupResponseMessage = {
  type: "success" | "error";
  text: string;
};

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const platformCapabilities = [
  "Company Workspace",
  "Marketplace Network",
  "Executive Intelligence",
  "Procurement Governance",
  "Supplier Collaboration",
  "AI Procurement Foundation",
];

const setupSteps = [
  "Create secure account",
  "Complete company workspace",
  "Choose organization type",
  "Activate correct permissions",
];

const inputClassName =
  "h-[60px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-60";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupScreen nextPath={DEFAULT_POST_LOGIN_PATH} />}>
      <SignupFromQuery />
    </Suspense>
  );
}

function SignupFromQuery() {
  const searchParams = useSearchParams();

  return (
    <SignupScreen nextPath={getSafeNextPath(searchParams.get("next"))} />
  );
}

function SignupScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const onboardingPath = getCompanyOnboardingPath(nextPath);

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const firstNameErrorId = useId();
  const lastNameErrorId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const formErrorId = useId();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] =
    useState<SignupResponseMessage | null>(null);

  const normalizedFirstName = normalizeProfessionalName(firstName);
  const normalizedLastName = normalizeProfessionalName(lastName);
  const normalizedEmail = normalizeEmail(email);
  const firstNameError = validateProfessionalName(
    normalizedFirstName,
    "First name",
    { required: attemptedSubmit || firstName.length > 0 },
  );
  const lastNameError = validateProfessionalName(
    normalizedLastName,
    "Last name",
    { required: attemptedSubmit || lastName.length > 0 },
  );

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
  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  const namesAreReady =
    !validateProfessionalName(normalizedFirstName, "First name", {
      required: true,
    }) &&
    !validateProfessionalName(normalizedLastName, "Last name", {
      required: true,
    });

  const formIsReady =
    namesAreReady &&
    normalizedEmail.length > 0 &&
    passwordIsReady &&
    passwordsMatch;

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setAttemptedSubmit(true);
    setLoading(true);
    setResponseMessage(null);

    const submittedFirstName = normalizeProfessionalName(firstName);
    const submittedLastName = normalizeProfessionalName(lastName);
    const submittedFirstNameError = validateProfessionalName(
      submittedFirstName,
      "First name",
      { required: true },
    );
    const submittedLastNameError = validateProfessionalName(
      submittedLastName,
      "Last name",
      { required: true },
    );

    if (submittedFirstNameError || submittedLastNameError) {
      setLoading(false);
      setResponseMessage({
        type: "error",
        text:
          submittedFirstNameError ||
          submittedLastNameError ||
          "Please enter your first and last name.",
      });
      return;
    }

    if (!passwordIsReady) {
      setLoading(false);
      setResponseMessage({
        type: "error",
        text: "Please choose a password that meets all enterprise security requirements.",
      });
      return;
    }

    if (!passwordsMatch) {
      setLoading(false);
      setResponseMessage({
        type: "error",
        text: "The password confirmation does not match. Please review both fields.",
      });
      return;
    }

    try {
      const confirmationRedirect = new URL(
        "/auth/callback",
        window.location.origin,
      );
      confirmationRedirect.searchParams.set("next", onboardingPath);

      const { error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: confirmationRedirect.toString(),
          data: {
            first_name: submittedFirstName,
            last_name: submittedLastName,
          },
        },
      });

      if (signupError) {
        setResponseMessage({
          type: "error",
          text: getFriendlySignupError(signupError.message),
        });
        return;
      }

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError) {
        setResponseMessage({
          type: "success",
          text: "Your account has been created. Please verify your email if required, then sign in to continue company setup.",
        });
        return;
      }

      await syncCurrentUserProfessionalNames(supabase, {
        firstName: submittedFirstName,
        lastName: submittedLastName,
        requireNames: true,
      });

      router.push(onboardingPath);
      router.refresh();
    } catch {
      setResponseMessage({
        type: "error",
        text: "A secure account creation connection could not be completed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

      <section className={`${EXECUTIVE_PAGE_CLASS} grid min-h-[calc(100vh-3rem)] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10`}>
        <aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
          <BrandTile />

          <p className="mt-10 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
            Nexus Pavilion Access
          </p>

          <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
            Create your enterprise account.
          </h1>

          <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
            Build your organization&apos;s secure procurement
            workspace with verified access, company identity,
            marketplace readiness, and enterprise procurement
            intelligence.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {platformCapabilities.map((capability) => (
              <div
                key={capability}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-200"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
                  ✓
                </span>

                <span>{capability}</span>
              </div>
            ))}
          </div>

          <div className="mt-9 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
              Account Setup Path
            </p>

            <div className="mt-4 space-y-3">
              {setupSteps.map((step, index) => (
                <StatusRow
                  key={step}
                  label={step}
                  ready={index === 0 && formIsReady}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-[700px] rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
          <Link
            href={
              nextPath === DEFAULT_POST_LOGIN_PATH
                ? "/login"
                : `/login?next=${encodeURIComponent(nextPath)}`
            }
            className="inline-flex text-sm font-bold text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40"
          >
            ← Back to login
          </Link>

          <div className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
              Secure Account
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
              Create account.
            </h2>

            <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
              Create your account first. Company setup,
              organization type, and permissions are assigned in
              the next step.
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="mt-10 space-y-6"
            noValidate
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={firstNameId}
                  className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
                >
                  First name
                </label>

                <input
                  id={firstNameId}
                  type="text"
                  name="firstName"
                  required
                  autoComplete="given-name"
                  maxLength={PROFESSIONAL_NAME_MAX_LENGTH}
                  placeholder="Alex"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(firstNameError)}
                  aria-describedby={
                    firstNameError ? firstNameErrorId : undefined
                  }
                  className={inputClassName}
                />

                {firstNameError ? (
                  <p
                    id={firstNameErrorId}
                    role="alert"
                    className="mt-2 text-xs font-bold leading-5 text-red-200"
                  >
                    {firstNameError}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={lastNameId}
                  className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
                >
                  Last name
                </label>

                <input
                  id={lastNameId}
                  type="text"
                  name="lastName"
                  required
                  autoComplete="family-name"
                  maxLength={PROFESSIONAL_NAME_MAX_LENGTH}
                  placeholder="Morgan"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(lastNameError)}
                  aria-describedby={
                    lastNameError ? lastNameErrorId : undefined
                  }
                  className={inputClassName}
                />

                {lastNameError ? (
                  <p
                    id={lastNameErrorId}
                    role="alert"
                    className="mt-2 text-xs font-bold leading-5 text-red-200"
                  >
                    {lastNameError}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor={emailId}
                className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
              >
                Work email
              </label>

              <input
                id={emailId}
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                aria-invalid={
                  attemptedSubmit && normalizedEmail.length === 0
                }
                aria-describedby={
                  attemptedSubmit && normalizedEmail.length === 0
                    ? emailErrorId
                    : undefined
                }
                className={inputClassName}
              />

              {attemptedSubmit && normalizedEmail.length === 0 ? (
                <p
                  id={emailErrorId}
                  role="alert"
                  className="mt-2 text-xs font-bold leading-5 text-red-200"
                >
                  Work email is required.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={passwordId}
                className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
              >
                Password
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
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  disabled={loading}
                  aria-invalid={attemptedSubmit && !passwordIsReady}
                  aria-describedby={
                    attemptedSubmit && !passwordIsReady
                      ? passwordErrorId
                      : undefined
                  }
                  className={`${inputClassName} pr-20`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {attemptedSubmit && !passwordIsReady ? (
                <p
                  id={passwordErrorId}
                  role="alert"
                  className="mt-2 text-xs font-bold leading-5 text-red-200"
                >
                  Please choose a password that meets all enterprise
                  security requirements.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={confirmPasswordId}
                className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
              >
                Confirm password
              </label>

              <div className="relative">
                <input
                  id={confirmPasswordId}
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your secure password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  disabled={loading}
                  aria-invalid={attemptedSubmit && !passwordsMatch}
                  aria-describedby={
                    attemptedSubmit && !passwordsMatch
                      ? confirmPasswordErrorId
                      : undefined
                  }
                  className={`${inputClassName} pr-20`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current,
                    )
                  }
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              {attemptedSubmit && !passwordsMatch ? (
                <p
                  id={confirmPasswordErrorId}
                  role="alert"
                  className="mt-2 text-xs font-bold leading-5 text-red-200"
                >
                  The password confirmation does not match. Please
                  review both fields.
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Password Strength
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

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

            {responseMessage ? (
              <div
                id={formErrorId}
                role={responseMessage.type === "error" ? "alert" : "status"}
                className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                  responseMessage.type === "success"
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                    : "border-red-300/20 bg-red-400/10 text-red-200"
                }`}
              >
                {responseMessage.text}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !formIsReady}
              className={`${EXECUTIVE_CTA_PRIMARY} h-[60px] w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {loading
                ? "Creating secure account..."
                : "Create Account & Continue"}
            </button>
          </form>

          <p className="mt-7 text-sm font-semibold text-slate-400">
            Already have an account?{" "}
            <Link
              href={
                nextPath === DEFAULT_POST_LOGIN_PATH
                  ? "/login"
                  : `/login?next=${encodeURIComponent(nextPath)}`
              }
              className="font-black text-[#F5D77B]"
            >
              Sign in
            </Link>
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
            <p className="text-xs font-bold leading-5 text-slate-400">
              🔒 Enterprise account creation protected by Nexus
              Pavilion Security.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function BrandTile() {
  return (
    <div className="inline-flex rounded-[30px] border border-white/10 bg-white/[0.06] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="rounded-[24px] border border-white/10 bg-black px-6 py-5">
        <Image
          src={BRAND_LOGO_SRC}
          alt="Nexus Pavilion"
          width={240}
          height={88}
          priority
          className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
        />
      </div>
    </div>
  );
}

function StatusRow({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
      <span className="text-xs font-bold text-slate-300">
        {label}
      </span>

      <span
        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
          ready
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-white/[0.06] text-slate-500"
        }`}
      >
        {ready ? "Ready" : "Next"}
      </span>
    </div>
  );
}

function CheckRow({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-bold">
      <span className="text-slate-300">{label}</span>

      <span
        className={
          ready ? "text-emerald-300" : "text-slate-500"
        }
      >
        {ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}