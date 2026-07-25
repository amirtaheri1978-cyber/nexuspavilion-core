"use client";

import Link from "next/link";
import type { FormEvent } from "react";

export type EnrollmentPhase =
  | "idle"
  | "creating-account"
  | "verifying-identity"
  | "activating-workspace";

type ExecutiveEnrollmentFormProps = {
  email: string;
  password: string;
  confirmPassword: string;
  passwordIsReady: boolean;
  passwordsMatch: boolean;
  formIsReady: boolean;
  submitting: boolean;
  message: string;
  error: string;
  unavailable: boolean;
  enrollmentPhase: EnrollmentPhase;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current stroke-[1.8]"
    >
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.4]"
    >
      <path
        d="m4 10 3.4 3.4L16 5.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExecutiveEnrollmentForm({
  email,
  password,
  confirmPassword,
  passwordIsReady,
  passwordsMatch,
  formIsReady,
  submitting,
  message,
  error,
  unavailable,
  enrollmentPhase,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: ExecutiveEnrollmentFormProps) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#091a2d]/96 shadow-[0_34px_100px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))] px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#c9a35d]/25 bg-[#c9a35d]/10 text-[#e4c98f] shadow-[0_0_35px_rgba(201,163,93,.1)]">
            <LockIcon />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d6b977]">
              Security & Identity Workflow
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
              Activate Procurement Workspace
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Establish the credential that will govern your authorized access,
              role assignment, and workspace audit identity.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {unavailable ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-5 py-4 text-sm font-semibold leading-6 text-rose-200"
          >
            This invitation is not available for account enrollment. Return to
            the access brief for the current invitation status.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <WorkflowControl
              label="Recipient identity"
              description="Matched to the verified invitation"
              state="verified"
            />

            <Field label="Authorized recipient">
              <input
                type="email"
                readOnly
                value={email}
                aria-label="Authorized recipient email"
                className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3.5 text-sm font-semibold text-slate-400 outline-none"
              />
            </Field>

            <Field label="Create secure credential">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-[#d6b977]/60 focus:bg-white/[0.065] focus:ring-4 focus:ring-[#c9a35d]/10"
              />
            </Field>

            <Field label="Confirm secure credential">
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-[#d6b977]/60 focus:bg-white/[0.065] focus:ring-4 focus:ring-[#c9a35d]/10"
              />
            </Field>

            <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-slate-500">
                  Security controls
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Required
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <WorkflowControl
                  label="Password policy"
                  description="Minimum 8-character credential"
                  state={passwordIsReady ? "verified" : "pending"}
                />
                <WorkflowControl
                  label="Credential confirmation"
                  description="Both password entries must match"
                  state={passwordsMatch ? "verified" : "pending"}
                />
                <WorkflowControl
                  label="Workspace governance"
                  description="Role assignment and audit identity"
                  state="ready"
                />
              </div>
            </div>

            {submitting ? (
              <ProvisioningProgress phase={enrollmentPhase} />
            ) : null}

            {message ? (
              <div
                role="status"
                className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-emerald-200"
              >
                {message}
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-rose-200"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !formIsReady}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#c49a4d] via-[#d6b977] to-[#c49a4d] px-6 py-4 text-sm font-bold text-[#102035] shadow-[0_18px_45px_rgba(201,163,93,.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(201,163,93,.28)] focus:outline-none focus:ring-4 focus:ring-[#d6b977]/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <span>
                {submitting
                  ? "Provisioning executive access..."
                  : "Provision Executive Access"}
              </span>
              {!submitting ? (
                <span className="ml-2 transition duration-300 group-hover:translate-x-1">
                  →
                </span>
              ) : null}
            </button>

            <p className="text-center text-xs leading-5 text-slate-600">
              Continuing confirms that you are the intended recipient of this
              controlled workspace invitation.
            </p>
          </form>
        )}

        <div className="mt-6 border-t border-white/8 pt-5 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            Already registered?{" "}
            <span className="text-[#d6b977]">Sign in securely</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function WorkflowControl({
  label,
  description,
  state,
}: {
  label: string;
  description: string;
  state: "verified" | "pending" | "ready";
}) {
  const verified = state === "verified";
  const ready = state === "ready";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
      <div className="min-w-0">
        <p
          className={[
            "text-xs font-semibold",
            verified || ready ? "text-slate-200" : "text-slate-500",
          ].join(" ")}
        >
          {label}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">
          {description}
        </p>
      </div>

      <span
        className={[
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
          verified
            ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"
            : ready
              ? "border-[#c9a35d]/20 bg-[#c9a35d]/[0.07] text-[#d6b977]"
              : "border-white/8 bg-white/[0.025] text-slate-600",
        ].join(" ")}
      >
        {verified ? <CheckIcon /> : null}
        {verified ? "Verified" : ready ? "Ready" : "Pending"}
      </span>
    </div>
  );
}

function ProvisioningProgress({ phase }: { phase: EnrollmentPhase }) {
  const steps = [
    {
      id: "creating-account",
      label: "Creating secure credential",
    },
    {
      id: "verifying-identity",
      label: "Verifying account identity",
    },
    {
      id: "activating-workspace",
      label: "Activating workspace authority",
    },
  ] as const;

  const phaseOrder: EnrollmentPhase[] = [
    "idle",
    "creating-account",
    "verifying-identity",
    "activating-workspace",
  ];
  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div
      aria-live="polite"
      className="rounded-2xl border border-[#c9a35d]/20 bg-[#c9a35d]/[0.055] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#d6b977]">
          Access provisioning
        </p>
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#d6b977]" />
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const stepIndex = index + 1;
          const complete = currentIndex > stepIndex;
          const active = currentIndex === stepIndex;

          return (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={[
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition",
                  complete
                    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                    : active
                      ? "border-[#d6b977]/40 bg-[#c9a35d]/15 text-[#f0d89f]"
                      : "border-white/8 bg-white/[0.02] text-slate-700",
                ].join(" ")}
              >
                {complete ? <CheckIcon /> : index + 1}
              </div>
              <p
                className={[
                  "text-xs font-semibold transition",
                  active
                    ? "text-white"
                    : complete
                      ? "text-slate-300"
                      : "text-slate-600",
                ].join(" ")}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
