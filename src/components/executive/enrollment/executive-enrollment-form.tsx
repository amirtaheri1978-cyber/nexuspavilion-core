"use client";

import Link from "next/link";
import { useId, type FormEvent } from "react";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
} from "@/lib/auth/professional-names";

export type EnrollmentPhase =
  | "idle"
  | "creating-account"
  | "verifying-identity"
  | "activating-workspace";

type ExecutiveEnrollmentFormProps = {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  password: string;
  confirmPassword: string;
  passwordIsReady: boolean;
  passwordsMatch: boolean;
  formIsReady: boolean;
  submitting: boolean;
  message: string;
  error: string;
  firstNameError: string | null;
  lastNameError: string | null;
  jobTitleError: string | null;
  passwordError: string | null;
  confirmPasswordError: string | null;
  unavailable: boolean;
  enrollmentPhase: EnrollmentPhase;
  loginHref: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const enrollmentInputClass = [
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none transition",
  "placeholder:text-slate-600 hover:border-white/20",
  "focus:border-[#d6b977]/60 focus:bg-white/[0.065]",
  EXECUTIVE_FOCUS_GOLD,
].join(" ");

const enrollmentReadonlyClass =
  "w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3.5 text-sm font-semibold text-slate-400 outline-none";

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
  firstName,
  lastName,
  jobTitle,
  password,
  confirmPassword,
  passwordIsReady,
  passwordsMatch,
  formIsReady,
  submitting,
  message,
  error,
  firstNameError,
  lastNameError,
  jobTitleError,
  passwordError,
  confirmPasswordError,
  unavailable,
  enrollmentPhase,
  loginHref,
  onFirstNameChange,
  onLastNameChange,
  onJobTitleChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: ExecutiveEnrollmentFormProps) {
  const firstNameId = useId();
  const lastNameId = useId();
  const jobTitleId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const firstNameErrorId = useId();
  const lastNameErrorId = useId();
  const jobTitleErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const formErrorId = useId();
  const jobTitleHintId = useId();
  const identityReady = Boolean(firstName.trim() && lastName.trim() && jobTitle.trim());

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
              Confirm your professional identity, then establish the credential
              that will govern authorized access and workspace audit identity.
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
          <form
            method="post"
            action="#"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(event);
            }}
            className="space-y-5"
            noValidate
          >
            <WorkflowControl
              label="Recipient identity"
              description="Matched to the verified invitation"
              state="verified"
            />

            <div>
              <label
                htmlFor={emailId}
                className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
              >
                Authorized recipient
              </label>
              <input
                id={emailId}
                type="email"
                name="email"
                readOnly
                value={email}
                aria-label="Authorized recipient email"
                className={enrollmentReadonlyClass}
              />
            </div>

            <fieldset className="min-w-0 space-y-4 rounded-2xl border border-white/8 bg-black/10 p-4">
              <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.19em] text-[#d6b977]">
                Professional identity
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={firstNameId}
                    className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
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
                    onChange={(event) => onFirstNameChange(event.target.value)}
                    disabled={submitting}
                    aria-invalid={Boolean(firstNameError)}
                    aria-describedby={
                      firstNameError ? firstNameErrorId : undefined
                    }
                    className={enrollmentInputClass}
                  />
                  {firstNameError ? (
                    <p
                      id={firstNameErrorId}
                      role="alert"
                      className="mt-2 text-xs font-semibold leading-5 text-rose-200"
                    >
                      {firstNameError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor={lastNameId}
                    className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
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
                    onChange={(event) => onLastNameChange(event.target.value)}
                    disabled={submitting}
                    aria-invalid={Boolean(lastNameError)}
                    aria-describedby={
                      lastNameError ? lastNameErrorId : undefined
                    }
                    className={enrollmentInputClass}
                  />
                  {lastNameError ? (
                    <p
                      id={lastNameErrorId}
                      role="alert"
                      className="mt-2 text-xs font-semibold leading-5 text-rose-200"
                    >
                      {lastNameError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label
                  htmlFor={jobTitleId}
                  className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
                >
                  Job title
                </label>
                <input
                  id={jobTitleId}
                  type="text"
                  name="jobTitle"
                  required
                  autoComplete="organization-title"
                  maxLength={JOB_TITLE_MAX_LENGTH}
                  placeholder="Procurement Director"
                  value={jobTitle}
                  onChange={(event) => onJobTitleChange(event.target.value)}
                  disabled={submitting}
                  aria-invalid={Boolean(jobTitleError)}
                  aria-describedby={
                    jobTitleError
                      ? jobTitleErrorId
                      : jobTitleHintId
                  }
                  className={enrollmentInputClass}
                />
                <p id={jobTitleHintId} className="mt-2 text-[11px] leading-4 text-slate-600">
                  Your title in this invited workspace. Role assignment remains
                  governed by the invitation.
                </p>
                {jobTitleError ? (
                  <p
                    id={jobTitleErrorId}
                    role="alert"
                    className="mt-2 text-xs font-semibold leading-5 text-rose-200"
                  >
                    {jobTitleError}
                  </p>
                ) : null}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor={passwordId}
                className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
              >
                Create secure credential
              </label>
              <input
                id={passwordId}
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? passwordErrorId : undefined}
                className={enrollmentInputClass}
              />
              {passwordError ? (
                <p
                  id={passwordErrorId}
                  role="alert"
                  className="mt-2 text-xs font-semibold leading-5 text-rose-200"
                >
                  {passwordError}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={confirmPasswordId}
                className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400"
              >
                Confirm secure credential
              </label>
              <input
                id={confirmPasswordId}
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) =>
                  onConfirmPasswordChange(event.target.value)
                }
                disabled={submitting}
                aria-invalid={Boolean(confirmPasswordError)}
                aria-describedby={
                  confirmPasswordError ? confirmPasswordErrorId : undefined
                }
                className={enrollmentInputClass}
              />
              {confirmPasswordError ? (
                <p
                  id={confirmPasswordErrorId}
                  role="alert"
                  className="mt-2 text-xs font-semibold leading-5 text-rose-200"
                >
                  {confirmPasswordError}
                </p>
              ) : null}
            </div>

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
                  label="Professional identity"
                  description="First name, last name, and job title"
                  state={identityReady ? "verified" : "pending"}
                />
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
                  label="Enrollment completeness"
                  description="Identity and credential checks are complete"
                  state={formIsReady ? "verified" : "pending"}
                />
                <WorkflowControl
                  label="Workspace governance"
                  description="Role assignment remains invitation-controlled"
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
                id={formErrorId}
                role="alert"
                className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-rose-200"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className={`${EXECUTIVE_CTA_PRIMARY} w-full disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {submitting
                ? "Provisioning executive access..."
                : "Provision Executive Access"}
            </button>

            <p className="text-center text-xs leading-5 text-slate-600">
              Continuing confirms that you are the intended recipient of this
              controlled workspace invitation.
            </p>
          </form>
        )}

        <div className="mt-6 border-t border-white/8 pt-5 text-center">
          <Link
            href={loginHref}
            className={`text-sm font-semibold text-slate-400 transition hover:text-white ${EXECUTIVE_FOCUS_GOLD} rounded-lg px-1`}
          >
            Already registered?{" "}
            <span className="text-[#d6b977]">Sign in securely</span>
          </Link>
        </div>
      </div>
    </section>
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
