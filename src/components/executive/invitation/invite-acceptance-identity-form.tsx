"use client";

import { useId, useState, type FormEvent } from "react";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import {
  FRIENDLY_INVITE_IDENTITY_REQUIRED,
  validateInvitationEnrollmentIdentity,
} from "@/lib/auth/invite-enrollment";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  normalizeJobTitle,
  normalizeProfessionalName,
} from "@/lib/auth/professional-names";

const identityInputClass = [
  "mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none transition",
  "placeholder:text-slate-600 hover:border-white/20",
  "focus:border-[#C8A646]/60 focus:bg-white/[0.065]",
  EXECUTIVE_FOCUS_GOLD,
].join(" ");

type InviteAcceptanceIdentityFormProps = {
  invitationToken: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialJobTitle?: string;
  preview?: boolean;
};

export function InviteAcceptanceIdentityForm({
  invitationToken,
  initialFirstName = "",
  initialLastName = "",
  initialJobTitle = "",
  preview = false,
}: InviteAcceptanceIdentityFormProps) {
  const firstNameId = useId();
  const lastNameId = useId();
  const jobTitleId = useId();
  const firstNameErrorId = useId();
  const lastNameErrorId = useId();
  const jobTitleErrorId = useId();
  const jobTitleHintId = useId();
  const formErrorId = useId();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [formError, setFormError] = useState("");

  const normalizedFirstName = normalizeProfessionalName(firstName);
  const normalizedLastName = normalizeProfessionalName(lastName);
  const normalizedJobTitle = normalizeJobTitle(jobTitle);
  const showErrors = attemptedSubmit;
  const identityErrors = validateInvitationEnrollmentIdentity({
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    jobTitle: normalizedJobTitle,
  });
  const firstNameError = showErrors ? identityErrors.firstNameError : null;
  const lastNameError = showErrors ? identityErrors.lastNameError : null;
  const jobTitleError = showErrors ? identityErrors.jobTitleError : null;
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateInvitationEnrollmentIdentity({
      firstName: normalizeProfessionalName(firstName),
      lastName: normalizeProfessionalName(lastName),
      jobTitle: normalizeJobTitle(jobTitle),
    });
    const invalid = Boolean(
      errors.firstNameError || errors.lastNameError || errors.jobTitleError,
    );

    if (preview || invalid) {
      event.preventDefault();
    }

    setAttemptedSubmit(true);
    setFormError(invalid ? FRIENDLY_INVITE_IDENTITY_REQUIRED : "");
  }

  return (
    <form
      action={preview ? "#" : "/api/company-invitations/accept"}
      method="POST"
      onSubmit={handleSubmit}
      className="mt-5"
      noValidate
    >
      <input type="hidden" name="token" value={invitationToken} />

      <fieldset className="min-w-0 space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
        <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.19em] text-emerald-300">
          Professional identity
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={firstNameId}
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted"
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
              aria-invalid={Boolean(firstNameError)}
              aria-describedby={firstNameError ? firstNameErrorId : undefined}
              className={identityInputClass}
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
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted"
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
              aria-invalid={Boolean(lastNameError)}
              aria-describedby={lastNameError ? lastNameErrorId : undefined}
              className={identityInputClass}
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
            className="block text-[11px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted"
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
            onChange={(event) => setJobTitle(event.target.value)}
            aria-invalid={Boolean(jobTitleError)}
            aria-describedby={
              jobTitleError ? jobTitleErrorId : jobTitleHintId
            }
            className={identityInputClass}
          />
          <p
            id={jobTitleHintId}
            className="mt-2 text-[11px] leading-4 text-nexus-text-muted"
          >
            Your title in this invited workspace. Assigned role remains
            invitation-controlled.
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

      {formError ? (
        <div
          id={formErrorId}
          role="alert"
          className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-rose-200"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        className={`${EXECUTIVE_CTA_PRIMARY} mt-5 w-full`}
      >
        Verify Identity and Activate Access
      </button>
    </form>
  );
}
