"use client";

import { useId, useState, type FormEvent } from "react";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FORM_ERROR,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
} from "@/lib/design-system/executive-contract";
import { getFriendlyProfessionalIdentityError } from "@/lib/auth/professional-identity-settings";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  normalizeJobTitle,
  normalizeProfessionalName,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";

const identityLabelClass =
  "np-type-meta block text-nexus-muted";

const identityReadonlyClass = [
  EXECUTIVE_FORM_INPUT,
  "mt-2 cursor-default bg-black/20 text-nexus-muted",
].join(" ");

type ProfessionalIdentitySettingsFormProps = {
  initialFirstName?: string;
  initialLastName?: string;
  initialJobTitle?: string;
  email: string;
  preview?: boolean;
  previewError?: string | null;
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  errorCode?: string;
  firstNameError?: string | null;
  lastNameError?: string | null;
  jobTitleError?: string | null;
};

export function ProfessionalIdentitySettingsForm({
  initialFirstName = "",
  initialLastName = "",
  initialJobTitle = "",
  email,
  preview = false,
  previewError = null,
}: ProfessionalIdentitySettingsFormProps) {
  const firstNameId = useId();
  const lastNameId = useId();
  const jobTitleId = useId();
  const emailId = useId();
  const firstNameErrorId = useId();
  const lastNameErrorId = useId();
  const jobTitleErrorId = useId();
  const jobTitleHintId = useId();
  const emailHintId = useId();
  const formStatusId = useId();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(previewError || "");

  const submittedFirstName = normalizeProfessionalName(firstName);
  const submittedLastName = normalizeProfessionalName(lastName);
  const submittedJobTitle = normalizeJobTitle(jobTitle);
  const firstNameError = attemptedSubmit
    ? validateProfessionalName(submittedFirstName, "First name", {
        required: true,
      })
    : null;
  const lastNameError = attemptedSubmit
    ? validateProfessionalName(submittedLastName, "Last name", {
        required: true,
      })
    : null;
  const jobTitleError = attemptedSubmit
    ? validateFounderJobTitle(submittedJobTitle, { required: false })
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    setSuccess("");
    setError("");

    const nextFirstNameError = validateProfessionalName(
      submittedFirstName,
      "First name",
      { required: true },
    );
    const nextLastNameError = validateProfessionalName(
      submittedLastName,
      "Last name",
      { required: true },
    );
    const nextJobTitleError = validateFounderJobTitle(submittedJobTitle, {
      required: false,
    });

    if (nextFirstNameError || nextLastNameError || nextJobTitleError) {
      return;
    }

    if (preview) {
      setSuccess("Professional identity saved.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile/professional-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          firstName: submittedFirstName,
          lastName: submittedLastName,
          jobTitle: submittedJobTitle,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as SaveResponse;

      if (!response.ok || !payload.success) {
        setError(
          payload.error ||
            getFriendlyProfessionalIdentityError(payload.errorCode),
        );
        return;
      }

      setSuccess("Professional identity saved.");
    } catch {
      setError(getFriendlyProfessionalIdentityError(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
      <div className="min-w-0">
        <p className="np-type-meta text-nexus-muted">Professional Name</p>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={firstNameId} className={identityLabelClass}>
              First name
            </label>
            <input
              id={firstNameId}
              type="text"
              name="firstName"
              autoComplete="given-name"
              required
              maxLength={PROFESSIONAL_NAME_MAX_LENGTH}
              placeholder="Alex"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={saving}
              aria-invalid={Boolean(firstNameError)}
              aria-describedby={firstNameError ? firstNameErrorId : undefined}
              className={`mt-2 ${EXECUTIVE_FORM_INPUT}`}
            />
            {firstNameError ? (
              <p
                id={firstNameErrorId}
                role="alert"
                className={`mt-2 ${EXECUTIVE_FORM_ERROR}`}
              >
                {firstNameError}
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <label htmlFor={lastNameId} className={identityLabelClass}>
              Last name
            </label>
            <input
              id={lastNameId}
              type="text"
              name="lastName"
              autoComplete="family-name"
              required
              maxLength={PROFESSIONAL_NAME_MAX_LENGTH}
              placeholder="Morgan"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={saving}
              aria-invalid={Boolean(lastNameError)}
              aria-describedby={lastNameError ? lastNameErrorId : undefined}
              className={`mt-2 ${EXECUTIVE_FORM_INPUT}`}
            />
            {lastNameError ? (
              <p
                id={lastNameErrorId}
                role="alert"
                className={`mt-2 ${EXECUTIVE_FORM_ERROR}`}
              >
                {lastNameError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor={jobTitleId} className={identityLabelClass}>
          Job title
        </label>
        <input
          id={jobTitleId}
          type="text"
          name="jobTitle"
          autoComplete="organization-title"
          maxLength={JOB_TITLE_MAX_LENGTH}
          placeholder="Chief Procurement Officer"
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
          disabled={saving}
          aria-invalid={Boolean(jobTitleError)}
          aria-describedby={
            jobTitleError ? jobTitleErrorId : jobTitleHintId
          }
          className={`mt-2 ${EXECUTIVE_FORM_INPUT}`}
        />
        <p id={jobTitleHintId} className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
          Your title in this workspace. Descriptive professional context only —
          it does not grant workspace permissions. Leave blank to clear it.
        </p>
        {jobTitleError ? (
          <p
            id={jobTitleErrorId}
            role="alert"
            className={`mt-2 ${EXECUTIVE_FORM_ERROR}`}
          >
            {jobTitleError}
          </p>
        ) : null}
      </div>

      <div className="min-w-0">
        <label htmlFor={emailId} className={identityLabelClass}>
          Account Email
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          readOnly
          value={email}
          aria-readonly="true"
          aria-describedby={emailHintId}
          className={identityReadonlyClass}
        />
        <p id={emailHintId} className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
          Account email is read-only here. It remains the account identifier and
          is shown when a professional name is not yet stored.
        </p>
      </div>

      {success ? (
        <div id={formStatusId} role="status" className={EXECUTIVE_FEEDBACK_SUCCESS}>
          {success}
        </div>
      ) : null}

      {error ? (
        <div id={formStatusId} role="alert" className={EXECUTIVE_FEEDBACK_ERROR}>
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className={`${EXECUTIVE_CTA_PRIMARY} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {saving ? "Saving identity..." : "Save Professional Identity"}
      </button>
    </form>
  );
}
